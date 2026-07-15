/// <reference lib="dom" />

import './web/styles.css';

import * as React from 'react';
import { View, useColorScheme } from 'react-native';
import { clampPreviewIndex, normalizeNativeImagePreviewItems, resolveNativeImagePreviewColorScheme } from './utils';
import type {
  NativeImagePreviewChangeMeta,
  NativeImagePreviewComponent,
  NativeImagePreviewItemProps,
  NativeImagePreviewProps,
  NativeImagePreviewResolvedItem,
} from './types';
import { createNativeImagePreviewWeb } from './web/viewer';
import type {
  NativeImagePreviewWebChangeMeta,
  NativeImagePreviewWebController,
  NativeImagePreviewWebMediaItem,
} from './web/types';

type SourceElement = HTMLElement | null;

type NativeImagePreviewWebContextValue = {
  disabled: boolean;
  items: readonly NativeImagePreviewResolvedItem[];
  open: (
    index: number,
    onItemChange?: (value: number, meta: NativeImagePreviewChangeMeta) => void
  ) => void;
  sourceElementsRef: { current: SourceElement[] };
};

const NativeImagePreviewWebContext =
  React.createContext<NativeImagePreviewWebContextValue | null>(null);

const WebView = View as unknown as React.ElementType;

function toWebPreviewItems(
  items: readonly NativeImagePreviewResolvedItem[]
): NativeImagePreviewWebMediaItem[] {
  return items.map(({ alt, height, id, poster, type, url, width }) => ({
    alt: alt ?? id,
    height,
    id,
    poster,
    type,
    url,
    width,
  }));
}

function findPreviewSourceElement(element: SourceElement): SourceElement {
  if (!element) return null;
  if (element instanceof HTMLImageElement || element instanceof HTMLVideoElement) {
    return element;
  }
  return element.querySelector('img, video') ?? element;
}

function toChangeMeta(
  meta: NativeImagePreviewWebChangeMeta,
  items: readonly NativeImagePreviewResolvedItem[]
): NativeImagePreviewChangeMeta {
  return {
    reason: meta.reason,
    item: items[meta.index] ?? null,
  };
}

const NativeImagePreviewRoot = React.memo(function NativeImagePreview({
  children,
  colorScheme = 'dark',
  disabled = false,
  items,
  onChange,
}: NativeImagePreviewProps) {
  const systemColorScheme = useColorScheme();
  const controllerRef = React.useRef<NativeImagePreviewWebController | null>(null);
  const sourceElementsRef = React.useRef<SourceElement[]>([]);
  const resolvedItems = React.useMemo(
    () => normalizeNativeImagePreviewItems(items),
    [items]
  );
  const webItems = React.useMemo(
    () => toWebPreviewItems(resolvedItems),
    [resolvedItems]
  );
  const resolvedColorScheme = resolveNativeImagePreviewColorScheme(colorScheme, systemColorScheme);

  React.useEffect(() => {
    const controller = createNativeImagePreviewWeb();
    controllerRef.current = controller;

    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, []);

  const open = React.useCallback<NativeImagePreviewWebContextValue['open']>(
    (index, onItemChange) => {
      const controller = controllerRef.current;
      if (disabled || !controller || webItems.length === 0) return;

      const value = clampPreviewIndex(index, webItems.length);
      const getSourceElement = (nextIndex: number) =>
        findPreviewSourceElement(sourceElementsRef.current[nextIndex] ?? null);

      void controller.open({
        getSourceElement,
        index: value,
        items: webItems,
        objectFit: 'cover',
        sourceElement: getSourceElement(value),
        sourceImageSize: resolvedItems[value]
          ? {
              width: resolvedItems[value].width ?? 0,
              height: resolvedItems[value].height ?? 0,
            }
          : null,
        sourceObjectFit: 'cover',
        sourceVisibility: 'hidden',
        theme: resolvedColorScheme,
        onChange: (nextValue, meta) => {
          const changeMeta = toChangeMeta(meta, resolvedItems);
          onChange?.(nextValue, changeMeta);
          onItemChange?.(nextValue, changeMeta);
        },
      });
    },
    [disabled, onChange, resolvedColorScheme, resolvedItems, webItems]
  );

  const contextValue = React.useMemo<NativeImagePreviewWebContextValue>(
    () => ({
      disabled,
      items: resolvedItems,
      open,
      sourceElementsRef,
    }),
    [disabled, open, resolvedItems]
  );

  return (
    <NativeImagePreviewWebContext.Provider value={contextValue}>
      {children}
    </NativeImagePreviewWebContext.Provider>
  );
});

const NativeImagePreviewItem = React.memo(function NativeImagePreviewItem({
  children,
  disabled = false,
  index,
  onChange,
  style,
}: NativeImagePreviewItemProps) {
  const context = React.useContext(NativeImagePreviewWebContext);
  const sourceRef = React.useCallback(
    (node: SourceElement) => {
      if (!context) return;
      context.sourceElementsRef.current[index] = node;
    },
    [context, index]
  );
  const itemDisabled = !context || context.disabled || disabled || context.items.length === 0;

  const open = React.useCallback(() => {
    if (itemDisabled) return;
    context.open(index, onChange);
  }, [context, index, itemDisabled, onChange]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (itemDisabled) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      open();
    },
    [itemDisabled, open]
  );

  return (
    <WebView
      ref={sourceRef}
      aria-label={itemDisabled ? undefined : 'Open image preview'}
      onClick={itemDisabled ? undefined : open}
      onKeyDown={itemDisabled ? undefined : handleKeyDown}
      role={itemDisabled ? undefined : 'button'}
      style={style}
      tabIndex={itemDisabled ? undefined : 0}
    >
      {children}
    </WebView>
  );
});

export const NativeImagePreview = Object.assign(NativeImagePreviewRoot, {
  Item: NativeImagePreviewItem,
}) as NativeImagePreviewComponent;
