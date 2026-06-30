#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const rootDir = process.cwd();
const defaultProjects = [
  'packages/tools/tsconfig.json',
  'packages/ui/tsconfig.json',
  'apps/example/tsconfig.json',
];
const deprecatedDiagnosticCodes = new Set([6385, 6387]);
const projects = process.argv.length > 2 ? process.argv.slice(2) : defaultProjects;
const hits = [];
const seen = new Set();

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

function formatPath(fileName) {
  return toPosixPath(path.relative(rootDir, fileName));
}

function formatMessage(messageText) {
  return ts.flattenDiagnosticMessageText(messageText, '\n');
}

function shouldScanSourceFile(sourceFile) {
  const fileName = toPosixPath(sourceFile.fileName);
  return (
    !sourceFile.isDeclarationFile &&
    !fileName.includes('/node_modules/') &&
    !fileName.includes('/dist/') &&
    !fileName.includes('/build/')
  );
}

function addHit(project, diagnostic) {
  if (!diagnostic.file || diagnostic.start == null) return;

  const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  const file = formatPath(diagnostic.file.fileName);
  const message = formatMessage(diagnostic.messageText);
  const key = `${project}:${file}:${line + 1}:${character + 1}:${diagnostic.code}:${message}`;

  if (seen.has(key)) return;
  seen.add(key);

  hits.push({
    project,
    file,
    line: line + 1,
    character: character + 1,
    code: diagnostic.code,
    message,
    related:
      diagnostic.relatedInformation?.map((info) => ({
        file: info.file ? formatPath(info.file.fileName) : undefined,
        line:
          info.file && info.start != null
            ? info.file.getLineAndCharacterOfPosition(info.start).line + 1
            : undefined,
        character:
          info.file && info.start != null
            ? info.file.getLineAndCharacterOfPosition(info.start).character + 1
            : undefined,
        message: formatMessage(info.messageText),
      })) ?? [],
  });
}

function readProject(projectPath) {
  const resolvedProjectPath = path.resolve(rootDir, projectPath);
  if (!fs.existsSync(resolvedProjectPath)) {
    throw new Error(`Project not found: ${projectPath}`);
  }

  const configFile = ts.readConfigFile(resolvedProjectPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(formatMessage(configFile.error.messageText));
  }

  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(resolvedProjectPath),
    undefined,
    resolvedProjectPath
  );

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.map((diagnostic) => formatMessage(diagnostic.messageText)).join('\n'));
  }

  return {
    project: formatPath(resolvedProjectPath),
    program: ts.createProgram(parsed.fileNames, parsed.options),
  };
}

function scanProject(projectPath) {
  const { project, program } = readProject(projectPath);

  for (const sourceFile of program.getSourceFiles()) {
    if (!shouldScanSourceFile(sourceFile)) continue;

    for (const diagnostic of program.getSuggestionDiagnostics(sourceFile)) {
      if (deprecatedDiagnosticCodes.has(diagnostic.code)) {
        addHit(project, diagnostic);
      }
    }
  }
}

try {
  for (const project of projects) {
    scanProject(project);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}

hits.sort(
  (a, b) =>
    a.file.localeCompare(b.file) ||
    a.line - b.line ||
    a.character - b.character ||
    a.project.localeCompare(b.project)
);

if (hits.length > 0) {
  console.error('Deprecated declarations are still in use:\n');
  for (const hit of hits) {
    console.error(`${hit.file}:${hit.line}:${hit.character} TS${hit.code} (${hit.project})`);
    console.error(`  ${hit.message}`);
    for (const info of hit.related) {
      const location = info.file && info.line != null ? ` ${info.file}:${info.line}:${info.character}` : '';
      console.error(`  ${info.message}${location}`);
    }
    console.error('');
  }
  console.error(`Found ${hits.length} deprecated declaration usage${hits.length === 1 ? '' : 's'}.`);
  process.exit(1);
}

console.log('No deprecated declaration usage found.');
