import * as React from 'react';
import { Platform, StyleSheet } from 'react-native';
import TabView, { type AppleIcon } from 'react-native-bottom-tabs';
import { useI18n, useTheme } from 'zkit-ui';

import { FormsScreen } from './FormsScreen';
import { HomeScreen } from './HomeScreen';
import { ShowcaseScreen } from './ShowcaseScreen';
import { ToolsScreen } from './ToolsScreen';

type TabKey = 'home' | 'forms' | 'showcase' | 'tools';

type TabRoute = {
  key: TabKey;
  title: string;
  focusedIcon: AppleIcon | number;
  unfocusedIcon?: AppleIcon | number;
  freezeOnBlur?: boolean;
  lazy?: boolean;
};

const SCREENS: Record<TabKey, React.ComponentType> = {
  home: HomeScreen,
  forms: FormsScreen,
  showcase: ShowcaseScreen,
  tools: ToolsScreen,
};

function appleIcon(sfSymbol: string): AppleIcon {
  return { sfSymbol } as AppleIcon;
}

export function RootTabs() {
  const { t } = useI18n();
  const theme = useTheme();
  const [index, setIndex] = React.useState(0);

  const routes = React.useMemo<TabRoute[]>(
    () => [
      {
        key: 'home',
        title: t('example.tabs.home'),
        focusedIcon: appleIcon('house.fill'),
        unfocusedIcon: appleIcon('house'),
        lazy: false,
      },
      {
        key: 'forms',
        title: t('example.tabs.forms'),
        focusedIcon: appleIcon('square.and.pencil'),
        unfocusedIcon: appleIcon('square.and.pencil'),
        lazy: true,
      },
      {
        key: 'showcase',
        title: t('example.tabs.showcase'),
        focusedIcon: appleIcon('square.stack.3d.up.fill'),
        unfocusedIcon: appleIcon('square.stack.3d.up'),
        lazy: true,
        freezeOnBlur: true,
      },
      {
        key: 'tools',
        title: t('example.tabs.tools'),
        focusedIcon: appleIcon('wrench.and.screwdriver.fill'),
        unfocusedIcon: appleIcon('wrench.and.screwdriver'),
        lazy: true,
        freezeOnBlur: true,
      },
    ],
    [t]
  );

  const renderScene = React.useCallback(({ route }: { route: TabRoute }) => {
    const Screen = SCREENS[route.key];
    return <Screen />;
  }, []);

  return (
    <TabView
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
      labeled
      hapticFeedbackEnabled
      sidebarAdaptable={false}
      translucent
      scrollEdgeAppearance="default"
      minimizeBehavior={Platform.OS === 'ios' ? 'onScrollDown' : 'never'}
      tabBarActiveTintColor={theme.colors.primary}
      tabBarInactiveTintColor={theme.colors.muted}
      activeIndicatorColor={theme.colors.secondary}
      rippleColor={theme.colors.secondary}
      getLazy={({ route }) => route.lazy !== false}
      getFreezeOnBlur={({ route }) => route.freezeOnBlur ?? false}
      getSceneStyle={() => styles.scene}
    />
  );
}

const styles = StyleSheet.create({
  scene: {
    flex: 1,
  },
});
