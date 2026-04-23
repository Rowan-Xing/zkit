const icon = './assets/images/y2icon.png';

module.exports = {
  expo: {
    name: 'y2kit example',
    slug: 'y2kit-example',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'y2kit-example',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    icon,
    plugins: ['expo-dev-client'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.anonymous.y2kit-example',
      appleTeamId: 'CQ5QU9G4F2',
    },
    android: {
      edgeToEdgeEnabled: true,
      icon,
      adaptiveIcon: {
        foregroundImage: icon,
        backgroundColor: '#ffffff',
      },
    },
  },
};
