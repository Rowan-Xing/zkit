import * as React from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'y2kit-ui';

import { styles } from '../styles';

export const MetaPill = React.memo(function MetaPill({ label }: { label: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.metaPill, { backgroundColor: theme.colors.secondary }]}>
      <Text style={[styles.metaPillText, { color: theme.colors.onSecondary }]}>{label}</Text>
    </View>
  );
});
