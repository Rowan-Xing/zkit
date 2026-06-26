const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

fs.rmSync(distDir, { recursive: true, force: true });
execFileSync('tsc', ['-p', 'tsconfig.json'], { cwd: rootDir, stdio: 'inherit' });
