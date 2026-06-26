import * as React from 'react';
import { View } from 'react-native';
import {
  getDeviceBrand,
  getMaxFontSizeMultiplier,
  sp,
  tryGetRuntimeString,
  wp,
} from 'zkit-tools';
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
  Picker,
  Radio,
  RadioGroup,
  Switch,
  Text,
  TextInput,
  imagePreview,
  toast,
  useI18n,
  useTheme,
  type BottomSheetRef,
  type PickerValue,
} from 'zkit-ui';

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
    <View
      style={[
        styles.statusItem,
        { backgroundColor: '#F8FAFC', borderColor: theme.colors.border },
      ]}
    >
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
          <View style={styles.typeHeaderRow}>
            <Text style={[styles.typeLabel, { color: theme.colors.primary }]}>
              {t('example.foundation.displayLabel')}
            </Text>
            <View style={styles.typeHeaderLine} />
          </View>
          <Text style={[styles.typeDisplay, { color: theme.colors.onSurface }]}>
            {t('example.foundation.displayText')}
          </Text>
          <Text style={[styles.typeSubtitle, { color: theme.colors.muted }]}>
            {t('example.foundation.displaySubtitle')}
          </Text>
        </View>

        <View style={styles.examplePanelStack}>
          <View style={[styles.examplePanel, { backgroundColor: '#F8FAFC', borderColor: theme.colors.border }]}>
            <Text variant="heading" size="xl" weight="bold" style={{ color: theme.colors.onSurface }}>
              {t('example.foundation.sampleHeading')}
            </Text>
            <Text variant="body" size="md" tone="muted" truncate={2}>
              {t('example.foundation.sampleBody')}
            </Text>
            <Text variant="code" size="sm" color={theme.colors.primary}>
              {t('example.foundation.sampleCode')}
            </Text>
            <Text variant="caption" size="xs" tone="success" transform="uppercase">
              {t('example.foundation.sampleCaption')}
            </Text>
          </View>

          <View style={[styles.spinnerMatrix, { backgroundColor: '#FFFFFF', borderColor: theme.colors.border }]}>
            {[wp(16), wp(22), wp(30)].map((size) => (
              <View key={size} style={styles.spinnerExample}>
                <LoadingSpinner size={size} color={theme.colors.primary} />
                <Text style={[styles.controlValue, { color: theme.colors.muted }]}>
                  {Math.round(size)}px
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.statusStrip}>
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

        <View style={styles.actionDemoStack}>
          <View style={styles.actionDemoGroup}>
            <View style={styles.actionDemoGroupHeader}>
              <Text style={[styles.actionDemoGroupTitle, { color: theme.colors.muted }]}>
                {t('example.actions.groupCore')}
              </Text>
              <View style={[styles.actionDemoGroupRule, { backgroundColor: theme.colors.border }]} />
            </View>
            <View style={styles.actionDemoRow}>
              <View style={styles.actionDemoCell}>
                <Button
                  block
                  size="sm"
                  gradient={{ colors: ['#2563EB', '#0F9F6E'], direction: 'to right' }}
                  icon={renderIcon('zap', '#FFFFFF', wp(15))}
                  shadow="sm"
                  onPress={() => toast.success(t('example.actions.toastPrimary'))}
                >
                  {t('example.actions.primary')}
                </Button>
              </View>
              <View style={styles.actionDemoCell}>
                <Button
                  block
                  size="sm"
                  variant="soft"
                  tone="warning"
                  icon={renderIcon('alert-triangle', '#92400E', wp(15))}
                  onPress={() => toast.warning(t('example.actions.toastWarning'))}
                >
                  {t('example.actions.warning')}
                </Button>
              </View>
              <View style={styles.actionDemoCell}>
                <Button
                  block
                  size="sm"
                  variant="outline"
                  tone="danger"
                  icon={renderIcon('trash-2', '#DC2626', wp(15))}
                  onPress={() => toast.error(t('example.actions.toastDanger'))}
                >
                  {t('example.actions.danger')}
                </Button>
              </View>
            </View>
          </View>

          <View style={styles.actionDemoGroup}>
            <View style={styles.actionDemoGroupHeader}>
              <Text style={[styles.actionDemoGroupTitle, { color: theme.colors.muted }]}>
                {t('example.actions.groupState')}
              </Text>
              <View style={[styles.actionDemoGroupRule, { backgroundColor: theme.colors.border }]} />
            </View>
            <View style={styles.actionDemoRow}>
              <View style={styles.actionDemoCell}>
                <Button
                  block
                  variant="ghost"
                  tone="neutral"
                  icon={renderIcon('send', theme.colors.onSurface, wp(16))}
                  onPress={() => toast.info(t('example.actions.toastGhost'))}
                >
                  {t('example.actions.ghost')}
                </Button>
              </View>
              <View style={styles.actionDemoIconCell}>
                <Button
                  iconOnly
                  shape="pill"
                  accessibilityLabel={t('example.actions.refreshA11y')}
                  icon={renderIcon('refresh-cw', '#FFFFFF', wp(18))}
                  onPress={() => toast.info(t('example.actions.refreshed'))}
                />
              </View>
              <View style={styles.actionDemoCell}>
                <Button block loading={busy} onPress={onBusyDemo}>
                  {t('example.actions.sync')}
                </Button>
              </View>
            </View>
            <View style={styles.actionDemoRow}>
              <View style={styles.actionDemoFill}>
                <Button block loading={centerBusy} loadingMode="overlay" onPress={onCenterBusyDemo}>
                  {t('example.actions.centerLoad')}
                </Button>
              </View>
              <View style={styles.actionDemoCell}>
                <Button block disabled variant="solid" tone="neutral">
                  {t('example.actions.disabled')}
                </Button>
              </View>
            </View>
          </View>

          <View style={styles.actionDemoGroup}>
            <View style={styles.actionDemoGroupHeader}>
              <Text style={[styles.actionDemoGroupTitle, { color: theme.colors.muted }]}>
                {t('example.actions.groupSizes')}
              </Text>
              <View style={[styles.actionDemoGroupRule, { backgroundColor: theme.colors.border }]} />
            </View>
            <View style={styles.actionDemoRow}>
              <View style={styles.actionDemoCell}>
                <Button block size="xs" variant="solid" tone="primary">
                  {t('example.actions.sizeXs')}
                </Button>
              </View>
              <View style={styles.actionDemoCell}>
                <Button block size="sm" variant="soft" tone="success">
                  {t('example.actions.sizeSmSoft')}
                </Button>
              </View>
              <View style={styles.actionDemoCell}>
                <Button block size="md" variant="outline" tone="info">
                  {t('example.actions.sizeMdOutline')}
                </Button>
              </View>
            </View>
            <View style={styles.actionDemoRow}>
              <View style={styles.actionDemoCell}>
                <Button block size="lg" shape="pill" tone="neutral">
                  {t('example.actions.sizeLgPill')}
                </Button>
              </View>
              <View style={styles.actionDemoCell}>
                <Button
                  block
                  variant="link"
                  tone="info"
                  icon={renderIcon('external-link', theme.colors.primary, wp(16))}
                  iconPlacement="end"
                >
                  {t('example.actions.linkEndIcon')}
                </Button>
              </View>
            </View>
          </View>

          <View style={styles.actionDemoGroup}>
            <View style={styles.actionDemoGroupHeader}>
              <Text style={[styles.actionDemoGroupTitle, { color: theme.colors.muted }]}>
                {t('example.actions.groupCustom')}
              </Text>
              <View style={[styles.actionDemoGroupRule, { backgroundColor: theme.colors.border }]} />
            </View>
            <View style={styles.actionDemoRow}>
              <View style={styles.actionDemoCell}>
                <Button
                  block
                  variant="solid"
                  colors={{ background: '#111827', text: '#FFFFFF', loading: '#FFFFFF' }}
                  border={{ width: wp(1), color: '#111827' }}
                  layout={{
                    minHeight: wp(44),
                    paddingHorizontal: wp(14),
                    radius: wp(12),
                    textSize: sp(14),
                  }}
                >
                  {t('example.actions.customLayoutColors')}
                </Button>
              </View>
              <View style={styles.actionDemoCell}>
                <Button
                  block
                  shadow="md"
                  pressEffect="scale-highlight"
                  gradient={{ colors: ['#111827', theme.colors.primary], direction: 'to right' }}
                >
                  {t('example.actions.blockGradientShadow')}
                </Button>
              </View>
            </View>
          </View>
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

type FormDemoBlockProps = {
  title: string;
  caption: string;
  children: React.ReactNode;
};

const FormDemoBlock = React.memo(function FormDemoBlock({
  title,
  caption,
  children,
}: FormDemoBlockProps) {
  const theme = useTheme();

  return (
    <View style={styles.formBlock}>
      <View style={styles.formBlockHeader}>
        <Text style={[styles.formBlockTitle, { color: theme.colors.onSurface }]}>
          {title}
        </Text>
        <Text style={[styles.formBlockCaption, { color: theme.colors.muted }]}>
          {caption}
        </Text>
      </View>
      <View style={styles.formBlockBody}>{children}</View>
    </View>
  );
});

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
        <FormDemoBlock
          title={t('example.forms.inputGroupTitle')}
          caption={t('example.forms.inputGroupCaption')}
        >
          <TextInput
            defaultValue={t('example.forms.searchValue')}
            label={t('example.forms.searchLabel')}
            description={t('example.forms.searchDescription')}
            placeholder={t('example.forms.searchPlaceholder')}
            prefix={renderIcon('search', theme.colors.muted, wp(18))}
            clearable
            returnKeyType="search"
            inputMode="search"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            value={note}
            onChange={onNoteChange}
            label={t('example.forms.noteLabel')}
            description={t('example.forms.noteDescription')}
            placeholder={t('example.forms.placeholder')}
            clearable
            maxLength={120}
            returnKeyType="done"
            showCount
          />

          <TextInput
            defaultValue="128.00"
            label={t('example.forms.amountLabel')}
            description={t('example.forms.amountDescription')}
            prefix="$"
            suffix="USD"
            variant="filled"
            tone="success"
            keyboardType="decimal-pad"
            inputMode="decimal"
            clearable
          />
        </FormDemoBlock>

        <FormDemoBlock
          title={t('example.forms.feedbackGroupTitle')}
          caption={t('example.forms.feedbackGroupCaption')}
        >
          <TextInput
            defaultValue={t('example.forms.validationValue')}
            label={t('example.forms.validationLabel')}
            error={t('example.forms.validationError')}
            status="error"
            clearable
          />

          <TextInput
            defaultValue={t('example.forms.multilineValue')}
            label={t('example.forms.multilineLabel')}
            description={t('example.forms.multilineDescription')}
            variant="outline"
            status="warning"
            multiline
            minRows={3}
            maxRows={5}
            showCount
            maxLength={160}
          />
        </FormDemoBlock>

        <FormDemoBlock
          title={t('example.forms.stateGroupTitle')}
          caption={t('example.forms.stateGroupCaption')}
        >
          <View style={styles.dualColumnGrid}>
            <TextInput
              defaultValue={t('example.forms.readOnlyValue')}
              label={t('example.forms.readOnlyLabel')}
              readOnly
              variant="outline"
              size="sm"
              style={styles.dualColumnItem}
            />
            <TextInput
              defaultValue={t('example.forms.disabledValue')}
              label={t('example.forms.disabledLabel')}
              disabled
              variant="outline"
              size="sm"
              style={styles.dualColumnItem}
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
                {t('example.forms.notifications')}
              </Text>
              <Text style={[styles.controlValue, { color: theme.colors.muted }]}>
                {enabled ? t('example.forms.enabled') : t('example.forms.disabled')}
              </Text>
            </View>
            <Switch
              checked={enabled}
              stateText={{
                checked: t('example.forms.on'),
                unchecked: t('example.forms.off'),
              }}
              onCheckedChange={onEnabledChange}
            />
          </View>

          <View style={styles.switchOptionStack}>
            <Switch
              label={t('example.forms.switchSmallInfo')}
              description={t('example.forms.switchLabelPlacementEnd')}
              defaultChecked
              size="sm"
              tone="info"
              stateText={{
                checked: t('example.forms.switchOnShort'),
                unchecked: t('example.forms.switchOffShort'),
              }}
              contentStyle={styles.switchOptionContent}
              style={[
                styles.switchOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Switch
              label={t('example.forms.switchLoading')}
              description={t('example.forms.switchBusyState')}
              checked
              loading
              tone="warning"
              contentStyle={styles.switchOptionContent}
              style={[
                styles.switchOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Switch
              label={t('example.forms.switchDisabled')}
              description={t('example.forms.switchNotInteractive')}
              defaultChecked
              disabled
              contentStyle={styles.switchOptionContent}
              style={[
                styles.switchOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Switch
              label={t('example.forms.switchCustom')}
              defaultChecked
              colors={{
                checkedTrack: '#111827',
                thumb: '#FFFFFF',
                uncheckedTrack: '#CBD5E1',
              }}
              layout={{
                width: wp(58),
                height: wp(32),
                thumbInset: wp(4),
                textSize: wp(10),
              }}
              contentStyle={styles.switchOptionContent}
              style={[
                styles.switchOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
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
              stateText={{
                checked: t('example.forms.live'),
                unchecked: t('example.forms.hold'),
              }}
            />
          </View>

          <View
            style={[
              styles.spinnerRow,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <LoadingSpinner size={wp(24)} color={theme.colors.primary} />
            <Text style={[styles.controlValue, { color: theme.colors.muted }]}>
              {t('example.forms.spinner')}
            </Text>
          </View>
        </FormDemoBlock>
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
              {renderIcon('check-circle', '#4F46E5', wp(18))}
            </View>
            <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>{t('example.choice.checkboxStates')}</Text>
          </View>
          <View style={styles.dualColumnGrid}>
            <Checkbox defaultChecked label={t('example.choice.checked')} description={t('example.choice.defaultChecked')} tone="success" />
            <Checkbox defaultChecked="indeterminate" label={t('example.choice.indeterminate')} tone="warning" />
            <Checkbox label={t('example.choice.softLg')} size="lg" variant="soft" tone="info" shape="rounded" />
            <Checkbox
              defaultChecked
              disabled
              label={t('example.choice.disabled')}
              description={t('example.choice.lockedState')}
              labelPlacement="start"
            />
          </View>
        </View>

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
            onChange={onCheckedItemsChange}
            orientation="vertical"
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
            onChange={(next) => {
              if (next != null) onDensityChange(next);
            }}
            orientation="vertical"
            gap={wp(10)}
          >
            <Radio value="compact" label={t('example.choice.compact')} />
            <Radio value="comfortable" label={t('example.choice.comfortable')} />
            <Radio value="spacious" label={t('example.choice.spacious')} />
          </RadioGroup>
        </View>

        <View
          style={[
            styles.selectionBlock,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <View style={styles.selectionHeader}>
            <View style={[styles.selectionIcon, { backgroundColor: '#E8F7F1' }]}>
              {renderIcon('circle', '#0F9F6E', wp(18))}
            </View>
            <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>{t('example.choice.radioStates')}</Text>
          </View>
          <View style={styles.dualColumnGrid}>
            <Radio defaultChecked label={t('example.choice.checked')} description={t('example.choice.standalone')} tone="success" />
            <Radio label={t('example.choice.allowDeselect')} allowDeselect defaultChecked tone="info" />
            <Radio label={t('example.choice.softLg')} size="lg" variant="soft" tone="warning" />
            <Radio defaultChecked disabled label={t('example.choice.disabled')} labelPlacement="start" />
          </View>
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
    void sheetRef.current?.open();
  }, []);

  const closeSheet = React.useCallback(() => {
    void sheetRef.current?.close();
  }, []);

  return (
    <Section
      eyebrow={t('example.surfaces.eyebrow')}
      title={t('example.surfaces.title')}
      subtitle={t('example.surfaces.subtitle')}
      accentColor="#334155"
    >
      <View style={styles.surfaceGrid}>
        <Accordion defaultValue="state" itemGap={wp(10)} size="md" variant="card">
          <AccordionItem value="state">
            <AccordionTrigger title={t('example.surfaces.accordionState')} />
            <AccordionContent>
              <Text style={[styles.paragraph, { color: theme.colors.muted }]}>
                {t('example.surfaces.accordionStateBody')}
              </Text>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="services">
            <AccordionTrigger title={t('example.surfaces.accordionServices')} />
            <AccordionContent>
              <Text style={[styles.paragraph, { color: theme.colors.muted }]}>
                {t('example.surfaces.accordionServicesBody')}
              </Text>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Accordion
          type="multiple"
          defaultValue={['motion', 'mount']}
          itemGap={wp(8)}
          size="sm"
          tone="info"
          variant="filled"
          mountStrategy="lazy"
        >
          <AccordionItem value="motion">
            <AccordionTrigger title={t('example.surfaces.multipleLazyTitle')} description={t('example.surfaces.multipleLazyDescription')} />
            <AccordionContent>
              <Text style={[styles.paragraph, { color: theme.colors.muted }]}>
                {t('example.surfaces.multipleLazyBody')}
              </Text>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="mount">
            <AccordionTrigger title={t('example.surfaces.compactAccordionTitle')} description={t('example.surfaces.compactAccordionDescription')} />
            <AccordionContent>
              <Text style={[styles.paragraph, { color: theme.colors.muted }]}>
                {t('example.surfaces.compactAccordionBody')}
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
        detents={['content', 0.72]}
        backgroundColor={theme.colors.surface}
        handle={{
          width: wp(36),
          height: wp(4),
          topMargin: wp(10),
          radius: wp(2),
          color: theme.colors.border,
        }}
        maxHeight={wp(420)}
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
  workflow: PickerValue;
  workflowLabel: string;
  onAddressChange: (next: string[]) => void;
  onAddressLabelChange: (next: string) => void;
  onDateChange: (next: string) => void;
  onDateLabelChange: (next: string) => void;
  onLanguageChange: (next: string) => void;
  onLanguageLabelChange: (next: string) => void;
  onRangeChange: (next: string[]) => void;
  onWorkflowChange: (next: PickerValue) => void;
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
  const [month, setMonth] = React.useState('2026-04');
  const [monthLabel, setMonthLabel] = React.useState('2026-04');
  const languageOptions = React.useMemo(
    () => [
      { value: 'en', label: t('example.language.en') },
      { value: 'zh', label: t('example.language.zh') },
      { value: 'ja', label: t('example.language.ja') },
    ],
    [t]
  );
  const workflowOptions = React.useMemo(
    () => [
      {
        value: 'design',
        label: t('example.workflow.design'),
        children: [
          { value: 'tokens', label: t('example.workflow.tokens') },
          { value: 'motion', label: t('example.workflow.motion') },
        ],
      },
      {
        value: 'ship',
        label: t('example.workflow.ship'),
        children: [
          { value: 'review', label: t('example.workflow.review') },
          { value: 'release', label: t('example.workflow.release') },
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
          options={languageOptions}
          value={language}
          onChange={(next, selection) => {
            onLanguageChange(normalizePickerValue(next));
            onLanguageLabelChange(selection.label);
          }}
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
          options={workflowOptions}
          value={workflow}
          onChange={(next, selection) => {
            onWorkflowChange(next);
            onWorkflowLabelChange(selection.label.replace(/-/g, ' / '));
          }}
          separator=" / "
          title={t('example.pickers.workflow')}
        >
          {({ label }) => (
            <FieldTrigger iconName="git-branch" label={t('example.pickers.workflow')} value={label || workflowLabel} />
          )}
        </Picker>

        <DatePicker
          value={date}
          onChange={(next, selection) => {
            onDateChange(next);
            onDateLabelChange(selection.label);
          }}
          min="2024-01-01"
          max="2030-12-31"
        >
          {({ label, placeholder }) => (
            <FieldTrigger iconName="calendar" label="DatePicker" value={label || dateLabel || placeholder} />
          )}
        </DatePicker>

        <DatePicker
          value={month}
          onChange={(next, selection) => {
            setMonth(String(next ?? ''));
            setMonthLabel(selection.label);
          }}
          precision="month"
          min="2024-01"
          max="2030-12"
          title={t('example.pickers.monthPrecision')}
          labelFormat={(selection) =>
            `${selection.parts.year}-${String(selection.parts.month ?? 1).padStart(2, '0')}`
          }
        >
          {({ label, placeholder }) => (
            <FieldTrigger iconName="calendar" label={t('example.pickers.monthLabel')} value={label || monthLabel || placeholder} />
          )}
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
  const { t } = useI18n();

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
          onPress={() => toast.success(t('example.services.toastSaved'), { duration: 1400 })}
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
          onPress={() => imagePreview.open({ images: previewImages })}
        />
        <ServiceActionCard
          iconName="shield"
          title={t('example.services.captchaTitle')}
          subtitle={t('example.services.captchaSubtitle')}
          color="#DB2777"
          buttonLabel={t('example.common.open')}
          onPress={onCaptchaOpen}
        />
      </View>
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
  const phoneBrand = React.useMemo(() => getDeviceBrand(), []);
  const runtimeEnv = React.useMemo(() => {
    try {
      return tryGetRuntimeString('APP_ENV', 'local') || 'local';
    } catch {
      return t('example.tools.providerMissing');
    }
  }, [t]);

  const toolCards = React.useMemo(
    () => [
      { iconName: 'maximize' as const, label: 'wp(24)', value: `${Math.round(wp(24))} px`, color: '#2563EB' },
      { iconName: 'type' as const, label: 'sp(16)', value: `${Math.round(sp(16))} px`, color: '#7C3AED' },
      { iconName: 'smartphone' as const, label: t('example.tools.phoneBrand'), value: phoneBrand, color: '#0F9F6E' },
      { iconName: 'settings' as const, label: t('example.tools.fontCap'), value: `${getMaxFontSizeMultiplier()}x`, color: '#EB5A17' },
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
