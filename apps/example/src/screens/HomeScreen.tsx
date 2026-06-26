import * as React from 'react';

import { ExampleHeader } from '../components/ExampleHeader';
import { TabScreenShell } from './TabScreenShell';

export const HomeScreen = React.memo(function HomeScreen() {
  return (
    <TabScreenShell withTopInset={false}>
      <ExampleHeader topInset={0} />
    </TabScreenShell>
  );
});
