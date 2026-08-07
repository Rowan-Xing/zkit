import * as React from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import {
  TrueSheet,
  type DetentInfoEventPayload,
  type SheetDetent as NativeSheetDetent,
  type TrueSheetProps,
} from '@lodev09/react-native-true-sheet';
import { wp } from 'zkit-tools';
import { useTheme } from '../../theme/useTheme';
import { SheetHeader } from './slots';
import type {
  SheetBackdropConfig,
  SheetCloseOptions,
  SheetCloseReason,
  SheetDetent,
  SheetDetentChangePayload,
  SheetHandleConfig,
  SheetNativeProps,
  SheetOpenChangeReason,
  SheetOpenOptions,
  SheetRenderContext,
  SheetSlot,
  SheetState,
} from './types';

export type NativeBottomSheetOpenChangeDetails = {
  reason: SheetOpenChangeReason;
  detentIndex: number;
};

export type NativeBottomSheetCloseCompleteDetails = {
  reason: SheetCloseReason;
  detentIndex: number;
};

export type NativeBottomSheetRef = {
  open: (options?: SheetOpenOptions) => Promise<void>;
  close: (options?: SheetCloseOptions) => Promise<void>;
  snapTo: (detentIndex: number) => Promise<void>;
  getState: () => SheetState;
};

export type NativeBottomSheetProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: NativeBottomSheetOpenChangeDetails) => void;
  onOpenComplete?: (payload: SheetDetentChangePayload) => void;
  onCloseComplete?: (details: NativeBottomSheetCloseCompleteDetails) => void;

  detents?: readonly SheetDetent[];
  detentIndex?: number;
  defaultDetentIndex?: number;
  onDetentChange?: (index: number, payload: SheetDetentChangePayload) => void;

  disabled?: boolean;
  dismissible?: boolean;
  draggable?: boolean;
  backdrop?: boolean | SheetBackdropConfig;

  title?: React.ReactNode;
  description?: React.ReactNode;
  header?: SheetSlot;
  footer?: SheetSlot;
  children?: SheetSlot;

  backgroundColor?: TrueSheetProps['backgroundColor'];
  cornerRadius?: number;
  maxHeight?: number;
  maxWidth?: number;
  handle?: boolean | SheetHandleConfig;
  style?: StyleProp<ViewStyle>;
  headerStyle?: StyleProp<ViewStyle>;
  footerStyle?: StyleProp<ViewStyle>;

  testID?: ViewProps['testID'];
  accessibilityLabel?: ViewProps['accessibilityLabel'];
  backdropAccessibilityLabel?: string;

  nativeProps?: SheetNativeProps;
};

type NativePhase = 'idle' | 'presenting' | 'presented' | 'dismissing';
type ManualModalPhase = 'hidden' | 'showing' | 'shown' | 'hiding';
type ResolvedBackdrop = Required<SheetBackdropConfig>;

const DEFAULT_DETENTS: readonly SheetDetent[] = ['content'];
const DEFAULT_BACKDROP_OPACITY = 0.42;
const DEFAULT_DISMISSIBLE = true;
const DEFAULT_DRAGGABLE = true;
const DEFAULT_HANDLE_VISIBLE = true;
const IOS_SYSTEM_CORNER_RADIUS_MAJOR_VERSION = 26;

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function silentlyCatchPromise(value: unknown) {
  const maybePromise = value as { catch?: (onRejected: () => void) => unknown } | null | undefined;
  if (typeof maybePromise?.catch === 'function') {
    maybePromise.catch(() => {});
  }
}

function normalizeDetent(detent: SheetDetent): NativeSheetDetent {
  if (detent === 'content' || detent === 'auto') return 'auto';
  if (detent === 'medium') return 0.5;
  if (detent === 'large') return 0.9;
  if (detent === 'full') return 1;

  if (typeof detent === 'string' && detent.endsWith('%')) {
    const percent = Number.parseFloat(detent.slice(0, -1));
    if (Number.isFinite(percent) && percent > 0) {
      return clampNumber(percent / 100, 0.1, 1);
    }
    return 'auto';
  }

  if (typeof detent === 'number' && Number.isFinite(detent) && detent > 0) {
    return clampNumber(detent, 0.1, 1);
  }

  return 'auto';
}

function normalizeDetents(detents: readonly SheetDetent[] | undefined) {
  const source = detents?.length ? detents : DEFAULT_DETENTS;
  const semantic = source.slice(0, 3);
  return {
    semantic,
    native: semantic.map(normalizeDetent),
  };
}

function normalizeDetentIndex(index: number | undefined, length: number) {
  if (!Number.isFinite(index)) return 0;
  return clampNumber(Math.round(index ?? 0), 0, Math.max(0, length - 1));
}

function getIOSMajorVersion() {
  if (Platform.OS !== 'ios') return undefined;
  const version = Platform.Version;
  const major = typeof version === 'number' ? version : Number.parseInt(String(version).split('.')[0] ?? '', 10);
  return Number.isFinite(major) ? major : undefined;
}

function getDefaultCornerRadius() {
  const iosMajorVersion = getIOSMajorVersion();
  if (iosMajorVersion != null && iosMajorVersion >= IOS_SYSTEM_CORNER_RADIUS_MAJOR_VERSION) {
    return undefined;
  }

  return wp(22);
}

function resolveBackdrop(backdrop: NativeBottomSheetProps['backdrop']): ResolvedBackdrop {
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

function toNativeSlot(slot: React.ReactNode): TrueSheetProps['header'] {
  if (slot == null || typeof slot === 'boolean') return undefined;
  if (React.isValidElement(slot)) return slot;
  return <View>{slot}</View>;
}

function createDetentPayload(
  event: DetentInfoEventPayload,
  semanticDetents: readonly SheetDetent[],
  nativeDetents: readonly NativeSheetDetent[]
): SheetDetentChangePayload {
  const index = normalizeDetentIndex(event.index, semanticDetents.length);
  return {
    index,
    detent: semanticDetents[index] ?? DEFAULT_DETENTS[0],
    nativeDetent: nativeDetents[index] ?? 'auto',
    position: event.position,
    placement: 'bottom',
  };
}

export const NativeBottomSheet = React.forwardRef<NativeBottomSheetRef, NativeBottomSheetProps>(
  function NativeBottomSheet(
    {
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      onOpenComplete,
      onCloseComplete,
      detents,
      detentIndex: detentIndexProp,
      defaultDetentIndex = 0,
      onDetentChange,
      disabled = false,
      dismissible = DEFAULT_DISMISSIBLE,
      draggable = DEFAULT_DRAGGABLE,
      backdrop,
      title,
      description,
      header,
      footer,
      children,
      backgroundColor,
      cornerRadius,
      maxHeight,
      maxWidth,
      handle = DEFAULT_HANDLE_VISIBLE,
      style,
      headerStyle,
      footerStyle,
      testID,
      accessibilityLabel,
      backdropAccessibilityLabel = 'Close sheet',
      nativeProps,
    },
    ref
  ) {
    const theme = useTheme();
    const isOpenControlled = openProp !== undefined;
    const [innerOpen, setInnerOpen] = React.useState(defaultOpen);
    const isOpen = isOpenControlled ? !!openProp : innerOpen;
    const { semantic: semanticDetents, native: nativeDetents } = React.useMemo(
      () => normalizeDetents(detents),
      [detents]
    );
    const defaultIndex = normalizeDetentIndex(defaultDetentIndex, nativeDetents.length);
    const controlledDetentIndex =
      detentIndexProp == null ? undefined : normalizeDetentIndex(detentIndexProp, nativeDetents.length);
    const initialDetentIndex = controlledDetentIndex ?? defaultIndex;
    const [currentDetentIndex, setCurrentDetentIndex] = React.useState(initialDetentIndex);
    const [sheetState, setSheetState] = React.useState<SheetState>(isOpen ? 'opening' : 'closed');
    const [shellMounted, setShellMounted] = React.useState(isOpen);

    const nativeRef = React.useRef<TrueSheet>(null);
    const phaseRef = React.useRef<NativePhase>('idle');
    const pendingDismissRef = React.useRef(false);
    const activeLifecycleRef = React.useRef(isOpen);
    const isOpenRef = React.useRef(isOpen);
    const stateRef = React.useRef<SheetState>(sheetState);
    const currentDetentIndexRef = React.useRef(currentDetentIndex);
    const requestedOpenIndexRef = React.useRef(initialDetentIndex);
    const presentAnimatedRef = React.useRef(true);
    const dismissAnimatedRef = React.useRef(true);
    const closeReasonRef = React.useRef<SheetCloseReason>('system');
    const hasRequestedCloseReasonRef = React.useRef(false);
    const nativeOperationIdRef = React.useRef(0);
    const backdropConfig = React.useMemo(() => resolveBackdrop(backdrop), [backdrop]);
    const usesManualBackdrop = Platform.OS === 'ios' && backdropConfig.visible;
    // The outer RN Modal owns a separate native presentation lifecycle on iOS.
    // Keep it mounted through onDismiss so a rapid reopen cannot overlap that dismissal.
    const [manualModalVisible, setManualModalVisible] = React.useState(usesManualBackdrop && isOpen);
    const [manualModalReady, setManualModalReady] = React.useState(false);
    const manualModalPhaseRef = React.useRef<ManualModalPhase>(
      usesManualBackdrop && isOpen ? 'showing' : 'hidden'
    );
    const manualCloseShouldSyncRef = React.useRef(false);
    const backdropOpacity = React.useRef(
      new Animated.Value(usesManualBackdrop && isOpen ? backdropConfig.opacity : 0)
    ).current;
    const [manualBackdropMounted, setManualBackdropMounted] = React.useState(usesManualBackdrop && isOpen);

    React.useEffect(() => {
      isOpenRef.current = isOpen;
    }, [isOpen]);

    React.useEffect(() => {
      stateRef.current = sheetState;
    }, [sheetState]);

    React.useEffect(() => {
      currentDetentIndexRef.current = currentDetentIndex;
    }, [currentDetentIndex]);

    React.useEffect(() => {
      if (controlledDetentIndex == null) return;
      requestedOpenIndexRef.current = controlledDetentIndex;

      if (!isOpen || phaseRef.current !== 'presented') return;
      if (controlledDetentIndex === currentDetentIndexRef.current) return;

      silentlyCatchPromise(nativeRef.current?.resize(controlledDetentIndex));
    }, [controlledDetentIndex, isOpen]);

    React.useEffect(() => {
      if (!usesManualBackdrop) return;

      backdropOpacity.stopAnimation();

      if (isOpen) {
        setManualBackdropMounted(true);
        Animated.timing(backdropOpacity, {
          toValue: backdropConfig.opacity,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
        return;
      }

      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 120,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !isOpenRef.current) {
          setManualBackdropMounted(false);
        }
      });
    }, [backdropConfig.opacity, backdropOpacity, isOpen, usesManualBackdrop]);

    const emitOpenChange = React.useCallback(
      (nextOpen: boolean, reason: SheetOpenChangeReason, detentIndex?: number) => {
        onOpenChange?.(nextOpen, {
          reason,
          detentIndex: normalizeDetentIndex(detentIndex ?? currentDetentIndexRef.current, nativeDetents.length),
        });
      },
      [nativeDetents.length, onOpenChange]
    );

    const setOpen = React.useCallback(
      (nextOpen: boolean, reason: SheetOpenChangeReason, detentIndex?: number) => {
        if (disabled && nextOpen) return;

        if (nextOpen) {
          requestedOpenIndexRef.current = normalizeDetentIndex(
            detentIndex ?? requestedOpenIndexRef.current,
            nativeDetents.length
          );
          presentAnimatedRef.current = true;
          activeLifecycleRef.current = true;
          pendingDismissRef.current = false;
          hasRequestedCloseReasonRef.current = false;
          if (!isOpenControlled) setInnerOpen(true);
          emitOpenChange(true, 'api', requestedOpenIndexRef.current);
          return;
        }

        closeReasonRef.current = reason === 'api' ? 'api' : reason;
        hasRequestedCloseReasonRef.current = true;
        if (!isOpenControlled) setInnerOpen(false);
        emitOpenChange(false, reason, currentDetentIndexRef.current);
      },
      [disabled, emitOpenChange, isOpenControlled, nativeDetents.length]
    );

    const finishClosedLifecycle = React.useCallback(
      (shouldSyncOpenState: boolean, keepShellMounted = false) => {
        nativeOperationIdRef.current += 1;
        phaseRef.current = 'idle';
        pendingDismissRef.current = false;
        presentAnimatedRef.current = true;
        dismissAnimatedRef.current = true;
        setManualModalReady(false);
        setSheetState('closed');

        if (shouldSyncOpenState) {
          if (!isOpenControlled) setInnerOpen(false);
          emitOpenChange(false, closeReasonRef.current, currentDetentIndexRef.current);
        }

        if (!keepShellMounted) {
          setShellMounted(false);
        }

        if (activeLifecycleRef.current) {
          activeLifecycleRef.current = false;
          onCloseComplete?.({
            reason: closeReasonRef.current,
            detentIndex: currentDetentIndexRef.current,
          });
        }
      },
      [emitOpenChange, isOpenControlled, onCloseComplete]
    );

    const startManualModalDismiss = React.useCallback(
      (shouldSyncOpenState: boolean) => {
        manualCloseShouldSyncRef.current =
          manualCloseShouldSyncRef.current || shouldSyncOpenState;
        nativeOperationIdRef.current += 1;
        phaseRef.current = 'idle';
        pendingDismissRef.current = false;
        setManualModalReady(false);
        setSheetState('closing');

        if (manualModalPhaseRef.current === 'hidden') {
          finishClosedLifecycle(manualCloseShouldSyncRef.current);
          manualCloseShouldSyncRef.current = false;
          return;
        }

        if (manualModalPhaseRef.current !== 'hiding') {
          manualModalPhaseRef.current = 'hiding';
          setManualModalVisible(false);
        }
      },
      [finishClosedLifecycle]
    );

    const recoverNativeOperation = React.useCallback(
      (operation: 'present' | 'dismiss') => {
        if (operation === 'present') {
          closeReasonRef.current = 'system';
        }
        const shouldSyncOpenState = isOpenRef.current;

        if (usesManualBackdrop) {
          startManualModalDismiss(shouldSyncOpenState);
          return;
        }

        finishClosedLifecycle(shouldSyncOpenState);
      },
      [finishClosedLifecycle, startManualModalDismiss, usesManualBackdrop]
    );

    const requestDismiss = React.useCallback(
      (reason: SheetCloseReason) => {
        const phase = phaseRef.current;

        if (
          phase === 'dismissing' ||
          (usesManualBackdrop && manualModalPhaseRef.current === 'hiding')
        ) {
          return;
        }

        if (phase === 'presenting') {
          if (!pendingDismissRef.current) {
            closeReasonRef.current = reason;
          }
          pendingDismissRef.current = true;
          return;
        }

        closeReasonRef.current = reason;

        if (phase === 'presented') {
          const sheet = nativeRef.current;
          if (!sheet) {
            if (usesManualBackdrop) {
              startManualModalDismiss(false);
            } else {
              finishClosedLifecycle(false);
            }
            return;
          }

          pendingDismissRef.current = false;
          phaseRef.current = 'dismissing';
          setSheetState('closing');
          const operationId = ++nativeOperationIdRef.current;
          void sheet.dismiss(dismissAnimatedRef.current).catch(() => {
            if (
              operationId !== nativeOperationIdRef.current ||
              phaseRef.current !== 'dismissing'
            ) {
              return;
            }
            recoverNativeOperation('dismiss');
          });
          return;
        }

        if (!activeLifecycleRef.current) return;

        if (usesManualBackdrop) {
          startManualModalDismiss(false);
        } else {
          finishClosedLifecycle(false);
        }
      },
      [
        finishClosedLifecycle,
        recoverNativeOperation,
        startManualModalDismiss,
        usesManualBackdrop,
      ]
    );

    React.useEffect(() => {
      if (isOpen) {
        activeLifecycleRef.current = true;
        requestedOpenIndexRef.current = controlledDetentIndex ?? requestedOpenIndexRef.current;

        if (!shellMounted) {
          setShellMounted(true);
        }

        if (usesManualBackdrop && manualModalPhaseRef.current === 'hidden') {
          manualCloseShouldSyncRef.current = false;
          manualModalPhaseRef.current = 'showing';
          setManualModalReady(false);
          setManualModalVisible(true);
        }
        return;
      }

      if (shellMounted) {
        const reason = hasRequestedCloseReasonRef.current ? closeReasonRef.current : 'system';
        hasRequestedCloseReasonRef.current = false;
        requestDismiss(reason);
      }
    }, [
      controlledDetentIndex,
      isOpen,
      requestDismiss,
      shellMounted,
      usesManualBackdrop,
    ]);

    React.useEffect(() => {
      if (!isOpen || !shellMounted) return undefined;
      if (usesManualBackdrop && !manualModalReady) return undefined;

      const present = () => {
        if (!isOpenRef.current || phaseRef.current !== 'idle') return;
        if (
          usesManualBackdrop &&
          manualModalPhaseRef.current !== 'shown'
        ) {
          return;
        }

        const sheet = nativeRef.current;
        if (!sheet) return;

        const targetIndex = normalizeDetentIndex(
          controlledDetentIndex ?? requestedOpenIndexRef.current,
          nativeDetents.length
        );

        pendingDismissRef.current = false;
        phaseRef.current = 'presenting';
        setSheetState('opening');
        setCurrentDetentIndex(targetIndex);
        const operationId = ++nativeOperationIdRef.current;
        void sheet.present(targetIndex, presentAnimatedRef.current).catch(() => {
          if (
            operationId !== nativeOperationIdRef.current ||
            phaseRef.current !== 'presenting'
          ) {
            return;
          }
          recoverNativeOperation('present');
        });
      };

      if (usesManualBackdrop) {
        present();
        return undefined;
      }

      const rafId = requestAnimationFrame(present);
      return () => cancelAnimationFrame(rafId);
    }, [
      controlledDetentIndex,
      isOpen,
      manualModalReady,
      nativeDetents.length,
      recoverNativeOperation,
      shellMounted,
      usesManualBackdrop,
    ]);

    const openSheet = React.useCallback(
      async (options?: SheetOpenOptions) => {
        const targetIndex = normalizeDetentIndex(
          options?.detentIndex ?? requestedOpenIndexRef.current,
          nativeDetents.length
        );
        requestedOpenIndexRef.current = targetIndex;
        presentAnimatedRef.current = options?.animated !== false;

        if (isOpenRef.current && phaseRef.current === 'presented') {
          await nativeRef.current?.resize(targetIndex);
          return;
        }

        setOpen(true, 'api', targetIndex);
      },
      [nativeDetents.length, setOpen]
    );

    const closeSheet = React.useCallback(
      async (options?: SheetCloseOptions) => {
        dismissAnimatedRef.current = options?.animated !== false;
        setOpen(false, 'api', currentDetentIndexRef.current);
      },
      [setOpen]
    );

    const snapTo = React.useCallback(
      async (detentIndex: number) => {
        const targetIndex = normalizeDetentIndex(detentIndex, nativeDetents.length);
        requestedOpenIndexRef.current = targetIndex;
        if (!isOpenRef.current || phaseRef.current !== 'presented') return;
        await nativeRef.current?.resize(targetIndex);
      },
      [nativeDetents.length]
    );

    React.useImperativeHandle(
      ref,
      () => ({
        open: openSheet,
        close: closeSheet,
        snapTo,
        getState: () => stateRef.current,
      }),
      [closeSheet, openSheet, snapTo]
    );

    const context = React.useMemo<SheetRenderContext>(
      () => ({
        isOpen,
        state: sheetState,
        placement: 'bottom',
        detentIndex: currentDetentIndex,
        open: openSheet,
        close: closeSheet,
        snapTo,
      }),
      [closeSheet, currentDetentIndex, isOpen, openSheet, sheetState, snapTo]
    );

    const handleDidPresent = React.useCallback(
      (event: { nativeEvent: DetentInfoEventPayload }) => {
        const payload = createDetentPayload(event.nativeEvent, semanticDetents, nativeDetents);
        phaseRef.current = 'presented';
        setSheetState('open');
        setCurrentDetentIndex(payload.index);
        currentDetentIndexRef.current = payload.index;
        onOpenComplete?.(payload);

        if (pendingDismissRef.current || !isOpenRef.current) {
          requestDismiss(closeReasonRef.current);
        }
      },
      [nativeDetents, onOpenComplete, requestDismiss, semanticDetents]
    );

    const handleDidDismiss = React.useCallback(() => {
      const wasRequestedDismiss = phaseRef.current === 'dismissing' || pendingDismissRef.current;
      const shouldSyncOpenState = isOpenRef.current && !wasRequestedDismiss;
      if (shouldSyncOpenState) {
        closeReasonRef.current = closeReasonRef.current === 'system' ? 'gesture' : closeReasonRef.current;
      }

      if (usesManualBackdrop) {
        startManualModalDismiss(shouldSyncOpenState);
      } else {
        finishClosedLifecycle(shouldSyncOpenState);
      }
    }, [finishClosedLifecycle, startManualModalDismiss, usesManualBackdrop]);

    const handleManualModalShow = React.useCallback(() => {
      if (manualModalPhaseRef.current !== 'showing') return;

      if (!isOpenRef.current) {
        startManualModalDismiss(false);
        return;
      }

      manualModalPhaseRef.current = 'shown';
      // onShow is the native readiness barrier for presenting the nested TrueSheet.
      setManualModalReady(true);
    }, [startManualModalDismiss]);

    const handleManualModalDismiss = React.useCallback(() => {
      const shouldSyncOpenState = manualCloseShouldSyncRef.current;
      const shouldReopen = isOpenRef.current && !shouldSyncOpenState;
      const reopenAnimated = presentAnimatedRef.current;

      manualModalPhaseRef.current = 'hidden';
      manualCloseShouldSyncRef.current = false;
      setManualModalReady(false);
      setManualModalVisible(false);
      // Only onDismiss guarantees that UIKit has removed the outer presenter.
      finishClosedLifecycle(shouldSyncOpenState, shouldReopen);

      if (!shouldReopen) return;

      activeLifecycleRef.current = true;
      hasRequestedCloseReasonRef.current = false;
      presentAnimatedRef.current = reopenAnimated;
      phaseRef.current = 'idle';
      manualModalPhaseRef.current = 'showing';
      setSheetState('opening');
      setManualModalVisible(true);
    }, [finishClosedLifecycle]);

    const handleDetentChange = React.useCallback(
      (event: { nativeEvent: DetentInfoEventPayload }) => {
        const payload = createDetentPayload(event.nativeEvent, semanticDetents, nativeDetents);
        if (detentIndexProp == null) {
          setCurrentDetentIndex(payload.index);
        }
        currentDetentIndexRef.current = payload.index;
        onDetentChange?.(payload.index, payload);
      },
      [detentIndexProp, nativeDetents, onDetentChange, semanticDetents]
    );

    const handleBackPress = React.useCallback(() => {
      closeReasonRef.current = 'back';
      return nativeProps?.onBackPress?.() ?? true;
    }, [nativeProps]);

    const handleBackdropPress = React.useCallback(() => {
      if (disabled || !dismissible || !backdropConfig.dismissOnPress || !isOpenRef.current) return;
      closeReasonRef.current = 'backdrop';
      setOpen(false, 'backdrop', currentDetentIndexRef.current);
    }, [backdropConfig.dismissOnPress, disabled, dismissible, setOpen]);

    const resolvedHeader = toNativeSlot(
      header !== undefined || title != null || description != null ? (
        header !== undefined ? (
          renderSlot(header, context)
        ) : (
          <SheetHeader title={title} description={description} />
        )
      ) : undefined
    );
    const resolvedFooter = toNativeSlot(footer !== undefined ? renderSlot(footer, context) : undefined);
    const resolvedChildren = renderSlot(children, context);
    const handleConfig = handle && typeof handle === 'object' ? handle : {};
    const handleVisible = handle !== false;
    const surfaceColor = backgroundColor ?? theme.colors.surface;
    const resolvedCornerRadius = cornerRadius ?? getDefaultCornerRadius();

    const sheetNode = (
      <TrueSheet
        {...nativeProps}
        ref={nativeRef}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        detents={nativeDetents}
        dimmed={backdropConfig.visible && !usesManualBackdrop}
        dimmedDetentIndex={0}
        dismissible={!disabled && dismissible}
        draggable={!disabled && draggable}
        backgroundColor={surfaceColor}
        cornerRadius={resolvedCornerRadius}
        grabber={handleVisible}
        grabberOptions={
          handleVisible
            ? {
                width: handleConfig.width ?? wp(36),
                height: handleConfig.height ?? wp(4),
                topMargin: handleConfig.topMargin ?? wp(10),
                cornerRadius: handleConfig.radius ?? wp(2),
                color: handleConfig.color ?? theme.colors.border,
              }
            : undefined
        }
        maxContentHeight={maxHeight}
        maxContentWidth={maxWidth}
        header={resolvedHeader}
        headerStyle={headerStyle}
        footer={resolvedFooter}
        footerStyle={footerStyle}
        style={style}
        onDidPresent={handleDidPresent}
        onDidDismiss={handleDidDismiss}
        onDetentChange={handleDetentChange}
        onBackPress={handleBackPress}
      >
        {resolvedChildren}
      </TrueSheet>
    );

    if (!shellMounted) return null;

    if (usesManualBackdrop) {
      return (
        <Modal
          visible={manualModalVisible}
          transparent
          animationType="none"
          statusBarTranslucent
          presentationStyle="overFullScreen"
          onShow={handleManualModalShow}
          onDismiss={handleManualModalDismiss}
          onRequestClose={handleBackdropPress}
        >
          <View style={styles.modalRoot} pointerEvents="box-none">
            {manualBackdropMounted ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={backdropAccessibilityLabel}
                disabled={disabled || !dismissible || !backdropConfig.dismissOnPress}
                onPress={handleBackdropPress}
                style={StyleSheet.absoluteFill}
              >
                <Animated.View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: backdropConfig.color,
                      opacity: backdropOpacity,
                    },
                  ]}
                />
              </Pressable>
            ) : null}
            {sheetNode}
          </View>
        </Modal>
      );
    }

    return sheetNode;
  }
);

const styles = StyleSheet.create({
  modalRoot: {
    ...StyleSheet.absoluteFillObject,
  },
});
