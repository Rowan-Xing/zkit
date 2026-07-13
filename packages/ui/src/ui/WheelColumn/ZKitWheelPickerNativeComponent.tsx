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
  disabled?: boolean;
  textColor?: ColorValue;
  testID?: string;
};

export type ZKitWheelPickerChangeEvent = {
  newIndex: number;
  newValue: ZKitWheelPickerValue | null;
  syncRequestId?: number;
};

export type ZKitWheelPickerProps = ViewProps & {
  items: ZKitWheelPickerItem[];
  selectedIndex: number;
  disabled?: boolean;
  color?: ColorValue;
  itemColor?: ColorValue;
  disabledColor?: ColorValue;
  fontFamily?: string;
  fontSize?: number;
  fontStyle?: string;
  fontWeight?: string;
  maxFontSizeMultiplier?: number;
  numberOfLines?: number;
  rowHeight?: number;
  onChange?: (event: NativeSyntheticEvent<ZKitWheelPickerChangeEvent>) => void;
};

const nativeViewManagerAvailable =
  Platform.OS !== 'web' && UIManager.getViewManagerConfig(COMPONENT_NAME) != null;
const NativeZKitWheelPicker = nativeViewManagerAvailable
  ? requireNativeComponent<ZKitWheelPickerProps>(COMPONENT_NAME)
  : null;

type NativeRef = React.ComponentRef<NonNullable<typeof NativeZKitWheelPicker>>;

export const ZKitWheelPicker = React.forwardRef<NativeRef, ZKitWheelPickerProps>(function ZKitWheelPicker(
  props,
  ref
) {
  if (!nativeViewManagerAvailable || NativeZKitWheelPicker == null) {
    return null;
  }

  return <NativeZKitWheelPicker {...props} ref={ref} />;
});

export function isZKitWheelPickerNativeAvailable() {
  return nativeViewManagerAvailable;
}

export function syncZKitWheelPickerCurrentSelection(target: unknown, requestId: number) {
  if (!nativeViewManagerAvailable) return false;

  const command = UIManager.getViewManagerConfig(COMPONENT_NAME)?.Commands?.syncCurrentSelection;
  const handle = findNodeHandle(target as never);
  if (command == null || handle == null) {
    return false;
  }

  UIManager.dispatchViewManagerCommand(handle, command, [requestId]);
  return true;
}

export function scrollZKitWheelPickerToIndex(target: unknown, index: number, animated: boolean) {
  if (!nativeViewManagerAvailable) return false;

  const command = UIManager.getViewManagerConfig(COMPONENT_NAME)?.Commands?.scrollToIndex;
  const handle = findNodeHandle(target as never);
  if (command == null || handle == null) {
    return false;
  }

  UIManager.dispatchViewManagerCommand(handle, command, [index, animated]);
  return true;
}
