import * as React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text, useTheme } from 'y2kit-ui';
import { wp } from 'y2kit-tools';

import { renderIcon, type FeatherIconName } from '../demoUtils';
import { styles } from '../styles';

export type FieldTriggerProps = {
  iconName: FeatherIconName;
  label: string;
  value: string;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export const FieldTrigger = React.memo(function FieldTrigger({
  iconName,
  label,
  value,
  disabled,
  onPress,
  style,
}: FieldTriggerProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fieldTrigger,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: disabled ? 0.55 : pressed ? 0.82 : 1,
        },
        style,
      ]}
    >
      <View style={[styles.fieldIcon, { backgroundColor: theme.colors.secondary }]}>
        {renderIcon(iconName, theme.colors.primary, wp(18))}
      </View>
      <View style={styles.fieldText}>
        <Text style={[styles.fieldLabel, { color: theme.colors.muted }]}>{label}</Text>
        <Text numberOfLines={1} style={[styles.fieldValue, { color: theme.colors.onSurface }]}>
          {value}
        </Text>
      </View>
      {renderIcon('chevron-right', theme.colors.muted, wp(18))}
    </Pressable>
  );
});
