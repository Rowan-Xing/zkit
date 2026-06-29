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
  type CheckboxCheckedState,
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

type TextInputSectionProps = {
  note: string;
  onNoteChange: (next: string) => void;
};

type SwitchSectionProps = {
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
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

export const TextInputSection = React.memo(function TextInputSection({
  note,
  onNoteChange,
}: TextInputSectionProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const handleClear = React.useCallback(() => {
    toast.info(t('example.textInput.clearToast'));
  }, [t]);
  const handleSubmit = React.useCallback(
    (next: string) => {
      toast.info(`${t('example.textInput.submitToast')} ${next || '-'}`);
    },
    [t]
  );

  return (
    <Section
      eyebrow={t('example.textInput.eyebrow')}
      title={t('example.textInput.title')}
      subtitle={t('example.textInput.subtitle')}
    >
      <View style={styles.fieldStack}>
        <FormDemoBlock
          title={t('example.textInput.valueGroupTitle')}
          caption={t('example.textInput.valueGroupCaption')}
        >
          <TextInput
            defaultValue={t('example.textInput.searchValue')}
            label={t('example.textInput.searchLabel')}
            description={t('example.textInput.searchDescription')}
            placeholder={t('example.textInput.searchPlaceholder')}
            prefix={renderIcon('search', theme.colors.muted, wp(18))}
            clearable
            onClear={handleClear}
            returnKeyType="search"
            inputMode="search"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            value={note}
            onChange={onNoteChange}
            label={t('example.textInput.noteLabel')}
            labelAction={
              <Text variant="caption" tone="muted">
                {t('example.textInput.labelAction')}
              </Text>
            }
            description={t('example.textInput.noteDescription')}
            placeholder={t('example.textInput.placeholder')}
            clearable
            maxLength={120}
            required
            returnKeyType="done"
            showCount
          />

          <TextInput
            defaultValue="https://zkit.local"
            label={t('example.textInput.submitLabel')}
            description={t('example.textInput.submitDescription')}
            prefix={renderIcon('send', theme.colors.muted, wp(18))}
            placeholder={t('example.textInput.submitPlaceholder')}
            inputMode="url"
            returnKeyType="send"
            onSubmit={handleSubmit}
            clearable
          />
        </FormDemoBlock>

        <FormDemoBlock
          title={t('example.textInput.affixGroupTitle')}
          caption={t('example.textInput.affixGroupCaption')}
        >
          <TextInput
            defaultValue="128.00"
            label={t('example.textInput.amountLabel')}
            description={t('example.textInput.amountDescription')}
            prefix="$"
            suffix="USD"
            variant="filled"
            tone="success"
            keyboardType="decimal-pad"
            inputMode="decimal"
            clearable
          />

          <View style={styles.dualColumnGrid}>
            <TextInput
              defaultValue={t('example.textInput.filledValue')}
              label={t('example.textInput.filledLabel')}
              description={t('example.textInput.filledDescription')}
              variant="filled"
              tone="info"
              size="sm"
              style={styles.dualColumnItem}
            />
            <TextInput
              defaultValue={t('example.textInput.plainValue')}
              label={t('example.textInput.plainLabel')}
              description={t('example.textInput.plainDescription')}
              variant="plain"
              status="warning"
              size="sm"
              style={styles.dualColumnItem}
            />
          </View>

          <TextInput
            defaultValue={t('example.textInput.customValue')}
            label={t('example.textInput.customLabel')}
            description={t('example.textInput.customDescription')}
            color="info"
            colors={{
              background: '#EFF6FF',
              border: '#93C5FD',
              icon: '#2563EB',
              text: '#0F172A',
            }}
            layout={{
              minHeight: wp(52),
              radius: wp(16),
              paddingHorizontal: wp(16),
              textSize: wp(16),
            }}
            prefix={renderIcon('sliders', '#2563EB', wp(18))}
            clearable
          />

          <TextInput
            defaultValue={t('example.textInput.styleSlotValue')}
            label={t('example.textInput.styleSlotLabel')}
            description={t('example.textInput.styleSlotDescription')}
            prefix={renderIcon('edit-3', '#2563EB', wp(16))}
            suffix="VIP"
            clearable
            clearIcon={renderIcon('x-circle', '#2563EB', wp(16))}
            clearAccessibilityLabel={t('example.textInput.clearA11y')}
            maxLength={72}
            showCount
            fieldStyle={{ borderStyle: 'dashed' }}
            inputStyle={{ fontWeight: '700' }}
            labelStyle={{ color: '#1D4ED8' }}
            descriptionStyle={{ color: '#2563EB' }}
            countStyle={{ color: '#1D4ED8' }}
            prefixStyle={{
              backgroundColor: '#DBEAFE',
              borderRadius: wp(10),
              padding: wp(4),
            }}
            suffixStyle={{
              backgroundColor: '#DBEAFE',
              borderRadius: wp(10),
              paddingHorizontal: wp(8),
              paddingVertical: wp(3),
            }}
            clearButtonStyle={{ backgroundColor: '#DBEAFE' }}
          />
        </FormDemoBlock>

        <FormDemoBlock
          title={t('example.textInput.feedbackGroupTitle')}
          caption={t('example.textInput.feedbackGroupCaption')}
        >
          <TextInput
            defaultValue={t('example.textInput.validationValue')}
            label={t('example.textInput.validationLabel')}
            error={t('example.textInput.validationError')}
            status="error"
            clearable
            errorStyle={{ fontWeight: '800' }}
          />

          <View style={styles.dualColumnGrid}>
            <TextInput
              defaultValue={t('example.textInput.successValue')}
              label={t('example.textInput.successLabel')}
              description={t('example.textInput.successDescription')}
              status="success"
              size="sm"
              style={styles.dualColumnItem}
            />
            <TextInput
              defaultValue={t('example.textInput.invalidValue')}
              label={t('example.textInput.invalidLabel')}
              description={t('example.textInput.invalidDescription')}
              invalid
              size="sm"
              style={styles.dualColumnItem}
            />
          </View>

          <TextInput
            defaultValue={t('example.textInput.multilineValue')}
            label={t('example.textInput.multilineLabel')}
            description={t('example.textInput.multilineDescription')}
            variant="outline"
            status="warning"
            multiline
            minRows={3}
            maxRows={5}
            renderCount={({ count, maxLength }) =>
              `${count}${t('example.textInput.countUnit')}${maxLength ? ` / ${maxLength}` : ''}`
            }
            maxLength={160}
          />
        </FormDemoBlock>

        <FormDemoBlock
          title={t('example.textInput.stateGroupTitle')}
          caption={t('example.textInput.stateGroupCaption')}
        >
          <View style={styles.dualColumnGrid}>
            <TextInput
              defaultValue={t('example.textInput.readOnlyValue')}
              label={t('example.textInput.readOnlyLabel')}
              readOnly
              variant="outline"
              size="sm"
              style={styles.dualColumnItem}
            />
            <TextInput
              defaultValue={t('example.textInput.disabledValue')}
              label={t('example.textInput.disabledLabel')}
              disabled
              variant="outline"
              size="sm"
              style={styles.dualColumnItem}
            />
          </View>

          <View style={styles.dualColumnGrid}>
            <TextInput
              defaultValue={t('example.textInput.smallValue')}
              label={t('example.textInput.smallLabel')}
              size="sm"
              style={styles.dualColumnItem}
            />
            <TextInput
              defaultValue={t('example.textInput.largeValue')}
              label={t('example.textInput.largeLabel')}
              size="lg"
              style={styles.dualColumnItem}
            />
          </View>
        </FormDemoBlock>
      </View>
    </Section>
  );
});

export const SwitchSection = React.memo(function SwitchSection({
  enabled,
  onEnabledChange,
}: SwitchSectionProps) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <Section
      eyebrow={t('example.switch.eyebrow')}
      title={t('example.switch.title')}
      subtitle={t('example.switch.subtitle')}
    >
      <View style={styles.fieldStack}>
        <FormDemoBlock
          title={t('example.switch.stateGroupTitle')}
          caption={t('example.switch.stateGroupCaption')}
        >
          <View
            style={[
              styles.switchRow,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.switchCopy}>
              <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>
                {t('example.switch.notifications')}
              </Text>
              <Text style={[styles.controlValue, { color: theme.colors.muted }]}>
                {enabled ? t('example.switch.enabled') : t('example.switch.disabled')}
              </Text>
            </View>
            <Switch
              checked={enabled}
              stateText={{
                checked: t('example.switch.on'),
                unchecked: t('example.switch.off'),
              }}
              onCheckedChange={onEnabledChange}
            />
          </View>

          <View style={styles.switchOptionStack}>
            <Switch
              label={t('example.switch.defaultLabel')}
              description={t('example.switch.defaultDescription')}
              defaultChecked
              contentStyle={styles.switchOptionContent}
              style={[
                styles.switchOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Switch
              label={t('example.switch.uncheckedLabel')}
              description={t('example.switch.uncheckedDescription')}
              defaultChecked={false}
              contentStyle={styles.switchOptionContent}
              style={[
                styles.switchOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
          </View>
        </FormDemoBlock>

        <FormDemoBlock
          title={t('example.switch.sizeGroupTitle')}
          caption={t('example.switch.sizeGroupCaption')}
        >
          <View style={styles.switchOptionStack}>
            <Switch
              label={t('example.switch.smallInfo')}
              description={t('example.switch.smallInfoDescription')}
              defaultChecked
              size="sm"
              tone="info"
              stateText={{
                checked: t('example.switch.onShort'),
                unchecked: t('example.switch.offShort'),
              }}
              contentStyle={styles.switchOptionContent}
              style={[
                styles.switchOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Switch
              label={t('example.switch.successLarge')}
              description={t('example.switch.successLargeDescription')}
              defaultChecked
              size="lg"
              tone="success"
              stateText={{
                checked: t('example.switch.live'),
                unchecked: t('example.switch.hold'),
              }}
              contentStyle={styles.switchOptionContent}
              style={[
                styles.switchOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Switch
              label={t('example.switch.warningTone')}
              description={t('example.switch.warningToneDescription')}
              defaultChecked
              tone="warning"
              contentStyle={styles.switchOptionContent}
              style={[
                styles.switchOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Switch
              label={t('example.switch.dangerTone')}
              description={t('example.switch.dangerToneDescription')}
              defaultChecked
              tone="danger"
              contentStyle={styles.switchOptionContent}
              style={[
                styles.switchOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
          </View>
        </FormDemoBlock>

        <FormDemoBlock
          title={t('example.switch.contentGroupTitle')}
          caption={t('example.switch.contentGroupCaption')}
        >
          <View
            style={[
              styles.switchRow,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.switchCopy}>
              <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>
                {t('example.switch.labelEnd')}
              </Text>
              <Text style={[styles.controlValue, { color: theme.colors.muted }]}>
                {t('example.switch.labelEndDescription')}
              </Text>
            </View>
            <Switch
              defaultChecked
              label={t('example.switch.labelEndInline')}
              labelPlacement="end"
              tone="info"
              stateText={{
                checked: t('example.switch.onShort'),
                unchecked: t('example.switch.offShort'),
              }}
            />
          </View>

          <Switch
            defaultChecked
            tone="neutral"
            contentStyle={styles.switchOptionContent}
            style={[
              styles.switchOption,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            {({ checked }) => (
              <View style={styles.switchCustomContent}>
                <View
                  style={[
                    styles.switchCustomBadge,
                    { backgroundColor: checked ? theme.colors.primary : theme.colors.border },
                  ]}
                />
                <View style={styles.switchCustomCopy}>
                  <Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>
                    {t('example.switch.renderPropLabel')}
                  </Text>
                  <Text style={[styles.controlValue, { color: theme.colors.muted }]}>
                    {checked ? t('example.switch.renderPropOn') : t('example.switch.renderPropOff')}
                  </Text>
                </View>
              </View>
            )}
          </Switch>
        </FormDemoBlock>

        <FormDemoBlock
          title={t('example.switch.busyGroupTitle')}
          caption={t('example.switch.busyGroupCaption')}
        >
          <View style={styles.switchOptionStack}>
            <Switch
              label={t('example.switch.loading')}
              description={t('example.switch.busyState')}
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
              label={t('example.switch.customLoading')}
              description={t('example.switch.customLoadingDescription')}
              checked
              loading
              loadingIndicator={renderIcon('loader', theme.colors.primary, wp(13))}
              colors={{ loading: theme.colors.primary }}
              contentStyle={styles.switchOptionContent}
              style={[
                styles.switchOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Switch
              label={t('example.switch.disabledChecked')}
              description={t('example.switch.notInteractive')}
              defaultChecked
              disabled
              contentStyle={styles.switchOptionContent}
              style={[
                styles.switchOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Switch
              label={t('example.switch.disabledUnchecked')}
              description={t('example.switch.notInteractive')}
              disabled
              contentStyle={styles.switchOptionContent}
              style={[
                styles.switchOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
          </View>
        </FormDemoBlock>

        <FormDemoBlock
          title={t('example.switch.customGroupTitle')}
          caption={t('example.switch.customGroupCaption')}
        >
          <View style={styles.switchOptionStack}>
            <Switch
              label={t('example.switch.colorOverride')}
              description={t('example.switch.colorOverrideDescription')}
              defaultChecked
              color="#7C3AED"
              colors={{
                uncheckedTrack: '#DDD6FE',
                checkedText: '#FFFFFF',
                uncheckedText: '#5B21B6',
                focusRing: '#DDD6FE',
              }}
              stateText={{
                checked: t('example.switch.onShort'),
                unchecked: t('example.switch.offShort'),
              }}
              duration={320}
              contentStyle={styles.switchOptionContent}
              style={[
                styles.switchOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Switch
              label={t('example.switch.layoutOverride')}
              description={t('example.switch.layoutOverrideDescription')}
              defaultChecked
              colors={{
                checkedTrack: '#111827',
                thumb: '#FFFFFF',
                uncheckedTrack: '#CBD5E1',
              }}
              layout={{
                width: wp(70),
                height: wp(34),
                thumbInset: wp(4),
                radius: wp(16),
                textSize: wp(10),
                textLineHeight: wp(12),
              }}
              stateText={{
                checked: t('example.switch.live'),
                unchecked: t('example.switch.hold'),
              }}
              stateTextStyle={{ fontWeight: '800' }}
              trackStyle={{ borderWidth: wp(1), borderColor: '#94A3B8' }}
              thumbStyle={{ shadowOpacity: 0.2 }}
              contentStyle={styles.switchOptionContent}
              style={[
                styles.switchOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Switch
              label={t('example.switch.textStyleOverride')}
              description={t('example.switch.textStyleOverrideDescription')}
              defaultChecked
              tone="info"
              labelStyle={{ color: '#1D4ED8', fontWeight: '900' }}
              descriptionStyle={{ color: '#2563EB' }}
              accessibilityState={{ expanded: true }}
              contentStyle={styles.switchOptionContent}
              style={[
                styles.switchOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
          </View>
        </FormDemoBlock>
      </View>
    </Section>
  );
});

type CheckboxSectionProps = {
  checkedItems: string[];
  onCheckedItemsChange: (next: string[]) => void;
};

type RadioSectionProps = {
  density: Density;
  onDensityChange: (next: Density) => void;
};

const CHECKBOX_GROUP_VALUES = ['motion', 'forms', 'overlays'] as const;

type ChoiceCaseCardProps = {
  iconName: FeatherIconName;
  iconColor: string;
  iconBackground: string;
  title: string;
  caption: string;
  children: React.ReactNode;
};

const ChoiceCaseCard = React.memo(function ChoiceCaseCard({
  iconName,
  iconColor,
  iconBackground,
  title,
  caption,
  children,
}: ChoiceCaseCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.choiceCaseCard,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <View style={styles.choiceCaseHeader}>
        <View style={[styles.choiceCaseIcon, { backgroundColor: iconBackground }]}>
          {renderIcon(iconName, iconColor, wp(18))}
        </View>
        <View style={styles.choiceCaseCopy}>
          <Text style={[styles.choiceCaseTitle, { color: theme.colors.onSurface }]}>{title}</Text>
          <Text numberOfLines={2} style={[styles.choiceCaseCaption, { color: theme.colors.muted }]}>
            {caption}
          </Text>
        </View>
      </View>
      <View style={styles.choiceCaseBody}>{children}</View>
    </View>
  );
});

export const CheckboxSection = React.memo(function CheckboxSection({
  checkedItems,
  onCheckedItemsChange,
}: CheckboxSectionProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const [controlledState, setControlledState] = React.useState<CheckboxCheckedState>('indeterminate');
  const selectedCount = checkedItems.length;
  const checkboxGroupState: CheckboxCheckedState =
    selectedCount === 0
      ? false
      : selectedCount === CHECKBOX_GROUP_VALUES.length
        ? true
        : 'indeterminate';
  const handleSelectAllChange = React.useCallback(
    (next: CheckboxCheckedState) => {
      onCheckedItemsChange(next === false ? [] : [...CHECKBOX_GROUP_VALUES]);
    },
    [onCheckedItemsChange]
  );

  return (
    <Section
      eyebrow={t('example.checkbox.eyebrow')}
      title={t('example.checkbox.title')}
      subtitle={t('example.checkbox.subtitle')}
    >
      <View style={styles.selectionGrid}>
        <ChoiceCaseCard
          iconName="check-circle"
          iconColor="#7C3AED"
          iconBackground="#F3E8FF"
          title={t('example.checkbox.stateTitle')}
          caption={t('example.checkbox.stateCaption')}
        >
          <View style={styles.choiceOptionStack}>
            <Checkbox
              checked={controlledState}
              onChange={setControlledState}
              label={t('example.checkbox.controlled')}
              description={t('example.checkbox.controlledDescription')}
              tone="primary"
              style={[
                styles.choiceOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Checkbox
              defaultChecked
              label={t('example.checkbox.defaultChecked')}
              description={t('example.checkbox.defaultCheckedDescription')}
              tone="success"
              style={[
                styles.choiceOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Checkbox
              defaultChecked="indeterminate"
              label={t('example.checkbox.defaultIndeterminate')}
              description={t('example.checkbox.defaultIndeterminateDescription')}
              tone="warning"
              style={[
                styles.choiceOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Checkbox
              label={t('example.checkbox.unchecked')}
              description={t('example.checkbox.uncheckedDescription')}
              variant="outline"
              style={[
                styles.choiceOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Checkbox
              defaultChecked
              disabled
              label={t('example.checkbox.disabled')}
              description={t('example.checkbox.disabledDescription')}
              labelPlacement="start"
              style={[
                styles.choiceOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
          </View>
        </ChoiceCaseCard>

        <ChoiceCaseCard
          iconName="sliders"
          iconColor="#2563EB"
          iconBackground="#DBEAFE"
          title={t('example.checkbox.visualTitle')}
          caption={t('example.checkbox.visualCaption')}
        >
          <View style={styles.choiceOptionStack}>
            <Checkbox
              defaultChecked
              label={t('example.checkbox.solidCircle')}
              description={t('example.checkbox.solidCircleDescription')}
              variant="solid"
              tone="primary"
              shape="circle"
              style={[
                styles.choiceOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Checkbox
              defaultChecked
              label={t('example.checkbox.outlineSquare')}
              description={t('example.checkbox.outlineSquareDescription')}
              variant="outline"
              tone="danger"
              shape="square"
              style={[
                styles.choiceOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Checkbox
              label={t('example.checkbox.softLarge')}
              description={t('example.checkbox.softLargeDescription')}
              size="lg"
              variant="soft"
              tone="info"
              shape="rounded"
              style={[
                styles.choiceOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Checkbox
              defaultChecked
              label={t('example.checkbox.trailingLabel')}
              description={t('example.checkbox.trailingLabelDescription')}
              labelPlacement="start"
              tone="neutral"
              style={[
                styles.choiceOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
          </View>
        </ChoiceCaseCard>

        <ChoiceCaseCard
          iconName="check-square"
          iconColor="#4F46E5"
          iconBackground="#EEF2FF"
          title="CheckboxGroup"
          caption={t('example.checkbox.groupCaption')}
        >
          <Checkbox
            checked={checkboxGroupState}
            onChange={handleSelectAllChange}
            label={t('example.checkbox.selectAll')}
            description={t('example.checkbox.selectAllDescription')}
            tone="primary"
            style={[
              styles.choiceOption,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          />
          <CheckboxGroup
            value={checkedItems}
            onChange={onCheckedItemsChange}
            orientation="vertical"
            gap={wp(10)}
            variant="soft"
            tone="primary"
            shape="rounded"
          >
            <Checkbox
              value="motion"
              label={t('example.checkbox.motionTokens')}
              description={t('example.checkbox.groupItemPrimary')}
              style={[
                styles.choiceOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Checkbox
              value="forms"
              label={t('example.checkbox.formControls')}
              description={t('example.checkbox.groupItemOverride')}
              tone="success"
              style={[
                styles.choiceOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Checkbox
              value="overlays"
              label={t('example.checkbox.overlayServices')}
              description={t('example.checkbox.groupItemDisabled')}
              disabled
              style={[
                styles.choiceOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
          </CheckboxGroup>
          <CheckboxGroup
            defaultValue={['audit']}
            orientation="horizontal"
            wrap
            gap={wp(12)}
            rowGap={wp(10)}
            align="center"
            size="sm"
            variant="outline"
            tone="info"
          >
            <Checkbox value="audit" label={t('example.checkbox.uncontrolledAudit')} />
            <Checkbox value="release" label={t('example.checkbox.uncontrolledRelease')} />
            <Checkbox value="report" label={t('example.checkbox.uncontrolledReport')} />
          </CheckboxGroup>
          <CheckboxGroup
            defaultValue={['locked']}
            disabled
            orientation="vertical"
            gap={wp(8)}
            variant="soft"
            tone="neutral"
          >
            <Checkbox value="locked" label={t('example.checkbox.disabledGroupItem')} description={t('example.checkbox.disabledGroupDescription')} />
          </CheckboxGroup>
        </ChoiceCaseCard>

        <ChoiceCaseCard
          iconName="layers"
          iconColor="#7C3AED"
          iconBackground="#F3E8FF"
          title={t('example.checkbox.customTitle')}
          caption={t('example.checkbox.customCaption')}
        >
          <Checkbox defaultChecked showIndicator={false}>
            {({ checked }) => (
              <View
                style={[
                  styles.choiceCustomOption,
                  {
                    backgroundColor: checked ? '#F3E8FF' : '#F8FAFC',
                    borderColor: checked ? '#7C3AED' : theme.colors.border,
                  },
                ]}
              >
                <View style={[styles.choiceCustomDot, { backgroundColor: checked ? '#7C3AED' : '#CBD5E1' }]} />
                <View style={styles.choiceCustomCopy}>
                  <Text style={[styles.choiceCustomTitle, { color: theme.colors.onSurface }]}>
                    {t('example.checkbox.customCard')}
                  </Text>
                  <Text style={[styles.choiceCustomText, { color: theme.colors.muted }]}>
                    {t('example.checkbox.customCardDescription')}
                  </Text>
                </View>
              </View>
            )}
          </Checkbox>
          <Checkbox
            defaultChecked
            label={t('example.checkbox.customIndicator')}
            description={t('example.checkbox.customIndicatorDescription')}
            color="#7C3AED"
            colors={{
              checkedBackground: '#7C3AED',
              checkedBorder: '#7C3AED',
              uncheckedBorder: '#A78BFA',
              focusRing: '#DDD6FE',
            }}
            layout={{
              indicatorSize: wp(28),
              indicatorRadius: wp(10),
              indicatorIconSize: wp(16),
              gap: wp(12),
            }}
            duration={320}
            indicator={renderIcon('star', '#FFFFFF', wp(14))}
            indicatorStyle={{ shadowOpacity: 0.18 }}
            labelStyle={{ color: '#5B21B6', fontWeight: '900' }}
            descriptionStyle={{ color: '#6D28D9' }}
            accessibilityState={{ expanded: true }}
            style={[
              styles.choiceOption,
              { backgroundColor: '#F5F3FF', borderColor: '#C4B5FD' },
            ]}
          />
        </ChoiceCaseCard>
      </View>
    </Section>
  );
});

export const RadioSection = React.memo(function RadioSection({
  density,
  onDensityChange,
}: RadioSectionProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const [standaloneChecked, setStandaloneChecked] = React.useState(true);

  return (
    <Section
      eyebrow={t('example.radio.eyebrow')}
      title={t('example.radio.title')}
      subtitle={t('example.radio.subtitle')}
    >
      <View style={styles.selectionGrid}>
        <ChoiceCaseCard
          iconName="circle"
          iconColor="#0891B2"
          iconBackground="#E0F2FE"
          title={t('example.radio.stateTitle')}
          caption={t('example.radio.stateCaption')}
        >
          <View style={styles.choiceOptionStack}>
            <Radio
              checked={standaloneChecked}
              onChange={setStandaloneChecked}
              label={t('example.radio.controlled')}
              description={t('example.radio.controlledDescription')}
              tone="primary"
              style={[
                styles.choiceOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Radio
              defaultChecked
              label={t('example.radio.defaultChecked')}
              description={t('example.radio.defaultCheckedDescription')}
              tone="success"
              style={[
                styles.choiceOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Radio
              defaultChecked
              allowDeselect
              label={t('example.radio.allowDeselect')}
              description={t('example.radio.allowDeselectDescription')}
              tone="info"
              style={[
                styles.choiceOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Radio
              defaultChecked
              disabled
              label={t('example.radio.disabled')}
              description={t('example.radio.disabledDescription')}
              labelPlacement="start"
              style={[
                styles.choiceOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
          </View>
        </ChoiceCaseCard>

        <ChoiceCaseCard
          iconName="disc"
          iconColor="#0F9F6E"
          iconBackground="#E8F7F1"
          title="RadioGroup"
          caption={t('example.radio.groupCaption')}
        >
          <RadioGroup<Density>
            value={density}
            onChange={(next) => {
              if (next != null) onDensityChange(next);
            }}
            orientation="vertical"
            gap={wp(10)}
            variant="soft"
            tone="success"
          >
            <Radio
              value="compact"
              label={t('example.radio.compact')}
              description={t('example.radio.compactDescription')}
              style={[
                styles.choiceOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Radio
              value="comfortable"
              label={t('example.radio.comfortable')}
              description={t('example.radio.comfortableDescription')}
              style={[
                styles.choiceOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Radio
              value="spacious"
              label={t('example.radio.spacious')}
              description={t('example.radio.spaciousDescription')}
              tone="info"
              style={[
                styles.choiceOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
          </RadioGroup>
          <RadioGroup
            defaultValue="sync"
            allowDeselect
            orientation="horizontal"
            wrap
            gap={wp(12)}
            rowGap={wp(10)}
            align="center"
            size="sm"
            variant="outline"
            tone="info"
          >
            <Radio value="sync" label={t('example.radio.uncontrolledSync')} />
            <Radio value="manual" label={t('example.radio.uncontrolledManual')} />
            <Radio value="off" label={t('example.radio.uncontrolledOff')} />
          </RadioGroup>
          <RadioGroup
            defaultValue="locked"
            disabled
            orientation="vertical"
            gap={wp(8)}
            variant="soft"
            tone="neutral"
          >
            <Radio value="locked" label={t('example.radio.disabledGroupItem')} description={t('example.radio.disabledGroupDescription')} />
          </RadioGroup>
        </ChoiceCaseCard>

        <ChoiceCaseCard
          iconName="sliders"
          iconColor="#D97706"
          iconBackground="#FEF3C7"
          title={t('example.radio.visualTitle')}
          caption={t('example.radio.visualCaption')}
        >
          <View style={styles.choiceOptionStack}>
            <Radio
              defaultChecked
              label={t('example.radio.solidSuccess')}
              description={t('example.radio.solidSuccessDescription')}
              variant="solid"
              tone="success"
              style={[
                styles.choiceOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Radio
              label={t('example.radio.outlineDanger')}
              description={t('example.radio.outlineDangerDescription')}
              variant="outline"
              tone="danger"
              style={[
                styles.choiceOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Radio
              defaultChecked
              label={t('example.radio.softLarge')}
              description={t('example.radio.softLargeDescription')}
              size="lg"
              variant="soft"
              tone="warning"
              style={[
                styles.choiceOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            <Radio
              defaultChecked
              label={t('example.radio.trailingLabel')}
              description={t('example.radio.trailingLabelDescription')}
              labelPlacement="start"
              tone="neutral"
              style={[
                styles.choiceOption,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
          </View>
        </ChoiceCaseCard>

        <ChoiceCaseCard
          iconName="layers"
          iconColor="#0891B2"
          iconBackground="#E0F2FE"
          title={t('example.radio.customTitle')}
          caption={t('example.radio.customCaption')}
        >
          <Radio defaultChecked showIndicator={false}>
            {({ checked }) => (
              <View
                style={[
                  styles.choiceCustomOption,
                  {
                    backgroundColor: checked ? '#E0F2FE' : '#F8FAFC',
                    borderColor: checked ? '#0891B2' : theme.colors.border,
                  },
                ]}
              >
                <View style={[styles.choiceCustomDot, { backgroundColor: checked ? '#0891B2' : '#CBD5E1' }]} />
                <View style={styles.choiceCustomCopy}>
                  <Text style={[styles.choiceCustomTitle, { color: theme.colors.onSurface }]}>
                    {t('example.radio.customCard')}
                  </Text>
                  <Text style={[styles.choiceCustomText, { color: theme.colors.muted }]}>
                    {t('example.radio.customCardDescription')}
                  </Text>
                </View>
              </View>
            )}
          </Radio>
          <Radio
            defaultChecked
            label={t('example.radio.customIndicator')}
            description={t('example.radio.customIndicatorDescription')}
            color="#0891B2"
            colors={{
              checkedBackground: '#CCFBF1',
              checkedBorder: '#0891B2',
              checkedIndicator: '#0E7490',
              uncheckedBorder: '#67E8F9',
              focusRing: '#CFFAFE',
            }}
            layout={{
              indicatorSize: wp(28),
              indicatorDotSize: wp(12),
              indicatorBorderWidth: wp(2),
              gap: wp(12),
            }}
            duration={320}
            indicator={renderIcon('zap', '#0E7490', wp(13))}
            indicatorStyle={{ backgroundColor: '#A5F3FC' }}
            labelStyle={{ color: '#0E7490', fontWeight: '900' }}
            descriptionStyle={{ color: '#0891B2' }}
            accessibilityState={{ expanded: true }}
            style={[
              styles.choiceOption,
              { backgroundColor: '#ECFEFF', borderColor: '#67E8F9' },
            ]}
          />
        </ChoiceCaseCard>
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
          itemGap={wp(10)}
          size="md"
          color="#2563EB"
          variant="card"
          mountStrategy="lazy"
          itemStyle={[styles.surfaceAccordionItem, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}
        >
          <AccordionItem value="motion">
            <AccordionTrigger
              title={t('example.surfaces.multipleLazyTitle')}
              description={t('example.surfaces.multipleLazyDescription')}
            />
            <AccordionContent>
              <Text style={[styles.surfaceAccordionText, { color: '#475569' }]}>
                {t('example.surfaces.multipleLazyBody')}
              </Text>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="mount">
            <AccordionTrigger
              title={t('example.surfaces.compactAccordionTitle')}
              description={t('example.surfaces.compactAccordionDescription')}
            />
            <AccordionContent>
              <Text style={[styles.surfaceAccordionText, { color: '#475569' }]}>
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
  onGlobalPicker: () => void;
  onLoading: () => void;
  onPermissionPurpose: () => void;
};

export const ServicesSection = React.memo(function ServicesSection({
  serviceChoice,
  onCaptchaOpen,
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
