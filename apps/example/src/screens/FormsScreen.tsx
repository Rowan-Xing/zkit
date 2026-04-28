import * as React from 'react';
import { useI18n, type PickerModelValue } from 'y2kit-ui';

import { InputsSection, PickersSection, SelectionSection } from '../sections/PlaygroundSections';
import type { Density } from '../data';
import { TabScreenShell } from './TabScreenShell';

export const FormsScreen = React.memo(function FormsScreen() {
  const { t } = useI18n();

  const [enabled, setEnabled] = React.useState(true);
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

  const rangeLabel = React.useMemo(
    () => (range.length === 2 ? `${range[0]} ${t('example.common.to')} ${range[1]}` : t('example.range.select')),
    [range, t]
  );

  return (
    <TabScreenShell withTopInset={false}>
      <InputsSection
        enabled={enabled}
        note={note}
        onEnabledChange={setEnabled}
        onNoteChange={setNote}
      />
      <SelectionSection
        checkedItems={checkedItems}
        density={density}
        onCheckedItemsChange={setCheckedItems}
        onDensityChange={setDensity}
      />
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
    </TabScreenShell>
  );
});
