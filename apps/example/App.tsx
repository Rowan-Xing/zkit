import 'react-native-gesture-handler';

import * as React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ComponentLibProvider } from 'y2kit-ui';

import { Playground } from './src/Playground';
import { exampleTheme } from './src/theme';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ComponentLibProvider locale="en-US" theme={exampleTheme}>
          <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
          <Playground />
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
