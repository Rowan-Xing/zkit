import * as React from 'react';
import {
  UIManager,
  Platform,
  findNodeHandle,
  requireNativeComponent,
  type ColorValue,
  type NativeSyntheticEvent,
  type ViewProps,
} from 'react-native';

const COMPONENT_NAME = 'Y2KitWheelPicker';

export type Y2KitWheelPickerValue = string | number;

export type Y2KitWheelPickerItem = {
  label: string;
  value: Y2KitWheelPickerValue;
  textColor?: ColorValue;
  testID?: string;
};

export type Y2KitWheelPickerChangeEvent = {
  newIndex: number;
  newValue: Y2KitWheelPickerValue | null;
};

export type Y2KitWheelPickerProps = ViewProps & {
  items: Y2KitWheelPickerItem[];
  selectedIndex: number;
  color?: ColorValue;
  fontFamily?: string;
  fontSize?: number;
  fontStyle?: string;
  fontWeight?: string;
  numberOfLines?: number;
  rowHeight?: number;
  onChange?: (event: NativeSyntheticEvent<Y2KitWheelPickerChangeEvent>) => void;
};

const NativeY2KitWheelPicker =
  Platform.OS === 'ios' ? requireNativeComponent<Y2KitWheelPickerProps>(COMPONENT_NAME) : null;

type NativeRef = React.ElementRef<NonNullable<typeof NativeY2KitWheelPicker>>;

export const Y2KitWheelPicker = React.forwardRef<NativeRef, Y2KitWheelPickerProps>(function Y2KitWheelPicker(
  props,
  ref
) {
  if (Platform.OS !== 'ios' || NativeY2KitWheelPicker == null) {
    return null;
  }

  return <NativeY2KitWheelPicker {...props} ref={ref} />;
});

export function syncY2KitWheelPickerCurrentSelection(target: unknown) {
  if (Platform.OS !== 'ios') return false;

  const command = UIManager.getViewManagerConfig(COMPONENT_NAME)?.Commands?.syncCurrentSelection;
  const handle = findNodeHandle(target as never);
  if (command == null || handle == null) {
    return false;
  }

  UIManager.dispatchViewManagerCommand(handle, command, []);
  return true;
}
