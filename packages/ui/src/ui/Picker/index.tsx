import * as React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type AccessibilityState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sp, wp } from 'zkit-tools';
import { useI18n } from '../../i18n/useI18n';
import { useTheme } from '../../theme/useTheme';
import { Sheet, type SheetOpenChangeDetails } from '../Sheet';
import { Text } from '../Text';
import {
  WheelColumn,
  WHEEL_AREA_HEIGHT,
  WHEEL_AREA_VERTICAL_INSET,
  WHEEL_ITEM_HEIGHT,
  WHEEL_SELECTION_BACKGROUND_COLOR,
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
import { PickerActionBar, getPickerActionBarBottomInset } from './actionBar';
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
  const safeBottom = getPickerActionBarBottomInset(insets.bottom);
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
  const wheelsRef = React.useRef<Array<WheelColumnHandle | null>>([]);
  const confirmingRef = React.useRef(false);

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
  }, [resolveFromValue, value, visible]);

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

  const detents = React.useMemo<Array<'auto' | number>>(() => {
    if (sheetHeight === 'auto' || sheetHeight == null) return ['auto'];
    if (!Number.isFinite(sheetHeight) || sheetHeight <= 0) return ['auto'];
    return [clampNumber(sheetHeight / screenH, 0.1, 0.92)];
  }, [screenH, sheetHeight]);

  const setPickerOpen = React.useCallback((nextOpen: boolean) => {
    onOpenChange?.(nextOpen);
    if (!isOpenControlled) setInnerOpen(nextOpen);
  }, [isOpenControlled, onOpenChange]);

  const close = React.useCallback(() => {
    setPickerOpen(false);
  }, [setPickerOpen]);

  const openPicker = React.useCallback(() => {
    if (disabled) return;

    setDraft(resolveFromValue(value));
    if (!visible) {
      setPickerOpen(true);
    }
  }, [disabled, resolveFromValue, setPickerOpen, value, visible]);

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

  const handleSheetOpenChange = React.useCallback((nextOpen: boolean, meta: SheetOpenChangeDetails) => {
    if (!nextOpen && visible && meta.reason !== 'api') {
      onCancel?.();
    }
    setPickerOpen(nextOpen);
  }, [onCancel, setPickerOpen, visible]);

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

  const sheetNode = (
    <Sheet
      placement="bottom"
      open={visible}
      onOpenChange={handleSheetOpenChange}
      onCloseComplete={onDismissComplete}
      detents={detents}
      backgroundColor={theme.colors.surface}
      handle={false}
      draggable={false}
      dismissible={!disabled}
      nativeProps={{ insetAdjustment: 'never' }}
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

        {draftColumns.length > 0 ? (
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
                <View style={styles.highlightBar} pointerEvents="none" />
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
        )}

        <PickerActionBar
          cancelText={cancelText ?? t('picker.cancel')}
          confirmText={confirmText ?? t('picker.confirm')}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
          disabled={disabled}
          confirmDisabled={confirmDisabled}
        />
      </View>
    </Sheet>
  );

  return (
    <>
      {triggerNode}
      {sheetNode}
    </>
  );
}) as <TOption = import('./types').PickerOption>(
  props: PickerProps<TOption> & React.RefAttributes<PickerHandle>
) => React.ReactElement | null;

const styles = StyleSheet.create({
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
    backgroundColor: WHEEL_SELECTION_BACKGROUND_COLOR,
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
});
