import type * as React from 'react';
import type {
  ImageSourcePropType,
  NativeSyntheticEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';

export type NativeImagePreviewResolvedColorScheme = 'dark' | 'light';
export type NativeImagePreviewColorScheme =
  | NativeImagePreviewResolvedColorScheme
  | 'system';
export type NativeImagePreviewMediaType = 'image' | 'video';
export type NativeImagePreviewSource = ImageSourcePropType | string;

export type NativeImagePreviewItemDescriptor = {
  id?: string;
  type?: NativeImagePreviewMediaType;
  url?: string;
  source?: NativeImagePreviewSource;
  poster?: NativeImagePreviewSource;
  width?: number;
  height?: number;
};

export type NativeImagePreviewItem =
  | NativeImagePreviewSource
  | NativeImagePreviewItemDescriptor;

export type NativeImagePreviewResolvedItem = {
  id: string;
  type: NativeImagePreviewMediaType;
  url: string;
  poster?: string;
  width?: number;
  height?: number;
  raw: NativeImagePreviewItem;
};

export type NativeImagePreviewNativeItem = {
  id: string;
  type: NativeImagePreviewMediaType;
  url: string;
  poster?: string;
  width?: number;
  height?: number;
};

export type NativeImagePreviewChangeReason = 'swipe';

export type NativeImagePreviewChangeEventPayload = {
  currentIndex: number;
};

export type NativeImagePreviewChangeEvent =
  NativeSyntheticEvent<NativeImagePreviewChangeEventPayload>;

export type NativeImagePreviewChangeMeta = {
  reason: NativeImagePreviewChangeReason;
  item: NativeImagePreviewResolvedItem | null;
  nativeEvent?: NativeImagePreviewChangeEvent;
};

export type NativeImagePreviewNativeProps = {
  iosCloseIconName?: string;
};

export type NativeImagePreviewProps = {
  items: readonly NativeImagePreviewItem[];
  children: React.ReactNode;
  colorScheme?: NativeImagePreviewColorScheme;
  disabled?: boolean;
  edgeToEdge?: boolean;
  nativeProps?: NativeImagePreviewNativeProps;
  onChange?: (value: number, meta: NativeImagePreviewChangeMeta) => void;
};

export type NativeImagePreviewItemProps = {
  index: number;
  children: React.ReactElement;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  onChange?: (value: number, meta: NativeImagePreviewChangeMeta) => void;
};

export type NativeImagePreviewComponent = React.MemoExoticComponent<
  (props: NativeImagePreviewProps) => React.ReactElement
> & {
  Item: React.MemoExoticComponent<
    (props: NativeImagePreviewItemProps) => React.ReactElement
  >;
};
