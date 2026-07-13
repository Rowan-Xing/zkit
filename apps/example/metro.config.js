const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
const defaultResolveRequest = config.resolver.resolveRequest;
// Keep every zkit-ui public entry on the same source tree while developing the
// workspace. Mixing the root source entry with dist subpath entries creates a
// second copy of module-level contexts (Theme/I18n), so hooks imported from
// `zkit-ui` cannot see providers imported from `zkit-ui/provider`.
const localSourceEntries = {
  'zkit-tools': path.resolve(workspaceRoot, 'packages/tools/src/index.ts'),
  'zkit-ui': path.resolve(workspaceRoot, 'packages/ui/src/index.ts'),
  'zkit-ui/all': path.resolve(workspaceRoot, 'packages/ui/src/all.ts'),
  'zkit-ui/provider': path.resolve(workspaceRoot, 'packages/ui/src/ZKitProvider.tsx'),
  'zkit-ui/core-provider': path.resolve(workspaceRoot, 'packages/ui/src/ZKitCoreProvider.tsx'),
  'zkit-ui/config': path.resolve(workspaceRoot, 'packages/ui/src/config.ts'),
  'zkit-ui/theme/ThemeProvider': path.resolve(workspaceRoot, 'packages/ui/src/theme/ThemeProvider.tsx'),
  'zkit-ui/theme/defaultTheme': path.resolve(workspaceRoot, 'packages/ui/src/theme/defaultTheme.ts'),
  'zkit-ui/theme/mergeTheme': path.resolve(workspaceRoot, 'packages/ui/src/theme/mergeTheme.ts'),
  'zkit-ui/theme/types': path.resolve(workspaceRoot, 'packages/ui/src/theme/types.ts'),
  'zkit-ui/theme/useTheme': path.resolve(workspaceRoot, 'packages/ui/src/theme/useTheme.ts'),
  'zkit-ui/i18n/I18nProvider': path.resolve(workspaceRoot, 'packages/ui/src/i18n/I18nProvider.tsx'),
  'zkit-ui/i18n/locale': path.resolve(workspaceRoot, 'packages/ui/src/i18n/locale.ts'),
  'zkit-ui/i18n/types': path.resolve(workspaceRoot, 'packages/ui/src/i18n/types.ts'),
  'zkit-ui/i18n/useI18n': path.resolve(workspaceRoot, 'packages/ui/src/i18n/useI18n.ts'),
  'zkit-ui/i18n/locales': path.resolve(workspaceRoot, 'packages/ui/src/i18n/locales/index.ts'),
  'zkit-ui/i18n/locales/de': path.resolve(workspaceRoot, 'packages/ui/src/i18n/locales/de.ts'),
  'zkit-ui/i18n/locales/en-US': path.resolve(workspaceRoot, 'packages/ui/src/i18n/locales/en-US.ts'),
  'zkit-ui/i18n/locales/ja': path.resolve(workspaceRoot, 'packages/ui/src/i18n/locales/ja.ts'),
  'zkit-ui/i18n/locales/zh-CN': path.resolve(workspaceRoot, 'packages/ui/src/i18n/locales/zh-CN.ts'),
  'zkit-ui/i18n/locales/zh-TW': path.resolve(workspaceRoot, 'packages/ui/src/i18n/locales/zh-TW.ts'),
  'zkit-ui/accordion': path.resolve(workspaceRoot, 'packages/ui/src/ui/Accordion/index.tsx'),
  'zkit-ui/address-cascader': path.resolve(workspaceRoot, 'packages/ui/src/ui/AddressCascader/index.tsx'),
  'zkit-ui/between-time': path.resolve(workspaceRoot, 'packages/ui/src/ui/BetweenTime/index.tsx'),
  'zkit-ui/button': path.resolve(workspaceRoot, 'packages/ui/src/ui/Button/index.tsx'),
  'zkit-ui/checkbox': path.resolve(workspaceRoot, 'packages/ui/src/ui/Checkbox/index.tsx'),
  'zkit-ui/date-picker': path.resolve(workspaceRoot, 'packages/ui/src/ui/DatePicker/index.tsx'),
  'zkit-ui/linked-scroll': path.resolve(workspaceRoot, 'packages/ui/src/ui/LinkedScroll/index.tsx'),
  'zkit-ui/loading-spinner': path.resolve(workspaceRoot, 'packages/ui/src/ui/LoadingSpinner/index.tsx'),
  'zkit-ui/picker': path.resolve(workspaceRoot, 'packages/ui/src/ui/Picker/index.tsx'),
  'zkit-ui/radio': path.resolve(workspaceRoot, 'packages/ui/src/ui/Radio/index.tsx'),
  'zkit-ui/sheet': path.resolve(workspaceRoot, 'packages/ui/src/ui/Sheet/index.tsx'),
  'zkit-ui/slider-captcha': path.resolve(workspaceRoot, 'packages/ui/src/ui/SliderCaptcha/index.tsx'),
  'zkit-ui/switch': path.resolve(workspaceRoot, 'packages/ui/src/ui/Switch/index.tsx'),
  'zkit-ui/text': path.resolve(workspaceRoot, 'packages/ui/src/ui/Text/index.tsx'),
  'zkit-ui/text-input': path.resolve(workspaceRoot, 'packages/ui/src/ui/TextInput/index.tsx'),
  'zkit-ui/wheel-column': path.resolve(workspaceRoot, 'packages/ui/src/ui/WheelColumn/index.tsx'),
  'zkit-ui/action-dialog': path.resolve(workspaceRoot, 'packages/ui/src/services/ActionDialogService/index.tsx'),
  'zkit-ui/image-preview': path.resolve(workspaceRoot, 'packages/ui/src/services/ImagePreviewService/index.tsx'),
  'zkit-ui/loading': path.resolve(workspaceRoot, 'packages/ui/src/services/LoadingService/index.tsx'),
  'zkit-ui/permission-purpose-dialog': path.resolve(workspaceRoot, 'packages/ui/src/services/PermissionPurposeDialogService/index.tsx'),
  'zkit-ui/picker-service': path.resolve(workspaceRoot, 'packages/ui/src/services/PickerService/index.tsx'),
  'zkit-ui/toast': path.resolve(workspaceRoot, 'packages/ui/src/services/CardToastService/index.tsx'),
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
