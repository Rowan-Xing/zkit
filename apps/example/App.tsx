import 'react-native-gesture-handler';

import { Feather } from '@expo/vector-icons';
import * as React from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { wp } from 'y2kit-tools';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AddressCascader,
  BetweenTime,
  Button,
  Checkbox,
  CheckboxGroup,
  ComponentLibProvider,
  DatePicker,
  LinkedScroll,
  LoadingSpinner,
  Picker,
  Radio,
  RadioGroup,
  SliderCaptcha,
  Switch,
  Text,
  TextInput,
  actionDialog,
  imagePreview,
  loading,
  permissionPurposeDialog,
  pickerService,
  toast,
  useTheme,
  type PickerModelValue,
  type SliderCaptchaChallenge,
} from 'y2kit-ui';

type FeatherIconName = keyof typeof Feather.glyphMap;
type Density = 'compact' | 'comfortable' | 'spacious';
type LinkedDemoData = {
  kind: 'overview' | 'metrics' | 'media';
  summary: string;
  accent: string;
  height: number;
  chips: string[];
};

const languageOptions = [
  { id: 'en', title: 'English' },
  { id: 'zh', title: 'Chinese' },
  { id: 'ja', title: 'Japanese' },
];

const workflowOptions = [
  {
    id: 'design',
    title: 'Design',
    children: [
      { id: 'tokens', title: 'Tokens' },
      { id: 'motion', title: 'Motion' },
    ],
  },
  {
    id: 'ship',
    title: 'Ship',
    children: [
      { id: 'review', title: 'Review' },
      { id: 'release', title: 'Release' },
    ],
  },
];

const previewImages = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
];

const captchaChallenge: SliderCaptchaChallenge = {
  backgroundImage:
    'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=640&q=80',
  blockImage:
    'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=120&q=80',
  blockY: 92,
  originalWidth: 640,
  originalHeight: 360,
  blockWidth: 72,
  blockHeight: 72,
};

const linkedFallbackData: LinkedDemoData = {
  kind: 'metrics',
  summary: 'Fallback section data for custom item sources.',
  accent: '#EAF1FF',
  height: 208,
  chips: ['Fallback', 'metrics', '0 items'],
};

const linkedScrollItems = Array.from({ length: 28 }, (_, index) => {
  const order = index + 1;
  const kind: LinkedDemoData['kind'] =
    index % 5 === 0 ? 'overview' : index % 3 === 0 ? 'media' : 'metrics';
  const palette = ['#EAF1FF', '#ECFDF3', '#FFF7ED', '#F4F3FF'];

  return {
    value: `section-${order}`,
    label: `Section ${order}`,
    data: {
      kind,
      summary:
        kind === 'overview'
          ? 'Overview block with denser content and a taller viewport target.'
          : kind === 'media'
            ? 'Media-like section with mixed copy, chips, and uneven height.'
            : 'Metric section with compact rows and predictable recycling type.',
      accent: palette[index % palette.length],
      height: kind === 'overview' ? 280 : kind === 'media' ? 236 : 208,
      chips: [`Batch ${Math.ceil(order / 4)}`, kind, `${24 + index * 3} items`],
    },
  };
});

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function icon(name: FeatherIconName, color: string, size = 17) {
  return <Feather name={name} color={color} size={size} />;
}

function normalizePickerValue(value: PickerModelValue): string {
  if (Array.isArray(value)) return String(value[value.length - 1] ?? '');
  return String(value ?? '');
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ComponentLibProvider
          locale="en-US"
          theme={{
            colors: {
              primary: '#1F6FEB',
              onPrimary: '#FFFFFF',
              secondary: '#EAF1FF',
              onSecondary: '#102A43',
              surface: '#FFFFFF',
              onSurface: '#111827',
              border: '#D5DCE8',
              muted: '#667085',
              disabled: '#98A2B3',
            },
          }}
        >
          <StatusBar barStyle="dark-content" />
          <Playground />
        </ComponentLibProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Playground() {
  const theme = useTheme();
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

  const rangeLabel = range.length === 2 ? `${range[0]} to ${range[1]}` : 'Select range';

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

  if (linkedScrollOpen) {
    return <LinkedScrollDemo onBack={() => setLinkedScrollOpen(false)} />;
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: '#F6F7F9' }]} edges={['top']}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={[styles.logo, { backgroundColor: theme.colors.primary }]}>
              {icon('box', theme.colors.onPrimary, 20)}
            </View>
            <View style={styles.headerCopy}>
              <Text style={[styles.eyebrow, { color: theme.colors.muted }]}>@y2kit/example</Text>
              <Text style={[styles.title, { color: theme.colors.onSurface }]}>y2kit-ui</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <MetaPill label="Expo 54" />
            <MetaPill label="RN 0.81" />
            <MetaPill label="React 19" />
          </View>
        </View>

        <Section title="Buttons">
          <View style={styles.buttonGrid}>
            <Button icon={icon('zap', '#FFFFFF')} onPress={() => toast.success('Primary')}>
              Primary
            </Button>
            <Button
              variant="soft"
              tone="warning"
              icon={icon('alert-triangle', '#92400E')}
              onPress={() => toast.warning('Soft warning')}
            >
              Warning
            </Button>
            <Button
              variant="outline"
              tone="danger"
              icon={icon('trash-2', '#DC2626')}
              onPress={() => toast.error('Danger action')}
            >
              Danger
            </Button>
            <Button
              variant="ghost"
              tone="neutral"
              icon={icon('send', theme.colors.onSurface)}
              onPress={() => toast.info('Ghost action')}
            >
              Ghost
            </Button>
            <Button
              iconOnly
              shape="pill"
              accessibilityLabel="Refresh"
              icon={icon('refresh-cw', '#FFFFFF')}
              onPress={() => toast.info('Refreshed')}
            />
            <Button loading={busy} onPress={handleBusyDemo}>
              Sync
            </Button>
            <Button loading={centerBusy} loadingMode="overlay" onPress={handleCenterBusyDemo}>
              Center load
            </Button>
          </View>
        </Section>

        <Section title="Inputs">
          <View style={styles.fieldStack}>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Type a note"
              placeholderTextColor={theme.colors.muted}
              style={[
                styles.textInput,
                {
                  borderColor: theme.colors.border,
                  color: theme.colors.onSurface,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            />

            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>Notifications</Text>
                <Text style={[styles.controlValue, { color: theme.colors.muted }]}>
                  {enabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
              <Switch checked={enabled} onChange={setEnabled} />
            </View>

            <View style={styles.spinnerRow}>
              <LoadingSpinner size={24} color={theme.colors.primary} />
              <Text style={[styles.controlValue, { color: theme.colors.muted }]}>LoadingSpinner</Text>
            </View>
          </View>
        </Section>

        <Section title="Selection">
          <View style={styles.selectionGrid}>
            <View style={styles.selectionBlock}>
              <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>CheckboxGroup</Text>
              <CheckboxGroup
                value={checkedItems}
                onValueChange={setCheckedItems}
                direction="column"
                gap={10}
              >
                <Checkbox value="motion" label="Motion tokens" />
                <Checkbox value="forms" label="Form controls" />
                <Checkbox value="overlays" label="Overlay services" />
              </CheckboxGroup>
            </View>

            <View style={styles.selectionBlock}>
              <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>RadioGroup</Text>
              <RadioGroup<Density>
                value={density}
                onValueChange={(next) => {
                  if (next) setDensity(next);
                }}
                direction="column"
                gap={10}
              >
                <Radio itemValue="compact" label="Compact" />
                <Radio itemValue="comfortable" label="Comfortable" />
                <Radio itemValue="spacious" label="Spacious" />
              </RadioGroup>
            </View>
          </View>
        </Section>

        <Section title="Accordion">
          <Accordion type="single" collapsible defaultValue="state" style={styles.accordion}>
            <AccordionItem value="state" style={styles.accordionItem}>
              <AccordionTrigger title="Controlled and uncontrolled state" />
              <AccordionContent>
                <Text style={[styles.paragraph, { color: theme.colors.muted }]}>
                  Buttons, switches, checkbox groups, radios, and pickers are wired to local state in this app.
                </Text>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="services" style={styles.accordionItem}>
              <AccordionTrigger title="Provider-backed services" />
              <AccordionContent>
                <Text style={[styles.paragraph, { color: theme.colors.muted }]}>
                  Toast, dialog, loading, picker, permission purpose, image preview, and captcha demos share the
                  ComponentLibProvider root.
                </Text>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Section>

        <Section title="LinkedScroll">
          <View style={[styles.linkedIntro, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.linkedIntroCopy}>
              <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>
                Scroll-linked menu and content
              </Text>
              <Text style={[styles.linkedIntroText, { color: theme.colors.muted }]}>
                Opens a full-screen demo so both FlashList panes can scroll without parent list nesting.
              </Text>
            </View>
            <Button
              icon={icon('columns', '#FFFFFF', wp(17))}
              onPress={() => setLinkedScrollOpen(true)}
            >
              Open demo
            </Button>
          </View>
        </Section>

        <Section title="Pickers">
          <View style={styles.fieldStack}>
            <Picker
              list={languageOptions}
              value={language}
              onValueChange={(next) => setLanguage(normalizePickerValue(next))}
              label={languageLabel}
              onLabelChange={setLanguageLabel}
              title="Language"
            >
              {({ label }) => (
                <FieldTrigger iconName="globe" label="Language" value={label || languageLabel || language} />
              )}
            </Picker>

            <Picker
              list={workflowOptions}
              value={workflow}
              onValueChange={setWorkflow}
              label={workflowLabel}
              onLabelChange={(next) => setWorkflowLabel(next.replace(/-/g, ' / '))}
              separator=" / "
              title="Workflow"
            >
              {({ label }) => <FieldTrigger iconName="git-branch" label="Workflow" value={label || workflowLabel} />}
            </Picker>

            <DatePicker
              value={date}
              onValueChange={setDate}
              label={dateLabel}
              onLabelChange={setDateLabel}
              start="2024-01-01"
              end="2030-12-31"
            >
              {({ label }) => <FieldTrigger iconName="calendar" label="DatePicker" value={label || date} />}
            </DatePicker>

            <AddressCascader
              value={address}
              onValueChange={setAddress}
              label={addressLabel}
              onLabelChange={setAddressLabel}
            >
              {({ label, labels }) => {
                const compactAddress = labels.length > 1 ? labels.slice(-2).join(' / ') : label || addressLabel;
                return <FieldTrigger iconName="map-pin" label="AddressCascader" value={compactAddress} />;
              }}
            </AddressCascader>

            <BetweenTime
              value={range}
              onValueChange={setRange}
              start="2024-01-01"
              end="2030-12-31"
              quickDate={['d', 'w', 'm', '7', '30']}
            >
              <FieldTrigger iconName="clock" label="BetweenTime" value={rangeLabel} />
            </BetweenTime>
          </View>
        </Section>

        <Section title="Services">
          <View style={styles.buttonGrid}>
            <Button
              icon={icon('message-square', '#FFFFFF')}
              onPress={() => toast.success('Saved with toast', 1400)}
            >
              Toast
            </Button>
            <Button variant="outline" tone="info" icon={icon('layers', '#3B82F6')} onPress={handleDialog}>
              Dialog
            </Button>
            <Button variant="soft" tone="success" icon={icon('loader', '#047857')} onPress={handleLoading}>
              Loading
            </Button>
            <Button variant="outline" tone="neutral" icon={icon('list', theme.colors.onSurface)} onPress={handleGlobalPicker}>
              {serviceChoice}
            </Button>
            <Button variant="soft" tone="warning" icon={icon('camera', '#92400E')} onPress={handlePermissionPurpose}>
              Permission
            </Button>
            <Button
              variant="outline"
              tone="neutral"
              icon={icon('image', theme.colors.onSurface)}
              onPress={() => imagePreview.show({ images: previewImages })}
            >
              Preview
            </Button>
            <Button
              variant="ghost"
              tone="info"
              icon={icon('shield', '#3B82F6')}
              onPress={() => setCaptchaVisible(true)}
            >
              Captcha
            </Button>
          </View>
        </Section>
      </ScrollView>

      <SliderCaptcha
        visible={captchaVisible}
        onClose={() => setCaptchaVisible(false)}
        loadChallenge={() => captchaChallenge}
        verifyChallenge={async (payload) => {
          await wait(240);
          return payload.progress > 0.24
            ? { success: true }
            : { success: false, message: 'Slide farther' };
        }}
        onVerified={() => {
          setCaptchaVisible(false);
          toast.success('Captcha verified', 1200);
        }}
        texts={{
          title: 'Slide captcha',
          verifyFailed: 'Try again',
          verifySuccess: 'Verified',
        }}
      />
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();

  return (
    <View style={[styles.section, { borderTopColor: theme.colors.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{title}</Text>
      {children}
    </View>
  );
}

function LinkedScrollDemo({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const [selectedSection, setSelectedSection] = React.useState(linkedScrollItems[0].value);
  const selectedItem = linkedScrollItems.find((item) => item.value === selectedSection) ?? linkedScrollItems[0];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: '#F6F7F9' }]} edges={['top', 'bottom']}>
      <View style={[styles.linkedDemoHeader, { borderBottomColor: theme.colors.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to playground"
          onPress={onBack}
          style={({ pressed }) => [
            styles.linkedBackButton,
            {
              backgroundColor: theme.colors.surface,
              opacity: pressed ? 0.72 : 1,
            },
          ]}
        >
          {icon('arrow-left', theme.colors.onSurface, wp(20))}
        </Pressable>

        <View style={styles.linkedDemoTitleWrap}>
          <Text style={[styles.linkedDemoTitle, { color: theme.colors.onSurface }]}>LinkedScroll</Text>
          <Text numberOfLines={1} style={[styles.linkedDemoSubtitle, { color: theme.colors.muted }]}>
            Selected: {selectedItem.label}
          </Text>
        </View>

        <View style={[styles.linkedSelectedBadge, { backgroundColor: theme.colors.secondary }]}>
          <Text style={[styles.linkedSelectedBadgeText, { color: theme.colors.primary }]}>
            {selectedItem.data.kind}
          </Text>
        </View>
      </View>

      <View style={styles.linkedDemoBody}>
        <LinkedScroll
          items={linkedScrollItems}
          value={selectedSection}
          onChange={(next) => setSelectedSection(next)}
          menuWidth={wp(108)}
          menuItemHeight={wp(54)}
          sectionGap={wp(12)}
          contentPaddingHorizontal={wp(12)}
          contentPaddingVertical={wp(12)}
          activeBackgroundColor="#DCEBFF"
          activeColor={theme.colors.primary}
          inactiveColor={theme.colors.muted}
          menuBackgroundColor="#F0F3F8"
          contentBackgroundColor="#F6F7F9"
          getMenuItemType={() => 'menu'}
          getSectionType={(item) => item.data?.kind ?? linkedFallbackData.kind}
          menuListProps={{
            drawDistance: wp(360),
            contentContainerStyle: styles.linkedMenuContent,
          }}
          contentListProps={{
            drawDistance: wp(900),
          }}
          renderSection={({ item, index, selected }) => {
            const data = item.data ?? linkedFallbackData;
            return (
              <View
                style={[
                  styles.linkedSectionCard,
                  {
                    minHeight: wp(data.height),
                    backgroundColor: selected ? data.accent : theme.colors.surface,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <View style={styles.linkedSectionHeader}>
                  <Text style={[styles.linkedSectionNumber, { color: theme.colors.primary }]}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                  <View style={styles.linkedSectionTitleWrap}>
                    <Text style={[styles.linkedSectionTitle, { color: theme.colors.onSurface }]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.linkedSummary, { color: theme.colors.muted }]}>
                      {data.summary}
                    </Text>
                  </View>
                </View>

                <View style={styles.linkedChipRow}>
                  {data.chips.map((chip) => (
                    <View key={chip} style={[styles.linkedChip, { borderColor: theme.colors.border }]}>
                      <Text style={[styles.linkedChipText, { color: theme.colors.onSurface }]}>{chip}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.linkedMetricStack}>
                  <View style={styles.linkedMetricRow}>
                    <Text style={[styles.linkedMetricLabel, { color: theme.colors.muted }]}>Render type</Text>
                    <Text style={[styles.linkedMetricValue, { color: theme.colors.onSurface }]}>{data.kind}</Text>
                  </View>
                  <View style={styles.linkedMetricRow}>
                    <Text style={[styles.linkedMetricLabel, { color: theme.colors.muted }]}>Section height</Text>
                    <Text style={[styles.linkedMetricValue, { color: theme.colors.onSurface }]}>{data.height}</Text>
                  </View>
                  <View style={styles.linkedMetricRow}>
                    <Text style={[styles.linkedMetricLabel, { color: theme.colors.muted }]}>Source</Text>
                    <Text style={[styles.linkedMetricValue, { color: theme.colors.onSurface }]}>FlashList</Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

function MetaPill({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.metaPill, { backgroundColor: theme.colors.secondary }]}>
      <Text style={[styles.metaPillText, { color: theme.colors.onSecondary }]}>{label}</Text>
    </View>
  );
}

function FieldTrigger({
  iconName,
  label,
  value,
  disabled,
  onPress,
  style,
}: {
  iconName: FeatherIconName;
  label: string;
  value: string;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fieldTrigger,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: disabled ? 0.55 : pressed ? 0.82 : 1,
        },
        style,
      ]}
    >
      <View style={[styles.fieldIcon, { backgroundColor: theme.colors.secondary }]}>
        {icon(iconName, theme.colors.primary, 18)}
      </View>
      <View style={styles.fieldText}>
        <Text style={[styles.fieldLabel, { color: theme.colors.muted }]}>{label}</Text>
        <Text numberOfLines={1} style={[styles.fieldValue, { color: theme.colors.onSurface }]}>
          {value}
        </Text>
      </View>
      {icon('chevron-right', theme.colors.muted, 18)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  content: {
    paddingBottom: wp(36),
    paddingHorizontal: wp(20),
  },
  header: {
    gap: 18,
    paddingBottom: 22,
    paddingTop: 18,
  },
  headerTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  logo: {
    alignItems: 'center',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metaPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 14,
    paddingVertical: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  buttonGrid: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  fieldStack: {
    gap: 12,
  },
  textInput: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  switchRow: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 54,
  },
  switchCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 14,
  },
  controlLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  controlValue: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  spinnerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 32,
  },
  selectionGrid: {
    gap: 16,
  },
  selectionBlock: {
    gap: 12,
  },
  accordion: {
    gap: 10,
  },
  accordionItem: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D5DCE8',
    borderWidth: StyleSheet.hairlineWidth,
  },
  linkedIntro: {
    alignItems: 'center',
    borderRadius: wp(8),
    borderWidth: wp(1),
    flexDirection: 'row',
    gap: wp(12),
    paddingHorizontal: wp(14),
    paddingVertical: wp(14),
  },
  linkedIntroCopy: {
    flex: 1,
    minWidth: 0,
  },
  linkedIntroText: {
    fontSize: wp(13),
    lineHeight: wp(18),
    marginTop: wp(4),
  },
  linkedDemoHeader: {
    alignItems: 'center',
    borderBottomWidth: wp(1),
    flexDirection: 'row',
    gap: wp(12),
    paddingBottom: wp(12),
    paddingHorizontal: wp(16),
    paddingTop: wp(10),
  },
  linkedBackButton: {
    alignItems: 'center',
    borderRadius: wp(18),
    height: wp(36),
    justifyContent: 'center',
    width: wp(36),
  },
  linkedDemoTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  linkedDemoTitle: {
    fontSize: wp(19),
    fontWeight: '800',
    lineHeight: wp(24),
  },
  linkedDemoSubtitle: {
    fontSize: wp(13),
    lineHeight: wp(18),
    marginTop: wp(2),
  },
  linkedSelectedBadge: {
    alignItems: 'center',
    borderRadius: wp(13),
    minHeight: wp(26),
    minWidth: wp(72),
    justifyContent: 'center',
    paddingHorizontal: wp(10),
  },
  linkedSelectedBadgeText: {
    fontSize: wp(12),
    fontWeight: '800',
    lineHeight: wp(16),
  },
  linkedDemoBody: {
    flex: 1,
    minHeight: 0,
  },
  linkedMenuContent: {
    paddingVertical: wp(8),
  },
  linkedSectionCard: {
    borderRadius: wp(18),
    borderWidth: wp(1),
    overflow: 'hidden',
    paddingHorizontal: wp(18),
    paddingVertical: wp(18),
  },
  linkedSectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: wp(12),
  },
  linkedSectionNumber: {
    fontSize: wp(13),
    fontWeight: '900',
    lineHeight: wp(18),
    minWidth: wp(24),
  },
  linkedSectionTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  linkedSectionTitle: {
    fontSize: wp(22),
    fontWeight: '900',
    lineHeight: wp(28),
  },
  linkedSummary: {
    fontSize: wp(14),
    lineHeight: wp(20),
    marginTop: wp(6),
  },
  linkedChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(8),
    marginTop: wp(18),
  },
  linkedChip: {
    borderRadius: wp(12),
    borderWidth: wp(1),
    minHeight: wp(24),
    justifyContent: 'center',
    paddingHorizontal: wp(10),
  },
  linkedChipText: {
    fontSize: wp(12),
    fontWeight: '700',
    lineHeight: wp(16),
  },
  linkedMetricStack: {
    gap: wp(10),
    marginTop: wp(22),
  },
  linkedMetricRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: wp(28),
  },
  linkedMetricLabel: {
    fontSize: wp(13),
    fontWeight: '700',
    lineHeight: wp(18),
  },
  linkedMetricValue: {
    fontSize: wp(14),
    fontWeight: '800',
    lineHeight: wp(19),
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
  },
  fieldTrigger: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fieldIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  fieldText: {
    flex: 1,
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 3,
  },
});
