const fs = require('node:fs');
const path = require('node:path');

const packageRoot = path.resolve(__dirname, '..');
const distRoot = path.join(packageRoot, 'dist');
const packageJsonPath = path.join(packageRoot, 'package.json');
const rootEntryPath = path.join(distRoot, 'index.js');
const rootTypesPath = path.join(distRoot, 'index.d.ts');
const allEntryPath = path.join(distRoot, 'all.js');

function readFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${path.relative(packageRoot, filePath)}. Run pnpm --filter zkit-ui build first.`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

const rootEntry = readFile(rootEntryPath);
const rootTypes = readFile(rootTypesPath);
const allEntry = readFile(allEntryPath);
const packageJson = JSON.parse(readFile(packageJsonPath));

const forbiddenRootRuntimeImports = [
  './ZKitProvider',
  './services/',
  './ui/Accordion/',
  './ui/AddressCascader/',
  './ui/BetweenTime/',
  './ui/Button/',
  './ui/Checkbox/',
  './ui/DatePicker/',
  './ui/LinkedScroll/',
  './ui/NativeImagePreview/',
  './ui/LoadingSpinner/',
  './ui/Picker/',
  './ui/Radio/',
  './ui/Sheet/',
  './ui/SliderCaptcha/',
  './ui/Switch/',
  './ui/Text/',
  './ui/TextInput/',
  './ui/WheelColumn/',
];

const forbiddenRootTypeExports = [
  'TextProps',
  'TextRef',
  'AddressCascader',
  'PickerServiceProvider',
  'ZKitProvider',
  'ButtonProps',
  'SheetProps',
];

const requiredPackageExports = [
  '.',
  './all',
  './provider',
  './core-provider',
  './config',
  './text',
  './native-image-preview',
  './button',
  './sheet',
  './address-cascader',
  './toast',
  './loading',
  './picker-service',
  './package.json',
];

const errors = [];

for (const specifier of forbiddenRootRuntimeImports) {
  if (rootEntry.includes(specifier)) {
    errors.push(`Root entry must not import ${specifier}. Use a subpath entrypoint instead.`);
  }
}

for (const symbol of forbiddenRootTypeExports) {
  if (rootTypes.includes(symbol)) {
    errors.push(`Root types must not export ${symbol}. Move it to zkit-ui/all or a subpath entrypoint.`);
  }
}

if (!allEntry.includes('./ui/AddressCascader/index')) {
  errors.push('Full entry zkit-ui/all should keep exporting AddressCascader.');
}

for (const exportKey of requiredPackageExports) {
  if (!Object.prototype.hasOwnProperty.call(packageJson.exports ?? {}, exportKey)) {
    errors.push(`package.json exports is missing ${exportKey}.`);
  }
}

const sideEffects = packageJson.sideEffects;
const hasOnlyCssSideEffects =
  Array.isArray(sideEffects) &&
  sideEffects.length === 2 &&
  sideEffects.includes('*.css') &&
  sideEffects.includes('**/*.css');

if (sideEffects !== false && !hasOnlyCssSideEffects) {
  errors.push('package.json sideEffects should be false or only whitelist CSS files.');
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log('zkit-ui entrypoints verified');
