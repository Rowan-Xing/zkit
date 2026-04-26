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
  useI18n,
  useTheme,
  type BottomSheetRef,
  type PickerModelValue,
} from 'y2kit-ui';

import {
  previewImages,
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
  const { t } = useI18n();

  return (
    <Section
      eyebrow={t('example.foundation.eyebrow')}
      title={t('example.foundation.title')}
      subtitle={t('example.foundation.subtitle')}
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
            <Text style={[styles.typeLabel, { color: theme.colors.primary }]}>
              {t('example.foundation.displayLabel')}
            </Text>
            <Text style={[styles.typeDisplay, { color: theme.colors.onSurface }]}>
              {t('example.foundation.displayText')}
            </Text>
          </View>
          <Text style={[styles.typeSubtitle, { color: theme.colors.muted }]}>
            {t('example.foundation.displaySubtitle')}
          </Text>
        </View>

        <View style={[styles.statusStrip, { borderTopColor: theme.colors.border }]}>
          <FoundationStatusCell
            iconName="type"
            label={t('example.foundation.textLabel')}
            value={t('example.foundation.textValue')}
            color="#2563EB"
          />
          <FoundationStatusCell
            iconName="loader"
            label={t('example.foundation.spinnerLabel')}
            value={t('example.foundation.spinnerValue')}
            color="#0F9F6E"
          />
          <FoundationStatusCell
            iconName="sliders"
            label={t('example.foundation.tokensLabel')}
            value={t('example.foundation.tokensValue')}
            color="#EB5A17"
          />
          <FoundationStatusCell
            iconName="activity"
            label={t('example.foundation.motionLabel')}
            value={t('example.foundation.motionValue')}
            color="#7C3AED"
          />
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
  const { t } = useI18n();

  return (
    <Section
      eyebrow={t('example.actions.eyebrow')}
      title={t('example.actions.title')}
      subtitle={t('example.actions.subtitle')}
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
            <Text style={[styles.actionTitle, { color: theme.colors.onSurface }]}>
              {t('example.actions.panelTitle')}
            </Text>
            <Text style={[styles.actionSubtitle, { color: theme.colors.muted }]}>
              {t('example.actions.panelSubtitle')}
            </Text>
          </View>
        </View>

        <View style={styles.buttonGrid}>
          <Button
            gradient={{ colors: ['#2563EB', '#0F9F6E'], direction: 'to right' }}
            icon={renderIcon('zap', '#FFFFFF')}
            shadow="sm"
            onPress={() => toast.success(t('example.actions.toastPrimary'))}
          >
            {t('example.actions.primary')}
          </Button>
          <Button
            variant="soft"
            tone="warning"
            icon={renderIcon('alert-triangle', '#92400E')}
            onPress={() => toast.warning(t('example.actions.toastWarning'))}
          >
            {t('example.actions.warning')}
          </Button>
          <Button
            variant="outline"
            tone="danger"
            icon={renderIcon('trash-2', '#DC2626')}
            onPress={() => toast.error(t('example.actions.toastDanger'))}
          >
            {t('example.actions.danger')}
          </Button>
          <Button
            variant="ghost"
            tone="neutral"
            icon={renderIcon('send', theme.colors.onSurface)}
            onPress={() => toast.info(t('example.actions.toastGhost'))}
          >
            {t('example.actions.ghost')}
          </Button>
          <Button
            iconOnly
            shape="pill"
            accessibilityLabel={t('example.actions.refreshA11y')}
            icon={renderIcon('refresh-cw', '#FFFFFF')}
            onPress={() => toast.info(t('example.actions.refreshed'))}
          />
          <Button loading={busy} onPress={onBusyDemo}>
            {t('example.actions.sync')}
          </Button>
          <Button loading={centerBusy} loadingMode="overlay" onPress={onCenterBusyDemo}>
            {t('example.actions.centerLoad')}
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
  const { t } = useI18n();

  return (
    <Section
      eyebrow={t('example.forms.eyebrow')}
      title={t('example.forms.title')}
      subtitle={t('example.forms.subtitle')}
      accentColor="#0F9F6E"
    >
      <View style={styles.fieldStack}>
        <TextInput
          value={note}
          onChangeText={onNoteChange}
          placeholder={t('example.forms.placeholder')}
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
            <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>
              {t('example.forms.notifications')}
            </Text>
            <Text style={[styles.controlValue, { color: theme.colors.muted }]}>
              {enabled ? t('example.forms.enabled') : t('example.forms.disabled')}
            </Text>
          </View>
          <Switch
            checked={enabled}
            checkedLabel={t('example.forms.on')}
            uncheckedLabel={t('example.forms.off')}
            onChange={onEnabledChange}
          />
        </View>

        <View
          style={[
            styles.switchRow,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <View style={styles.switchCopy}>
            <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>
              {t('example.forms.deliveryLane')}
            </Text>
            <Text style={[styles.controlValue, { color: theme.colors.muted }]}>
              {t('example.forms.deliveryTone')}
            </Text>
          </View>
          <Switch
            defaultChecked
            size="lg"
            tone="success"
            checkedLabel={t('example.forms.live')}
            uncheckedLabel={t('example.forms.hold')}
          />
        </View>

        <View
          style={[
            styles.spinnerRow,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <LoadingSpinner size={wp(24)} color={theme.colors.primary} />
          <Text style={[styles.controlValue, { color: theme.colors.muted }]}>{t('example.forms.spinner')}</Text>
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
  const { t } = useI18n();

  return (
    <Section
      eyebrow={t('example.choice.eyebrow')}
      title={t('example.choice.title')}
      subtitle={t('example.choice.subtitle')}
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
            <Checkbox value="motion" label={t('example.choice.motionTokens')} />
            <Checkbox value="forms" label={t('example.choice.formControls')} />
            <Checkbox value="overlays" label={t('example.choice.overlayServices')} />
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
            <Radio itemValue="compact" label={t('example.choice.compact')} />
            <Radio itemValue="comfortable" label={t('example.choice.comfortable')} />
            <Radio itemValue="spacious" label={t('example.choice.spacious')} />
          </RadioGroup>
        </View>
      </View>
    </Section>
  );
});

export const SurfacesSection = React.memo(function SurfacesSection({ onOpenLinkedScroll }: { onOpenLinkedScroll: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  const sheetRef = React.useRef<BottomSheetRef>(null);

  const openSheet = React.useCallback(() => {
    void sheetRef.current?.present();
  }, []);

  const closeSheet = React.useCallback(() => {
    void sheetRef.current?.dismiss();
  }, []);

  return (
    <Section
      eyebrow={t('example.surfaces.eyebrow')}
      title={t('example.surfaces.title')}
      subtitle={t('example.surfaces.subtitle')}
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
            <AccordionTrigger title={t('example.surfaces.accordionState')} />
            <AccordionContent>
              <Text style={[styles.paragraph, { color: theme.colors.muted }]}>
                {t('example.surfaces.accordionStateBody')}
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
            <AccordionTrigger title={t('example.surfaces.accordionServices')} />
            <AccordionContent>
              <Text style={[styles.paragraph, { color: theme.colors.muted }]}>
                {t('example.surfaces.accordionServicesBody')}
              </Text>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <View style={[styles.linkedIntro, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.linkedIntroCopy}>
            <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>
              {t('example.surfaces.linkedTitle')}
            </Text>
            <Text style={[styles.linkedIntroText, { color: theme.colors.muted }]}>
              {t('example.surfaces.linkedBody')}
            </Text>
          </View>
          <Button icon={renderIcon('columns', '#FFFFFF', wp(17))} onPress={onOpenLinkedScroll}>
            {t('example.common.open')}
          </Button>
        </View>

        <View style={[styles.linkedIntro, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.linkedIntroCopy}>
            <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>
              {t('example.surfaces.sheetTitle')}
            </Text>
            <Text style={[styles.linkedIntroText, { color: theme.colors.muted }]}>
              {t('example.surfaces.sheetBody')}
            </Text>
          </View>
          <Button variant="outline" tone="neutral" icon={renderIcon('layers', theme.colors.onSurface, wp(17))} onPress={openSheet}>
            {t('example.common.sheet')}
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
            <Text style={[styles.sheetTitle, { color: theme.colors.onSurface }]}>
              {t('example.surfaces.sheetTitle')}
            </Text>
            <Text style={[styles.sheetSubtitle, { color: theme.colors.muted }]}>
              {t('example.surfaces.sheetSubtitle')}
            </Text>
          </View>
          <View style={styles.sheetGrid}>
            <View style={[styles.sheetSwatch, { backgroundColor: '#E8F7F1' }]}>
              <Text style={[styles.sheetSwatchLabel, { color: '#0F7A57' }]}>
                {t('example.surfaces.detent')}
              </Text>
              <Text style={[styles.sheetSwatchValue, { color: '#0F513F' }]}>auto</Text>
            </View>
            <View style={[styles.sheetSwatch, { backgroundColor: '#FFF1E7' }]}>
              <Text style={[styles.sheetSwatchLabel, { color: '#9A3412' }]}>
                {t('example.surfaces.max')}
              </Text>
              <Text style={[styles.sheetSwatchValue, { color: '#7C2D12' }]}>72%</Text>
            </View>
          </View>
          <Button block onPress={closeSheet}>
            {t('example.common.done')}
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
  const { t } = useI18n();
  const languageOptions = React.useMemo(
    () => [
      { id: 'en', title: t('example.language.en') },
      { id: 'zh', title: t('example.language.zh') },
      { id: 'ja', title: t('example.language.ja') },
    ],
    [t]
  );
  const workflowOptions = React.useMemo(
    () => [
      {
        id: 'design',
        title: t('example.workflow.design'),
        children: [
          { id: 'tokens', title: t('example.workflow.tokens') },
          { id: 'motion', title: t('example.workflow.motion') },
        ],
      },
      {
        id: 'ship',
        title: t('example.workflow.ship'),
        children: [
          { id: 'review', title: t('example.workflow.review') },
          { id: 'release', title: t('example.workflow.release') },
        ],
      },
    ],
    [t]
  );

  return (
    <Section
      eyebrow={t('example.pickers.eyebrow')}
      title={t('example.pickers.title')}
      subtitle={t('example.pickers.subtitle')}
      accentColor="#0891B2"
    >
      <View style={styles.fieldStack}>
        <Picker
          list={languageOptions}
          value={language}
          onValueChange={(next) => onLanguageChange(normalizePickerValue(next))}
          label={languageLabel}
          onLabelChange={onLanguageLabelChange}
          title={t('example.pickers.language')}
        >
          {({ label }) => (
            <FieldTrigger
              iconName="globe"
              label={t('example.pickers.language')}
              value={label || languageLabel || language}
            />
          )}
        </Picker>

        <Picker
          list={workflowOptions}
          value={workflow}
          onValueChange={onWorkflowChange}
          label={workflowLabel}
          onLabelChange={(next) => onWorkflowLabelChange(next.replace(/-/g, ' / '))}
          separator=" / "
          title={t('example.pickers.workflow')}
        >
          {({ label }) => (
            <FieldTrigger iconName="git-branch" label={t('example.pickers.workflow')} value={label || workflowLabel} />
          )}
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
  const { t } = useI18n();
  const [otaRunId, setOtaRunId] = React.useState(0);

  const handleCropImage = React.useCallback(async () => {
    try {
      const result = await imageCropper.pick({
        square: true,
        output: { maxWidth: 1024, maxHeight: 1024, compress: 0.92, format: 'jpeg' },
        texts: {
          title: t('example.services.cropperEdit'),
          confirm: t('example.common.use'),
          cancel: t('example.common.cancel'),
        },
      });

      if (result) {
        toast.success(t('example.services.cropperSuccess'), 1400);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('example.services.cropperFailed'), 1800);
    }
  }, [t]);

  const handleOtaSimulation = React.useCallback(() => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      setOtaRunId((current) => current + 1);
      return;
    }

    toast.info(t('example.services.otaRelease'), 1600);
  }, [t]);

  return (
    <Section
      eyebrow={t('example.services.eyebrow')}
      title={t('example.services.title')}
      subtitle={t('example.services.subtitle')}
      accentColor="#DB2777"
    >
      <View style={styles.serviceGrid}>
        <ServiceActionCard
          iconName="message-square"
          title={t('example.services.toastTitle')}
          subtitle={t('example.services.toastSubtitle')}
          color="#0F9F6E"
          buttonLabel={t('example.common.show')}
          onPress={() => toast.success(t('example.services.toastSaved'), 1400)}
        />
        <ServiceActionCard
          iconName="layers"
          title={t('example.services.dialogTitle')}
          subtitle={t('example.services.dialogSubtitle')}
          color="#2563EB"
          buttonLabel={t('example.common.open')}
          onPress={onDialog}
        />
        <ServiceActionCard
          iconName="loader"
          title={t('example.services.loadingTitle')}
          subtitle={t('example.services.loadingSubtitle')}
          color="#7C3AED"
          buttonLabel={t('example.common.run')}
          onPress={onLoading}
        />
        <ServiceActionCard
          iconName="list"
          title={t('example.services.pickerTitle')}
          subtitle={serviceChoice}
          color="#0891B2"
          buttonLabel={t('example.common.pick')}
          onPress={onGlobalPicker}
        />
        <ServiceActionCard
          iconName="camera"
          title={t('example.services.permissionTitle')}
          subtitle={t('example.services.permissionSubtitle')}
          color="#EB5A17"
          buttonLabel={t('example.common.show')}
          onPress={onPermissionPurpose}
        />
        <ServiceActionCard
          iconName="image"
          title={t('example.services.previewTitle')}
          subtitle={t('example.services.previewSubtitle')}
          color="#334155"
          buttonLabel={t('example.common.preview')}
          onPress={() => imagePreview.show({ images: previewImages })}
        />
        <ServiceActionCard
          iconName="crop"
          title={t('example.services.cropperTitle')}
          subtitle={t('example.services.cropperSubtitle')}
          color="#0F9F6E"
          buttonLabel={t('example.common.pick')}
          onPress={handleCropImage}
        />
        <ServiceActionCard
          iconName="shield"
          title={t('example.services.captchaTitle')}
          subtitle={t('example.services.captchaSubtitle')}
          color="#DB2777"
          buttonLabel={t('example.common.open')}
          onPress={onCaptchaOpen}
        />
        <ServiceActionCard
          iconName="terminal"
          title={t('example.services.debuggerTitle')}
          subtitle={t('example.services.debuggerSubtitle')}
          color={theme.colors.onSurface}
          buttonLabel={t('example.common.open')}
          onPress={onDebuggerOpen}
        />
        <ServiceActionCard
          iconName="download-cloud"
          title={t('example.services.otaTitle')}
          subtitle={t('example.services.otaSubtitle')}
          color="#2563EB"
          buttonLabel={t('example.common.run')}
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
  const { t } = useI18n();
  const phoneBrand = React.useMemo(() => getPhoneBrand(), []);
  const runtimeEnv = React.useMemo(() => {
    try {
      return getEnv('APP_ENV', 'local') || 'local';
    } catch {
      return t('example.tools.providerMissing');
    }
  }, [t]);

  const toolCards = React.useMemo(
    () => [
      { iconName: 'maximize' as const, label: 'wp(24)', value: `${Math.round(wp(24))} px`, color: '#2563EB' },
      { iconName: 'type' as const, label: 'sp(16)', value: `${Math.round(sp(16))} px`, color: '#7C3AED' },
      { iconName: 'smartphone' as const, label: t('example.tools.phoneBrand'), value: phoneBrand, color: '#0F9F6E' },
      { iconName: 'settings' as const, label: t('example.tools.fontCap'), value: `${getMaxFontScale()}x`, color: '#EB5A17' },
      { iconName: 'server' as const, label: t('example.tools.runtimeEnv'), value: runtimeEnv, color: '#0891B2' },
      { iconName: 'package' as const, label: t('example.tools.config'), value: t('example.tools.typedAccess'), color: '#334155' },
    ],
    [phoneBrand, runtimeEnv, t]
  );

  return (
    <Section
      eyebrow={t('example.tools.eyebrow')}
      title={t('example.tools.title')}
      subtitle={t('example.tools.subtitle')}
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
          {t('example.common.test')}
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
