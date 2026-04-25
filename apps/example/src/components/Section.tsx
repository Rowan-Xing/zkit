import * as React from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'y2kit-ui';

import { styles } from '../styles';

export const Section = React.memo(function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.section, { borderTopColor: theme.colors.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{title}</Text>
      {children}
    </View>
  );
});
