import { requireNativeView } from 'expo';
import * as React from 'react';
import { Platform, View, useColorScheme } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  controlEdgeToEdgeValues,
  isEdgeToEdge,
} from 'react-native-is-edge-to-edge';
import { NativeImagePreviewContext } from './context';
import type {
  NativeImagePreviewChangeEvent,
  NativeImagePreviewComponent,
  NativeImagePreviewItemProps,
  NativeImagePreviewNativeItem,
  NativeImagePreviewProps,
} from './types';
import {
  clampPreviewIndex,
  normalizeNativeImagePreviewItems,
  resolveNativeImagePreviewColorScheme,
  toNativePreviewItems,
} from './utils';

type NativePreviewViewProps = {
  children: React.ReactElement;
  index: number;
  style?: StyleProp<ViewStyle>;
  galleryId: string;
  items: readonly NativeImagePreviewNativeItem[];
  theme: 'dark' | 'light';
  edgeToEdge: boolean;
  closeIconName?: string;
  onIndexChange?: (event: NativeImagePreviewChangeEvent) => void;
};

const NativePreviewView = requireNativeView<NativePreviewViewProps>(
  'ZKitNativeImagePreview'
);

const ANDROID_EDGE_TO_EDGE = Platform.OS === 'android' ? isEdgeToEdge() : false;

function createGalleryId() {
  return `zkit-native-image-preview-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

const NativeImagePreviewRoot = React.memo(function NativeImagePreview({
  children,
  colorScheme = 'dark',
  disabled = false,
  edgeToEdge = false,
  items,
  nativeProps,
  onChange,
}: NativeImagePreviewProps) {
  const systemColorScheme = useColorScheme();
  const galleryIdRef = React.useRef<string | null>(null);
  if (galleryIdRef.current == null) {
    galleryIdRef.current = createGalleryId();
  }

  const resolvedItems = React.useMemo(
    () => normalizeNativeImagePreviewItems(items),
    [items]
  );
  const nativeItems = React.useMemo(
    () => toNativePreviewItems(resolvedItems),
    [resolvedItems]
  );
  const resolvedColorScheme = resolveNativeImagePreviewColorScheme(colorScheme, systemColorScheme);
  const contextValue = React.useMemo(
    () => ({
      galleryId: galleryIdRef.current!,
      items: resolvedItems,
      nativeItems,
      colorScheme: resolvedColorScheme,
      disabled,
      edgeToEdge,
      nativeProps,
      onChange,
    }),
    [disabled, edgeToEdge, nativeItems, nativeProps, onChange, resolvedColorScheme, resolvedItems]
  );

  return (
    <NativeImagePreviewContext.Provider value={contextValue}>
      {children}
    </NativeImagePreviewContext.Provider>
  );
});

const NativeImagePreviewItem = React.memo(function NativeImagePreviewItem({
  children,
  disabled = false,
  index,
  onChange,
  style,
}: NativeImagePreviewItemProps) {
  const context = React.useContext(NativeImagePreviewContext);

  const handleIndexChange = React.useCallback(
    (event: NativeImagePreviewChangeEvent) => {
      if (!context) return;

      const value = event.nativeEvent.currentIndex;
      const meta = {
        reason: 'swipe' as const,
        item: context.items[value] ?? null,
        nativeEvent: event,
      };
      context.onChange?.(value, meta);
      onChange?.(value, meta);
    },
    [context, onChange]
  );

  if (!context || context.disabled || disabled || context.nativeItems.length === 0) {
    return <View style={style}>{children}</View>;
  }

  const resolvedEdgeToEdge = ANDROID_EDGE_TO_EDGE || context.edgeToEdge;

  if (__DEV__ && Platform.OS === 'android') {
    controlEdgeToEdgeValues({ edgeToEdge: resolvedEdgeToEdge });
  }

  return (
    <NativePreviewView
      closeIconName={context.nativeProps?.iosCloseIconName}
      edgeToEdge={resolvedEdgeToEdge}
      galleryId={context.galleryId}
      index={clampPreviewIndex(index, context.nativeItems.length)}
      items={context.nativeItems}
      onIndexChange={handleIndexChange}
      style={style}
      theme={context.colorScheme}
    >
      {children}
    </NativePreviewView>
  );
});

export const NativeImagePreview = Object.assign(NativeImagePreviewRoot, {
  Item: NativeImagePreviewItem,
}) as NativeImagePreviewComponent;
