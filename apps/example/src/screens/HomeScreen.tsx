import * as React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExampleHeader } from '../components/ExampleHeader';
import { wait } from '../demoUtils';
import { ButtonsSection, FoundationSection } from '../sections/PlaygroundSections';
import { TabScreenShell } from './TabScreenShell';

export const HomeScreen = React.memo(function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = React.useState(false);
  const [centerBusy, setCenterBusy] = React.useState(false);

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

  return (
    <TabScreenShell>
      <ExampleHeader topInset={insets.top} />
      <FoundationSection />
      <ButtonsSection
        busy={busy}
        centerBusy={centerBusy}
        onBusyDemo={handleBusyDemo}
        onCenterBusyDemo={handleCenterBusyDemo}
      />
    </TabScreenShell>
  );
});
