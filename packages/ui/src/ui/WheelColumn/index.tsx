import * as React from 'react';
import {
  Platform,
  StyleSheet,
  Text as NativeText,
  View,
  type AccessibilityActionEvent,
  type ColorValue,
  type StyleProp,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { getMaxFontSizeMultiplier, sp, wp } from 'zkit-tools';
import { useTheme } from '../../theme/useTheme';
import {
  isZKitWheelPickerNativeAvailable,
  scrollZKitWheelPickerToIndex,
  ZKitWheelPicker,
  syncZKitWheelPickerCurrentSelection,
  type ZKitWheelPickerChangeEvent,
} from './ZKitWheelPickerNativeComponent';
export { WHEEL_SELECTION_BACKGROUND_COLOR } from './constants';

export const WHEEL_VISIBLE_ITEMS = 5;

// iOS 走系统 UIPickerView，Android 走 RecyclerView，Web/无原生模块时走自绘 transform 路径。
// 这些尺寸是当前 app 端多轮调校后的稳定观感，保留为默认公共规格。
const NATIVE_SYNC_ACK_TIMEOUT_MS = 1000;
const IOS_NATIVE_PICKER_HEIGHT = wp(260);
const IOS_NATIVE_PICKER_ROW_HEIGHT = wp(50);
const IOS_NATIVE_PICKER_FONT_SIZE = sp(22);
const BASE_WHEEL_ITEM_HEIGHT = wp(44);
const BASE_WHEEL_AREA_HEIGHT = BASE_WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ITEMS;

export const WHEEL_VIEWPORT_HEIGHT = Platform.OS === 'ios' ? IOS_NATIVE_PICKER_HEIGHT : BASE_WHEEL_AREA_HEIGHT;
export const WHEEL_AREA_HEIGHT =
  Platform.OS === 'ios' ? Math.max(IOS_NATIVE_PICKER_HEIGHT, BASE_WHEEL_AREA_HEIGHT) : BASE_WHEEL_AREA_HEIGHT;
export const WHEEL_AREA_VERTICAL_INSET = Math.max(0, WHEEL_AREA_HEIGHT - WHEEL_VIEWPORT_HEIGHT) / 2;
export const WHEEL_ITEM_HEIGHT =
  Platform.OS === 'ios' ? IOS_NATIVE_PICKER_HEIGHT / WHEEL_VISIBLE_ITEMS : BASE_WHEEL_ITEM_HEIGHT;

const CENTER_OFFSET = WHEEL_ITEM_HEIGHT * Math.floor(WHEEL_VISIBLE_ITEMS / 2);
const IOS_SETTLE_DELAY_MS = 90;

const SNAP_DURATION_MIN = 140;
const SNAP_DURATION_MAX = 280;
const SNAP_DURATION_PER_ITEM = 24;

const RELEASE_VELOCITY_DEADZONE = 220;
const RELEASE_LOCK_DISTANCE_ITEMS = 0.1;
const RELEASE_LOCK_MAX_VELOCITY = 380;
const MAX_FLING_ITEMS = 7;
const ANDROID_VELOCITY_WINDOW_MS = 90;

// Web 与未集成原生模块的 Android fallback 使用 transform 驱动。这里只保留
// 选中项两侧固定数量的行，避免大数据列一次挂载数百个 View/Text。
// 半径同时覆盖 5 个可见项、最大 7 项惯性距离，以及额外的拖动缓冲。
const VIRTUAL_WINDOW_RADIUS = 12;
const VIRTUAL_WINDOW_SIZE = VIRTUAL_WINDOW_RADIUS * 2 + 1;
const VIRTUALIZATION_THRESHOLD = VIRTUAL_WINDOW_SIZE;
const VIRTUAL_WINDOW_RECENTER_STEP = 4;
const USE_NATIVE_WHEEL_PICKER = isZKitWheelPickerNativeAvailable();

const SNAP_EASING = Easing.bezier(0.22, 1, 0.36, 1);

export type WheelColumnValue = string | number;

export type WheelColumnOption<TValue extends WheelColumnValue = WheelColumnValue> = {
  value: TValue;
  label: string;
  disabled?: boolean;
  key?: React.Key;
  testID?: string;
  accessibilityLabel?: string;
};

export type WheelColumnChangeSource = 'user' | 'accessibility';

export type WheelColumnChangePayload<TValue extends WheelColumnValue = WheelColumnValue> = {
  value: TValue;
  index: number;
  option: WheelColumnOption<TValue>;
  source: WheelColumnChangeSource;
};

export type WheelColumnHandle = {
  scrollToIndex: (index: number, animated?: boolean) => void;
  scrollToValue: (value: WheelColumnValue, animated?: boolean) => void;
  settleToNearest: (animated?: boolean) => number;
  syncCurrentSelection: () => Promise<number>;
};

type NativeSyncRequest = {
  requestId: number;
  resolve: (index: number) => void;
  reject: (error: Error) => void;
};

type NativeViewProps = Omit<ViewProps, 'children' | 'style' | 'onChange'>;

export type WheelColumnProps<TValue extends WheelColumnValue = WheelColumnValue> = NativeViewProps & {
  options: WheelColumnOption<TValue>[];
  value?: TValue | null;
  defaultValue?: TValue | null;
  onChange?: (payload: WheelColumnChangePayload<TValue>) => void;

  disabled?: boolean;
  width?: number;

  style?: StyleProp<ViewStyle>;
  itemTextStyle?: StyleProp<TextStyle>;
  selectedItemTextStyle?: StyleProp<TextStyle>;
  disabledItemTextStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

// 简短别名保留给 Picker / Date 类内部数据构造使用。
export type WheelOption<TValue extends WheelColumnValue = WheelColumnValue> = WheelColumnOption<TValue>;

function clampNumber(n: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(max, n));
}

function indexToOffset(index: number) {
  'worklet';
  return index * WHEEL_ITEM_HEIGHT;
}

function getReleaseDeltaItems(velocityY: number) {
  const speed = Math.abs(velocityY);
  if (speed < RELEASE_VELOCITY_DEADZONE) return 0;
  const projected = Math.pow(speed / 1400, 1.05) * 3.6;
  return clampNumber(projected, 0, MAX_FLING_ITEMS);
}

function getTargetIndexFromRelease(offset: number, velocityY: number, maxIndex: number) {
  const currentIndexFloat = offset / WHEEL_ITEM_HEIGHT;
  const nearestIndex = Math.round(currentIndexFloat);
  const distanceToNearest = Math.abs(currentIndexFloat - nearestIndex);
  const speed = Math.abs(velocityY);

  if (speed < RELEASE_VELOCITY_DEADZONE) {
    return clampNumber(nearestIndex, 0, maxIndex);
  }

  if (distanceToNearest < RELEASE_LOCK_DISTANCE_ITEMS && speed < RELEASE_LOCK_MAX_VELOCITY) {
    return clampNumber(nearestIndex, 0, maxIndex);
  }

  const deltaItems = getReleaseDeltaItems(velocityY);
  if (deltaItems <= 0) {
    return clampNumber(nearestIndex, 0, maxIndex);
  }

  const direction = velocityY < 0 ? 1 : -1;
  let targetIndex = Math.round(currentIndexFloat + direction * deltaItems);

  if (targetIndex === nearestIndex) {
    targetIndex = nearestIndex + direction;
  }

  return clampNumber(targetIndex, 0, maxIndex);
}

function getSnapDuration(fromOffset: number, toOffset: number) {
  const distanceItems = Math.abs(toOffset - fromOffset) / WHEEL_ITEM_HEIGHT;
  return clampNumber(
    Math.round(SNAP_DURATION_MIN + distanceItems * SNAP_DURATION_PER_ITEM),
    SNAP_DURATION_MIN,
    SNAP_DURATION_MAX
  );
}

function findOptionIndex<TValue extends WheelColumnValue>(
  options: readonly WheelColumnOption<TValue>[],
  value: TValue | WheelColumnValue | null | undefined
) {
  if (value == null) return -1;
  return options.findIndex((option) => Object.is(option.value, value));
}

function findNearestEnabledIndex<TValue extends WheelColumnValue>(
  options: readonly WheelColumnOption<TValue>[],
  index: number,
  direction = 0
) {
  if (!options.length) return -1;

  const clampedIndex = clampNumber(Math.round(index), 0, options.length - 1);
  if (!options[clampedIndex]?.disabled) return clampedIndex;

  const walkForward = () => {
    for (let i = clampedIndex + 1; i < options.length; i += 1) {
      if (!options[i]?.disabled) return i;
    }
    return -1;
  };

  const walkBackward = () => {
    for (let i = clampedIndex - 1; i >= 0; i -= 1) {
      if (!options[i]?.disabled) return i;
    }
    return -1;
  };

  if (direction > 0) {
    const next = walkForward();
    return next >= 0 ? next : walkBackward();
  }

  if (direction < 0) {
    const previous = walkBackward();
    return previous >= 0 ? previous : walkForward();
  }

  for (let distance = 1; distance < options.length; distance += 1) {
    const previous = clampedIndex - distance;
    if (previous >= 0 && !options[previous]?.disabled) return previous;

    const next = clampedIndex + distance;
    if (next < options.length && !options[next]?.disabled) return next;
  }

  return -1;
}

function resolveDisplayIndex<TValue extends WheelColumnValue>(
  options: readonly WheelColumnOption<TValue>[],
  value: TValue | null | undefined
) {
  if (!options.length) return 0;

  const selectedIndex = findOptionIndex(options, value);
  if (selectedIndex >= 0) return selectedIndex;

  const firstEnabledIndex = findNearestEnabledIndex(options, 0);
  return firstEnabledIndex >= 0 ? firstEnabledIndex : 0;
}

function normalizeFontWeight(fontWeight: TextStyle['fontWeight']) {
  if (fontWeight == null) return undefined;
  return String(fontWeight);
}

function normalizeFontStyle(fontStyle: TextStyle['fontStyle']) {
  if (fontStyle == null) return undefined;
  return fontStyle;
}

function optionKey(option: WheelColumnOption, index: number) {
  return option.key ?? option.value ?? index;
}

function resolveWebInteractionStyle(disabled: boolean): StyleProp<ViewStyle> {
  if (Platform.OS !== 'web') return undefined;
  return {
    cursor: disabled ? 'not-allowed' : 'grab',
    touchAction: 'none',
    userSelect: 'none',
  } as unknown as ViewStyle;
}

type WheelItemProps = {
  item: WheelColumnOption;
  selected: boolean;
  maxFontSizeMultiplier: number | undefined;
  numberOfLines: number;
  itemTextColor: ColorValue;
  selectedTextColor: ColorValue;
  disabledTextColor: ColorValue;
  itemTextStyle: StyleProp<TextStyle>;
  selectedItemTextStyle: StyleProp<TextStyle>;
  disabledItemTextStyle: StyleProp<TextStyle>;
};

const WheelItem = React.memo(function WheelItem({
  item,
  selected,
  maxFontSizeMultiplier,
  numberOfLines,
  itemTextColor,
  selectedTextColor,
  disabledTextColor,
  itemTextStyle,
  selectedItemTextStyle,
  disabledItemTextStyle,
}: WheelItemProps) {
  return (
    <View style={styles.itemContainer}>
      <NativeText
        accessibilityLabel={item.accessibilityLabel ?? item.label}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        numberOfLines={numberOfLines}
        style={[
          styles.itemText,
          { color: itemTextColor },
          itemTextStyle,
          selected && [styles.itemTextSelected, { color: selectedTextColor }, selectedItemTextStyle],
          item.disabled && [
            styles.itemTextDisabled,
            { color: disabledTextColor },
            disabledItemTextStyle,
          ],
        ]}
        testID={item.testID}
      >
        {item.label}
      </NativeText>
    </View>
  );
});

const WheelColumnBase = React.forwardRef<WheelColumnHandle, WheelColumnProps>(function WheelColumn(
  {
    options,
    value,
    defaultValue,
    onChange,
    disabled = false,
    width,
    style,
    itemTextStyle,
    selectedItemTextStyle,
    disabledItemTextStyle,
    numberOfLines = 1,
    accessibilityLabel,
    accessibilityHint,
    accessibilityState,
    testID,
    ...viewProps
  },
  ref
) {
  const theme = useTheme();
  const isControlled = value !== undefined;
  const firstDefaultValue = React.useMemo(() => {
    if (defaultValue != null && findOptionIndex(options, defaultValue) >= 0) return defaultValue;

    const firstEnabledIndex = findNearestEnabledIndex(options, 0);
    if (firstEnabledIndex >= 0) return options[firstEnabledIndex]?.value ?? null;
    return options[0]?.value ?? null;
  }, [defaultValue, options]);
  const [uncontrolledValue, setUncontrolledValue] = React.useState<WheelColumnValue | null>(firstDefaultValue);
  const resolvedValue = isControlled ? value : uncontrolledValue;
  const maxIndex = Math.max(0, options.length - 1);
  const maxOffset = indexToOffset(maxIndex);
  const displayIndex = resolveDisplayIndex(options, resolvedValue);
  const [renderCenterIndex, setRenderCenterIndex] = React.useState(displayIndex);
  const renderCenterIndexRef = React.useRef(displayIndex);
  const previousWindowDisplayIndexRef = React.useRef(displayIndex);
  const effectiveRenderCenterIndex =
    previousWindowDisplayIndexRef.current === displayIndex ? renderCenterIndex : displayIndex;
  const virtualRange = React.useMemo(() => {
    if (USE_NATIVE_WHEEL_PICKER || options.length <= VIRTUALIZATION_THRESHOLD) {
      return {
        startIndex: 0,
        endIndex: options.length,
      };
    }

    const maxStartIndex = Math.max(0, options.length - VIRTUAL_WINDOW_SIZE);
    const startIndex = clampNumber(effectiveRenderCenterIndex - VIRTUAL_WINDOW_RADIUS, 0, maxStartIndex);
    const endIndex = Math.min(options.length, startIndex + VIRTUAL_WINDOW_SIZE);

    return {
      startIndex,
      endIndex,
    };
  }, [effectiveRenderCenterIndex, options.length]);
  const offsetY = useSharedValue(indexToOffset(displayIndex));
  const dragStartOffset = useSharedValue(indexToOffset(displayIndex));
  const isUserInteracting = useSharedValue(false);

  const iosPickerRef = React.useRef<unknown>(null);
  const iosSelectedIndexRef = React.useRef(displayIndex);
  const iosSettleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const iosSyncTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const nativeSyncSequenceRef = React.useRef(0);
  const nativeSyncRequestRef = React.useRef<NativeSyncRequest | null>(null);
  const [iosSelectedIndex, setIosSelectedIndex] = React.useState(displayIndex);

  const selectedValueRef = React.useRef<WheelColumnValue | null | undefined>(resolvedValue);
  const displayIndexRef = React.useRef(displayIndex);
  const controlledValueRef = React.useRef<WheelColumnValue | null | undefined>(resolvedValue);
  const controlledDisplayIndexRef = React.useRef(displayIndex);
  const isControlledRef = React.useRef(isControlled);
  const maxIndexRef = React.useRef(maxIndex);
  const controlledNativeReconcileFrameRef = React.useRef<number | null>(null);

  // Keep the committed, prop-derived selection separate from the optimistic
  // native selection refs. Native events update selectedValueRef/displayIndexRef
  // before a controlled parent has accepted the change; these refs remain the
  // source of truth if that parent deliberately does not write the value back.
  controlledValueRef.current = resolvedValue;
  controlledDisplayIndexRef.current = displayIndex;
  isControlledRef.current = isControlled;
  maxIndexRef.current = maxIndex;

  const flattenedItemTextStyle = React.useMemo(() => StyleSheet.flatten(itemTextStyle) ?? {}, [itemTextStyle]);
  const flattenedSelectedItemTextStyle = React.useMemo(
    () => StyleSheet.flatten(selectedItemTextStyle) ?? {},
    [selectedItemTextStyle]
  );
  const flattenedDisabledItemTextStyle = React.useMemo(
    () => StyleSheet.flatten(disabledItemTextStyle) ?? {},
    [disabledItemTextStyle]
  );

  const selectedTextColor = (flattenedSelectedItemTextStyle.color ??
    flattenedItemTextStyle.color ??
    theme.colors.onSurface) as ColorValue;
  const itemTextColor = (flattenedItemTextStyle.color ?? theme.colors.muted) as ColorValue;
  const disabledTextColor = (flattenedDisabledItemTextStyle.color ?? theme.colors.disabled) as ColorValue;
  const nativeFontSize =
    typeof flattenedSelectedItemTextStyle.fontSize === 'number'
      ? flattenedSelectedItemTextStyle.fontSize
      : typeof flattenedItemTextStyle.fontSize === 'number'
        ? flattenedItemTextStyle.fontSize
        : IOS_NATIVE_PICKER_FONT_SIZE;
  const nativeFontWeight =
    normalizeFontWeight(flattenedSelectedItemTextStyle.fontWeight) ??
    normalizeFontWeight(flattenedItemTextStyle.fontWeight) ??
    '500';
  const nativeFontFamily = flattenedSelectedItemTextStyle.fontFamily ?? flattenedItemTextStyle.fontFamily;
  const nativeFontStyle =
    normalizeFontStyle(flattenedSelectedItemTextStyle.fontStyle) ??
    normalizeFontStyle(flattenedItemTextStyle.fontStyle);

  const clearIOSSettleTimer = React.useCallback(() => {
    if (iosSettleTimerRef.current != null) {
      clearTimeout(iosSettleTimerRef.current);
      iosSettleTimerRef.current = null;
    }
  }, []);

  const clearIOSSyncTimer = React.useCallback(() => {
    if (iosSyncTimerRef.current != null) {
      clearTimeout(iosSyncTimerRef.current);
      iosSyncTimerRef.current = null;
    }
  }, []);

  const resolveSelectableIndex = React.useCallback(
    (index: number, direction = 0) => {
      const next = findNearestEnabledIndex(options, index, direction);
      return next >= 0 ? next : clampNumber(Math.round(index), 0, maxIndex);
    },
    [maxIndex, options]
  );

  const recenterVirtualWindow = React.useCallback(
    (index: number, force = false) => {
      if (USE_NATIVE_WHEEL_PICKER || options.length <= VIRTUALIZATION_THRESHOLD) return;
      const nextCenterIndex = clampNumber(Math.round(index), 0, maxIndex);
      if (
        !force &&
        Math.abs(nextCenterIndex - renderCenterIndexRef.current) < VIRTUAL_WINDOW_RECENTER_STEP
      ) {
        return;
      }

      renderCenterIndexRef.current = nextCenterIndex;
      setRenderCenterIndex(nextCenterIndex);
    },
    [maxIndex, options.length]
  );

  const resolveNativeSyncRequest = React.useCallback(
    (requestId: number, index: number) => {
      const request = nativeSyncRequestRef.current;
      if (!request || request.requestId !== requestId) return false;

      nativeSyncRequestRef.current = null;
      clearIOSSyncTimer();
      request.resolve(resolveSelectableIndex(index));
      return true;
    },
    [clearIOSSyncTimer, resolveSelectableIndex]
  );

  const rejectNativeSyncRequest = React.useCallback(
    (message: string) => {
      const request = nativeSyncRequestRef.current;
      if (!request) return;

      nativeSyncRequestRef.current = null;
      clearIOSSyncTimer();
      request.reject(new Error(`[zkit-ui][WheelColumn] ${message}`));
    },
    [clearIOSSyncTimer]
  );

  const syncIOSSelectedIndex = React.useCallback(
    (index: number) => {
      const nextIndex = clampNumber(index, 0, maxIndex);
      iosSelectedIndexRef.current = nextIndex;
      setIosSelectedIndex((previous) => (previous === nextIndex ? previous : nextIndex));
      return nextIndex;
    },
    [maxIndex]
  );

  const clearControlledNativeReconcile = React.useCallback(() => {
    if (controlledNativeReconcileFrameRef.current != null) {
      cancelAnimationFrame(controlledNativeReconcileFrameRef.current);
      controlledNativeReconcileFrameRef.current = null;
    }
  }, []);

  const scheduleControlledNativeReconcile = React.useCallback(
    (emittedIndex: number, emittedValue: WheelColumnValue) => {
      if (!USE_NATIVE_WHEEL_PICKER || !isControlledRef.current) return;

      clearControlledNativeReconcile();
      controlledNativeReconcileFrameRef.current = requestAnimationFrame(() => {
        controlledNativeReconcileFrameRef.current = null;

        if (!isControlledRef.current) return;

        const committedIndex = clampNumber(
          controlledDisplayIndexRef.current,
          0,
          maxIndexRef.current
        );
        const parentAcceptedSelection =
          committedIndex === emittedIndex && Object.is(controlledValueRef.current, emittedValue);
        if (parentAcceptedSelection) return;

        // A native wheel owns its physical position while the user is moving
        // it, so selectedIndex cannot be forced back during the gesture. Once
        // the stable change has been offered to the parent, restore both the
        // optimistic JS refs/state and the physical wheel if the controlled
        // value was not accepted. The explicit command makes the rollback
        // immediate; the state update keeps the next React commit consistent.
        selectedValueRef.current = controlledValueRef.current;
        displayIndexRef.current = committedIndex;
        iosSelectedIndexRef.current = committedIndex;
        setIosSelectedIndex((previous) =>
          previous === committedIndex ? previous : committedIndex
        );
        scrollZKitWheelPickerToIndex(iosPickerRef.current, committedIndex, false);
      });
    },
    [clearControlledNativeReconcile]
  );

  const emitSelectedIndex = React.useCallback(
    (index: number, source: WheelColumnChangeSource) => {
      if (!options.length) return;

      const nextIndex = resolveSelectableIndex(index, index - displayIndexRef.current);
      const option = options[nextIndex];
      if (!option || option.disabled) return;

      const sameAsCurrent =
        displayIndexRef.current === nextIndex && Object.is(selectedValueRef.current, option.value);

      if (sameAsCurrent) {
        scheduleControlledNativeReconcile(nextIndex, option.value);
        return;
      }

      selectedValueRef.current = option.value;
      displayIndexRef.current = nextIndex;

      if (!isControlled) {
        setUncontrolledValue(option.value);
      }

      // Queue this before notifying the parent so a synchronous callback that
      // unmounts the wheel can cancel the frame in its effect cleanup.
      scheduleControlledNativeReconcile(nextIndex, option.value);

      onChange?.({
        value: option.value,
        index: nextIndex,
        option,
        source,
      });
    },
    [isControlled, onChange, options, resolveSelectableIndex, scheduleControlledNativeReconcile]
  );

  const scheduleIOSSettle = React.useCallback(
    (index: number) => {
      clearIOSSettleTimer();
      iosSettleTimerRef.current = setTimeout(() => {
        iosSettleTimerRef.current = null;
        const nextIndex = resolveSelectableIndex(index, index - displayIndexRef.current);
        if (nextIndex !== index) {
          syncIOSSelectedIndex(nextIndex);
        }
        emitSelectedIndex(nextIndex, 'user');
      }, IOS_SETTLE_DELAY_MS);
    },
    [clearIOSSettleTimer, emitSelectedIndex, resolveSelectableIndex, syncIOSSelectedIndex]
  );

  const scrollToIndex = React.useCallback(
    (index: number, animated = false) => {
      const nextIndex = clampNumber(index, 0, maxIndex);
      if (USE_NATIVE_WHEEL_PICKER) {
        clearIOSSettleTimer();
        syncIOSSelectedIndex(nextIndex);
        scrollZKitWheelPickerToIndex(iosPickerRef.current, nextIndex, animated);
        return;
      }

      const distanceFromWindowCenter = Math.abs(nextIndex - renderCenterIndexRef.current);
      const canAnimateWithinWindow = distanceFromWindowCenter <= VIRTUAL_WINDOW_RADIUS - MAX_FLING_ITEMS;
      recenterVirtualWindow(nextIndex, !canAnimateWithinWindow);
      const nextOffset = indexToOffset(nextIndex);
      cancelAnimation(offsetY);
      isUserInteracting.value = false;
      if (animated && canAnimateWithinWindow) {
        offsetY.value = withTiming(nextOffset, {
          duration: getSnapDuration(offsetY.value, nextOffset),
          easing: SNAP_EASING,
        });
        return;
      }
      offsetY.value = nextOffset;
    },
    [
      clearIOSSettleTimer,
      isUserInteracting,
      maxIndex,
      offsetY,
      recenterVirtualWindow,
      syncIOSSelectedIndex,
    ]
  );

  const scrollToValue = React.useCallback(
    (nextValue: WheelColumnValue, animated = false) => {
      const index = findOptionIndex(options, nextValue);
      if (index < 0) return;
      scrollToIndex(index, animated);
    },
    [options, scrollToIndex]
  );

  const settleToNearest = React.useCallback(
    (animated = false) => {
      const rawIndex =
        USE_NATIVE_WHEEL_PICKER
          ? iosSelectedIndexRef.current
          : Math.round(clampNumber(offsetY.value, 0, maxOffset) / WHEEL_ITEM_HEIGHT);
      const nextIndex = resolveSelectableIndex(rawIndex, rawIndex - displayIndexRef.current);
      scrollToIndex(nextIndex, animated);
      return nextIndex;
    },
    [maxOffset, offsetY, resolveSelectableIndex, scrollToIndex]
  );

  const syncCurrentSelection = React.useCallback(() => {
    if (!USE_NATIVE_WHEEL_PICKER) {
      return Promise.resolve(settleToNearest(false));
    }

    clearIOSSettleTimer();
    rejectNativeSyncRequest('A newer native selection sync superseded the previous request.');

    return new Promise<number>((resolve, reject) => {
      const requestId = ++nativeSyncSequenceRef.current;
      nativeSyncRequestRef.current = { requestId, resolve, reject };

      const commandSent =
        iosPickerRef.current != null &&
        syncZKitWheelPickerCurrentSelection(iosPickerRef.current, requestId);
      if (!commandSent) {
        rejectNativeSyncRequest('The native selection sync command is unavailable.');
        return;
      }

      // Never turn an unacknowledged command into a successful confirmation:
      // the UI/bridge may simply be busy and the cached index can be stale.
      // Leaving the picker open is safer than committing the wrong value.
      iosSyncTimerRef.current = setTimeout(() => {
        const pending = nativeSyncRequestRef.current;
        if (pending?.requestId === requestId) {
          rejectNativeSyncRequest('Timed out waiting for the native selection acknowledgement.');
        }
      }, NATIVE_SYNC_ACK_TIMEOUT_MS);
    });
  }, [clearIOSSettleTimer, rejectNativeSyncRequest, settleToNearest]);

  React.useImperativeHandle(
    ref,
    () => ({ scrollToIndex, scrollToValue, settleToNearest, syncCurrentSelection }),
    [scrollToIndex, scrollToValue, settleToNearest, syncCurrentSelection]
  );

  React.useEffect(() => {
    selectedValueRef.current = resolvedValue;
    displayIndexRef.current = displayIndex;
    previousWindowDisplayIndexRef.current = displayIndex;
    recenterVirtualWindow(displayIndex, true);
  }, [displayIndex, recenterVirtualWindow, resolvedValue]);

  React.useEffect(() => {
    if (isControlled || !options.length) return;
    if (findOptionIndex(options, uncontrolledValue) >= 0) return;

    const firstEnabledIndex = findNearestEnabledIndex(options, 0);
    const nextValue = firstEnabledIndex >= 0 ? options[firstEnabledIndex]?.value : options[0]?.value;
    setUncontrolledValue(nextValue ?? null);
  }, [isControlled, options, uncontrolledValue]);

  React.useEffect(() => {
    if (!options.length) {
      clearControlledNativeReconcile();
      clearIOSSettleTimer();
      iosSelectedIndexRef.current = 0;
      setIosSelectedIndex(0);
      cancelAnimation(offsetY);
      offsetY.value = 0;
      return;
    }

    clearIOSSettleTimer();
    syncIOSSelectedIndex(displayIndex);
    scrollToIndex(displayIndex, false);
  }, [
    clearControlledNativeReconcile,
    clearIOSSettleTimer,
    displayIndex,
    offsetY,
    options.length,
    scrollToIndex,
    syncIOSSelectedIndex,
  ]);

  React.useEffect(
    () => () => {
      clearIOSSettleTimer();
      rejectNativeSyncRequest('The wheel unmounted before native selection sync completed.');
    },
    [clearIOSSettleTimer, rejectNativeSyncRequest]
  );

  React.useEffect(
    () => () => {
      clearControlledNativeReconcile();
    },
    [clearControlledNativeReconcile]
  );

  const handleIOSChange = React.useCallback(
    (event: { nativeEvent: ZKitWheelPickerChangeEvent }) => {
      const rawIndex = syncIOSSelectedIndex(event.nativeEvent.newIndex);
      const nextIndex = resolveSelectableIndex(rawIndex, rawIndex - displayIndexRef.current);
      const rawSyncRequestId = event.nativeEvent.syncRequestId;
      const syncRequestId =
        typeof rawSyncRequestId === 'number' && Number.isFinite(rawSyncRequestId)
          ? Math.trunc(rawSyncRequestId)
          : null;
      if (syncRequestId != null) {
        resolveNativeSyncRequest(syncRequestId, nextIndex);
      }

      if (disabled) {
        if (syncRequestId == null) {
          scrollZKitWheelPickerToIndex(iosPickerRef.current, displayIndexRef.current, false);
        }
        return;
      }

      if (Platform.OS === 'android' || syncRequestId != null) {
        if (nextIndex !== rawIndex) {
          syncIOSSelectedIndex(nextIndex);
          scrollZKitWheelPickerToIndex(iosPickerRef.current, nextIndex, true);
        }
        emitSelectedIndex(nextIndex, 'user');
        return;
      }
      scheduleIOSSettle(nextIndex);
    },
    [
      disabled,
      emitSelectedIndex,
      resolveNativeSyncRequest,
      resolveSelectableIndex,
      scheduleIOSSettle,
      syncIOSSelectedIndex,
    ]
  );

  const startInteraction = React.useCallback(() => {
    cancelAnimation(offsetY);
    isUserInteracting.value = true;
    dragStartOffset.value = offsetY.value;
  }, [dragStartOffset, isUserInteracting, offsetY]);

  const updateInteraction = React.useCallback(
    (translationY: number) => {
      const nextOffset = clampNumber(dragStartOffset.value - translationY, 0, maxOffset);
      offsetY.value = nextOffset;
      recenterVirtualWindow(nextOffset / WHEEL_ITEM_HEIGHT);
    },
    [dragStartOffset, maxOffset, offsetY, recenterVirtualWindow]
  );

  const finishInteraction = React.useCallback(
    (velocityY: number) => {
      const currentOffset = clampNumber(offsetY.value, 0, maxOffset);
      const rawIndex = getTargetIndexFromRelease(currentOffset, velocityY, maxIndex);
      const currentIndex = Math.round(currentOffset / WHEEL_ITEM_HEIGHT);
      const nextIndex = resolveSelectableIndex(rawIndex, rawIndex - currentIndex);
      const nextOffset = indexToOffset(nextIndex);
      const canAnimateWithinWindow =
        Math.abs(nextIndex - renderCenterIndexRef.current) <=
        VIRTUAL_WINDOW_RADIUS - Math.floor(WHEEL_VISIBLE_ITEMS / 2);
      recenterVirtualWindow(nextIndex, !canAnimateWithinWindow);
      if (!canAnimateWithinWindow) {
        requestAnimationFrame(() => {
          offsetY.value = nextOffset;
          isUserInteracting.value = false;
          emitSelectedIndex(nextIndex, 'user');
        });
        return;
      }
      offsetY.value = withTiming(
        nextOffset,
        {
          duration: getSnapDuration(currentOffset, nextOffset),
          easing: SNAP_EASING,
        },
        (finished) => {
          if (!finished) return;
          isUserInteracting.value = false;
          scheduleOnRN(emitSelectedIndex, nextIndex, 'user');
        }
      );
    },
    [
      emitSelectedIndex,
      isUserInteracting,
      maxIndex,
      maxOffset,
      offsetY,
      recenterVirtualWindow,
      resolveSelectableIndex,
    ]
  );

  const touchStateRef = React.useRef({
    startPageY: 0,
    samples: [] as Array<{ pageY: number; timestamp: number }>,
  });

  const beginTouch = React.useCallback(
    (pageY: number, timestamp?: number) => {
      const ts = typeof timestamp === 'number' ? timestamp : Date.now();
      touchStateRef.current = {
        startPageY: pageY,
        samples: [{ pageY, timestamp: ts }],
      };
      startInteraction();
    },
    [startInteraction]
  );

  const recordTouchSample = React.useCallback((pageY: number, timestamp?: number) => {
    const ts = typeof timestamp === 'number' ? timestamp : Date.now();
    const { samples } = touchStateRef.current;
    samples.push({ pageY, timestamp: ts });

    while (samples.length > 6) {
      samples.shift();
    }

    const minTs = ts - ANDROID_VELOCITY_WINDOW_MS;
    while (samples.length > 2 && samples[0]?.timestamp < minTs) {
      samples.shift();
    }
  }, []);

  const moveTouch = React.useCallback(
    (pageY: number, timestamp?: number) => {
      updateInteraction(pageY - touchStateRef.current.startPageY);
      recordTouchSample(pageY, timestamp);
    },
    [recordTouchSample, updateInteraction]
  );

  const endTouch = React.useCallback(
    (pageY: number, timestamp?: number) => {
      recordTouchSample(pageY, timestamp);
      const { samples } = touchStateRef.current;
      const firstSample = samples[0];
      const lastSample = samples[samples.length - 1];
      const deltaY = (lastSample?.pageY ?? pageY) - (firstSample?.pageY ?? pageY);
      const deltaT = Math.max(1, (lastSample?.timestamp ?? Date.now()) - (firstSample?.timestamp ?? Date.now()));
      finishInteraction((deltaY / deltaT) * 1000);
    },
    [finishInteraction, recordTouchSample]
  );

  const handleAccessibilityAction = React.useCallback(
    (event: AccessibilityActionEvent) => {
      if (disabled) return;

      const actionName = event.nativeEvent.actionName;
      const direction = actionName === 'increment' ? 1 : actionName === 'decrement' ? -1 : 0;
      if (direction === 0) return;

      const nextIndex = findNearestEnabledIndex(options, displayIndexRef.current + direction, direction);
      if (nextIndex < 0) return;

      scrollToIndex(nextIndex, true);
      emitSelectedIndex(nextIndex, 'accessibility');
    },
    [
      disabled,
      emitSelectedIndex,
      options,
      scrollToIndex,
    ]
  );

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: CENTER_OFFSET - offsetY.value }],
  }));
  const selectedContentStyle = useAnimatedStyle(() => ({
    // The selected-color copy is clipped by a one-row viewport positioned at
    // the wheel centre. Keeping this transform relative to that viewport makes
    // the color follow the physical centre continuously, including while a
    // drag or snap animation is in flight.
    transform: [{ translateY: -offsetY.value }],
  }));

  const maxFontSizeMultiplier = getMaxFontSizeMultiplier();
  const { items, selectedItems } = React.useMemo(() => {
    if (USE_NATIVE_WHEEL_PICKER) return { items: null, selectedItems: null };

    const visibleOptions = options.slice(virtualRange.startIndex, virtualRange.endIndex);
    const renderItems = (selectedLayer: boolean) =>
      visibleOptions.map((item, localIndex) => {
        const index = virtualRange.startIndex + localIndex;
        return (
          <WheelItem
            key={`${selectedLayer ? 'selected' : 'base'}-${String(optionKey(item, index))}-${index}`}
            item={item}
            selected={selectedLayer}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
            numberOfLines={numberOfLines}
            itemTextColor={itemTextColor}
            selectedTextColor={selectedTextColor}
            disabledTextColor={disabledTextColor}
            itemTextStyle={itemTextStyle}
            selectedItemTextStyle={selectedItemTextStyle}
            disabledItemTextStyle={disabledItemTextStyle}
          />
        );
      });

    return {
      items: renderItems(false),
      selectedItems: renderItems(true),
    };
  }, [
    disabledItemTextStyle,
    disabledTextColor,
    itemTextColor,
    itemTextStyle,
    maxFontSizeMultiplier,
    numberOfLines,
    options,
    selectedItemTextStyle,
    selectedTextColor,
    virtualRange.endIndex,
    virtualRange.startIndex,
  ]);

  const nativeItems = React.useMemo(() => {
    if (!USE_NATIVE_WHEEL_PICKER) return [];

    return options.map((item) => ({
      label: item.label,
      value: item.value,
      disabled: item.disabled,
      textColor: item.disabled ? disabledTextColor : undefined,
      // Avoid allocating and serializing hundreds of synthetic test IDs on
      // every native date-wheel mount. Explicit IDs remain fully supported.
      testID: item.testID,
    }));
  }, [disabledTextColor, options]);

  const selectedOption = options[displayIndex];
  const canInteract = !disabled && options.length > 1 && findNearestEnabledIndex(options, displayIndex) >= 0;
  const columnStyle = React.useMemo(
    () => [styles.column, width != null && { width }, resolveWebInteractionStyle(disabled), style],
    [disabled, style, width]
  );
  const resolvedAccessibilityState = React.useMemo(
    () => ({
      ...accessibilityState,
      disabled,
    }),
    [accessibilityState, disabled]
  );

  if (USE_NATIVE_WHEEL_PICKER) {
    return (
      <View
        {...viewProps}
        accessibilityHint={accessibilityHint}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={resolvedAccessibilityState}
        accessibilityValue={{ text: selectedOption?.label ?? '' }}
        style={columnStyle}
        pointerEvents={canInteract ? 'auto' : 'none'}
        testID={testID}
      >
        <ZKitWheelPicker
          ref={iosPickerRef as React.Ref<any>}
          items={nativeItems}
          selectedIndex={iosSelectedIndex}
          disabled={disabled}
          onChange={handleIOSChange}
          numberOfLines={numberOfLines}
          rowHeight={Platform.OS === 'ios' ? IOS_NATIVE_PICKER_ROW_HEIGHT : WHEEL_ITEM_HEIGHT}
          style={styles.nativePicker}
          fontFamily={nativeFontFamily}
          fontSize={nativeFontSize}
          fontStyle={nativeFontStyle}
          fontWeight={nativeFontWeight}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
          color={selectedTextColor}
          itemColor={itemTextColor}
          disabledColor={disabledTextColor}
        />
      </View>
    );
  }

  return (
    <View
      {...viewProps}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
      accessibilityState={resolvedAccessibilityState}
      accessibilityValue={{ text: selectedOption?.label ?? '' }}
      collapsable={false}
      onAccessibilityAction={handleAccessibilityAction}
      style={columnStyle}
      testID={testID}
    >
      <Animated.View
        style={[
          styles.content,
          { top: virtualRange.startIndex * WHEEL_ITEM_HEIGHT },
          contentStyle,
        ]}
        pointerEvents="none"
      >
        {items}
      </Animated.View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={styles.selectedTextWindow}
      >
        <Animated.View
          style={[
            styles.content,
            { top: virtualRange.startIndex * WHEEL_ITEM_HEIGHT },
            selectedContentStyle,
          ]}
        >
          {selectedItems}
        </Animated.View>
      </View>
      <View
        style={styles.touchSurface}
        collapsable={false}
        pointerEvents="box-only"
        onStartShouldSetResponder={() => canInteract}
        onStartShouldSetResponderCapture={() => canInteract}
        onMoveShouldSetResponder={() => canInteract}
        onMoveShouldSetResponderCapture={() => canInteract}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(event) => {
          beginTouch(event.nativeEvent.pageY, event.nativeEvent.timestamp);
        }}
        onResponderMove={(event) => {
          moveTouch(event.nativeEvent.pageY, event.nativeEvent.timestamp);
        }}
        onResponderRelease={(event) => {
          endTouch(event.nativeEvent.pageY, event.nativeEvent.timestamp);
        }}
        onResponderTerminate={(event) => {
          endTouch(event.nativeEvent.pageY, event.nativeEvent.timestamp);
        }}
      />
    </View>
  );
});

export const WheelColumn = React.memo(WheelColumnBase);

const styles = StyleSheet.create({
  column: {
    height: WHEEL_VIEWPORT_HEIGHT,
    overflow: 'hidden',
  },
  nativePicker: {
    width: '100%',
    height: WHEEL_VIEWPORT_HEIGHT,
  },
  content: {
    width: '100%',
  },
  selectedTextWindow: {
    position: 'absolute',
    top: CENTER_OFFSET,
    left: 0,
    right: 0,
    height: WHEEL_ITEM_HEIGHT,
    overflow: 'hidden',
    zIndex: 1,
  },
  touchSurface: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 5,
  },
  itemContainer: {
    height: WHEEL_ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(8),
  },
  itemText: {
    fontSize: sp(18),
    textAlign: 'center',
    fontWeight: '500',
  },
  itemTextSelected: {
    opacity: 1,
  },
  itemTextDisabled: {
    opacity: 0.62,
  },
});
