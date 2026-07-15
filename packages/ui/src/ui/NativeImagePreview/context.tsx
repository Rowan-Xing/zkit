import * as React from 'react';
import type {
  NativeImagePreviewChangeMeta,
  NativeImagePreviewNativeItem,
  NativeImagePreviewNativeProps,
  NativeImagePreviewResolvedItem,
  NativeImagePreviewResolvedColorScheme,
} from './types';

export type NativeImagePreviewContextValue = {
  previewGroupId: string;
  items: readonly NativeImagePreviewResolvedItem[];
  nativeItems: readonly NativeImagePreviewNativeItem[];
  colorScheme: NativeImagePreviewResolvedColorScheme;
  disabled: boolean;
  edgeToEdge: boolean;
  nativeProps?: NativeImagePreviewNativeProps;
  onChange?: (value: number, meta: NativeImagePreviewChangeMeta) => void;
};

export const NativeImagePreviewContext =
  React.createContext<NativeImagePreviewContextValue | null>(null);
