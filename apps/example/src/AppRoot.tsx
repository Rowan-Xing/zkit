import * as React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Animated, {
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import { ComponentLibProvider } from 'y2kit-ui';
import { BRAND_COLORS, COMPONENT_LIB_THEME } from './brand';
import { ComponentScreen } from './screens/ComponentScreen';
import { HomeScreen } from './screens/HomeScreen';
import type { AppRoute, ComponentId } from './types';

export default function AppRoot() {
  const [route, setRoute] = React.useState<AppRoute>({ kind: 'home' });
  const [direction, setDirection] = React.useState<'forward' | 'back'>('forward');

  const openComponent = React.useCallback((id: ComponentId) => {
    setDirection('forward');
    setRoute({ kind: 'component', id });
  }, []);

  const goHome = React.useCallback(() => {
    setDirection('back');
    setRoute({ kind: 'home' });
  }, []);

  const entering = direction === 'forward' ? SlideInRight.duration(260) : SlideInLeft.duration(260);
  const exiting = direction === 'forward' ? SlideOutLeft.duration(220) : SlideOutRight.duration(220);
  const screenKey = route.kind === 'home' ? 'home' : route.id;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ComponentLibProvider locale="zh-CN" theme={COMPONENT_LIB_THEME}>
          <StatusBar barStyle="dark-content" backgroundColor={BRAND_COLORS.page} />
          <View style={styles.root}>
            <Animated.View key={screenKey} entering={entering} exiting={exiting} style={styles.root}>
              {route.kind === 'home' ? (
                <HomeScreen onOpenComponent={openComponent} />
              ) : (
                <ComponentScreen
                  id={route.id}
                  onBack={goHome}
                  onOpenComponent={openComponent}
                />
              )}
            </Animated.View>
          </View>
        </ComponentLibProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: BRAND_COLORS.page,
    flex: 1,
  },
});
