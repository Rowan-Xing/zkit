import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { wp } from 'y2kit-tools';
import {
  SliderCaptcha,
  actionDialog,
  loading,
  permissionPurposeDialog,
  pickerService,
  toast,
  type PickerModelValue,
} from 'y2kit-ui';

import { ExampleHeader } from './components/ExampleHeader';
import { captchaChallenge, type Density } from './data';
import { wait } from './demoUtils';
import { LinkedScrollDemo } from './LinkedScrollDemo';
import {
  AccordionSection,
  ButtonsSection,
  InputsSection,
  LinkedScrollLaunchSection,
  PickersSection,
  SelectionSection,
  ServicesSection,
} from './sections/PlaygroundSections';
import { styles } from './styles';
import { exampleBackgroundColor } from './theme';

export function Playground() {
  const insets = useSafeAreaInsets();
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

  const rangeLabel = React.useMemo(
    () => (range.length === 2 ? `${range[0]} to ${range[1]}` : 'Select range'),
    [range]
  );

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

  if (linkedScrollOpen) {
    return <LinkedScrollDemo onBack={closeLinkedScrollDemo} />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: exampleBackgroundColor }]}>
      <ScrollView
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + wp(36) }]}
      >
        <ExampleHeader topInset={insets.top} />

        <ButtonsSection
          busy={busy}
          centerBusy={centerBusy}
          onBusyDemo={handleBusyDemo}
          onCenterBusyDemo={handleCenterBusyDemo}
        />

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

        <AccordionSection />

        <LinkedScrollLaunchSection onOpen={openLinkedScrollDemo} />

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

        <ServicesSection
          serviceChoice={serviceChoice}
          onCaptchaOpen={openCaptcha}
          onDialog={handleDialog}
          onGlobalPicker={handleGlobalPicker}
          onLoading={handleLoading}
          onPermissionPurpose={handlePermissionPurpose}
        />
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
    </View>
  );
}
