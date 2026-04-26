import * as React from 'react';
import { Pressable, ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

export function Playground() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = React.useRef<ScrollView>(null);
  const sectionOffsetsRef = React.useRef<Partial<Record<ShowcaseNavKey, number>>>({});
  const [activeSection, setActiveSection] = React.useState<ShowcaseNavKey>('foundation');
  const [enabled, setEnabled] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [centerBusy, setCenterBusy] = React.useState(false);
  const [note, setNote] = React.useState('Expo 54 playground');
  const [checkedItems, setCheckedItems] = React.useState<string[]>(['motion']);
  const [density, setDensity] = React.useState<Density>('comfortable');
  const [language, setLanguage] = React.useState('en');
  const [languageLabel, setLanguageLabel] = React.useState('English');
  const [workflow, setWorkflow] = React.useState<PickerModelValue>(['design', 'tokens']);
  const [workflowLabel, setWorkflowLabel] = React.useState('Design / Tokens');
  const [date, setDate] = React.useState('2026-04-23');
  const [dateLabel, setDateLabel] = React.useState('2026-04-23');
  const [address, setAddress] = React.useState<string[]>(['110000', '110100', '110101']);
  const [addressLabel, setAddressLabel] = React.useState('Beijing-City-Dongcheng');
  const [range, setRange] = React.useState<string[]>(['2026-04-01', '2026-04-23']);
  const [serviceChoice, setServiceChoice] = React.useState('Tokens');
  const [captchaVisible, setCaptchaVisible] = React.useState(false);
  const [linkedScrollOpen, setLinkedScrollOpen] = React.useState(false);
  const [routerGuardStatus, setRouterGuardStatus] = React.useState('Ready');

  const rangeLabel = React.useMemo(
    () => (range.length === 2 ? `${range[0]} to ${range[1]}` : 'Select range'),
    [range]
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
        { id: 'tokens', title: 'Tokens' },
        { id: 'forms', title: 'Forms' },
        { id: 'overlays', title: 'Overlays' },
      ],
      value: serviceChoice.toLowerCase(),
      title: 'Component area',
    });

    if (!result) return;
    setServiceChoice(String(result.label || result.value));
    toast.info(`Selected ${result.label}`, 1200);
  }, [serviceChoice]);

  const handleDialog = React.useCallback(async () => {
    const confirmed = await actionDialog.confirm({
      title: 'Run action',
      content: 'Confirm opens the same service API an app screen would use.',
      confirmText: 'Run',
      cancelText: 'Cancel',
      footer: { layout: 'row' },
    });

    if (confirmed) {
      toast.success('Action confirmed', 1200);
    }
  }, []);

  const handleLoading = React.useCallback(async () => {
    await loading.withPromise(wait(900), {
      loadingText: 'Syncing',
      successText: 'Synced',
      errorText: 'Failed',
    });
  }, []);

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
      title: 'Camera access',
      message: 'Used by image capture and crop flows in this app.',
      scopeKey: 'example-camera',
    });

    setTimeout(() => {
      purpose.hide();
    }, 2600);
  }, []);

  const openLinkedScrollDemo = React.useCallback(() => {
    setLinkedScrollOpen(true);
  }, []);

  const closeLinkedScrollDemo = React.useCallback(() => {
    setLinkedScrollOpen(false);
  }, []);

  const openCaptcha = React.useCallback(() => {
    setCaptchaVisible(true);
  }, []);

  const closeCaptcha = React.useCallback(() => {
    setCaptchaVisible(false);
  }, []);

  const verifyCaptcha = React.useCallback(async (payload: { progress: number }) => {
    await wait(240);
    return payload.progress > 0.24 ? { success: true } : { success: false, message: 'Slide farther' };
  }, []);

  const handleCaptchaVerified = React.useCallback(() => {
    setCaptchaVisible(false);
    toast.success('Captcha verified', 1200);
  }, []);

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

    setRouterGuardStatus(events.length === 2 ? 'Duplicate push blocked' : events.join(' -> '));
    toast.info('Router guard tested', 1200);
  }, []);

  if (linkedScrollOpen) {
    return <LinkedScrollDemo onBack={closeLinkedScrollDemo} />;
  }

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
            serviceChoice={serviceChoice}
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
          title: 'Slide captcha',
          verifyFailed: 'Try again',
          verifySuccess: 'Verified',
        }}
      />
      <FloatingDebugger initialVisible={false} enableNetworkTab />
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
                  { backgroundColor: active ? 'rgba(255,255,255,0.18)' : theme.colors.secondary },
                ]}
              >
                {renderIcon(NAV_ICONS[item.key], iconColor, wp(16))}
              </View>
              <View style={styles.navCopy}>
                <Text style={[styles.navTitle, { color: active ? theme.colors.onPrimary : theme.colors.onSurface }]}>
                  {item.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.navCaption, { color: active ? 'rgba(255,255,255,0.72)' : theme.colors.muted }]}
                >
                  {item.caption}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});
