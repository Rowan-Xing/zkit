import * as React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import TabView, { type AppleIcon } from 'react-native-bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, useI18n, useTheme } from 'zkit-ui';
import { wp } from 'zkit-tools';

import { FormsScreen } from './FormsScreen';
import { HomeScreen } from './HomeScreen';
import { ShowcaseScreen } from './ShowcaseScreen';
import { ToolsScreen } from './ToolsScreen';
import { renderIcon, type FeatherIconName } from '../demoUtils';

type TabKey = 'home' | 'forms' | 'showcase' | 'tools';

type TabRoute = {
  key: TabKey;
  title: string;
  focusedIcon: AppleIcon | number;
  unfocusedIcon?: AppleIcon | number;
  androidIconName: FeatherIconName;
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
  const insets = useSafeAreaInsets();
  const [index, setIndex] = React.useState(0);
  const bottomInset = Math.max(insets.bottom, wp(10));
  const tabBarStyle = React.useMemo(
    () => ({
      backgroundColor: theme.colors.surface,
    }),
    [theme.colors.surface]
  );

  const routes = React.useMemo<TabRoute[]>(
    () => [
      {
        key: 'home',
        title: t('example.tabs.home'),
        focusedIcon: appleIcon('house.fill'),
        unfocusedIcon: appleIcon('house'),
        androidIconName: 'home',
        lazy: false,
      },
      {
        key: 'forms',
        title: t('example.tabs.forms'),
        focusedIcon: appleIcon('square.and.pencil'),
        unfocusedIcon: appleIcon('square.and.pencil'),
        androidIconName: 'edit-3',
        lazy: true,
      },
      {
        key: 'showcase',
        title: t('example.tabs.showcase'),
        focusedIcon: appleIcon('square.stack.3d.up.fill'),
        unfocusedIcon: appleIcon('square.stack.3d.up'),
        androidIconName: 'layers',
        lazy: true,
        freezeOnBlur: true,
      },
      {
        key: 'tools',
        title: t('example.tabs.tools'),
        focusedIcon: appleIcon('wrench.and.screwdriver.fill'),
        unfocusedIcon: appleIcon('wrench.and.screwdriver'),
        androidIconName: 'tool',
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

  const renderAndroidTabBar = React.useCallback(
    () => (
      <View
        style={[
          styles.androidTabBar,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            paddingBottom: bottomInset,
            paddingTop: wp(8),
          },
        ]}
      >
        {routes.map((route, routeIndex) => {
          const selected = routeIndex === index;
          const color = selected ? theme.colors.primary : theme.colors.muted;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setIndex(routeIndex)}
              style={styles.androidTab}
            >
              {renderIcon(route.androidIconName, color, wp(18))}
              <Text size="xs" weight={selected ? 'semibold' : 'medium'} style={{ color }}>
                {route.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    ),
    [
      bottomInset,
      index,
      routes,
      theme.colors.border,
      theme.colors.muted,
      theme.colors.primary,
      theme.colors.surface,
    ]
  );

  return (
    <TabView
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
      labeled
      hapticFeedbackEnabled
      sidebarAdaptable={false}
      translucent={Platform.OS === 'ios'}
      scrollEdgeAppearance="default"
      minimizeBehavior={Platform.OS === 'ios' ? 'onScrollDown' : 'never'}
      tabBarActiveTintColor={theme.colors.primary}
      tabBarInactiveTintColor={theme.colors.muted}
      tabBarStyle={tabBarStyle}
      activeIndicatorColor={theme.colors.secondary}
      rippleColor={theme.colors.secondary}
      tabBar={Platform.OS === 'android' ? renderAndroidTabBar : undefined}
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
  androidTabBar: {
    alignItems: 'center',
    borderTopWidth: wp(1),
    flexDirection: 'row',
    minHeight: wp(64),
  },
  androidTab: {
    alignItems: 'center',
    flex: 1,
    gap: wp(4),
    justifyContent: 'center',
    minHeight: wp(46),
  },
});
