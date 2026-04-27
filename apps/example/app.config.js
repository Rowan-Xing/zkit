const icon = './assets/images/logo.png';
const iosBundleIdentifier =
  process.env.Y2KIT_EXAMPLE_IOS_BUNDLE_IDENTIFIER ?? 'com.xingyuyang.y2kitexample';
const appleTeamId = process.env.Y2KIT_EXAMPLE_APPLE_TEAM_ID;

module.exports = {
  expo: {
    name: 'Y2Kit',
    slug: 'Y2Kit',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'y2kit-example',
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
      package: 'com.anonymous.y2kitexample',
      edgeToEdgeEnabled: true,
    },
  },
};
