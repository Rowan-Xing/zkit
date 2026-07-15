const path = require('path');
const fs = require('fs');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
const defaultResolveRequest = config.resolver.resolveRequest;
const localPackages = [
  {
    name: 'zkit-tools',
    root: path.resolve(workspaceRoot, 'packages/tools'),
    packageJson: require(path.resolve(workspaceRoot, 'packages/tools/package.json')),
  },
  {
    name: 'zkit-ui',
    root: path.resolve(workspaceRoot, 'packages/ui'),
    packageJson: require(path.resolve(workspaceRoot, 'packages/ui/package.json')),
  },
];
const localSourceExtensions = ['', '.tsx', '.ts', '.jsx', '.js'];

const resolveLocalSourceFile = (candidatePath) => {
  for (const extension of localSourceExtensions) {
    const filePath = `${candidatePath}${extension}`;
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return filePath;
    }
  }

  for (const extension of localSourceExtensions.slice(1)) {
    const filePath = path.join(candidatePath, `index${extension}`);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
};

const pickRuntimeExportTarget = (exportTarget) => {
  if (typeof exportTarget === 'string') {
    return exportTarget;
  }

  if (!exportTarget || typeof exportTarget !== 'object') {
    return null;
  }

  return exportTarget['react-native'] || exportTarget.default || null;
};

const matchPackageExport = (exportsMap, subpath) => {
  const exactExport = exportsMap[subpath];
  if (exactExport) {
    return pickRuntimeExportTarget(exactExport);
  }

  for (const [pattern, exportTarget] of Object.entries(exportsMap)) {
    const starIndex = pattern.indexOf('*');
    if (starIndex === -1) {
      continue;
    }

    const prefix = pattern.slice(0, starIndex);
    const suffix = pattern.slice(starIndex + 1);
    if (!subpath.startsWith(prefix) || !subpath.endsWith(suffix)) {
      continue;
    }

    const wildcardValue = subpath.slice(prefix.length, subpath.length - suffix.length);
    const runtimeTarget = pickRuntimeExportTarget(exportTarget);
    return typeof runtimeTarget === 'string'
      ? runtimeTarget.replace('*', wildcardValue)
      : null;
  }

  return null;
};

const exportTargetToSourceFile = (packageRoot, exportTarget) => {
  if (!exportTarget || !exportTarget.startsWith('./dist/') || !exportTarget.endsWith('.js')) {
    return null;
  }

  const sourceRelativePath = exportTarget.slice('./dist/'.length, -'.js'.length);
  return resolveLocalSourceFile(path.join(packageRoot, 'src', sourceRelativePath));
};

const resolveLocalSourceEntry = (moduleName) => {
  for (const localPackage of localPackages) {
    let subpath = null;
    if (moduleName === localPackage.name) {
      subpath = '.';
    } else if (moduleName.startsWith(`${localPackage.name}/`)) {
      subpath = `./${moduleName.slice(localPackage.name.length + 1)}`;
    }

    if (!subpath) {
      continue;
    }

    const exportTarget = matchPackageExport(localPackage.packageJson.exports || {}, subpath);
    const sourceFile = exportTargetToSourceFile(localPackage.root, exportTarget);
    if (sourceFile) {
      return sourceFile;
    }
  }

  return null;
};

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

const { assetExts, sourceExts } = config.resolver;

config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer/expo');
config.resolver.assetExts = assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...sourceExts, 'svg'];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const localEntry = resolveLocalSourceEntry(moduleName);
  if (localEntry) {
    return {
      filePath: localEntry,
      type: 'sourceFile',
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
