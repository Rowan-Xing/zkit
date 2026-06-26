const icon = './assets/images/logo.png';
const iosBundleIdentifier =
  process.env.ZKIT_EXAMPLE_IOS_BUNDLE_IDENTIFIER ?? 'com.xingyuyang.zkitexample';
const appleTeamId = process.env.ZKIT_EXAMPLE_APPLE_TEAM_ID;

module.exports = {
  expo: {
    name: 'ZKit',
    slug: 'zkit',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'zkit-example',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    icon,
    plugins: ['expo-dev-client', 'expo-localization'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: iosBundleIdentifier,
      ...(appleTeamId ? { appleTeamId } : {}),
    },
    android: {
      package: 'com.anonymous.zkitexample',
      edgeToEdgeEnabled: true,
    },
  },
};
