import * as React from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'y2kit-ui';
import { wp } from 'y2kit-tools';

import { renderIcon } from '../demoUtils';
import { styles } from '../styles';
import { MetaPill } from './MetaPill';

const runtimeLabels = ['Expo 54', 'RN 0.81', 'React 19'];

export const ExampleHeader = React.memo(function ExampleHeader({ topInset }: { topInset: number }) {
  const theme = useTheme();

  return (
    <View style={[styles.header, { paddingTop: topInset + wp(18) }]}>
      <View style={styles.headerTitleRow}>
        <View style={[styles.logo, { backgroundColor: theme.colors.primary }]}>
          {renderIcon('box', theme.colors.onPrimary, wp(20))}
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: theme.colors.muted }]}>@y2kit/example</Text>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>y2kit-ui</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        {runtimeLabels.map((label) => (
          <MetaPill key={label} label={label} />
        ))}
      </View>
    </View>
  );
});
