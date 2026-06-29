import * as React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { WithTimingConfig } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { wp } from 'zkit-tools';
import { useTheme } from '../../theme/useTheme';
import { NativeBottomSheet, type NativeBottomSheetRef } from './nativeBottom';
import { SheetContent, SheetFooter, SheetHeader } from './slots';
import type {
  SheetAnimationConfig,
  SheetBackdropConfig,
  SheetCloseOptions,
  SheetCloseReason,
  SheetDetent,
  SheetHandleConfig,
  SheetOpenChangeReason,
  SheetOpenOptions,
  SheetPlacement,
  SheetProps,
  SheetRef,
  SheetRenderContext,
  SheetSafeAreaEdges,
  SheetSize,
  SheetSlot,
  SheetState,
} from './types';

export { SheetContent, SheetFooter, SheetHeader } from './slots';
export type {
  SheetAnimationConfig,
  SheetBackdropConfig,
  SheetCloseCompleteDetails,
  SheetCloseOptions,
  SheetCloseReason,
  SheetContentProps,
  SheetDetent,
  SheetDetentChangePayload,
  SheetFooterProps,
  SheetHandleConfig,
  SheetHeaderProps,
  SheetNativeProps,
  SheetOpenChangeDetails,
  SheetOpenChangeReason,
  SheetOpenCompleteDetails,
  SheetOpenOptions,
  SheetOpenReason,
  SheetPlacement,
  SheetProps,
  SheetRef,
  SheetRenderContext,
  SheetSafeAreaEdges,
  SheetSize,
  SheetState,
} from './types';

type ResolvedAnimation = {
  openTiming: WithTimingConfig;
  closeTiming: WithTimingConfig;
};

type ResolvedBackdrop = Required<SheetBackdropConfig>;

const DEFAULT_BACKDROP_OPACITY = 0.42;
const DEFAULT_DISMISSIBLE = true;
const DEFAULT_DRAGGABLE = true;
const DEFAULT_HANDLE_VISIBLE = true;
const DEFAULT_OPEN_DURATION = 260;
const DEFAULT_CLOSE_DURATION = 210;
const DEFAULT_EASING = Easing.out(Easing.cubic);
const DEFAULT_SIDE_SIZE_RATIO = 0.86;
const DEFAULT_TOP_MAX_RATIO = 0.82;
const DEFAULT_DRAG_VELOCITY = 900;
const BOTTOM_HANDLE_RESERVE = wp(36);
const TOP_HANDLE_RESERVE = wp(20);
const SIDE_HANDLE_RESERVE = wp(24);
const SIDE_HANDLE_INSET = wp(4);
const SIDE_HANDLE_WIDTH = wp(16);

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function resolveDuration(duration: number | undefined, fallback: number) {
  if (duration == null || !Number.isFinite(duration)) return fallback;
  return Math.max(0, duration);
}

function resolveAnimation(animation: SheetAnimationConfig | false | undefined): ResolvedAnimation {
  if (animation === false) {
    return {
      openTiming: {
        duration: 0,
        easing: DEFAULT_EASING,
        reduceMotion: ReduceMotion.Always,
      },
      closeTiming: {
        duration: 0,
        easing: DEFAULT_EASING,
        reduceMotion: ReduceMotion.Always,
      },
    };
  }

  const easing = animation?.easing ?? DEFAULT_EASING;
  const reduceMotion = animation?.reduceMotion ?? ReduceMotion.System;
  const duration = animation?.duration;

  return {
    openTiming: {
      duration: resolveDuration(animation?.openDuration ?? duration, DEFAULT_OPEN_DURATION),
      easing,
      reduceMotion,
    },
    closeTiming: {
      duration: resolveDuration(animation?.closeDuration ?? duration, DEFAULT_CLOSE_DURATION),
      easing,
      reduceMotion,
    },
  };
}

function resolveBackdrop(backdrop: SheetProps['backdrop']): ResolvedBackdrop {
  if (backdrop === false) {
    return {
      visible: false,
      dismissOnPress: false,
      color: '#000000',
      opacity: 0,
    };
  }

  if (backdrop && typeof backdrop === 'object') {
    return {
      visible: backdrop.visible !== false,
      dismissOnPress: backdrop.dismissOnPress !== false,
      color: backdrop.color ?? '#000000',
      opacity: backdrop.opacity ?? DEFAULT_BACKDROP_OPACITY,
    };
  }

  return {
    visible: true,
    dismissOnPress: true,
    color: '#000000',
    opacity: DEFAULT_BACKDROP_OPACITY,
  };
}

function renderSlot(slot: SheetSlot | undefined, context: SheetRenderContext) {
  if (typeof slot === 'function') {
    return (slot as (context: SheetRenderContext) => React.ReactNode)(context);
  }
  return slot;
}

function normalizeDetentIndex(index: number | undefined, length: number) {
  if (!Number.isFinite(index)) return 0;
  return clampNumber(Math.round(index ?? 0), 0, Math.max(0, length - 1));
}

function detentsFromSize(size: SheetSize | undefined) {
  if (size == null || size === 'auto' || typeof size === 'number') return undefined;
  if (size === 'sm') return ['content'] as const;
  if (size === 'md') return ['medium'] as const;
  if (size === 'lg') return ['large'] as const;
  if (size === 'full') return ['full'] as const;
  return [size] as const;
}

function parsePercent(input: string) {
  if (!input.endsWith('%')) return undefined;
  const percent = Number.parseFloat(input.slice(0, -1));
  if (!Number.isFinite(percent) || percent <= 0) return undefined;
  return clampNumber(percent / 100, 0.1, 1);
}

function resolveAxisSize(
  size: SheetSize | undefined,
  axisLength: number,
  fallback: number,
  maxSize: number | undefined
) {
  const resolvedMax = Math.max(wp(64), maxSize ?? axisLength);
  if (typeof size === 'number') return clampNumber(size, wp(64), resolvedMax);
  if (typeof size === 'string') {
    const percent = parsePercent(size);
    if (percent != null) return clampNumber(axisLength * percent, wp(64), resolvedMax);
    if (size === 'sm') return clampNumber(wp(280), wp(64), resolvedMax);
    if (size === 'md') return clampNumber(wp(320), wp(64), resolvedMax);
    if (size === 'lg') return clampNumber(wp(380), wp(64), resolvedMax);
    if (size === 'full') return resolvedMax;
  }
  return clampNumber(fallback, wp(64), resolvedMax);
}

function resolveTopHeight(
  size: SheetSize | undefined,
  windowHeight: number,
  maxHeight: number | undefined
) {
  if (size == null || size === 'auto') return undefined;
  return resolveAxisSize(size, windowHeight, windowHeight * DEFAULT_TOP_MAX_RATIO, maxHeight);
}

function resolveBottomHeight(
  detents: readonly SheetDetent[] | undefined,
  detentIndex: number,
  windowHeight: number,
  maxHeight: number | undefined
) {
  const detent = detents?.[normalizeDetentIndex(detentIndex, detents.length)] ?? 'auto';
  if (detent === 'content' || detent === 'auto') return undefined;

  const resolvedMax = Math.max(wp(64), maxHeight ?? windowHeight);
  if (detent === 'medium') return clampNumber(windowHeight * 0.5, wp(64), resolvedMax);
  if (detent === 'large') return clampNumber(windowHeight * 0.9, wp(64), resolvedMax);
  if (detent === 'full') return resolvedMax;

  if (typeof detent === 'string') {
    const percent = parsePercent(detent);
    if (percent != null) return clampNumber(windowHeight * percent, wp(64), resolvedMax);
  }

  if (typeof detent === 'number' && Number.isFinite(detent) && detent > 0) {
    return clampNumber(windowHeight * clampNumber(detent, 0.1, 1), wp(64), resolvedMax);
  }

  return undefined;
}

function getCloseDirection(placement: SheetPlacement) {
  if (placement === 'left' || placement === 'top') return -1;
  return 1;
}

function getClosedOffset(placement: SheetPlacement, width: number, height: number) {
  if (placement === 'left') return -width;
  if (placement === 'right') return width;
  if (placement === 'top') return -height;
  return height;
}

function resolveSafeAreaEdges(safeArea: SheetProps['safeArea'], placement: SheetPlacement): SheetSafeAreaEdges {
  if (safeArea === false) return {};
  if (safeArea && typeof safeArea === 'object') return safeArea;
  if (placement === 'top') return { top: true, left: true, right: true };
  if (placement === 'left') return { top: true, left: true, bottom: true };
  if (placement === 'right') return { top: true, right: true, bottom: true };
  return { left: true, right: true, bottom: true };
}

function toCloseReason(reason: SheetOpenChangeReason): SheetCloseReason {
  return reason === 'api' ? 'api' : reason;
}

function resolveDetentIndexForDetails(placement: SheetPlacement, detentIndex: number) {
  return placement === 'bottom' ? detentIndex : null;
}

function getDocument() {
  return (
    globalThis as unknown as {
      document?: {
        addEventListener: (type: string, listener: (event: { key?: string; preventDefault?: () => void }) => void) => void;
        removeEventListener: (type: string, listener: (event: { key?: string; preventDefault?: () => void }) => void) => void;
      };
    }
  ).document;
}

const SheetRoot = React.forwardRef<SheetRef, SheetProps>(function Sheet(
  {
    placement = 'bottom',
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    onOpenComplete,
    onCloseComplete,
    disabled = false,
    dismissible = DEFAULT_DISMISSIBLE,
    draggable = DEFAULT_DRAGGABLE,
    backdrop,
    title,
    description,
    header,
    footer,
    children,
    size,
    safeArea = true,
    detents,
    detentIndex,
    defaultDetentIndex,
    onDetentChange,
    nativeProps,
    backgroundColor,
    cornerRadius,
    maxHeight,
    maxWidth,
    handle = DEFAULT_HANDLE_VISIBLE,
    animation,
    dragCloseThreshold,
    dragVelocityThreshold = DEFAULT_DRAG_VELOCITY,
    style,
    headerStyle,
    footerStyle,
    testID,
    accessibilityLabel,
    backdropAccessibilityLabel = 'Close sheet',
  },
  ref
) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const windowSize = useWindowDimensions();
  const isBottomPlacement = placement === 'bottom';
  const usesNativeBottom = isBottomPlacement && Platform.OS !== 'web';
  const nativeBottomRef = React.useRef<NativeBottomSheetRef>(null);
  const isOpenControlled = openProp !== undefined;
  const [innerOpen, setInnerOpen] = React.useState(defaultOpen);
  const isOpen = isOpenControlled ? !!openProp : innerOpen;
  const [sheetState, setSheetState] = React.useState<SheetState>(isOpen ? 'opening' : 'closed');
  const [shellMounted, setShellMounted] = React.useState(isOpen);
  const [surfaceReady, setSurfaceReady] = React.useState(false);
  const [layoutSize, setLayoutSize] = React.useState({ width: 0, height: 0 });
  const bottomDetents = React.useMemo(
    () => detents ?? detentsFromSize(size),
    [detents, size]
  );
  const bottomDetentCount = bottomDetents?.length ?? 1;
  const initialDetentIndex = normalizeDetentIndex(
    detentIndex ?? defaultDetentIndex,
    bottomDetentCount
  );
  const [customDetentIndex, setCustomDetentIndex] = React.useState(initialDetentIndex);

  const progress = useSharedValue(0);
  const gestureClosePending = useSharedValue(false);
  const isOpenRef = React.useRef(isOpen);
  const previousOpenRef = React.useRef(isOpen);
  const closeIntentRef = React.useRef(false);
  const activeLifecycleRef = React.useRef(isOpen);
  const stateRef = React.useRef<SheetState>(sheetState);
  const requestedDetentIndexRef = React.useRef(initialDetentIndex);
  const animationRef = React.useRef(resolveAnimation(animation));
  const closeReasonRef = React.useRef<SheetCloseReason>('system');
  const presentAnimatedRef = React.useRef(true);
  const dismissAnimatedRef = React.useRef(true);
  const openAnimationFrameRef = React.useRef<number | null>(null);
  const openAnimationStartedRef = React.useRef(false);
  const controlledGestureResetFrameRef = React.useRef<number | null>(null);
  const backdropConfig = React.useMemo(() => resolveBackdrop(backdrop), [backdrop]);
  const resolvedAnimation = React.useMemo(() => resolveAnimation(animation), [animation]);

  const cancelOpenAnimationFrame = React.useCallback(() => {
    if (openAnimationFrameRef.current == null) return;
    cancelAnimationFrame(openAnimationFrameRef.current);
    openAnimationFrameRef.current = null;
  }, []);

  React.useEffect(() => {
    animationRef.current = resolvedAnimation;
  }, [resolvedAnimation]);

  React.useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  React.useEffect(() => {
    stateRef.current = sheetState;
  }, [sheetState]);

  React.useEffect(() => {
    const wasOpen = previousOpenRef.current;

    if (wasOpen && !isOpen) {
      if (!closeIntentRef.current) {
        closeReasonRef.current = 'system';
      }
      closeIntentRef.current = false;
    }

    if (!wasOpen && isOpen) {
      closeIntentRef.current = false;
    }

    previousOpenRef.current = isOpen;
  }, [isOpen]);

  React.useEffect(() => {
    if (detentIndex == null) return;
    const nextIndex = normalizeDetentIndex(detentIndex, bottomDetentCount);
    requestedDetentIndexRef.current = nextIndex;
    setCustomDetentIndex(nextIndex);
  }, [bottomDetentCount, detentIndex]);

  React.useEffect(() => {
    setCustomDetentIndex((currentIndex) => {
      const nextIndex = normalizeDetentIndex(currentIndex, bottomDetentCount);
      requestedDetentIndexRef.current = nextIndex;
      return nextIndex;
    });
  }, [bottomDetentCount]);

  React.useEffect(
    () => () => {
      cancelOpenAnimationFrame();

      if (controlledGestureResetFrameRef.current != null) {
        cancelAnimationFrame(controlledGestureResetFrameRef.current);
        controlledGestureResetFrameRef.current = null;
      }
    },
    [cancelOpenAnimationFrame]
  );

  const emitOpenChange = React.useCallback(
    (nextOpen: boolean, reason: SheetOpenChangeReason, detentIndex?: number) => {
      onOpenChange?.(nextOpen, {
        reason,
        placement,
        detentIndex: resolveDetentIndexForDetails(
          placement,
          normalizeDetentIndex(detentIndex ?? requestedDetentIndexRef.current, bottomDetentCount)
        ),
      });
    },
    [bottomDetentCount, onOpenChange, placement]
  );

  const requestOpenChange = React.useCallback(
    (nextOpen: boolean, reason: SheetOpenChangeReason, detentIndex?: number) => {
      if (disabled && nextOpen) return;

      if (detentIndex != null) {
        const nextIndex = normalizeDetentIndex(detentIndex, bottomDetentCount);
        requestedDetentIndexRef.current = nextIndex;
        if (!usesNativeBottom) setCustomDetentIndex(nextIndex);
      }

      if (nextOpen === isOpenRef.current) return;

      if (nextOpen) {
        activeLifecycleRef.current = true;
        presentAnimatedRef.current = true;
      } else {
        closeReasonRef.current = toCloseReason(reason);
        closeIntentRef.current = true;
        dismissAnimatedRef.current = true;
      }

      if (!isOpenControlled) {
        setInnerOpen(nextOpen);
      }

      emitOpenChange(nextOpen, reason, requestedDetentIndexRef.current);
    },
    [bottomDetentCount, disabled, emitOpenChange, isOpenControlled, usesNativeBottom]
  );

  const finishClosedLifecycle = React.useCallback(() => {
    if (isOpenRef.current) return;

    setSheetState('closed');
    progress.value = 0;
    gestureClosePending.value = false;
    presentAnimatedRef.current = true;
    dismissAnimatedRef.current = true;
    openAnimationStartedRef.current = false;
    setSurfaceReady(false);
    setShellMounted(false);

    if (activeLifecycleRef.current) {
      activeLifecycleRef.current = false;
      onCloseComplete?.({
        reason: closeReasonRef.current,
        placement,
        detentIndex: resolveDetentIndexForDetails(placement, requestedDetentIndexRef.current),
      });
    }
  }, [gestureClosePending, onCloseComplete, placement, progress]);

  const finishOpenLifecycle = React.useCallback(() => {
    if (!isOpenRef.current) return;

    setSheetState('open');
    gestureClosePending.value = false;
    onOpenComplete?.({
      placement,
      detentIndex: resolveDetentIndexForDetails(placement, requestedDetentIndexRef.current),
    });
  }, [gestureClosePending, onOpenComplete, placement]);

  const openSheet = React.useCallback(
    async (options?: SheetOpenOptions) => {
      const targetIndex = normalizeDetentIndex(
        options?.detentIndex ?? requestedDetentIndexRef.current,
        bottomDetentCount
      );
      requestedDetentIndexRef.current = targetIndex;
      presentAnimatedRef.current = options?.animated !== false;

      if (usesNativeBottom) {
        const bottomRef = nativeBottomRef.current;
        if (bottomRef) {
          await bottomRef.open({ detentIndex: targetIndex, animated: options?.animated });
          return;
        }
      }

      setCustomDetentIndex(targetIndex);
      requestOpenChange(true, 'api', targetIndex);
    },
    [bottomDetentCount, requestOpenChange, usesNativeBottom]
  );

  const closeSheet = React.useCallback(
    async (options?: SheetCloseOptions) => {
      dismissAnimatedRef.current = options?.animated !== false;

      if (usesNativeBottom) {
        const bottomRef = nativeBottomRef.current;
        if (bottomRef) {
          await bottomRef.close({ animated: options?.animated });
          return;
        }
      }

      requestOpenChange(false, 'api', requestedDetentIndexRef.current);
    },
    [requestOpenChange, usesNativeBottom]
  );

  const snapTo = React.useCallback(
    async (detentIndex: number) => {
      const targetIndex = normalizeDetentIndex(detentIndex, bottomDetentCount);
      requestedDetentIndexRef.current = targetIndex;

      setCustomDetentIndex(targetIndex);

      if (usesNativeBottom) {
        await nativeBottomRef.current?.snapTo(targetIndex);
      }
    },
    [bottomDetentCount, usesNativeBottom]
  );

  React.useImperativeHandle(
    ref,
    () => ({
      open: openSheet,
      close: closeSheet,
      snapTo,
      getState: () => (usesNativeBottom ? nativeBottomRef.current?.getState() ?? stateRef.current : stateRef.current),
    }),
    [closeSheet, openSheet, snapTo, usesNativeBottom]
  );

  React.useEffect(() => {
    if (usesNativeBottom || !isOpen) return undefined;

    activeLifecycleRef.current = true;
    openAnimationStartedRef.current = false;
    cancelOpenAnimationFrame();
    progress.value = 0;
    gestureClosePending.value = false;
    setLayoutSize({ width: 0, height: 0 });
    setSurfaceReady(false);
    setShellMounted(true);
    setSheetState('opening');

    return undefined;
  }, [cancelOpenAnimationFrame, gestureClosePending, isOpen, progress, usesNativeBottom]);

  React.useEffect(() => {
    if (usesNativeBottom || !isOpen || !shellMounted || !surfaceReady || openAnimationStartedRef.current) {
      return undefined;
    }

    const frame = requestAnimationFrame(() => {
      openAnimationFrameRef.current = null;
      if (!isOpenRef.current) return;

      openAnimationStartedRef.current = true;
      progress.value = withTiming(
        1,
        presentAnimatedRef.current ? animationRef.current.openTiming : { ...animationRef.current.openTiming, duration: 0 },
        (finished) => {
          if (finished) runOnJS(finishOpenLifecycle)();
        }
      );
    });

    openAnimationFrameRef.current = frame;

    return () => {
      if (openAnimationFrameRef.current !== frame) return;
      cancelAnimationFrame(frame);
      openAnimationFrameRef.current = null;
    };
  }, [finishOpenLifecycle, isOpen, progress, shellMounted, surfaceReady, usesNativeBottom]);

  React.useEffect(() => {
    if (usesNativeBottom || isOpen) return undefined;
    if (!shellMounted || stateRef.current === 'closed') return undefined;

    cancelOpenAnimationFrame();
    openAnimationStartedRef.current = false;
    setSurfaceReady(false);
    setSheetState('closing');
    progress.value = withTiming(
      0,
      dismissAnimatedRef.current ? animationRef.current.closeTiming : { ...animationRef.current.closeTiming, duration: 0 },
      (finished) => {
        if (finished) runOnJS(finishClosedLifecycle)();
      }
    );

    return undefined;
  }, [cancelOpenAnimationFrame, finishClosedLifecycle, isOpen, progress, shellMounted, usesNativeBottom]);

  const requestBackdropClose = React.useCallback(() => {
    if (disabled || !dismissible || !backdropConfig.dismissOnPress || !isOpenRef.current) return;
    requestOpenChange(false, 'backdrop', requestedDetentIndexRef.current);
  }, [backdropConfig.dismissOnPress, disabled, dismissible, requestOpenChange]);

  const requestBackClose = React.useCallback(() => {
    if (disabled || !dismissible || !isOpenRef.current) return;
    requestOpenChange(false, 'back', requestedDetentIndexRef.current);
  }, [disabled, dismissible, requestOpenChange]);

  const requestGestureClose = React.useCallback(() => {
    if (disabled || !dismissible || !draggable || !isOpenRef.current) return;
    requestOpenChange(false, 'gesture', requestedDetentIndexRef.current);

    if (!isOpenControlled) return;

    if (controlledGestureResetFrameRef.current != null) {
      cancelAnimationFrame(controlledGestureResetFrameRef.current);
    }

    controlledGestureResetFrameRef.current = requestAnimationFrame(() => {
      controlledGestureResetFrameRef.current = null;
      if (!isOpenRef.current) return;

      gestureClosePending.value = false;
      progress.value = withTiming(1, animationRef.current.openTiming);
    });
  }, [disabled, dismissible, draggable, gestureClosePending, isOpenControlled, progress, requestOpenChange]);

  React.useEffect(() => {
    if (usesNativeBottom || Platform.OS !== 'web' || !isOpen || disabled || !dismissible) return undefined;

    const documentRef = getDocument();
    if (!documentRef) return undefined;

    const handleKeyDown = (event: { key?: string; preventDefault?: () => void }) => {
      if (event.key !== 'Escape') return;
      event.preventDefault?.();
      requestBackClose();
    };

    documentRef.addEventListener('keydown', handleKeyDown);
    return () => documentRef.removeEventListener('keydown', handleKeyDown);
  }, [disabled, dismissible, isOpen, requestBackClose, usesNativeBottom]);

  const context = React.useMemo<SheetRenderContext>(
    () => ({
      isOpen,
      state: sheetState,
      placement,
      detentIndex: resolveDetentIndexForDetails(placement, customDetentIndex),
      open: openSheet,
      close: closeSheet,
      snapTo,
    }),
    [closeSheet, customDetentIndex, isOpen, openSheet, placement, sheetState, snapTo]
  );

  const handleBottomOpenChange = React.useCallback(
    (nextOpen: boolean, meta: { reason: SheetOpenChangeReason; detentIndex: number }) => {
      const reason = meta.reason;
      requestedDetentIndexRef.current = normalizeDetentIndex(meta.detentIndex, bottomDetentCount);

      if (!nextOpen) {
        closeReasonRef.current = toCloseReason(reason);
        closeIntentRef.current = true;
      } else {
        activeLifecycleRef.current = true;
      }

      if (!isOpenControlled) {
        setInnerOpen(nextOpen);
      }

      emitOpenChange(nextOpen, reason, requestedDetentIndexRef.current);
    },
    [bottomDetentCount, emitOpenChange, isOpenControlled]
  );

  const horizontal = placement === 'left' || placement === 'right';
  const fallbackWidth = resolveAxisSize(
    size,
    windowSize.width,
    Math.min(wp(360), windowSize.width * DEFAULT_SIDE_SIZE_RATIO),
    maxWidth
  );
  const resolvedHeight = isBottomPlacement
    ? resolveBottomHeight(bottomDetents, customDetentIndex, windowSize.height, maxHeight)
    : resolveTopHeight(size, windowSize.height, maxHeight);
  const fallbackHeight = resolvedHeight ??
    (isBottomPlacement
      ? Math.min(windowSize.height, maxHeight ?? windowSize.height)
      : Math.min(windowSize.height * DEFAULT_TOP_MAX_RATIO, maxHeight ?? windowSize.height));
  const animatedWidth = horizontal ? fallbackWidth : windowSize.width;
  const animatedHeight = horizontal ? windowSize.height : layoutSize.height || fallbackHeight;
  const closedOffset = getClosedOffset(placement, animatedWidth, animatedHeight);
  const closedDistance = Math.abs(closedOffset);
  const closeDirection = getCloseDirection(placement);
  const closeThreshold = dragCloseThreshold ?? Math.min(closedDistance * 0.36, wp(156));
  const safeAreaEdges = resolveSafeAreaEdges(safeArea, placement);
  const handleConfig: SheetHandleConfig = handle && typeof handle === 'object' ? handle : {};
  const handleVisible = handle !== false;
  const handleCanDrag = handleVisible && draggable && dismissible && !disabled;
  const usesBottomInlineHandle = handleVisible && isBottomPlacement;
  const usesTopInlineHandle = handleVisible && placement === 'top';
  const usesOverlayHandle = handleVisible && horizontal;
  const topHandleReserve = usesTopInlineHandle ? TOP_HANDLE_RESERVE : 0;
  const dragResetTiming = resolvedAnimation.openTiming;
  const dragCloseTiming = resolvedAnimation.closeTiming;
  const surfaceColor = backgroundColor ?? theme.colors.surface;
  const resolvedCornerRadius = cornerRadius ?? wp(22);
  const topMaxHeight = Math.min(
    windowSize.height,
    (maxHeight ?? windowSize.height * DEFAULT_TOP_MAX_RATIO) + topHandleReserve
  );
  const surfaceLayoutStyle: ViewStyle = horizontal
    ? {
        bottom: 0,
        top: 0,
        width: fallbackWidth,
        maxWidth,
        [placement]: -animatedWidth,
      }
    : isBottomPlacement
      ? {
          bottom: -animatedHeight,
          left: 0,
          right: 0,
          height: resolvedHeight,
          maxHeight: maxHeight ?? windowSize.height,
        }
      : {
          left: 0,
          right: 0,
          top: -animatedHeight,
          height: resolvedHeight,
          maxHeight: topMaxHeight,
        };
  const surfaceInsetStyle: ViewStyle = {
    paddingTop:
      (safeAreaEdges.top ? insets.top : 0) ||
      undefined,
    paddingRight:
      (safeAreaEdges.right ? insets.right : 0) +
        (placement === 'left' && usesOverlayHandle ? SIDE_HANDLE_RESERVE : 0) ||
      undefined,
    paddingBottom:
      (safeAreaEdges.bottom ? insets.bottom : 0) ||
      undefined,
    paddingLeft:
      (safeAreaEdges.left ? insets.left : 0) +
        (placement === 'right' && usesOverlayHandle ? SIDE_HANDLE_RESERVE : 0) ||
      undefined,
  };
  const cornerStyle: ViewStyle =
    placement === 'left'
      ? {
          borderTopRightRadius: resolvedCornerRadius,
          borderBottomRightRadius: resolvedCornerRadius,
        }
      : placement === 'right'
        ? {
            borderTopLeftRadius: resolvedCornerRadius,
            borderBottomLeftRadius: resolvedCornerRadius,
          }
        : placement === 'bottom'
          ? {
              borderTopLeftRadius: resolvedCornerRadius,
              borderTopRightRadius: resolvedCornerRadius,
            }
          : {
              borderBottomLeftRadius: resolvedCornerRadius,
              borderBottomRightRadius: resolvedCornerRadius,
            };

  const animatedSurfaceStyle = useAnimatedStyle(() => {
    const translate = -closedOffset * progress.value;
    if (horizontal) return { transform: [{ translateX: translate }] };
    return { transform: [{ translateY: translate }] };
  }, [closedOffset, horizontal]);

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropConfig.opacity * progress.value,
  }), [backdropConfig.opacity]);

  const panGesture = React.useMemo(() => {
    if (!handleCanDrag) return Gesture.Pan().enabled(false);

    const baseGesture = Gesture.Pan().enabled(handleCanDrag);
    const directionalGesture = horizontal
      ? baseGesture.activeOffsetX([-wp(8), wp(8)])
      : baseGesture.activeOffsetY([-wp(8), wp(8)]);

    return directionalGesture
      .onBegin(() => {
        'worklet';
        gestureClosePending.value = false;
      })
      .onUpdate((event) => {
        'worklet';
        const rawDrag =
          placement === 'left'
            ? Math.min(event.translationX, 0)
            : placement === 'right'
              ? Math.max(event.translationX, 0)
              : placement === 'top'
                ? Math.min(event.translationY, 0)
                : Math.max(event.translationY, 0);
        const boundedDrag =
          closeDirection > 0
            ? Math.min(rawDrag, closedDistance)
            : Math.max(rawDrag, -closedDistance);
        progress.value = closedDistance <= 0 ? 1 : 1 - Math.abs(boundedDrag) / closedDistance;
      })
      .onEnd((event) => {
        'worklet';
        const velocity = horizontal ? event.velocityX : event.velocityY;
        const distance = closedDistance * (1 - progress.value);
        const shouldClose =
          distance >= closeThreshold ||
          velocity * closeDirection >= dragVelocityThreshold;

        if (shouldClose) {
          gestureClosePending.value = true;
          progress.value = withTiming(0, dragCloseTiming);
          runOnJS(requestGestureClose)();
        }
      })
      .onFinalize(() => {
        'worklet';
        if (gestureClosePending.value) return;
        progress.value = withTiming(1, dragResetTiming);
      });
  }, [
    closeDirection,
    closedDistance,
    closeThreshold,
    dragCloseTiming,
    dragResetTiming,
    dragVelocityThreshold,
    gestureClosePending,
    handleCanDrag,
    horizontal,
    placement,
    progress,
    requestGestureClose,
  ]);

  const handleIndicator = handleVisible ? (
    <View
      style={[
        horizontal ? styles.verticalHandle : styles.horizontalHandle,
        {
          backgroundColor: handleConfig.color ?? theme.colors.border,
          borderRadius: handleConfig.radius ?? wp(2),
          height: horizontal ? handleConfig.width ?? wp(36) : handleConfig.height ?? wp(4),
          width: horizontal ? handleConfig.height ?? wp(4) : handleConfig.width ?? wp(36),
        },
      ]}
    />
  ) : null;

  const inlineHandle = usesBottomInlineHandle ? (
    <GestureDetector gesture={panGesture}>
      <View
        accessibilityRole={handleCanDrag ? 'adjustable' : undefined}
        style={styles.inlineHandleHost}
      >
        {handleIndicator}
      </View>
    </GestureDetector>
  ) : null;

  const topInlineHandle = usesTopInlineHandle ? (
    <GestureDetector gesture={panGesture}>
      <View
        accessibilityRole={handleCanDrag ? 'adjustable' : undefined}
        style={styles.topHandleHost}
      >
        {handleIndicator}
      </View>
    </GestureDetector>
  ) : null;

  const overlayHandle = usesOverlayHandle ? (
    <GestureDetector gesture={panGesture}>
      <View
        accessibilityRole={handleCanDrag ? 'adjustable' : undefined}
        style={[
          styles.handleHost,
          placement === 'left' ? styles.handleHostRight : styles.handleHostLeft,
        ]}
      >
        {handleIndicator}
      </View>
    </GestureDetector>
  ) : null;

  if (usesNativeBottom) {
    return (
      <NativeBottomSheet
        ref={nativeBottomRef}
        open={isOpen}
        onOpenChange={handleBottomOpenChange}
        onOpenComplete={(payload) => {
          requestedDetentIndexRef.current = payload.index;
          onOpenComplete?.({
            placement: 'bottom',
            detentIndex: payload.index,
          });
        }}
        onCloseComplete={(details) => {
          closeReasonRef.current = details.reason;
          requestedDetentIndexRef.current = details.detentIndex;
          onCloseComplete?.({
            reason: details.reason,
            placement: 'bottom',
            detentIndex: details.detentIndex,
          });
        }}
        detents={bottomDetents}
        detentIndex={detentIndex}
        defaultDetentIndex={defaultDetentIndex}
        onDetentChange={(index, payload) => {
          requestedDetentIndexRef.current = index;
          onDetentChange?.(index, payload);
        }}
        disabled={disabled}
        dismissible={dismissible}
        draggable={draggable}
        backdrop={backdrop}
        title={title}
        description={description}
        header={
          header === undefined
            ? undefined
            : (bottomContext) => renderSlot(header, bottomContext)
        }
        footer={
          footer === undefined
            ? undefined
            : (bottomContext) => renderSlot(footer, bottomContext)
        }
        backgroundColor={backgroundColor}
        cornerRadius={cornerRadius}
        maxHeight={maxHeight}
        maxWidth={maxWidth}
        handle={handle}
        style={style}
        headerStyle={headerStyle}
        footerStyle={footerStyle}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        backdropAccessibilityLabel={backdropAccessibilityLabel}
        nativeProps={nativeProps}
      >
        {children === undefined
          ? undefined
          : (bottomContext) => renderSlot(children, bottomContext)}
      </NativeBottomSheet>
    );
  }

  if (!shellMounted) return null;

  const resolvedHeader =
    header !== undefined || title != null || description != null ? (
      header !== undefined ? (
        renderSlot(header, context)
      ) : (
        <SheetHeader title={title} description={description} style={headerStyle} />
      )
    ) : null;
  const resolvedFooter = footer !== undefined ? renderSlot(footer, context) : null;
  const resolvedChildren = renderSlot(children, context);

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={requestBackClose}
    >
      <GestureHandlerRootView style={styles.modalRoot}>
        <View style={styles.modalRoot} pointerEvents="box-none">
          {backdropConfig.visible ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={backdropAccessibilityLabel}
              disabled={disabled || !dismissible || !backdropConfig.dismissOnPress}
              onPress={requestBackdropClose}
              style={StyleSheet.absoluteFill}
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: backdropConfig.color },
                  styles.closedBackdrop,
                  animatedBackdropStyle,
                ]}
              />
            </Pressable>
          ) : null}

          <Animated.View
            testID={testID}
            accessibilityLabel={accessibilityLabel}
            accessibilityViewIsModal
            importantForAccessibility="yes"
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              const sizeChanged = width !== layoutSize.width || height !== layoutSize.height;
              if (sizeChanged) setLayoutSize({ width, height });
              if (!surfaceReady) setSurfaceReady(true);
            }}
            style={[
              styles.surface,
              surfaceLayoutStyle,
              cornerStyle,
              surfaceInsetStyle,
              { backgroundColor: surfaceColor, borderColor: theme.colors.border },
              style,
              animatedSurfaceStyle,
            ]}
          >
            {usesTopInlineHandle ? (
              <>
                <View style={styles.topContentHost}>
                  {resolvedHeader}
                  {resolvedChildren}
                  {resolvedFooter != null ? <View style={footerStyle}>{resolvedFooter}</View> : null}
                </View>
                {topInlineHandle}
              </>
            ) : (
              <>
                {inlineHandle}
                {overlayHandle}
                {resolvedHeader}
                {resolvedChildren}
                {resolvedFooter != null ? <View style={footerStyle}>{resolvedFooter}</View> : null}
              </>
            )}
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
});

type SheetComponent = React.ForwardRefExoticComponent<
  SheetProps & React.RefAttributes<SheetRef>
> & {
  Header: typeof SheetHeader;
  Content: typeof SheetContent;
  Footer: typeof SheetFooter;
};

export const Sheet = Object.assign(SheetRoot, {
  Header: SheetHeader,
  Content: SheetContent,
  Footer: SheetFooter,
}) as SheetComponent;

const styles = StyleSheet.create({
  modalRoot: {
    ...StyleSheet.absoluteFillObject,
  },
  surface: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'absolute',
  },
  closedBackdrop: {
    opacity: 0,
  },
  handleHost: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    zIndex: 2,
  },
  handleHostLeft: {
    bottom: 0,
    left: SIDE_HANDLE_INSET,
    top: 0,
    width: SIDE_HANDLE_WIDTH,
  },
  handleHostRight: {
    bottom: 0,
    right: SIDE_HANDLE_INSET,
    top: 0,
    width: SIDE_HANDLE_WIDTH,
  },
  inlineHandleHost: {
    alignItems: 'center',
    flexShrink: 0,
    height: BOTTOM_HANDLE_RESERVE,
    justifyContent: 'center',
  },
  topContentHost: {
    flexShrink: 1,
    marginBottom: TOP_HANDLE_RESERVE,
    overflow: 'hidden',
  },
  topHandleHost: {
    alignItems: 'center',
    bottom: 0,
    height: TOP_HANDLE_RESERVE,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 2,
  },
  horizontalHandle: {
    flexShrink: 0,
  },
  verticalHandle: {
    flexShrink: 0,
  },
});
