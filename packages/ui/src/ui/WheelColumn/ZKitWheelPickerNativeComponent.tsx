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

const COMPONENT_NAME = 'ZKitWheelPicker';

export type ZKitWheelPickerValue = string | number;

export type ZKitWheelPickerItem = {
  label: string;
  value: ZKitWheelPickerValue;
  textColor?: ColorValue;
  testID?: string;
};

export type ZKitWheelPickerChangeEvent = {
  newIndex: number;
  newValue: ZKitWheelPickerValue | null;
};

export type ZKitWheelPickerProps = ViewProps & {
  items: ZKitWheelPickerItem[];
  selectedIndex: number;
  color?: ColorValue;
  fontFamily?: string;
  fontSize?: number;
  fontStyle?: string;
  fontWeight?: string;
  numberOfLines?: number;
  rowHeight?: number;
  onChange?: (event: NativeSyntheticEvent<ZKitWheelPickerChangeEvent>) => void;
};

const NativeZKitWheelPicker =
  Platform.OS === 'ios' ? requireNativeComponent<ZKitWheelPickerProps>(COMPONENT_NAME) : null;

type NativeRef = React.ElementRef<NonNullable<typeof NativeZKitWheelPicker>>;

export const ZKitWheelPicker = React.forwardRef<NativeRef, ZKitWheelPickerProps>(function ZKitWheelPicker(
  props,
  ref
) {
  if (Platform.OS !== 'ios' || NativeZKitWheelPicker == null) {
    return null;
  }

  return <NativeZKitWheelPicker {...props} ref={ref} />;
});

export function syncZKitWheelPickerCurrentSelection(target: unknown) {
  if (Platform.OS !== 'ios') return false;

  const command = UIManager.getViewManagerConfig(COMPONENT_NAME)?.Commands?.syncCurrentSelection;
  const handle = findNodeHandle(target as never);
  if (command == null || handle == null) {
    return false;
  }

  UIManager.dispatchViewManagerCommand(handle, command, []);
  return true;
}
