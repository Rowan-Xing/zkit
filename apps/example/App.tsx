import 'react-native-gesture-handler';

import * as React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ZKitProvider } from 'zkit-ui';

import { RootWorkspace } from './src/screens/RootWorkspace';
import { exampleMessages, resolveExampleLocale } from './src/i18n';
import {
  defaultExampleThemePreset,
  exampleThemePresets,
  type ExampleThemePresetKey,
} from './src/theme';

export default function App() {
  const [locale, setLocale] = React.useState(resolveExampleLocale);
  const [themePreset, setThemePreset] = React.useState<ExampleThemePresetKey>(defaultExampleThemePreset);
  const theme = exampleThemePresets[themePreset].theme;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ZKitProvider locale={locale} messages={exampleMessages[locale]} theme={theme}>
          <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
          <RootWorkspace
            locale={locale}
            themePreset={themePreset}
            onLocaleChange={setLocale}
            onThemePresetChange={setThemePreset}
          />
        </ZKitProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
