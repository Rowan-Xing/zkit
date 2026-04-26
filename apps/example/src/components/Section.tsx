import * as React from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Text, useTheme } from 'y2kit-ui';

import { styles } from '../styles';

export const Section = React.memo(function Section({
  eyebrow,
  title,
  subtitle,
  accentColor,
  action,
  onLayout,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  accentColor?: string;
  action?: React.ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <View onLayout={onLayout} style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionAccent, { backgroundColor: accentColor ?? theme.colors.primary }]} />
        <View style={styles.sectionCopy}>
          {eyebrow ? (
            <Text style={[styles.sectionEyebrow, { color: theme.colors.primary }]}>{eyebrow}</Text>
          ) : null}
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.sectionSubtitle, { color: theme.colors.muted }]}>{subtitle}</Text>
          ) : null}
        </View>
        {action ? <View style={styles.sectionAction}>{action}</View> : null}
      </View>
      {children}
    </View>
  );
});
