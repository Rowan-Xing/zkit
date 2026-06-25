import * as React from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type AccessibilityState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sp, wp } from 'y2kit-tools';
import { useI18n } from '../../i18n/useI18n';
import { useTheme } from '../../theme/useTheme';
import { BottomSheet, type BottomSheetRef } from '../BottomSheet';
import { Button } from '../Button';
import { Text } from '../Text';
import {
  WheelColumn,
  WHEEL_AREA_HEIGHT,
  WHEEL_AREA_VERTICAL_INSET,
  WHEEL_ITEM_HEIGHT,
  WHEEL_VISIBLE_ITEMS,
  type WheelColumnHandle,
  type WheelOption,
} from '../WheelColumn';
import type {
  PickerCascadeState,
} from './utils';
import {
  clampNumber,
  createPickerSelection,
  findNearestEnabledIndex,
  resolveCascade,
  resolveOptionDisabled,
  resolveOptionChildren,
  resolveOptionLabel,
  resolveOptionValue,
  toArrayValue,
  transparentizeColor,
} from './utils';
import type {
  PickerColumnHeaderContext,
  PickerDraftChangePayload,
  PickerHandle,
  PickerOptionAccessors,
  PickerPrimitiveValue,
  PickerProps,
  PickerSelection,
  PickerTriggerContext,
  PickerValue,
  PickerValueMode,
} from './types';

export type {
  PickerChangePayload,
  PickerColumnHeaderContext,
  PickerConfirmPayload,
  PickerDraftChangePayload,
  PickerHandle,
  PickerOption,
  PickerPrimitiveValue,
  PickerProps,
  PickerSelection,
  PickerTreeNode,
  PickerTriggerContext,
  PickerValue,
  PickerValueMode,
} from './types';

const ITEM_HEIGHT = WHEEL_ITEM_HEIGHT;
const VISIBLE_ITEMS = WHEEL_VISIBLE_ITEMS;
const DEFAULT_MAX_COLUMNS = 5;
const MAX_COLUMNS_LIMIT = 8;

type SheetNativePhase = 'idle' | 'presenting' | 'presented' | 'dismissing';

type TriggerChildProps = {
  onPress?: (...args: unknown[]) => void;
  disabled?: boolean;
  accessibilityState?: AccessibilityState;
};

type WheelColumnSlotProps<TOption> = {
  options: TOption[];
  columnIndex: number;
  parentPath: TOption[];
  accessors: PickerOptionAccessors<TOption>;
  selectedIndex: number;
  onIndexChange: (columnIndex: number, index: number) => void;
  width: number;
  disabled: boolean;
  wheelsRef: React.MutableRefObject<Array<WheelColumnHandle | null>>;
};

function silentlyCatchPromise(value: unknown) {
  const maybePromise = value as { catch?: (onRejected: () => void) => unknown } | null | undefined;
  if (typeof maybePromise?.catch === 'function') {
    maybePromise.catch(() => {});
  }
}

function toWheelOptions<TOption>(
  options: TOption[],
  parentPath: TOption[],
  accessors: PickerOptionAccessors<TOption>
): WheelOption[] {
  return options.map((option, index) => {
    const path = [...parentPath, option];
    const value = resolveOptionValue(option, index, path, accessors);
    const label = resolveOptionLabel(option, index, path, accessors);
    const record = option != null && typeof option === 'object' ? (option as Record<string, unknown>) : {};

    return {
      value,
      label,
      disabled: resolveOptionDisabled(option, index, path, accessors),
      key: typeof record.key === 'string' || typeof record.key === 'number' ? record.key : value,
      testID: typeof record.testID === 'string' ? record.testID : undefined,
      accessibilityLabel: typeof record.accessibilityLabel === 'string' ? record.accessibilityLabel : undefined,
    };
  });
}

const WheelColumnSlot = React.memo(function WheelColumnSlot<TOption>({
  options,
  columnIndex,
  parentPath,
  accessors,
  selectedIndex,
  onIndexChange,
  width,
  disabled,
  wheelsRef,
}: WheelColumnSlotProps<TOption>) {
  const wheelOptions = React.useMemo(
    () => toWheelOptions(options, parentPath, accessors),
    [accessors, options, parentPath]
  );
  const selectedValue = wheelOptions[Math.max(0, selectedIndex)]?.value ?? null;
  const handleChange = React.useCallback(
    (payload: { index: number }) => onIndexChange(columnIndex, payload.index),
    [columnIndex, onIndexChange]
  );

  return (
    <WheelColumn
      ref={(element) => {
        wheelsRef.current[columnIndex] = element;
      }}
      options={wheelOptions}
      value={selectedValue}
      onChange={handleChange}
      width={width}
      disabled={disabled}
    />
  );
}) as <TOption>(props: WheelColumnSlotProps<TOption>) => React.ReactElement;

function createEmptyCascadeState<TOption>(): PickerCascadeState<TOption> {
  return {
    columns: [],
    indices: [],
    values: [],
    labels: [],
    items: [],
  };
}

function getPreferPathValue(value: PickerValue | undefined, valueMode: PickerValueMode, resolvedColumns: number) {
  if (valueMode === 'path') return true;
  if (valueMode === 'single') return false;
  if (Array.isArray(value)) return true;
  if (value !== undefined) return false;
  return resolvedColumns > 1;
}

function composeTrigger<TOption>(
  children: PickerProps<TOption>['children'],
  context: PickerTriggerContext<TOption>
): React.ReactNode {
  if (typeof children === 'function') {
    return composeTrigger(children(context), context);
  }

  if (React.isValidElement(children)) {
    const child = children as React.ReactElement<TriggerChildProps>;
    const previousOnPress = child.props.onPress;
    const previousAccessibilityState = child.props.accessibilityState;

    return React.cloneElement(child, {
      onPress: (...args: unknown[]) => {
        previousOnPress?.(...args);
        context.open();
      },
      disabled: context.disabled || child.props.disabled,
      accessibilityState: {
        ...previousAccessibilityState,
        disabled: context.disabled || previousAccessibilityState?.disabled,
        expanded: context.isOpen,
      },
    });
  }

  if (children == null) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: context.disabled, expanded: context.isOpen }}
      disabled={context.disabled}
      onPress={context.open}
    >
      {children}
    </Pressable>
  );
}

function normalizeMaxColumns(maxColumns: number | undefined) {
  if (maxColumns == null) return DEFAULT_MAX_COLUMNS;
  if (!Number.isFinite(maxColumns)) return DEFAULT_MAX_COLUMNS;
  return clampNumber(Math.round(maxColumns), 1, MAX_COLUMNS_LIMIT);
}

export const Picker = React.forwardRef<PickerHandle, PickerProps>(function Picker<TOption>(
  {
    options,
    value: valueProp,
    defaultValue,
    onChange,
    valueMode = 'auto',
    open: openProp,
    defaultOpen,
    onOpenChange,
    onDismissComplete,
    title,
    placeholder = '',
    cancelText,
    confirmText,
    emptyText,
    separator = '-',
    formatLabel,
    renderColumnHeader,
    maxColumns,
    getOptionValue,
    getOptionLabel,
    getOptionChildren,
    isOptionDisabled,
    lazyContent = true,
    sheetHeight = 'auto',
    disabled = false,
    onCancel,
    onConfirm,
    onDraftChange,
    children,
  }: PickerProps<TOption>,
  ref: React.ForwardedRef<PickerHandle>
) {
  const { t } = useI18n();
  const theme = useTheme();
  const { height: screenH, width: screenW } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const safeBottom = insets.bottom >= 10 ? insets.bottom : wp(20);
  const effectiveMaxColumns = React.useMemo(() => normalizeMaxColumns(maxColumns), [maxColumns]);

  const accessors = React.useMemo<PickerOptionAccessors<TOption>>(
    () => ({ getOptionValue, getOptionLabel, getOptionChildren, isOptionDisabled }),
    [getOptionChildren, getOptionLabel, getOptionValue, isOptionDisabled]
  );

  const isValueControlled = valueProp !== undefined;
  const [innerValue, setInnerValue] = React.useState<PickerValue | undefined>(defaultValue);
  const value = isValueControlled ? valueProp : innerValue;

  const isOpenControlled = openProp !== undefined;
  const [innerOpen, setInnerOpen] = React.useState(!!defaultOpen);
  const visible = isOpenControlled ? !!openProp : innerOpen;
  const [sheetMounted, setSheetMounted] = React.useState(visible);
  const [contentMounted, setContentMounted] = React.useState(() => !lazyContent || visible);

  const sheetRef = React.useRef<BottomSheetRef>(null);
  const sheetPhaseRef = React.useRef<SheetNativePhase>('idle');
  const pendingDismissRef = React.useRef(false);
  const activeSheetLifecycleRef = React.useRef(visible);
  const visibleRef = React.useRef(visible);
  const wheelsRef = React.useRef<Array<WheelColumnHandle | null>>([]);
  const confirmingRef = React.useRef(false);

  React.useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  const resolveFromValue = React.useCallback(
    (nextValue: PickerValue | undefined) =>
      resolveCascade(options, toArrayValue(nextValue), accessors, effectiveMaxColumns),
    [accessors, effectiveMaxColumns, options]
  );

  const createSelection = React.useCallback(
    (state: PickerCascadeState<TOption>, nextValue: PickerValue | undefined = value) =>
      createPickerSelection(state, {
        separator,
        valueMode,
        preferPathValue: getPreferPathValue(nextValue, valueMode, state.columns.length),
        formatLabel,
      }),
    [formatLabel, separator, value, valueMode]
  );

  const initialDraft = React.useMemo(() => resolveFromValue(value), [resolveFromValue, value]);
  const [{ columns: draftColumns, indices: draftIndices, values: draftValues, labels: draftLabels, items: draftItems }, setDraft] =
    React.useState<PickerCascadeState<TOption>>(initialDraft);

  React.useEffect(() => {
    setDraft(resolveFromValue(value));
  }, [resolveFromValue, value]);

  React.useEffect(() => {
    if (!visible) return;
    setDraft(resolveFromValue(value));
    if (lazyContent) setContentMounted(true);
  }, [lazyContent, resolveFromValue, value, visible]);

  const committedSelection = React.useMemo<PickerSelection<TOption>>(() => {
    const state = value === undefined ? createEmptyCascadeState<TOption>() : resolveFromValue(value);
    return createSelection(state, value);
  }, [createSelection, resolveFromValue, value]);

  const draftState = React.useMemo<PickerCascadeState<TOption>>(
    () => ({
      columns: draftColumns,
      indices: draftIndices,
      values: draftValues,
      labels: draftLabels,
      items: draftItems,
    }),
    [draftColumns, draftIndices, draftItems, draftLabels, draftValues]
  );

  const draftSelection = React.useMemo(() => createSelection(draftState), [createSelection, draftState]);

  const finishClosedLifecycle = React.useCallback(
    (shouldSyncOpenState: boolean) => {
      sheetPhaseRef.current = 'idle';
      pendingDismissRef.current = false;
      confirmingRef.current = false;

      if (shouldSyncOpenState) {
        onOpenChange?.(false);
        if (!isOpenControlled) setInnerOpen(false);
      }

      if (lazyContent) {
        setContentMounted(false);
      }

      if (Platform.OS === 'ios' || lazyContent) {
        setSheetMounted(false);
      }

      if (activeSheetLifecycleRef.current) {
        activeSheetLifecycleRef.current = false;
        onDismissComplete?.();
      }
    },
    [isOpenControlled, lazyContent, onDismissComplete, onOpenChange]
  );

  const requestSheetDismiss = React.useCallback(() => {
    const phase = sheetPhaseRef.current;

    if (phase === 'dismissing') return;

    if (phase === 'presenting') {
      pendingDismissRef.current = true;
      return;
    }

    if (phase === 'presented') {
      const sheet = sheetRef.current;
      if (!sheet) {
        finishClosedLifecycle(true);
        return;
      }

      pendingDismissRef.current = false;
      sheetPhaseRef.current = 'dismissing';
      silentlyCatchPromise(sheet.dismiss());
      return;
    }

    if (activeSheetLifecycleRef.current) {
      finishClosedLifecycle(true);
    }
  }, [finishClosedLifecycle]);

  React.useEffect(() => {
    if (visible && !sheetMounted) {
      activeSheetLifecycleRef.current = true;
      pendingDismissRef.current = false;
      setSheetMounted(true);
    }

    if (visible && sheetMounted) {
      activeSheetLifecycleRef.current = true;
    }
  }, [sheetMounted, visible]);

  React.useEffect(() => {
    if (visible && sheetMounted) {
      const rafId = requestAnimationFrame(() => {
        if (!visibleRef.current) return;
        if (sheetPhaseRef.current !== 'idle') return;

        const sheet = sheetRef.current;
        if (!sheet) return;

        pendingDismissRef.current = false;
        sheetPhaseRef.current = 'presenting';
        silentlyCatchPromise(sheet.present());
      });

      return () => cancelAnimationFrame(rafId);
    }

    if (!visible && sheetMounted) {
      requestSheetDismiss();
    }

    return undefined;
  }, [requestSheetDismiss, sheetMounted, visible]);

  const detents = React.useMemo<Array<'auto' | number>>(() => {
    if (sheetHeight === 'auto' || sheetHeight == null) return ['auto'];
    if (!Number.isFinite(sheetHeight) || sheetHeight <= 0) return ['auto'];
    return [clampNumber(sheetHeight / screenH, 0.1, 0.92)];
  }, [screenH, sheetHeight]);

  const close = React.useCallback(() => {
    onOpenChange?.(false);
    if (!isOpenControlled) setInnerOpen(false);
    requestSheetDismiss();
  }, [isOpenControlled, onOpenChange, requestSheetDismiss]);

  const openPicker = React.useCallback(() => {
    if (disabled) return;

    setDraft(resolveFromValue(value));
    if (lazyContent) setContentMounted(true);

    if (!visible) {
      if (!isOpenControlled) setInnerOpen(true);
      onOpenChange?.(true);
    }
  }, [disabled, isOpenControlled, lazyContent, onOpenChange, resolveFromValue, value, visible]);

  React.useImperativeHandle(
    ref,
    () => ({
      open: openPicker,
      close,
    }),
    [close, openPicker]
  );

  const columnsCount = React.useMemo(
    () => Math.max(1, Math.min(effectiveMaxColumns, draftColumns.length || 1)),
    [draftColumns.length, effectiveMaxColumns]
  );
  const columnWidth = React.useMemo(() => (screenW - wp(32)) / columnsCount, [columnsCount, screenW]);
  const confirmDisabled = disabled || !draftSelection.isComplete;
  const transparentSurface = React.useMemo(() => transparentizeColor(theme.colors.surface), [theme.colors.surface]);

  React.useEffect(() => {
    wheelsRef.current.length = columnsCount;
  }, [columnsCount]);

  const emitDraftChange = React.useCallback(
    (nextState: PickerCascadeState<TOption>) => {
      const selection = createSelection(nextState) as PickerDraftChangePayload<TOption>;
      onDraftChange?.(selection);
    },
    [createSelection, onDraftChange]
  );

  const syncDraftFromWheels = React.useCallback(async () => {
    const settledIndices = await Promise.all(
      Array.from({ length: effectiveMaxColumns }, async (_, columnIndex) => {
        const wheel = wheelsRef.current[columnIndex];
        if (Platform.OS === 'ios') {
          return wheel?.syncCurrentSelection();
        }
        return wheel?.settleToNearest(false);
      })
    );

    const desiredValues: PickerPrimitiveValue[] = [];
    let currentOptions = Array.isArray(options) ? (options as TOption[]) : [];
    let path: TOption[] = [];

    for (let columnIndex = 0; columnIndex < effectiveMaxColumns; columnIndex += 1) {
      if (!currentOptions.length) break;

      const safeIndex = findNearestEnabledIndex(
        currentOptions,
        settledIndices[columnIndex] ?? draftIndices[columnIndex] ?? 0,
        path,
        accessors
      );
      if (safeIndex < 0) break;

      const item = currentOptions[safeIndex];
      if (item == null) break;

      const nextPath = [...path, item];
      desiredValues[columnIndex] = resolveOptionValue(item, safeIndex, nextPath, accessors);
      currentOptions = resolveOptionChildren(item, safeIndex, nextPath, accessors);
      path = nextPath;
    }

    const nextState = resolveCascade(options, desiredValues, accessors, effectiveMaxColumns);
    setDraft(nextState);

    requestAnimationFrame(() => {
      for (let i = 0; i < nextState.indices.length; i += 1) {
        wheelsRef.current[i]?.scrollToIndex(nextState.indices[i] ?? 0, false);
      }
    });

    return nextState;
  }, [accessors, draftIndices, effectiveMaxColumns, options]);

  const handleWheelIndexChange = React.useCallback(
    (columnIndex: number, nextIndex: number) => {
      const columnOptions = draftColumns[columnIndex] ?? [];
      if (!columnOptions.length) return;

      const parentPath = draftItems.slice(0, columnIndex);
      const safeIndex = findNearestEnabledIndex(columnOptions, nextIndex, parentPath, accessors);
      if (safeIndex < 0) return;

      if (safeIndex !== nextIndex) {
        wheelsRef.current[columnIndex]?.scrollToIndex(safeIndex, true);
      }

      const item = columnOptions[safeIndex];
      if (item == null) return;

      const nextPath = [...parentPath, item];
      const nextDesired = [...draftValues];
      nextDesired[columnIndex] = resolveOptionValue(item, safeIndex, nextPath, accessors);
      nextDesired.length = columnIndex + 1;

      const nextState = resolveCascade(options, nextDesired, accessors, effectiveMaxColumns);
      setDraft(nextState);

      requestAnimationFrame(() => {
        for (let i = columnIndex + 1; i < nextState.indices.length; i += 1) {
          wheelsRef.current[i]?.scrollToIndex(nextState.indices[i] ?? 0, false);
        }
      });

      emitDraftChange(nextState);
    },
    [accessors, draftColumns, draftItems, draftValues, effectiveMaxColumns, emitDraftChange, options]
  );

  const handleCancel = React.useCallback(() => {
    onCancel?.();
    close();
  }, [close, onCancel]);

  const handleConfirm = React.useCallback(async () => {
    if (confirmDisabled || confirmingRef.current) return;
    confirmingRef.current = true;

    try {
      const syncedState = await syncDraftFromWheels();
      const selection = createSelection(syncedState);
      if (!selection.isComplete) return;

      if (!isValueControlled) {
        setInnerValue(selection.value);
      }

      onChange?.(selection.value, selection);
      onConfirm?.(selection);
      close();
    } finally {
      confirmingRef.current = false;
    }
  }, [close, confirmDisabled, createSelection, isValueControlled, onChange, onConfirm, syncDraftFromWheels]);

  const handleSheetDidPresent = React.useCallback(() => {
    sheetPhaseRef.current = 'presented';
    if (pendingDismissRef.current || !visibleRef.current) {
      requestSheetDismiss();
    }
  }, [requestSheetDismiss]);

  const handleSheetDidDismiss = React.useCallback(() => {
    const wasProgrammaticDismiss = sheetPhaseRef.current === 'dismissing' || pendingDismissRef.current;
    const shouldSyncOpenState = !visibleRef.current || !wasProgrammaticDismiss;
    finishClosedLifecycle(shouldSyncOpenState);
  }, [finishClosedLifecycle]);

  const handleBackdropPress = React.useCallback(() => {
    if (disabled || !visible) return;
    onCancel?.();
    close();
  }, [close, disabled, onCancel, visible]);

  const triggerContext = React.useMemo<PickerTriggerContext<TOption>>(
    () => ({
      ...committedSelection,
      label: committedSelection.label,
      open: openPicker,
      close,
      isOpen: visible,
      disabled,
      placeholder,
    }),
    [close, committedSelection, disabled, openPicker, placeholder, visible]
  );

  const triggerNode = React.useMemo(
    () => composeTrigger(children, triggerContext),
    [children, triggerContext]
  );

  const useManualIOSBackdrop = Platform.OS === 'ios';
  const backdropOpacity = React.useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [backdropMounted, setBackdropMounted] = React.useState(useManualIOSBackdrop && visible);

  React.useEffect(() => {
    if (!useManualIOSBackdrop) return;

    backdropOpacity.stopAnimation();

    if (visible) {
      setBackdropMounted(true);
      Animated.timing(backdropOpacity, {
        toValue: 1,
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
      if (finished && !visibleRef.current) {
        setBackdropMounted(false);
      }
    });
  }, [backdropOpacity, useManualIOSBackdrop, visible]);

  const sheetNode = (
    <BottomSheet
      ref={sheetRef}
      detents={detents}
      backgroundColor={theme.colors.surface}
      cornerRadius={undefined}
      grabber={false}
      draggable={false}
      dimmed={!useManualIOSBackdrop}
      dimmedDetentIndex={0}
      insetAdjustment="never"
      dismissible={Platform.OS === 'ios' ? false : !disabled}
      onDidPresent={handleSheetDidPresent}
      onDidDismiss={handleSheetDidDismiss}
    >
      <View
        accessibilityViewIsModal
        style={[
          styles.sheetInner,
          {
            backgroundColor: theme.colors.surface,
            paddingBottom: safeBottom,
          },
        ]}
        pointerEvents={disabled ? 'none' : 'auto'}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {title ?? t('picker.title')}
          </Text>
        </View>

        {contentMounted ? (
          draftColumns.length > 0 ? (
            <View style={styles.pickerArea}>
              {renderColumnHeader && (
                <View style={styles.columnLabelsRow}>
                  {draftColumns.slice(0, columnsCount).map((columnOptions, columnIndex) => {
                    const headerContext: PickerColumnHeaderContext<TOption> = {
                      columnIndex,
                      columnCount: columnsCount,
                      options: columnOptions,
                      selectedItem: draftItems[columnIndex],
                      selectedValue: draftValues[columnIndex],
                      selectedLabel: draftLabels[columnIndex],
                    };

                    return (
                      <View key={`header-${columnIndex}`} style={[styles.columnLabelItem, { width: columnWidth }]}>
                        {renderColumnHeader(headerContext)}
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.pickerWrapper}>
                {Platform.OS !== 'ios' && (
                  <View
                    style={[styles.highlightBar, { backgroundColor: theme.colors.secondary }]}
                    pointerEvents="none"
                  />
                )}

                <View style={styles.columnsRow}>
                  {draftColumns.slice(0, columnsCount).map((columnOptions, columnIndex) => (
                    <WheelColumnSlot
                      key={`column-${columnIndex}-${columnsCount}`}
                      options={columnOptions}
                      columnIndex={columnIndex}
                      parentPath={draftItems.slice(0, columnIndex)}
                      accessors={accessors}
                      selectedIndex={Math.max(0, draftIndices[columnIndex] ?? 0)}
                      onIndexChange={handleWheelIndexChange}
                      width={columnWidth}
                      disabled={disabled}
                      wheelsRef={wheelsRef}
                    />
                  ))}
                </View>

                {Platform.OS !== 'ios' && (
                  <View style={styles.topMask} pointerEvents="none">
                    <LinearGradient colors={[theme.colors.surface, transparentSurface]} style={StyleSheet.absoluteFill} />
                  </View>
                )}
                {Platform.OS !== 'ios' && (
                  <View style={styles.bottomMask} pointerEvents="none">
                    <LinearGradient colors={[transparentSurface, theme.colors.surface]} style={StyleSheet.absoluteFill} />
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text tone="muted" align="center">
                {emptyText ?? t('picker.empty')}
              </Text>
            </View>
          )
        ) : (
          <View style={[styles.pickerArea, { height: WHEEL_AREA_HEIGHT + wp(18) }]} />
        )}

        <View style={styles.footer}>
          <View style={styles.footerButtonWrapper}>
            <Button
              variant="soft"
              onPress={handleCancel}
              disabled={disabled}
              block
              layout={{ minHeight: wp(44), radius: wp(14), textSize: sp(16) }}
            >
              {cancelText ?? t('picker.cancel')}
            </Button>
          </View>
          <View style={styles.footerButtonWrapper}>
            <Button
              onPress={handleConfirm}
              disabled={confirmDisabled}
              block
              layout={{ minHeight: wp(44), radius: wp(14), textSize: sp(16) }}
            >
              {confirmText ?? t('picker.confirm')}
            </Button>
          </View>
        </View>
      </View>
    </BottomSheet>
  );

  return (
    <>
      {triggerNode}
      {sheetMounted ? (
        useManualIOSBackdrop ? (
          <Modal
            visible
            transparent
            animationType="none"
            statusBarTranslucent
            presentationStyle="overFullScreen"
            onRequestClose={handleBackdropPress}
          >
            <View style={styles.modalRoot} pointerEvents="box-none">
              {backdropMounted ? (
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={handleBackdropPress}
                  disabled={disabled || !visible}
                >
                  <Animated.View style={[styles.iosBackdrop, { opacity: backdropOpacity }]} />
                </Pressable>
              ) : null}
              {sheetNode}
            </View>
          </Modal>
        ) : (
          sheetNode
        )
      ) : null}
    </>
  );
}) as <TOption = import('./types').PickerOption>(
  props: PickerProps<TOption> & React.RefAttributes<PickerHandle>
) => React.ReactElement | null;

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  iosBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  sheetInner: {
    width: '100%',
    paddingHorizontal: wp(16),
    paddingTop: wp(12),
  },
  header: {
    minHeight: wp(32),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(12),
  },
  headerTitle: {
    fontSize: sp(16),
    fontWeight: '600',
  },
  pickerArea: {
    marginTop: wp(4),
    paddingVertical: WHEEL_AREA_VERTICAL_INSET,
  },
  emptyState: {
    minHeight: WHEEL_AREA_HEIGHT + wp(18),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(24),
  },
  columnLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: wp(6),
  },
  columnLabelItem: {
    alignItems: 'center',
  },
  pickerWrapper: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    position: 'relative',
    width: '100%',
    overflow: 'visible',
  },
  highlightBar: {
    position: 'absolute',
    top: ITEM_HEIGHT * ((VISIBLE_ITEMS - 1) / 2),
    left: -wp(16),
    right: -wp(16),
    height: ITEM_HEIGHT,
    zIndex: 0,
  },
  topMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * ((VISIBLE_ITEMS - 1) / 2),
    zIndex: 2,
  },
  bottomMask: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * ((VISIBLE_ITEMS - 1) / 2),
    zIndex: 2,
  },
  columnsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: wp(14),
  },
  footerButtonWrapper: {
    flex: 1,
  },
});
