import * as React from 'react';
import { View } from 'react-native';
import { getEnv, getMaxFontScale, getPhoneBrand, sp, wp } from 'y2kit-tools';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AddressCascader,
  BetweenTime,
  BottomSheet,
  Button,
  Checkbox,
  CheckboxGroup,
  DatePicker,
  LoadingSpinner,
  OTAUpdateManager,
  Picker,
  Radio,
  RadioGroup,
  Switch,
  Text,
  TextInput,
  imageCropper,
  imagePreview,
  toast,
  useTheme,
  type BottomSheetRef,
  type PickerModelValue,
} from 'y2kit-ui';

import {
  languageOptions,
  previewImages,
  workflowOptions,
  type Density,
} from '../data';
import { normalizePickerValue, renderIcon, type FeatherIconName } from '../demoUtils';
import { FieldTrigger } from '../components/FieldTrigger';
import { Section } from '../components/Section';
import { styles } from '../styles';

type FoundationStatusCellProps = {
  iconName: FeatherIconName;
  label: string;
  value: string;
  color: string;
};

const FoundationStatusCell = React.memo(function FoundationStatusCell({
  iconName,
  label,
  value,
  color,
}: FoundationStatusCellProps) {
  const theme = useTheme();

  return (
    <View style={styles.statusItem}>
      <View style={[styles.statusIcon, { backgroundColor: `${color}1A` }]}>
        {renderIcon(iconName, color, wp(17))}
      </View>
      <View style={styles.statusTextWrap}>
        <Text style={[styles.statusLabel, { color: theme.colors.muted }]}>{label}</Text>
        <Text numberOfLines={1} style={[styles.statusValue, { color: theme.colors.onSurface }]}>
          {value}
        </Text>
      </View>
    </View>
  );
});

export const FoundationSection = React.memo(function FoundationSection() {
  const theme = useTheme();

  return (
    <Section
      eyebrow="Foundation"
      title="Design baseline"
      subtitle="Type, color, scale, and loading primitives"
      accentColor="#2563EB"
    >
      <View
        style={[
          styles.foundationBand,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <View style={styles.typeSpecimen}>
          <View style={styles.typeRow}>
            <Text style={[styles.typeLabel, { color: theme.colors.primary }]}>Display</Text>
            <Text style={[styles.typeDisplay, { color: theme.colors.onSurface }]}>
              Calm speed, crisp control.
            </Text>
          </View>
          <Text style={[styles.typeSubtitle, { color: theme.colors.muted }]}>
            Body copy stays legible while state changes remain immediate.
          </Text>
        </View>

        <View style={[styles.statusStrip, { borderTopColor: theme.colors.border }]}>
          <FoundationStatusCell iconName="type" label="Text" value="7 variants" color="#2563EB" />
          <FoundationStatusCell iconName="loader" label="Spinner" value="Native scale" color="#0F9F6E" />
          <FoundationStatusCell iconName="sliders" label="Tokens" value="Theme aware" color="#EB5A17" />
          <FoundationStatusCell iconName="activity" label="Motion" value="No layout jump" color="#7C3AED" />
        </View>
      </View>
    </Section>
  );
});

type ButtonsSectionProps = {
  busy: boolean;
  centerBusy: boolean;
  onBusyDemo: () => void;
  onCenterBusyDemo: () => void;
};

export const ButtonsSection = React.memo(function ButtonsSection({
  busy,
  centerBusy,
  onBusyDemo,
  onCenterBusyDemo,
}: ButtonsSectionProps) {
  const theme = useTheme();

  return (
    <Section
      eyebrow="Actions"
      title="Button system"
      subtitle="Solid, soft, outline, ghost, icon-only, and loading modes"
      accentColor="#EB5A17"
    >
      <View
        style={[
          styles.actionPanel,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <View style={styles.actionPanelHeader}>
          <View style={[styles.actionPulse, { backgroundColor: '#FFF1E7' }]}>
            {renderIcon('zap', '#EB5A17', wp(20))}
          </View>
          <View style={styles.actionPanelCopy}>
            <Text style={[styles.actionTitle, { color: theme.colors.onSurface }]}>Primary action row</Text>
            <Text style={[styles.actionSubtitle, { color: theme.colors.muted }]}>
              Buttons keep touch targets stable across loading and pressed states.
            </Text>
          </View>
        </View>

        <View style={styles.buttonGrid}>
          <Button
            gradient={{ colors: ['#2563EB', '#0F9F6E'], direction: 'to right' }}
            icon={renderIcon('zap', '#FFFFFF')}
            shadow="sm"
            onPress={() => toast.success('Primary action')}
          >
            Primary
          </Button>
          <Button
            variant="soft"
            tone="warning"
            icon={renderIcon('alert-triangle', '#92400E')}
            onPress={() => toast.warning('Soft warning')}
          >
            Warning
          </Button>
          <Button
            variant="outline"
            tone="danger"
            icon={renderIcon('trash-2', '#DC2626')}
            onPress={() => toast.error('Danger action')}
          >
            Danger
          </Button>
          <Button
            variant="ghost"
            tone="neutral"
            icon={renderIcon('send', theme.colors.onSurface)}
            onPress={() => toast.info('Ghost action')}
          >
            Ghost
          </Button>
          <Button
            iconOnly
            shape="pill"
            accessibilityLabel="Refresh"
            icon={renderIcon('refresh-cw', '#FFFFFF')}
            onPress={() => toast.info('Refreshed')}
          />
          <Button loading={busy} onPress={onBusyDemo}>
            Sync
          </Button>
          <Button loading={centerBusy} loadingMode="overlay" onPress={onCenterBusyDemo}>
            Center load
          </Button>
        </View>
      </View>
    </Section>
  );
});

type InputsSectionProps = {
  enabled: boolean;
  note: string;
  onEnabledChange: (next: boolean) => void;
  onNoteChange: (next: string) => void;
};

export const InputsSection = React.memo(function InputsSection({
  enabled,
  note,
  onEnabledChange,
  onNoteChange,
}: InputsSectionProps) {
  const theme = useTheme();

  return (
    <Section
      eyebrow="Forms"
      title="Input controls"
      subtitle="TextInput, Switch, disabled state, and inline feedback"
      accentColor="#0F9F6E"
    >
      <View style={styles.fieldStack}>
        <TextInput
          value={note}
          onChangeText={onNoteChange}
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

        <View
          style={[
            styles.switchRow,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <View style={styles.switchCopy}>
            <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>Notifications</Text>
            <Text style={[styles.controlValue, { color: theme.colors.muted }]}>
              {enabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          <Switch checked={enabled} checkedLabel="On" uncheckedLabel="Off" onChange={onEnabledChange} />
        </View>

        <View
          style={[
            styles.switchRow,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <View style={styles.switchCopy}>
            <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>Delivery lane</Text>
            <Text style={[styles.controlValue, { color: theme.colors.muted }]}>Large success tone</Text>
          </View>
          <Switch defaultChecked size="lg" tone="success" checkedLabel="Live" uncheckedLabel="Hold" />
        </View>

        <View
          style={[
            styles.spinnerRow,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <LoadingSpinner size={wp(24)} color={theme.colors.primary} />
          <Text style={[styles.controlValue, { color: theme.colors.muted }]}>LoadingSpinner</Text>
        </View>
      </View>
    </Section>
  );
});

type SelectionSectionProps = {
  checkedItems: string[];
  density: Density;
  onCheckedItemsChange: (next: string[]) => void;
  onDensityChange: (next: Density) => void;
};

export const SelectionSection = React.memo(function SelectionSection({
  checkedItems,
  density,
  onCheckedItemsChange,
  onDensityChange,
}: SelectionSectionProps) {
  const theme = useTheme();

  return (
    <Section
      eyebrow="Choice"
      title="Selection model"
      subtitle="Controlled CheckboxGroup and RadioGroup with consistent value naming"
      accentColor="#7C3AED"
    >
      <View style={styles.selectionGrid}>
        <View
          style={[
            styles.selectionBlock,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <View style={styles.selectionHeader}>
            <View style={[styles.selectionIcon, { backgroundColor: '#EEF2FF' }]}>
              {renderIcon('check-square', '#4F46E5', wp(18))}
            </View>
            <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>CheckboxGroup</Text>
          </View>
          <CheckboxGroup
            value={checkedItems}
            onValueChange={onCheckedItemsChange}
            direction="column"
            gap={wp(10)}
          >
            <Checkbox value="motion" label="Motion tokens" />
            <Checkbox value="forms" label="Form controls" />
            <Checkbox value="overlays" label="Overlay services" />
          </CheckboxGroup>
        </View>

        <View
          style={[
            styles.selectionBlock,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <View style={styles.selectionHeader}>
            <View style={[styles.selectionIcon, { backgroundColor: '#E8F7F1' }]}>
              {renderIcon('disc', '#0F9F6E', wp(18))}
            </View>
            <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>RadioGroup</Text>
          </View>
          <RadioGroup<Density>
            value={density}
            onValueChange={(next) => {
              if (next) onDensityChange(next);
            }}
            direction="column"
            gap={wp(10)}
          >
            <Radio itemValue="compact" label="Compact" />
            <Radio itemValue="comfortable" label="Comfortable" />
            <Radio itemValue="spacious" label="Spacious" />
          </RadioGroup>
        </View>
      </View>
    </Section>
  );
});

export const SurfacesSection = React.memo(function SurfacesSection({ onOpenLinkedScroll }: { onOpenLinkedScroll: () => void }) {
  const theme = useTheme();
  const sheetRef = React.useRef<BottomSheetRef>(null);

  const openSheet = React.useCallback(() => {
    void sheetRef.current?.present();
  }, []);

  const closeSheet = React.useCallback(() => {
    void sheetRef.current?.dismiss();
  }, []);

  return (
    <Section
      eyebrow="Surfaces"
      title="Layered surfaces"
      subtitle="Accordion, BottomSheet, and linked scrolling patterns"
      accentColor="#334155"
    >
      <View style={styles.surfaceGrid}>
        <Accordion type="single" collapsible defaultValue="state" style={styles.accordion}>
          <AccordionItem
            value="state"
            style={[
              styles.accordionItem,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <AccordionTrigger title="Controlled and uncontrolled state" />
            <AccordionContent>
              <Text style={[styles.paragraph, { color: theme.colors.muted }]}>
                Buttons, switches, checkbox groups, radios, and pickers are wired to local state in this app.
              </Text>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem
            value="services"
            style={[
              styles.accordionItem,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <AccordionTrigger title="Provider-backed overlays" />
            <AccordionContent>
              <Text style={[styles.paragraph, { color: theme.colors.muted }]}>
                Toast, dialog, loading, picker, permission purpose, image preview, cropper, and captcha share one root provider.
              </Text>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <View style={[styles.linkedIntro, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.linkedIntroCopy}>
            <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>
              Scroll-linked menu and content
            </Text>
            <Text style={[styles.linkedIntroText, { color: theme.colors.muted }]}>
              FlashList panes stay isolated from the parent page.
            </Text>
          </View>
          <Button icon={renderIcon('columns', '#FFFFFF', wp(17))} onPress={onOpenLinkedScroll}>
            Open
          </Button>
        </View>

        <View style={[styles.linkedIntro, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.linkedIntroCopy}>
            <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>BottomSheet</Text>
            <Text style={[styles.linkedIntroText, { color: theme.colors.muted }]}>
              Native sheet detents with compact content.
            </Text>
          </View>
          <Button variant="outline" tone="neutral" icon={renderIcon('layers', theme.colors.onSurface, wp(17))} onPress={openSheet}>
            Sheet
          </Button>
        </View>
      </View>

      <BottomSheet
        ref={sheetRef}
        detents={['auto', 0.72]}
        backgroundColor={theme.colors.surface}
        cornerRadius={wp(8)}
        grabberOptions={{
          width: wp(36),
          height: wp(4),
          topMargin: wp(10),
          cornerRadius: wp(2),
          color: theme.colors.border,
        }}
        maxContentHeight={wp(420)}
      >
        <View style={styles.sheetContent}>
          <View>
            <Text style={[styles.sheetTitle, { color: theme.colors.onSurface }]}>BottomSheet</Text>
            <Text style={[styles.sheetSubtitle, { color: theme.colors.muted }]}>
              Detents, native gestures, and stable content sizing.
            </Text>
          </View>
          <View style={styles.sheetGrid}>
            <View style={[styles.sheetSwatch, { backgroundColor: '#E8F7F1' }]}>
              <Text style={[styles.sheetSwatchLabel, { color: '#0F7A57' }]}>Detent</Text>
              <Text style={[styles.sheetSwatchValue, { color: '#0F513F' }]}>auto</Text>
            </View>
            <View style={[styles.sheetSwatch, { backgroundColor: '#FFF1E7' }]}>
              <Text style={[styles.sheetSwatchLabel, { color: '#9A3412' }]}>Max</Text>
              <Text style={[styles.sheetSwatchValue, { color: '#7C2D12' }]}>72%</Text>
            </View>
          </View>
          <Button block onPress={closeSheet}>
            Done
          </Button>
        </View>
      </BottomSheet>
    </Section>
  );
});

type PickersSectionProps = {
  address: string[];
  addressLabel: string;
  date: string;
  dateLabel: string;
  language: string;
  languageLabel: string;
  range: string[];
  rangeLabel: string;
  workflow: PickerModelValue;
  workflowLabel: string;
  onAddressChange: (next: string[]) => void;
  onAddressLabelChange: (next: string) => void;
  onDateChange: (next: string) => void;
  onDateLabelChange: (next: string) => void;
  onLanguageChange: (next: string) => void;
  onLanguageLabelChange: (next: string) => void;
  onRangeChange: (next: string[]) => void;
  onWorkflowChange: (next: PickerModelValue) => void;
  onWorkflowLabelChange: (next: string) => void;
};

export const PickersSection = React.memo(function PickersSection({
  address,
  addressLabel,
  date,
  dateLabel,
  language,
  languageLabel,
  range,
  rangeLabel,
  workflow,
  workflowLabel,
  onAddressChange,
  onAddressLabelChange,
  onDateChange,
  onDateLabelChange,
  onLanguageChange,
  onLanguageLabelChange,
  onRangeChange,
  onWorkflowChange,
  onWorkflowLabelChange,
}: PickersSectionProps) {
  return (
    <Section
      eyebrow="Pickers"
      title="Picker flows"
      subtitle="Single column, tree, date, address, and date range"
      accentColor="#0891B2"
    >
      <View style={styles.fieldStack}>
        <Picker
          list={languageOptions}
          value={language}
          onValueChange={(next) => onLanguageChange(normalizePickerValue(next))}
          label={languageLabel}
          onLabelChange={onLanguageLabelChange}
          title="Language"
        >
          {({ label }) => <FieldTrigger iconName="globe" label="Language" value={label || languageLabel || language} />}
        </Picker>

        <Picker
          list={workflowOptions}
          value={workflow}
          onValueChange={onWorkflowChange}
          label={workflowLabel}
          onLabelChange={(next) => onWorkflowLabelChange(next.replace(/-/g, ' / '))}
          separator=" / "
          title="Workflow"
        >
          {({ label }) => <FieldTrigger iconName="git-branch" label="Workflow" value={label || workflowLabel} />}
        </Picker>

        <DatePicker
          value={date}
          onValueChange={onDateChange}
          label={dateLabel}
          onLabelChange={onDateLabelChange}
          start="2024-01-01"
          end="2030-12-31"
        >
          {({ label }) => <FieldTrigger iconName="calendar" label="DatePicker" value={label || date} />}
        </DatePicker>

        <AddressCascader
          value={address}
          onValueChange={onAddressChange}
          label={addressLabel}
          onLabelChange={onAddressLabelChange}
        >
          {({ label, labels }) => {
            const compactAddress = labels.length > 1 ? labels.slice(-2).join(' / ') : label || addressLabel;
            return <FieldTrigger iconName="map-pin" label="AddressCascader" value={compactAddress} />;
          }}
        </AddressCascader>

        <BetweenTime
          value={range}
          onValueChange={onRangeChange}
          start="2024-01-01"
          end="2030-12-31"
          quickDate={['d', 'w', 'm', '7', '30']}
        >
          <FieldTrigger iconName="clock" label="BetweenTime" value={rangeLabel} />
        </BetweenTime>
      </View>
    </Section>
  );
});

type ServicesSectionProps = {
  serviceChoice: string;
  onCaptchaOpen: () => void;
  onDebuggerOpen: () => void;
  onDialog: () => void;
  onGlobalPicker: () => void;
  onLoading: () => void;
  onPermissionPurpose: () => void;
};

export const ServicesSection = React.memo(function ServicesSection({
  serviceChoice,
  onCaptchaOpen,
  onDebuggerOpen,
  onDialog,
  onGlobalPicker,
  onLoading,
  onPermissionPurpose,
}: ServicesSectionProps) {
  const theme = useTheme();
  const [otaRunId, setOtaRunId] = React.useState(0);

  const handleCropImage = React.useCallback(async () => {
    try {
      const result = await imageCropper.pick({
        square: true,
        output: { maxWidth: 1024, maxHeight: 1024, compress: 0.92, format: 'jpeg' },
        texts: {
          title: 'Edit Photo',
          confirm: 'Use',
          cancel: 'Cancel',
        },
      });

      if (result) {
        toast.success('Image cropped', 1400);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Crop failed', 1800);
    }
  }, []);

  const handleOtaSimulation = React.useCallback(() => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      setOtaRunId((current) => current + 1);
      return;
    }

    toast.info('OTA checks run in release builds', 1600);
  }, []);

  return (
    <Section
      eyebrow="Services"
      title="Provider-backed actions"
      subtitle="Global overlays and command APIs mounted by ComponentLibProvider"
      accentColor="#DB2777"
    >
      <View style={styles.serviceGrid}>
        <ServiceActionCard
          iconName="message-square"
          title="Toast"
          subtitle="success / warning / error / info"
          color="#0F9F6E"
          buttonLabel="Show"
          onPress={() => toast.success('Saved with toast', 1400)}
        />
        <ServiceActionCard
          iconName="layers"
          title="ActionDialog"
          subtitle="confirm flow"
          color="#2563EB"
          buttonLabel="Open"
          onPress={onDialog}
        />
        <ServiceActionCard
          iconName="loader"
          title="Loading"
          subtitle="promise-bound result"
          color="#7C3AED"
          buttonLabel="Run"
          onPress={onLoading}
        />
        <ServiceActionCard
          iconName="list"
          title="Picker service"
          subtitle={serviceChoice}
          color="#0891B2"
          buttonLabel="Pick"
          onPress={onGlobalPicker}
        />
        <ServiceActionCard
          iconName="camera"
          title="Permission purpose"
          subtitle="camera scope"
          color="#EB5A17"
          buttonLabel="Show"
          onPress={onPermissionPurpose}
        />
        <ServiceActionCard
          iconName="image"
          title="Image preview"
          subtitle="pinch, pan, swipe"
          color="#334155"
          buttonLabel="Preview"
          onPress={() => imagePreview.show({ images: previewImages })}
        />
        <ServiceActionCard
          iconName="crop"
          title="Image cropper"
          subtitle="native photo crop"
          color="#0F9F6E"
          buttonLabel="Pick"
          onPress={handleCropImage}
        />
        <ServiceActionCard
          iconName="shield"
          title="Slider captcha"
          subtitle="challenge verification"
          color="#DB2777"
          buttonLabel="Open"
          onPress={onCaptchaOpen}
        />
        <ServiceActionCard
          iconName="terminal"
          title="Floating debugger"
          subtitle="logs and network panel"
          color={theme.colors.onSurface}
          buttonLabel="Open"
          onPress={onDebuggerOpen}
        />
        <ServiceActionCard
          iconName="download-cloud"
          title="OTA manager"
          subtitle="dev simulation"
          color="#2563EB"
          buttonLabel="Run"
          onPress={handleOtaSimulation}
        />
      </View>
      {typeof __DEV__ !== 'undefined' && __DEV__ && otaRunId > 0 ? (
        <OTAUpdateManager
          key={otaRunId}
          devSimulation={{
            enabled: true,
            delayMs: 180,
            downloadDurationMs: 1200,
            installDurationMs: 800,
            endState: 'ready',
          }}
        />
      ) : null}
    </Section>
  );
});

type ServiceActionCardProps = {
  iconName: FeatherIconName;
  title: string;
  subtitle: string;
  color: string;
  buttonLabel: string;
  onPress: () => void;
};

const ServiceActionCard = React.memo(function ServiceActionCard({
  iconName,
  title,
  subtitle,
  color,
  buttonLabel,
  onPress,
}: ServiceActionCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.serviceCard,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <View style={[styles.serviceIcon, { backgroundColor: `${color}1A` }]}>
        {renderIcon(iconName, color, wp(18))}
      </View>
      <View style={styles.serviceCopy}>
        <Text style={[styles.serviceTitle, { color: theme.colors.onSurface }]}>{title}</Text>
        <Text numberOfLines={1} style={[styles.serviceSubtitle, { color: theme.colors.muted }]}>
          {subtitle}
        </Text>
      </View>
      <Button size="sm" variant="outline" tone="neutral" onPress={onPress}>
        {buttonLabel}
      </Button>
    </View>
  );
});

type ToolsSectionProps = {
  routerGuardStatus: string;
  onRouterGuardDemo: () => void;
};

export const ToolsSection = React.memo(function ToolsSection({
  routerGuardStatus,
  onRouterGuardDemo,
}: ToolsSectionProps) {
  const theme = useTheme();
  const phoneBrand = React.useMemo(() => getPhoneBrand(), []);
  const runtimeEnv = React.useMemo(() => {
    try {
      return getEnv('APP_ENV', 'local') || 'local';
    } catch {
      return 'provider missing';
    }
  }, []);

  const toolCards = React.useMemo(
    () => [
      { iconName: 'maximize' as const, label: 'wp(24)', value: `${Math.round(wp(24))} px`, color: '#2563EB' },
      { iconName: 'type' as const, label: 'sp(16)', value: `${Math.round(sp(16))} px`, color: '#7C3AED' },
      { iconName: 'smartphone' as const, label: 'Phone brand', value: phoneBrand, color: '#0F9F6E' },
      { iconName: 'settings' as const, label: 'Font cap', value: `${getMaxFontScale()}x`, color: '#EB5A17' },
      { iconName: 'server' as const, label: 'Runtime env', value: runtimeEnv, color: '#0891B2' },
      { iconName: 'package' as const, label: 'Config', value: 'typed access', color: '#334155' },
    ],
    [phoneBrand, runtimeEnv]
  );

  return (
    <Section
      eyebrow="Tools"
      title="Runtime utilities"
      subtitle="Screen scale, font scale, device brand, env, and router guard"
      accentColor="#0F766E"
    >
      <View style={styles.toolGrid}>
        {toolCards.map((item) => (
          <ToolCard
            key={item.label}
            iconName={item.iconName}
            label={item.label}
            value={item.value}
            color={item.color}
          />
        ))}
      </View>

      <View
        style={[
          styles.routerGuardPanel,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <View style={styles.routerGuardCopy}>
          <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>RouterGuard</Text>
          <Text numberOfLines={1} style={[styles.controlValue, { color: theme.colors.muted }]}>
            {routerGuardStatus}
          </Text>
        </View>
        <Button size="sm" icon={renderIcon('navigation', '#FFFFFF', wp(15))} onPress={onRouterGuardDemo}>
          Test
        </Button>
      </View>
    </Section>
  );
});

type ToolCardProps = {
  iconName: FeatherIconName;
  label: string;
  value: string;
  color: string;
};

const ToolCard = React.memo(function ToolCard({ iconName, label, value, color }: ToolCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.toolCard,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <View style={[styles.toolIcon, { backgroundColor: `${color}1A` }]}>
        {renderIcon(iconName, color, wp(17))}
      </View>
      <Text style={[styles.toolLabel, { color: theme.colors.muted }]}>{label}</Text>
      <Text numberOfLines={1} style={[styles.toolValue, { color: theme.colors.onSurface }]}>
        {value}
      </Text>
    </View>
  );
});
