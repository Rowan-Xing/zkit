import * as React from 'react';
import { View } from 'react-native';
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
  DatePicker,
  LoadingSpinner,
  Picker,
  Radio,
  RadioGroup,
  Switch,
  Text,
  TextInput,
  useTheme,
  imagePreview,
  toast,
  type PickerModelValue,
} from 'y2kit-ui';

import {
  languageOptions,
  previewImages,
  workflowOptions,
  type Density,
} from '../data';
import { normalizePickerValue, renderIcon } from '../demoUtils';
import { FieldTrigger } from '../components/FieldTrigger';
import { Section } from '../components/Section';
import { styles } from '../styles';

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
    <Section title="Buttons">
      <View style={styles.buttonGrid}>
        <Button icon={renderIcon('zap', '#FFFFFF')} onPress={() => toast.success('Primary')}>
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
    <Section title="Inputs">
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

        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>Notifications</Text>
            <Text style={[styles.controlValue, { color: theme.colors.muted }]}>
              {enabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          <Switch checked={enabled} onChange={onEnabledChange} />
        </View>

        <View style={styles.spinnerRow}>
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
    <Section title="Selection">
      <View style={styles.selectionGrid}>
        <View style={styles.selectionBlock}>
          <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>CheckboxGroup</Text>
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

        <View style={styles.selectionBlock}>
          <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>RadioGroup</Text>
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

export const AccordionSection = React.memo(function AccordionSection() {
  const theme = useTheme();

  return (
    <Section title="Accordion">
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
  );
});

export const LinkedScrollLaunchSection = React.memo(function LinkedScrollLaunchSection({
  onOpen,
}: {
  onOpen: () => void;
}) {
  const theme = useTheme();

  return (
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
        <Button icon={renderIcon('columns', '#FFFFFF', wp(17))} onPress={onOpen}>
          Open demo
        </Button>
      </View>
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
    <Section title="Pickers">
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
  onDialog: () => void;
  onGlobalPicker: () => void;
  onLoading: () => void;
  onPermissionPurpose: () => void;
};

export const ServicesSection = React.memo(function ServicesSection({
  serviceChoice,
  onCaptchaOpen,
  onDialog,
  onGlobalPicker,
  onLoading,
  onPermissionPurpose,
}: ServicesSectionProps) {
  const theme = useTheme();

  return (
    <Section title="Services">
      <View style={styles.buttonGrid}>
        <Button icon={renderIcon('message-square', '#FFFFFF')} onPress={() => toast.success('Saved with toast', 1400)}>
          Toast
        </Button>
        <Button variant="outline" tone="info" icon={renderIcon('layers', '#3B82F6')} onPress={onDialog}>
          Dialog
        </Button>
        <Button variant="soft" tone="success" icon={renderIcon('loader', '#047857')} onPress={onLoading}>
          Loading
        </Button>
        <Button
          variant="outline"
          tone="neutral"
          icon={renderIcon('list', theme.colors.onSurface)}
          onPress={onGlobalPicker}
        >
          {serviceChoice}
        </Button>
        <Button
          variant="soft"
          tone="warning"
          icon={renderIcon('camera', '#92400E')}
          onPress={onPermissionPurpose}
        >
          Permission
        </Button>
        <Button
          variant="outline"
          tone="neutral"
          icon={renderIcon('image', theme.colors.onSurface)}
          onPress={() => imagePreview.show({ images: previewImages })}
        >
          Preview
        </Button>
        <Button variant="ghost" tone="info" icon={renderIcon('shield', '#3B82F6')} onPress={onCaptchaOpen}>
          Captcha
        </Button>
      </View>
    </Section>
  );
});
