import * as React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { sp, wp } from 'zkit-tools';
import { Button } from '../Button';

export function getPickerActionBarBottomInset(bottomInset: number) {
  return Math.max(bottomInset, wp(12));
}

export type PickerActionBarProps = {
  cancelText: React.ReactNode;
  confirmText: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  disabled?: boolean;
  confirmDisabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PickerActionBar({
  cancelText,
  confirmText,
  onCancel,
  onConfirm,
  disabled = false,
  confirmDisabled = false,
  style,
}: PickerActionBarProps) {
  return (
    <View style={[styles.root, style]}>
      <View style={styles.buttonWrapper}>
        <Button
          variant="soft"
          onPress={onCancel}
          disabled={disabled}
          block
          layout={ACTION_BUTTON_LAYOUT}
        >
          {cancelText}
        </Button>
      </View>
      <View style={styles.buttonWrapper}>
        <Button
          onPress={onConfirm}
          disabled={disabled || confirmDisabled}
          block
          layout={ACTION_BUTTON_LAYOUT}
        >
          {confirmText}
        </Button>
      </View>
    </View>
  );
}

const ACTION_BUTTON_LAYOUT = {
  minHeight: wp(44),
  radius: wp(14),
  textSize: sp(16),
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    gap: wp(14),
  },
  buttonWrapper: {
    flex: 1,
  },
});
