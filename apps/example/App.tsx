import 'react-native-gesture-handler';

import * as React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ComponentLibProvider } from 'y2kit-ui';

import { RootTabs } from './src/screens/RootTabs';
import { exampleMessages, resolveExampleLocale } from './src/i18n';
import { exampleTheme } from './src/theme';

export default function App() {
  const locale = React.useMemo(resolveExampleLocale, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ComponentLibProvider locale={locale} messages={exampleMessages[locale]} theme={exampleTheme}>
          <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
          <RootTabs />
        </ComponentLibProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
