import * as React from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { initRouterGuard, wp } from 'y2kit-tools';
import {
  FloatingDebugger,
  FloatingDebuggerController,
  SliderCaptcha,
  Text,
  actionDialog,
  loading,
  permissionPurposeDialog,
  pickerService,
  toast,
  useI18n,
  useTheme,
  type PickerModelValue,
} from 'y2kit-ui';

import { ExampleHeader } from './components/ExampleHeader';
import { captchaChallenge, showcaseNavItems, type Density, type ShowcaseNavKey } from './data';
import { renderIcon, wait, type FeatherIconName } from './demoUtils';
import { LinkedScrollDemo } from './LinkedScrollDemo';
import {
  ButtonsSection,
  FoundationSection,
  InputsSection,
  PickersSection,
  SelectionSection,
  ServicesSection,
  SurfacesSection,
  ToolsSection,
} from './sections/PlaygroundSections';
import { styles } from './styles';
import { exampleBackgroundColor } from './theme';

const NAV_ICONS: Record<ShowcaseNavKey, FeatherIconName> = {
  foundation: 'grid',
  actions: 'zap',
  forms: 'edit-3',
  choice: 'check-circle',
  surfaces: 'layers',
  pickers: 'calendar',
  services: 'command',
  tools: 'tool',
};

const ROUTE_PUSH_DURATION = 280;
const ROUTE_POP_DURATION = 220;

export function Playground() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { t } = useI18n();
  const scrollViewRef = React.useRef<ScrollView>(null);
  const sectionOffsetsRef = React.useRef<Partial<Record<ShowcaseNavKey, number>>>({});
  const [activeSection, setActiveSection] = React.useState<ShowcaseNavKey>('foundation');
  const [enabled, setEnabled] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [centerBusy, setCenterBusy] = React.useState(false);
  const [note, setNote] = React.useState(() => t('example.defaultNote'));
  const [checkedItems, setCheckedItems] = React.useState<string[]>(['motion']);
  const [density, setDensity] = React.useState<Density>('comfortable');
  const [language, setLanguage] = React.useState('en');
  const [languageLabel, setLanguageLabel] = React.useState(() => t('example.language.en'));
  const [workflow, setWorkflow] = React.useState<PickerModelValue>(['design', 'tokens']);
  const [workflowLabel, setWorkflowLabel] = React.useState(() => t('example.workflow.designTokens'));
  const [date, setDate] = React.useState('2026-04-23');
  const [dateLabel, setDateLabel] = React.useState('2026-04-23');
  const [address, setAddress] = React.useState<string[]>(['110000', '110100', '110101']);
  const [addressLabel, setAddressLabel] = React.useState(() => t('example.address.default'));
  const [range, setRange] = React.useState<string[]>(['2026-04-01', '2026-04-23']);
  const [serviceChoice, setServiceChoice] = React.useState('tokens');
  const [captchaVisible, setCaptchaVisible] = React.useState(false);
  const [linkedScrollMounted, setLinkedScrollMounted] = React.useState(false);
  const [routerGuardStatus, setRouterGuardStatus] = React.useState(() => t('example.router.ready'));
  const linkedRouteProgress = useSharedValue(0);

  const rangeLabel = React.useMemo(
    () => (range.length === 2 ? `${range[0]} ${t('example.common.to')} ${range[1]}` : t('example.range.select')),
    [range, t]
  );

  const handleSectionLayout = React.useCallback(
    (key: ShowcaseNavKey) => (event: LayoutChangeEvent) => {
      sectionOffsetsRef.current[key] = event.nativeEvent.layout.y;
    },
    []
  );

  const scrollToSection = React.useCallback((key: ShowcaseNavKey) => {
    setActiveSection(key);
    const targetY = sectionOffsetsRef.current[key] ?? 0;
    scrollViewRef.current?.scrollTo({
      y: Math.max(0, targetY - wp(10)),
      animated: true,
    });
  }, []);

  const handleGlobalPicker = React.useCallback(async () => {
    const result = await pickerService.pick({
      list: [
        { id: 'tokens', title: t('example.area.tokens') },
        { id: 'forms', title: t('example.area.forms') },
        { id: 'overlays', title: t('example.area.overlays') },
      ],
      value: serviceChoice,
      title: t('example.globalPicker.title'),
    });

    if (!result) return;
    setServiceChoice(String(result.value));
    toast.info(t('example.toast.selected', { label: result.label }), 1200);
  }, [serviceChoice, t]);

  const handleDialog = React.useCallback(async () => {
    const confirmed = await actionDialog.confirm({
      title: t('example.dialog.title'),
      content: t('example.dialog.content'),
      confirmText: t('example.dialog.confirm'),
      cancelText: t('example.common.cancel'),
      footer: { layout: 'row' },
    });

    if (confirmed) {
      toast.success(t('example.dialog.confirmed'), 1200);
    }
  }, [t]);

  const handleLoading = React.useCallback(async () => {
    await loading.withPromise(wait(900), {
      loadingText: t('example.loading.loading'),
      successText: t('example.loading.success'),
      errorText: t('example.loading.error'),
    });
  }, [t]);

  const handleBusyDemo = React.useCallback(async () => {
    if (busy) return;

    setBusy(true);
    try {
      await wait(1200);
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const handleCenterBusyDemo = React.useCallback(async () => {
    if (centerBusy) return;

    setCenterBusy(true);
    try {
      await wait(1200);
    } finally {
      setCenterBusy(false);
    }
  }, [centerBusy]);

  const handlePermissionPurpose = React.useCallback(() => {
    const purpose = permissionPurposeDialog.show({
      permission: 'camera',
      title: t('example.permission.title'),
      message: t('example.permission.message'),
      scopeKey: 'example-camera',
    });

    setTimeout(() => {
      purpose.hide();
    }, 2600);
  }, [t]);

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

  const openCaptcha = React.useCallback(() => {
    setCaptchaVisible(true);
  }, []);

  const closeCaptcha = React.useCallback(() => {
    setCaptchaVisible(false);
  }, []);

  const verifyCaptcha = React.useCallback(async (payload: { progress: number }) => {
    await wait(240);
    return payload.progress > 0.24 ? { success: true } : { success: false, message: t('example.captcha.slideFarther') };
  }, [t]);

  const handleCaptchaVerified = React.useCallback(() => {
    setCaptchaVisible(false);
    toast.success(t('example.captcha.verifiedToast'), 1200);
  }, [t]);

  const handleDebuggerOpen = React.useCallback(() => {
    FloatingDebuggerController.show?.();
  }, []);

  const handleRouterGuardDemo = React.useCallback(() => {
    const events: string[] = [];
    const router = {
      push: (path: string) => {
        events.push(`push ${path}`);
      },
      replace: (path: string) => {
        events.push(`replace ${path}`);
      },
      navigate: (path: string) => {
        events.push(`navigate ${path}`);
      },
      back: () => {
        events.push('back');
      },
    };

    const destroy = initRouterGuard({ router, fallbackLockMs: 700 });
    router.push('/components');
    router.push('/components');
    router.back();
    destroy();

    setRouterGuardStatus(events.length === 2 ? t('example.router.blocked') : events.join(' -> '));
    toast.info(t('example.router.tested'), 1200);
  }, [t]);

  return (
    <View style={[styles.screen, { backgroundColor: exampleBackgroundColor }]}>
      <ScrollView
        ref={scrollViewRef}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + wp(36) }]}
      >
        <ExampleHeader topInset={insets.top} />

        <ShowcaseNav activeKey={activeSection} onSelect={scrollToSection} />

        <View onLayout={handleSectionLayout('foundation')}>
          <FoundationSection />
        </View>

        <View onLayout={handleSectionLayout('actions')}>
          <ButtonsSection
            busy={busy}
            centerBusy={centerBusy}
            onBusyDemo={handleBusyDemo}
            onCenterBusyDemo={handleCenterBusyDemo}
          />
        </View>

        <View onLayout={handleSectionLayout('forms')}>
          <InputsSection
            enabled={enabled}
            note={note}
            onEnabledChange={setEnabled}
            onNoteChange={setNote}
          />
        </View>

        <View onLayout={handleSectionLayout('choice')}>
          <SelectionSection
            checkedItems={checkedItems}
            density={density}
            onCheckedItemsChange={setCheckedItems}
            onDensityChange={setDensity}
          />
        </View>

        <View onLayout={handleSectionLayout('surfaces')}>
          <SurfacesSection onOpenLinkedScroll={openLinkedScrollDemo} />
        </View>

        <View onLayout={handleSectionLayout('pickers')}>
          <PickersSection
            address={address}
            addressLabel={addressLabel}
            date={date}
            dateLabel={dateLabel}
            language={language}
            languageLabel={languageLabel}
            range={range}
            rangeLabel={rangeLabel}
            workflow={workflow}
            workflowLabel={workflowLabel}
            onAddressChange={setAddress}
            onAddressLabelChange={setAddressLabel}
            onDateChange={setDate}
            onDateLabelChange={setDateLabel}
            onLanguageChange={setLanguage}
            onLanguageLabelChange={setLanguageLabel}
            onRangeChange={setRange}
            onWorkflowChange={setWorkflow}
            onWorkflowLabelChange={setWorkflowLabel}
          />
        </View>

        <View onLayout={handleSectionLayout('services')}>
          <ServicesSection
            serviceChoice={t(`example.area.${serviceChoice}`)}
            onCaptchaOpen={openCaptcha}
            onDebuggerOpen={handleDebuggerOpen}
            onDialog={handleDialog}
            onGlobalPicker={handleGlobalPicker}
            onLoading={handleLoading}
            onPermissionPurpose={handlePermissionPurpose}
          />
        </View>

        <View onLayout={handleSectionLayout('tools')}>
          <ToolsSection
            routerGuardStatus={routerGuardStatus}
            onRouterGuardDemo={handleRouterGuardDemo}
          />
        </View>
      </ScrollView>

      <SliderCaptcha
        visible={captchaVisible}
        onClose={closeCaptcha}
        loadChallenge={() => captchaChallenge}
        verifyChallenge={verifyCaptcha}
        onVerified={handleCaptchaVerified}
        texts={{
          title: t('example.captcha.title'),
          verifyFailed: t('example.captcha.failed'),
          verifySuccess: t('example.captcha.success'),
        }}
      />
      <FloatingDebugger initialVisible={false} enableNetworkTab />

      {linkedScrollMounted ? (
        <Animated.View style={[styles.linkedRouteLayer, linkedRouteAnimatedStyle]}>
          <LinkedScrollDemo onBack={closeLinkedScrollDemo} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const ShowcaseNav = React.memo(function ShowcaseNav({
  activeKey,
  onSelect,
}: {
  activeKey: ShowcaseNavKey;
  onSelect: (key: ShowcaseNavKey) => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <View style={styles.navWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.navContent}
      >
        {showcaseNavItems.map((item) => {
          const active = item.key === activeKey;
          const iconColor = active ? theme.colors.onPrimary : theme.colors.primary;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              onPress={() => onSelect(item.key)}
              style={({ pressed }) => [
                styles.navItem,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                  opacity: pressed ? 0.78 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.navItemIcon,
                  { backgroundColor: active ? 'rgba(255,255,255,0.2)' : theme.colors.secondary },
                ]}
              >
                {renderIcon(NAV_ICONS[item.key], iconColor, wp(16))}
              </View>
              <View style={styles.navCopy}>
                <Text style={[styles.navTitle, { color: active ? theme.colors.onPrimary : theme.colors.onSurface }]}>
                  {t(item.titleKey)}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.navCaption, { color: active ? 'rgba(255,255,255,0.72)' : theme.colors.muted }]}
                >
                  {t(item.captionKey)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});
