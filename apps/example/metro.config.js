const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
const defaultResolveRequest = config.resolver.resolveRequest;
const localSourceEntries = {
  'zkit-galeria': path.resolve(workspaceRoot, 'packages/galeria/src/index.ts'),
  'zkit-galeria/react-native': path.resolve(workspaceRoot, 'packages/galeria/src/react-native/index.ts'),
  'zkit-galeria/styles.css': path.resolve(workspaceRoot, 'packages/galeria/src/galeria.css'),
  'zkit-tools': path.resolve(workspaceRoot, 'packages/tools/src/index.ts'),
  'zkit-ui': path.resolve(workspaceRoot, 'packages/ui/src/index.ts'),
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
  const localEntry = localSourceEntries[moduleName];
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
