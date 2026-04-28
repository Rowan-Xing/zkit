import * as React from 'react';
import { BackHandler, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { LinkedScrollDemo } from '../LinkedScrollDemo';
import { SurfacesSection } from '../sections/PlaygroundSections';
import { styles as sharedStyles } from '../styles';
import { TabScreenShell } from './TabScreenShell';

const ROUTE_PUSH_DURATION = 280;
const ROUTE_POP_DURATION = 220;

export const ShowcaseScreen = React.memo(function ShowcaseScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const [linkedScrollMounted, setLinkedScrollMounted] = React.useState(false);
  const linkedRouteProgress = useSharedValue(0);

  const completeLinkedScrollClose = React.useCallback(() => {
    setLinkedScrollMounted(false);
  }, []);

  const openLinkedScrollDemo = React.useCallback(() => {
    linkedRouteProgress.value = 0;
    setLinkedScrollMounted(true);
    requestAnimationFrame(() => {
      linkedRouteProgress.value = withTiming(1, {
        duration: ROUTE_PUSH_DURATION,
        easing: Easing.out(Easing.cubic),
      });
    });
  }, [linkedRouteProgress]);

  const closeLinkedScrollDemo = React.useCallback(() => {
    linkedRouteProgress.value = withTiming(
      0,
      {
        duration: ROUTE_POP_DURATION,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) runOnJS(completeLinkedScrollClose)();
      }
    );
  }, [completeLinkedScrollClose, linkedRouteProgress]);

  React.useEffect(() => {
    if (!linkedScrollMounted) return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeLinkedScrollDemo();
      return true;
    });

    return () => subscription.remove();
  }, [closeLinkedScrollDemo, linkedScrollMounted]);

  const linkedRouteAnimatedStyle = useAnimatedStyle(
    () => ({
      opacity: linkedRouteProgress.value,
      transform: [{ translateX: (1 - linkedRouteProgress.value) * screenWidth }],
    }),
    [screenWidth]
  );

  return (
    <View style={{ flex: 1 }}>
      <TabScreenShell withTopInset={false}>
        <SurfacesSection onOpenLinkedScroll={openLinkedScrollDemo} />
      </TabScreenShell>
      {linkedScrollMounted ? (
        <Animated.View style={[sharedStyles.linkedRouteLayer, linkedRouteAnimatedStyle]}>
          <LinkedScrollDemo onBack={closeLinkedScrollDemo} />
        </Animated.View>
      ) : null}
    </View>
  );
});
