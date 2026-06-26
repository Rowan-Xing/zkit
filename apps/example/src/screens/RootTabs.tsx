import * as React from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, useI18n, useTheme } from 'zkit-ui';
import { wp } from 'zkit-tools';

import { FormsScreen } from './FormsScreen';
import { HomeScreen } from './HomeScreen';
import { ShowcaseScreen } from './ShowcaseScreen';
import { ToolsScreen } from './ToolsScreen';
import { renderIcon, type FeatherIconName } from '../demoUtils';
import { exampleBackgroundColor } from '../theme';

type TabKey = 'home' | 'forms' | 'showcase' | 'tools';

type TabRoute = {
  key: TabKey;
  title: string;
  iconName: FeatherIconName;
  Screen: React.ComponentType;
};

export function RootTabs() {
  const { t } = useI18n();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  useWindowDimensions();

  const [activeKey, setActiveKey] = React.useState<TabKey>('home');

  const routes = React.useMemo<TabRoute[]>(
    () => [
      { key: 'home', title: t('example.tabs.home'), iconName: 'home', Screen: HomeScreen },
      { key: 'forms', title: t('example.tabs.forms'), iconName: 'edit-3', Screen: FormsScreen },
      { key: 'showcase', title: t('example.tabs.showcase'), iconName: 'layers', Screen: ShowcaseScreen },
      { key: 'tools', title: t('example.tabs.tools'), iconName: 'tool', Screen: ToolsScreen },
    ],
    [t]
  );

  const activeRoute = routes.find((route) => route.key === activeKey) ?? routes[0];
  const ActiveScreen = activeRoute.Screen;
  const bottomInset = Math.max(insets.bottom, wp(10));

  return (
    <View style={[styles.root, { backgroundColor: exampleBackgroundColor }]}>
      <View style={styles.scene}>
        <ActiveScreen />
      </View>

      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            paddingBottom: bottomInset,
            paddingTop: wp(8),
          },
        ]}
      >
        {routes.map((route) => {
          const selected = route.key === activeKey;
          const color = selected ? theme.colors.primary : theme.colors.muted;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setActiveKey(route.key)}
              style={styles.tab}
            >
              {renderIcon(route.iconName, color, wp(18))}
              <Text size="xs" weight={selected ? 'semibold' : 'medium'} style={{ color }}>
                {route.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scene: {
    flex: 1,
  },
  tabBar: {
    alignItems: 'center',
    borderTopWidth: wp(1),
    bottom: 0,
    flexDirection: 'row',
    left: 0,
    minHeight: wp(64),
    position: 'absolute',
    right: 0,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    gap: wp(4),
    justifyContent: 'center',
    minHeight: wp(46),
  },
});
