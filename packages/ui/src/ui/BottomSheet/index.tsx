import * as React from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ColorValue,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import {
  TrueSheet,
  TrueSheetProvider,
  type DetentInfoEventPayload,
  type SheetDetent as NativeSheetDetent,
  type TrueSheetProps,
} from '@lodev09/react-native-true-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { wp } from 'zkit-tools';
import { useTheme } from '../../theme/useTheme';
import { Text } from '../Text';

export type BottomSheetDetent =
  | 'content'
  | 'auto'
  | 'medium'
  | 'large'
  | 'full'
  | `${number}%`
  | number;

export type BottomSheetCloseReason = 'api' | 'backdrop' | 'back' | 'gesture' | 'system';
export type BottomSheetOpenChangeReason = BottomSheetCloseReason | 'default';
export type BottomSheetState = 'closed' | 'opening' | 'open' | 'closing';
export type BottomSheetMountStrategy = 'eager' | 'lazy' | 'unmountOnExit';

export type BottomSheetOpenChangeMeta = {
  reason: BottomSheetOpenChangeReason;
  detentIndex: number;
};

export type BottomSheetDetentChangePayload = {
  index: number;
  detent: BottomSheetDetent;
  nativeDetent: NativeSheetDetent;
  position: number;
};

export type BottomSheetBackdropConfig = {
  visible?: boolean;
  dismissOnPress?: boolean;
  color?: string;
  opacity?: number;
};

export type BottomSheetHandleConfig = {
  width?: number;
  height?: number;
  topMargin?: number;
  radius?: number;
  color?: ColorValue;
};

export type BottomSheetRenderContext = {
  isOpen: boolean;
  state: BottomSheetState;
  detentIndex: number;
  open: (detentIndex?: number) => Promise<void>;
  close: () => Promise<void>;
  snapTo: (detentIndex: number) => Promise<void>;
};

export type BottomSheetRef = {
  open: (detentIndex?: number, options?: { animated?: boolean }) => Promise<void>;
  close: (options?: { animated?: boolean }) => Promise<void>;
  snapTo: (detentIndex: number) => Promise<void>;
  dismissStack: (options?: { animated?: boolean }) => Promise<void>;
  getState: () => BottomSheetState;
};

type ManagedNativeProps =
  | 'name'
  | 'children'
  | 'detents'
  | 'initialDetentIndex'
  | 'initialDetentAnimated'
  | 'dimmed'
  | 'dimmedDetentIndex'
  | 'dismissible'
  | 'draggable'
  | 'backgroundColor'
  | 'cornerRadius'
  | 'grabber'
  | 'grabberOptions'
  | 'maxContentHeight'
  | 'maxContentWidth'
  | 'header'
  | 'headerStyle'
  | 'footer'
  | 'footerStyle'
  | 'style'
  | 'onDidPresent'
  | 'onDidDismiss'
  | 'onDetentChange';

export type BottomSheetNativeProps = Omit<TrueSheetProps, ManagedNativeProps>;

export type BottomSheetProps = {
  name?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, meta: BottomSheetOpenChangeMeta) => void;
  onOpenComplete?: (payload: BottomSheetDetentChangePayload) => void;
  onDismissComplete?: () => void;

  detents?: readonly BottomSheetDetent[];
  detentIndex?: number;
  defaultDetentIndex?: number;
  onDetentChange?: (index: number, payload: BottomSheetDetentChangePayload) => void;

  disabled?: boolean;
  dismissible?: boolean;
  draggable?: boolean;
  backdrop?: boolean | BottomSheetBackdropConfig;
  mountStrategy?: BottomSheetMountStrategy;

  title?: React.ReactNode;
  description?: React.ReactNode;
  header?: React.ReactNode | ((context: BottomSheetRenderContext) => React.ReactNode);
  footer?: React.ReactNode | ((context: BottomSheetRenderContext) => React.ReactNode);
  children?: React.ReactNode | ((context: BottomSheetRenderContext) => React.ReactNode);

  backgroundColor?: ColorValue;
  cornerRadius?: number;
  maxHeight?: number;
  maxWidth?: number;
  handle?: boolean | BottomSheetHandleConfig;
  style?: StyleProp<ViewStyle>;
  headerStyle?: StyleProp<ViewStyle>;
  footerStyle?: StyleProp<ViewStyle>;

  testID?: ViewProps['testID'];
  accessibilityLabel?: ViewProps['accessibilityLabel'];

  nativeProps?: BottomSheetNativeProps;
};

export type BottomSheetProviderProps = React.ComponentProps<typeof TrueSheetProvider>;

type NativePhase = 'idle' | 'presenting' | 'presented' | 'dismissing';

const DEFAULT_DETENTS: readonly BottomSheetDetent[] = ['content'];
const DEFAULT_BACKDROP_OPACITY = 0.42;
const DEFAULT_HANDLE_VISIBLE = true;
const DEFAULT_DISMISSIBLE = true;
const DEFAULT_DRAGGABLE = true;
const DEFAULT_MOUNT_STRATEGY: BottomSheetMountStrategy = 'lazy';
const IOS_SYSTEM_CORNER_RADIUS_MAJOR_VERSION = 26;

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function silentlyCatchPromise(value: unknown) {
  const maybePromise = value as { catch?: (onRejected: () => void) => unknown } | null | undefined;
  if (typeof maybePromise?.catch === 'function') {
    maybePromise.catch(() => {});
  }
}

function normalizeDetent(detent: BottomSheetDetent): NativeSheetDetent {
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

function normalizeDetents(detents: readonly BottomSheetDetent[] | undefined) {
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

function resolveBackdrop(backdrop: BottomSheetProps['backdrop']) {
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

function renderSlot(
  slot: React.ReactNode | ((context: BottomSheetRenderContext) => React.ReactNode),
  context: BottomSheetRenderContext
) {
  if (typeof slot === 'function') {
    return (slot as (context: BottomSheetRenderContext) => React.ReactNode)(context);
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
  semanticDetents: readonly BottomSheetDetent[],
  nativeDetents: readonly NativeSheetDetent[]
): BottomSheetDetentChangePayload {
  const index = normalizeDetentIndex(event.index, semanticDetents.length);
  return {
    index,
    detent: semanticDetents[index] ?? DEFAULT_DETENTS[0],
    nativeDetent: nativeDetents[index] ?? 'auto',
    position: event.position,
  };
}

export function BottomSheetProvider({ children }: BottomSheetProviderProps) {
  return <TrueSheetProvider>{children}</TrueSheetProvider>;
}

export type BottomSheetHeaderProps = ViewProps & {
  title?: React.ReactNode;
  description?: React.ReactNode;
};

export function BottomSheetHeader({
  title,
  description,
  children,
  style,
  ...props
}: BottomSheetHeaderProps) {
  const theme = useTheme();

  return (
    <View {...props} style={[styles.header, style]}>
      {children ?? (
        <>
          {title != null ? (
            <Text
              accessibilityRole="header"
              numberOfLines={2}
              size="lg"
              weight="semibold"
              style={{ color: theme.colors.onSurface }}
            >
              {title}
            </Text>
          ) : null}
          {description != null ? (
            <Text numberOfLines={3} size="sm" style={{ color: theme.colors.muted }}>
              {description}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

export type BottomSheetContentProps = ViewProps;

export function BottomSheetContent({ style, ...props }: BottomSheetContentProps) {
  return <View {...props} style={[styles.content, style]} />;
}

export type BottomSheetFooterProps = ViewProps & {
  safeArea?: boolean;
};

export function BottomSheetFooter({ safeArea = true, style, ...props }: BottomSheetFooterProps) {
  const insets = useSafeAreaInsets();
  const paddingBottom = safeArea ? Math.max(insets.bottom, wp(12)) : undefined;

  return <View {...props} style={[styles.footer, paddingBottom != null && { paddingBottom }, style]} />;
}

const BottomSheetRoot = React.forwardRef<BottomSheetRef, BottomSheetProps>(function BottomSheet(
  {
    name,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    onOpenComplete,
    onDismissComplete,
    detents,
    detentIndex: detentIndexProp,
    defaultDetentIndex = 0,
    onDetentChange,
    disabled = false,
    dismissible = DEFAULT_DISMISSIBLE,
    draggable = DEFAULT_DRAGGABLE,
    backdrop,
    mountStrategy = DEFAULT_MOUNT_STRATEGY,
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
  const [sheetState, setSheetState] = React.useState<BottomSheetState>(isOpen ? 'opening' : 'closed');
  const [shellMounted, setShellMounted] = React.useState(
    isOpen || mountStrategy === 'eager'
  );
  const [contentMounted, setContentMounted] = React.useState(
    isOpen || mountStrategy === 'eager'
  );

  const nativeRef = React.useRef<TrueSheet>(null);
  const phaseRef = React.useRef<NativePhase>(isOpen ? 'presenting' : 'idle');
  const pendingDismissRef = React.useRef(false);
  const activeLifecycleRef = React.useRef(isOpen);
  const isOpenRef = React.useRef(isOpen);
  const stateRef = React.useRef<BottomSheetState>(sheetState);
  const currentDetentIndexRef = React.useRef(currentDetentIndex);
  const requestedOpenIndexRef = React.useRef(initialDetentIndex);
  const presentAnimatedRef = React.useRef(true);
  const dismissAnimatedRef = React.useRef(true);
  const closeReasonRef = React.useRef<BottomSheetCloseReason>('system');
  const backdropOpacity = React.useRef(new Animated.Value(isOpen ? 1 : 0)).current;
  const backdropConfig = React.useMemo(() => resolveBackdrop(backdrop), [backdrop]);
  const usesManualBackdrop = Platform.OS === 'ios' && backdropConfig.visible;
  const [manualBackdropMounted, setManualBackdropMounted] = React.useState(
    usesManualBackdrop && isOpen
  );

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
    if (isOpen) {
      activeLifecycleRef.current = true;
      requestedOpenIndexRef.current = controlledDetentIndex ?? requestedOpenIndexRef.current;
      if (!shellMounted) setShellMounted(true);
      if (!contentMounted) setContentMounted(true);
      return;
    }

    if (shellMounted) {
      requestDismiss('system');
    }
  }, [controlledDetentIndex, contentMounted, isOpen, shellMounted]);

  React.useEffect(() => {
    if (!isOpen || !shellMounted) return undefined;

    const rafId = requestAnimationFrame(() => {
      if (!isOpenRef.current) return;
      if (phaseRef.current !== 'idle' && phaseRef.current !== 'presenting') return;

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
      silentlyCatchPromise(sheet.present(targetIndex, presentAnimatedRef.current));
    });

    return () => cancelAnimationFrame(rafId);
  }, [controlledDetentIndex, isOpen, nativeDetents.length, shellMounted]);

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
    (nextOpen: boolean, reason: BottomSheetOpenChangeReason, detentIndex?: number) => {
      onOpenChange?.(nextOpen, {
        reason,
        detentIndex: normalizeDetentIndex(detentIndex ?? currentDetentIndexRef.current, nativeDetents.length),
      });
    },
    [nativeDetents.length, onOpenChange]
  );

  const setOpen = React.useCallback(
    (nextOpen: boolean, reason: BottomSheetOpenChangeReason, detentIndex?: number) => {
      if (disabled && nextOpen) return;

      if (nextOpen) {
        requestedOpenIndexRef.current = normalizeDetentIndex(
          detentIndex ?? requestedOpenIndexRef.current,
          nativeDetents.length
        );
        presentAnimatedRef.current = true;
        activeLifecycleRef.current = true;
        pendingDismissRef.current = false;
        if (!isOpenControlled) setInnerOpen(true);
        emitOpenChange(true, reason, requestedOpenIndexRef.current);
        return;
      }

      closeReasonRef.current = reason === 'default' ? 'api' : reason;
      if (!isOpenControlled) setInnerOpen(false);
      emitOpenChange(false, reason, currentDetentIndexRef.current);
    },
    [disabled, emitOpenChange, isOpenControlled, nativeDetents.length]
  );

  const finishClosedLifecycle = React.useCallback(
    (shouldSyncOpenState: boolean) => {
      phaseRef.current = 'idle';
      pendingDismissRef.current = false;
      presentAnimatedRef.current = true;
      dismissAnimatedRef.current = true;
      setSheetState('closed');

      if (shouldSyncOpenState) {
        if (!isOpenControlled) setInnerOpen(false);
        emitOpenChange(false, closeReasonRef.current, currentDetentIndexRef.current);
      }

      if (mountStrategy === 'unmountOnExit') {
        setContentMounted(false);
      }

      if (Platform.OS === 'ios' || mountStrategy === 'unmountOnExit') {
        setShellMounted(false);
      }

      if (activeLifecycleRef.current) {
        activeLifecycleRef.current = false;
        onDismissComplete?.();
      }
    },
    [emitOpenChange, isOpenControlled, mountStrategy, onDismissComplete]
  );

  function requestDismiss(reason: BottomSheetCloseReason) {
    const phase = phaseRef.current;
    closeReasonRef.current = reason;

    if (phase === 'dismissing') return;

    if (phase === 'presenting') {
      pendingDismissRef.current = true;
      return;
    }

    if (phase === 'presented') {
      const sheet = nativeRef.current;
      if (!sheet) {
        finishClosedLifecycle(false);
        return;
      }

      pendingDismissRef.current = false;
      phaseRef.current = 'dismissing';
      setSheetState('closing');
      silentlyCatchPromise(sheet.dismiss(dismissAnimatedRef.current));
      return;
    }

    if (activeLifecycleRef.current) {
      finishClosedLifecycle(false);
    }
  }

  const openSheet = React.useCallback(
    async (detentIndex?: number, options?: { animated?: boolean }) => {
      const targetIndex = normalizeDetentIndex(
        detentIndex ?? requestedOpenIndexRef.current,
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
    async (options?: { animated?: boolean }) => {
      dismissAnimatedRef.current = options?.animated !== false;
      setOpen(false, 'api', currentDetentIndexRef.current);
    },
    [setOpen]
  );

  const snapTo = React.useCallback(async (detentIndex: number) => {
    const targetIndex = normalizeDetentIndex(detentIndex, nativeDetents.length);
    requestedOpenIndexRef.current = targetIndex;
    if (!isOpenRef.current || phaseRef.current !== 'presented') return;
    await nativeRef.current?.resize(targetIndex);
  }, [nativeDetents.length]);

  const dismissStack = React.useCallback(async (options?: { animated?: boolean }) => {
    dismissAnimatedRef.current = options?.animated !== false;
    await nativeRef.current?.dismissStack(dismissAnimatedRef.current);
  }, []);

  React.useImperativeHandle(
    ref,
    () => ({
      open: openSheet,
      close: closeSheet,
      snapTo,
      dismissStack,
      getState: () => stateRef.current,
    }),
    [closeSheet, dismissStack, openSheet, snapTo]
  );

  const context = React.useMemo<BottomSheetRenderContext>(
    () => ({
      isOpen,
      state: sheetState,
      detentIndex: currentDetentIndex,
      open: (detentIndex?: number) => openSheet(detentIndex),
      close: () => closeSheet(),
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
    [nativeDetents, onOpenComplete, semanticDetents]
  );

  const handleDidDismiss = React.useCallback(() => {
    const wasRequestedDismiss = phaseRef.current === 'dismissing' || pendingDismissRef.current;
    const shouldSyncOpenState = isOpenRef.current && !wasRequestedDismiss;
    if (shouldSyncOpenState) {
      closeReasonRef.current = closeReasonRef.current === 'system' ? 'gesture' : closeReasonRef.current;
    }
    finishClosedLifecycle(shouldSyncOpenState);
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
        <BottomSheetHeader title={title} description={description} />
      )
    ) : undefined
  );
  const resolvedFooter = toNativeSlot(footer !== undefined ? renderSlot(footer, context) : undefined);
  const resolvedChildren = contentMounted ? renderSlot(children, context) : null;
  const handleConfig = handle && typeof handle === 'object' ? handle : {};
  const handleVisible = handle !== false;
  const surfaceColor = backgroundColor ?? theme.colors.surface;
  const resolvedCornerRadius = cornerRadius ?? getDefaultCornerRadius();

  const sheetNode = (
    <TrueSheet
      {...nativeProps}
      ref={nativeRef}
      name={name}
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
        visible
        transparent
        animationType="none"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={handleBackdropPress}
      >
        <View style={styles.modalRoot} pointerEvents="box-none">
          {manualBackdropMounted ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close bottom sheet"
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
});

type BottomSheetComponent = React.ForwardRefExoticComponent<
  BottomSheetProps & React.RefAttributes<BottomSheetRef>
> & {
  Provider: typeof BottomSheetProvider;
  Header: typeof BottomSheetHeader;
  Content: typeof BottomSheetContent;
  Footer: typeof BottomSheetFooter;
};

export const BottomSheet = Object.assign(BottomSheetRoot, {
  Provider: BottomSheetProvider,
  Header: BottomSheetHeader,
  Content: BottomSheetContent,
  Footer: BottomSheetFooter,
}) as BottomSheetComponent;

const styles = StyleSheet.create({
  modalRoot: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    gap: wp(4),
    paddingHorizontal: wp(20),
    paddingTop: wp(20),
    paddingBottom: wp(12),
  },
  content: {
    paddingHorizontal: wp(20),
    paddingVertical: wp(16),
  },
  footer: {
    gap: wp(10),
    paddingHorizontal: wp(20),
    paddingTop: wp(12),
  },
});
