import * as React from 'react';
import {
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, useI18n, useTheme } from 'zkit-ui';
import { wp } from 'zkit-tools';

import { renderIcon, type FeatherIconName } from '../demoUtils';
import { EXAMPLE_LOCALES, type ExampleLocale } from '../i18n';
import {
  exampleBackgroundColor,
  exampleThemePresets,
  type ExampleThemePresetKey,
} from '../theme';
import {
  AccordionGuidePage,
  ButtonGuidePage,
  CheckboxGuidePage,
  FoundationGuidePage,
  LinkedScrollGuidePage,
  OverviewGuidePage,
  PickersGuidePage,
  RadioGuidePage,
  ServicesGuidePage,
  SheetGuidePage,
  SwitchGuidePage,
  TextInputGuidePage,
  ToolsGuidePage,
} from './GuidePages';
import { ActionDialogsGuidePage } from './ActionDialogsGuidePage';
import { GaleriaGuidePage } from './GaleriaGuidePage';

type WorkspaceRouteKey =
  | 'overview'
  | 'foundation'
  | 'button'
  | 'textInput'
  | 'switch'
  | 'checkbox'
  | 'radio'
  | 'accordion'
  | 'bottomSheet'
  | 'linkedScroll'
  | 'galeria'
  | 'pickers'
  | 'services'
  | 'dialogs'
  | 'tools';

type WorkspaceRoute = {
  key: WorkspaceRouteKey;
  title: string;
  caption: string;
  iconName: FeatherIconName;
  Screen: React.ComponentType;
};

const WORKSPACE_ROUTE_KEYS: readonly WorkspaceRouteKey[] = [
  'overview',
  'foundation',
  'button',
  'textInput',
  'switch',
  'checkbox',
  'radio',
  'accordion',
  'bottomSheet',
  'linkedScroll',
  'galeria',
  'pickers',
  'services',
  'dialogs',
  'tools',
];

const WORKSPACE_ROUTE_PATHS: Record<WorkspaceRouteKey, string> = {
  overview: '/',
  foundation: '/foundation',
  button: '/button',
  textInput: '/text-input',
  switch: '/switch',
  checkbox: '/checkbox',
  radio: '/radio',
  accordion: '/accordion',
  bottomSheet: '/bottom-sheet',
  linkedScroll: '/linked-scroll',
  galeria: '/native-image-preview',
  pickers: '/pickers',
  services: '/services',
  dialogs: '/dialogs',
  tools: '/tools',
};

const DRAWER_DURATION = 240;
const LANGUAGE_OPTIONS = EXAMPLE_LOCALES;
const LANGUAGE_LABEL_KEYS: Record<ExampleLocale, string> = {
  'zh-CN': 'example.language.zhCN',
  'zh-TW': 'example.language.zhTW',
  ja: 'example.language.ja',
  'en-US': 'example.language.en',
  de: 'example.language.de',
};
const LANGUAGE_SHORT_LABEL_KEYS: Record<ExampleLocale, string> = {
  'zh-CN': 'example.language.short.zhCN',
  'zh-TW': 'example.language.short.zhTW',
  ja: 'example.language.short.ja',
  'en-US': 'example.language.short.en',
  de: 'example.language.short.de',
};
const THEME_PRESET_KEYS: ExampleThemePresetKey[] = ['blue', 'emerald', 'rose', 'violet'];

function canUseBrowserRoutes() {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    typeof window.history?.pushState === 'function'
  );
}

function getRouteKeyFromPath(pathname: string): WorkspaceRouteKey {
  const segments = pathname.split('/').map((segment) => segment.trim()).filter(Boolean);
  const normalizedPath = `/${segments.join('/')}`.toLowerCase();
  const lastSegment = segments[segments.length - 1]?.toLowerCase();

  if (!lastSegment) return 'overview';
  if (lastSegment === 'overview') return 'overview';
  if (lastSegment === 'forms') return 'textInput';
  if (lastSegment === 'choice') return 'checkbox';
  if (lastSegment === 'surfaces') return 'accordion';
  if (lastSegment === 'sheet' || lastSegment === 'bottomsheet') return 'bottomSheet';
  if (lastSegment === 'linked' || lastSegment === 'linkedscroll') return 'linkedScroll';
  if (lastSegment === 'gallery' || lastSegment === 'native-image-preview') return 'galeria';

  return (
    WORKSPACE_ROUTE_KEYS.find(
      (key) =>
        WORKSPACE_ROUTE_PATHS[key].toLowerCase() === normalizedPath ||
        key.toLowerCase() === lastSegment
    ) ?? 'overview'
  );
}

function readWorkspaceRouteFromBrowser(): WorkspaceRouteKey {
  if (!canUseBrowserRoutes()) return 'overview';

  return getRouteKeyFromPath(window.location.pathname);
}

function pushWorkspaceRoute(routeKey: WorkspaceRouteKey) {
  if (!canUseBrowserRoutes()) return;

  const nextPath = WORKSPACE_ROUTE_PATHS[routeKey];
  const currentPath = window.location.pathname || '/';
  if (currentPath === nextPath) return;

  window.history.pushState({ zkitRoute: routeKey }, '', nextPath);
}

export type RootWorkspaceProps = {
  locale: ExampleLocale;
  themePreset: ExampleThemePresetKey;
  onLocaleChange: (next: ExampleLocale) => void;
  onThemePresetChange: (next: ExampleThemePresetKey) => void;
};

export function RootWorkspace({
  locale,
  themePreset,
  onLocaleChange,
  onThemePresetChange,
}: RootWorkspaceProps) {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const theme = useTheme();
  const drawerProgress = useSharedValue(0);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [activeKey, setActiveKey] = React.useState<WorkspaceRouteKey>(() =>
    readWorkspaceRouteFromBrowser()
  );

  const drawerWidth = React.useMemo(
    () => Math.min(wp(324), Math.max(wp(264), screenWidth - wp(56))),
    [screenWidth]
  );

  const routes = React.useMemo<WorkspaceRoute[]>(
    () => [
      {
        key: 'overview',
        title: t('example.page.overview.title'),
        caption: t('example.page.overview.caption'),
        iconName: 'home',
        Screen: OverviewGuidePage,
      },
      {
        key: 'foundation',
        title: t('example.page.foundation.title'),
        caption: t('example.page.foundation.caption'),
        iconName: 'type',
        Screen: FoundationGuidePage,
      },
      {
        key: 'button',
        title: t('example.page.button.title'),
        caption: t('example.page.button.caption'),
        iconName: 'zap',
        Screen: ButtonGuidePage,
      },
      {
        key: 'textInput',
        title: t('example.page.textInput.title'),
        caption: t('example.page.textInput.caption'),
        iconName: 'edit-3',
        Screen: TextInputGuidePage,
      },
      {
        key: 'switch',
        title: t('example.page.switch.title'),
        caption: t('example.page.switch.caption'),
        iconName: 'toggle-right',
        Screen: SwitchGuidePage,
      },
      {
        key: 'checkbox',
        title: t('example.page.checkbox.title'),
        caption: t('example.page.checkbox.caption'),
        iconName: 'check-square',
        Screen: CheckboxGuidePage,
      },
      {
        key: 'radio',
        title: t('example.page.radio.title'),
        caption: t('example.page.radio.caption'),
        iconName: 'disc',
        Screen: RadioGuidePage,
      },
      {
        key: 'accordion',
        title: t('example.page.accordion.title'),
        caption: t('example.page.accordion.caption'),
        iconName: 'chevron-down',
        Screen: AccordionGuidePage,
      },
      {
        key: 'bottomSheet',
        title: t('example.page.bottomSheet.title'),
        caption: t('example.page.bottomSheet.caption'),
        iconName: 'layers',
        Screen: SheetGuidePage,
      },
      {
        key: 'linkedScroll',
        title: t('example.page.linkedScroll.title'),
        caption: t('example.page.linkedScroll.caption'),
        iconName: 'columns',
        Screen: LinkedScrollGuidePage,
      },
      {
        key: 'galeria',
        title: t('example.page.galeria.title'),
        caption: t('example.page.galeria.caption'),
        iconName: 'image',
        Screen: GaleriaGuidePage,
      },
      {
        key: 'pickers',
        title: t('example.page.pickers.title'),
        caption: t('example.page.pickers.caption'),
        iconName: 'list',
        Screen: PickersGuidePage,
      },
      {
        key: 'services',
        title: t('example.page.services.title'),
        caption: t('example.page.services.caption'),
        iconName: 'command',
        Screen: ServicesGuidePage,
      },
      {
        key: 'dialogs',
        title: t('example.page.dialogs.title'),
        caption: t('example.page.dialogs.caption'),
        iconName: 'message-circle',
        Screen: ActionDialogsGuidePage,
      },
      {
        key: 'tools',
        title: t('example.page.tools.title'),
        caption: t('example.page.tools.caption'),
        iconName: 'tool',
        Screen: ToolsGuidePage,
      },
    ],
    [t]
  );

  const activeRoute = routes.find((route) => route.key === activeKey) ?? routes[0];
  const ActiveScreen = activeRoute.Screen;

  const openDrawer = React.useCallback(() => {
    setDrawerOpen(true);
  }, []);

  const closeDrawer = React.useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const selectRoute = React.useCallback((routeKey: WorkspaceRouteKey) => {
    setActiveKey(routeKey);
    setDrawerOpen(false);
    pushWorkspaceRoute(routeKey);
  }, []);

  React.useEffect(() => {
    if (!canUseBrowserRoutes()) return undefined;

    const handlePopState = () => {
      setActiveKey(readWorkspaceRouteFromBrowser());
      setDrawerOpen(false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  React.useEffect(() => {
    drawerProgress.value = withTiming(drawerOpen ? 1 : 0, {
      duration: DRAWER_DURATION,
      easing: drawerOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
  }, [drawerOpen, drawerProgress]);

  React.useEffect(() => {
    if (!drawerOpen) return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeDrawer();
      return true;
    });

    return () => subscription.remove();
  }, [closeDrawer, drawerOpen]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(drawerProgress.value, [0, 1], [0, 0.42]),
  }));

  const drawerStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateX: (drawerProgress.value - 1) * drawerWidth }],
    }),
    [drawerWidth]
  );
  const drawerContentStyle = React.useMemo(
    () => [styles.drawerContent, { paddingBottom: insets.bottom + wp(28) }],
    [insets.bottom]
  );

  return (
    <View style={[styles.root, { backgroundColor: exampleBackgroundColor }]}>
      <ActiveScreen />

      <View
        pointerEvents="box-none"
        style={[
          styles.topBar,
          {
            backgroundColor: exampleBackgroundColor,
            borderColor: theme.colors.border,
            paddingTop: insets.top + wp(8),
          },
        ]}
      >
        <View style={styles.topTitleWrap}>
          <Text numberOfLines={1} style={[styles.topTitle, { color: theme.colors.onSurface }]}>
            {activeRoute.title}
          </Text>
          <Text numberOfLines={1} style={[styles.topCaption, { color: theme.colors.muted }]}>
            {activeRoute.caption}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('example.workspace.menuA11y')}
          hitSlop={wp(8)}
          onPress={openDrawer}
          style={({ pressed }) => [
            styles.menuButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              opacity: pressed ? 0.72 : 1,
            },
          ]}
        >
          {renderIcon('menu', theme.colors.onSurface, wp(20))}
        </Pressable>
      </View>

      <View pointerEvents={drawerOpen ? 'auto' : 'none'} style={styles.drawerLayer}>
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Pressable accessibilityRole="button" onPress={closeDrawer} style={StyleSheet.absoluteFill} />
        </Animated.View>

        <Animated.View
          style={[
            styles.drawerPanel,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              paddingTop: insets.top + wp(16),
              width: drawerWidth,
            },
            drawerStyle,
          ]}
        >
          <View style={styles.drawerHeader}>
            <View style={styles.drawerTitleWrap}>
              <Text style={[styles.drawerTitle, { color: theme.colors.onSurface }]}>
                {t('example.workspace.drawerTitle')}
              </Text>
              <Text style={[styles.drawerSubtitle, { color: theme.colors.muted }]}>
                {t('example.workspace.drawerSubtitle')}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('example.workspace.closeMenuA11y')}
              hitSlop={wp(8)}
              onPress={closeDrawer}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: theme.colors.secondary, opacity: pressed ? 0.72 : 1 },
              ]}
            >
              {renderIcon('x', theme.colors.onSecondary, wp(18))}
            </Pressable>
          </View>

          <ScrollView
            bounces={false}
            contentInsetAdjustmentBehavior="never"
            showsVerticalScrollIndicator={false}
            style={styles.drawerScroll}
            contentContainerStyle={drawerContentStyle}
          >
            {routes.map((route) => (
              <DrawerRouteItem
                key={route.key}
                route={route}
                selected={route.key === activeKey}
                onPress={selectRoute}
              />
            ))}

            <View style={[styles.preferencePanel, { borderColor: theme.colors.border }]}>
              <Text style={[styles.preferenceTitle, { color: theme.colors.onSurface }]}>
                {t('example.workspace.preferences')}
              </Text>

              <View style={styles.preferenceGroup}>
                <Text style={[styles.preferenceLabel, { color: theme.colors.muted }]}>
                  {t('example.workspace.language')}
                </Text>
                <View style={[styles.segmentedControl, { backgroundColor: '#F1F5F9' }]}>
                  {LANGUAGE_OPTIONS.map((item) => {
                    const selected = item === locale;
                    const label = t(LANGUAGE_SHORT_LABEL_KEYS[item]);

                    return (
                      <Pressable
                        key={item}
                        accessibilityRole="button"
                        accessibilityLabel={t(LANGUAGE_LABEL_KEYS[item])}
                        accessibilityState={{ selected }}
                        onPress={() => onLocaleChange(item)}
                        style={({ pressed }) => [
                          styles.segmentOption,
                          {
                            backgroundColor: selected ? theme.colors.surface : 'transparent',
                            opacity: pressed ? 0.72 : 1,
                          },
                        ]}
                      >
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.segmentText,
                            { color: selected ? theme.colors.primary : theme.colors.muted },
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.preferenceGroup}>
                <Text style={[styles.preferenceLabel, { color: theme.colors.muted }]}>
                  {t('example.workspace.themeColor')}
                </Text>
                <View style={styles.swatchRow}>
                  {THEME_PRESET_KEYS.map((item) => {
                    const selected = item === themePreset;
                    const preset = exampleThemePresets[item];

                    return (
                      <Pressable
                        key={item}
                        accessibilityRole="button"
                        accessibilityLabel={t(`example.theme.${item}`)}
                        accessibilityState={{ selected }}
                        onPress={() => onThemePresetChange(item)}
                        style={({ pressed }) => [
                          styles.swatchButton,
                          {
                            borderColor: selected ? preset.color : theme.colors.border,
                            opacity: pressed ? 0.72 : 1,
                          },
                        ]}
                      >
                        <View style={[styles.swatchDot, { backgroundColor: preset.color }]} />
                        {selected ? (
                          <View style={styles.swatchCheck}>
                            {renderIcon('check', '#FFFFFF', wp(13))}
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
}

const DrawerRouteItem = React.memo(function DrawerRouteItem({
  route,
  selected,
  onPress,
}: {
  route: WorkspaceRoute;
  selected: boolean;
  onPress: (routeKey: WorkspaceRouteKey) => void;
}) {
  const theme = useTheme();
  const iconColor = selected ? theme.colors.primary : theme.colors.muted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onPress(route.key)}
      style={({ pressed }) => [
        styles.drawerItem,
        {
          backgroundColor: selected ? theme.colors.secondary : 'transparent',
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.drawerItemIcon,
          { backgroundColor: selected ? theme.colors.surface : '#F1F5F9' },
        ]}
      >
        {renderIcon(route.iconName, iconColor, wp(18))}
      </View>
      <View style={styles.drawerItemCopy}>
        <Text numberOfLines={1} style={[styles.drawerItemTitle, { color: theme.colors.onSurface }]}>
          {route.title}
        </Text>
        <Text numberOfLines={1} style={[styles.drawerItemCaption, { color: theme.colors.muted }]}>
          {route.caption}
        </Text>
      </View>
      {selected ? renderIcon('check', theme.colors.primary, wp(17)) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    borderBottomWidth: wp(1),
    flexDirection: 'row',
    gap: wp(12),
    left: 0,
    minHeight: wp(58),
    paddingBottom: wp(8),
    paddingHorizontal: wp(16),
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
  },
  topTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  topTitle: {
    fontSize: wp(15),
    fontWeight: '900',
    lineHeight: wp(20),
  },
  topCaption: {
    fontSize: wp(12),
    fontWeight: '600',
    lineHeight: wp(16),
    marginTop: wp(1),
  },
  menuButton: {
    alignItems: 'center',
    borderRadius: wp(12),
    borderWidth: wp(1),
    height: wp(42),
    justifyContent: 'center',
    width: wp(42),
  },
  drawerLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020617',
  },
  drawerPanel: {
    borderRightWidth: wp(1),
    bottom: 0,
    gap: wp(14),
    left: 0,
    paddingHorizontal: wp(14),
    position: 'absolute',
    top: 0,
  },
  drawerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: wp(12),
    minHeight: wp(54),
  },
  drawerTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  drawerTitle: {
    fontSize: wp(18),
    fontWeight: '900',
    lineHeight: wp(24),
  },
  drawerSubtitle: {
    fontSize: wp(12),
    fontWeight: '600',
    lineHeight: wp(17),
    marginTop: wp(2),
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: wp(11),
    height: wp(38),
    justifyContent: 'center',
    width: wp(38),
  },
  drawerContent: {
    gap: wp(6),
  },
  drawerScroll: {
    flex: 1,
    minHeight: 0,
  },
  drawerItem: {
    alignItems: 'center',
    borderRadius: wp(14),
    flexDirection: 'row',
    gap: wp(12),
    minHeight: wp(62),
    paddingHorizontal: wp(10),
    paddingVertical: wp(9),
  },
  drawerItemIcon: {
    alignItems: 'center',
    borderRadius: wp(11),
    height: wp(38),
    justifyContent: 'center',
    width: wp(38),
  },
  drawerItemCopy: {
    flex: 1,
    minWidth: 0,
  },
  drawerItemTitle: {
    fontSize: wp(14),
    fontWeight: '900',
    lineHeight: wp(19),
  },
  drawerItemCaption: {
    fontSize: wp(12),
    fontWeight: '600',
    lineHeight: wp(17),
    marginTop: wp(2),
  },
  preferencePanel: {
    borderTopWidth: wp(1),
    gap: wp(14),
    marginTop: wp(12),
    paddingTop: wp(16),
  },
  preferenceTitle: {
    fontSize: wp(14),
    fontWeight: '900',
    lineHeight: wp(19),
  },
  preferenceGroup: {
    gap: wp(8),
  },
  preferenceLabel: {
    fontSize: wp(12),
    fontWeight: '800',
    lineHeight: wp(16),
    textTransform: 'uppercase',
  },
  segmentedControl: {
    borderRadius: wp(12),
    flexDirection: 'row',
    gap: wp(4),
    minHeight: wp(40),
    padding: wp(4),
  },
  segmentOption: {
    alignItems: 'center',
    borderRadius: wp(9),
    flex: 1,
    justifyContent: 'center',
    minHeight: wp(32),
    paddingHorizontal: wp(8),
  },
  segmentText: {
    fontSize: wp(13),
    fontWeight: '900',
    lineHeight: wp(18),
  },
  swatchRow: {
    flexDirection: 'row',
    gap: wp(10),
  },
  swatchButton: {
    alignItems: 'center',
    borderRadius: wp(999),
    borderWidth: wp(2),
    height: wp(42),
    justifyContent: 'center',
    width: wp(42),
  },
  swatchDot: {
    borderRadius: wp(999),
    height: wp(28),
    width: wp(28),
  },
  swatchCheck: {
    alignItems: 'center',
    height: wp(18),
    justifyContent: 'center',
    position: 'absolute',
    width: wp(18),
  },
});
