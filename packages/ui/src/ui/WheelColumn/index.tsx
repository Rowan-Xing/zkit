import * as React from 'react';
import {
  Platform,
  StyleSheet,
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
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { getMaxFontScale, sp, wp } from 'y2kit-tools';
import { useTheme } from '../../theme/useTheme';
import {
  Y2KitWheelPicker,
  syncY2KitWheelPickerCurrentSelection,
  type Y2KitWheelPickerChangeEvent,
} from './Y2KitWheelPickerNativeComponent';

export const WHEEL_VISIBLE_ITEMS = 5;

// iOS 走系统 UIPickerView，Android/Web 走自绘 transform 路径。
// 这些尺寸是当前 app 端多轮调校后的稳定观感，保留为默认公共规格。
const IOS_CONFIRM_SYNC_TIMEOUT_MS = 64;
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
  const offsetY = useSharedValue(indexToOffset(displayIndex));
  const dragStartOffset = useSharedValue(indexToOffset(displayIndex));
  const isUserInteracting = useSharedValue(false);

  const iosPickerRef = React.useRef<unknown>(null);
  const iosSelectedIndexRef = React.useRef(displayIndex);
  const iosSettleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const iosSyncTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const iosSyncResolverRef = React.useRef<((index: number) => void) | null>(null);
  const [iosSelectedIndex, setIosSelectedIndex] = React.useState(displayIndex);

  const selectedValueRef = React.useRef<WheelColumnValue | null | undefined>(resolvedValue);
  const displayIndexRef = React.useRef(displayIndex);

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

  const resolveIOSSyncRequest = React.useCallback(
    (index: number) => {
      const resolver = iosSyncResolverRef.current;
      if (!resolver) return;
      iosSyncResolverRef.current = null;
      clearIOSSyncTimer();
      resolver(resolveSelectableIndex(index));
    },
    [clearIOSSyncTimer, resolveSelectableIndex]
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

  const emitSelectedIndex = React.useCallback(
    (index: number, source: WheelColumnChangeSource) => {
      if (!options.length) return;

      const nextIndex = resolveSelectableIndex(index, index - displayIndexRef.current);
      const option = options[nextIndex];
      if (!option || option.disabled) return;

      const sameAsCurrent =
        displayIndexRef.current === nextIndex && Object.is(selectedValueRef.current, option.value);

      if (sameAsCurrent) return;

      selectedValueRef.current = option.value;
      displayIndexRef.current = nextIndex;

      if (!isControlled) {
        setUncontrolledValue(option.value);
      }

      onChange?.({
        value: option.value,
        index: nextIndex,
        option,
        source,
      });
    },
    [isControlled, onChange, options, resolveSelectableIndex]
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
      if (Platform.OS === 'ios') {
        clearIOSSettleTimer();
        syncIOSSelectedIndex(nextIndex);
        return;
      }

      const nextOffset = indexToOffset(nextIndex);
      cancelAnimation(offsetY);
      isUserInteracting.value = false;
      if (animated) {
        offsetY.value = withTiming(nextOffset, {
          duration: getSnapDuration(offsetY.value, nextOffset),
          easing: SNAP_EASING,
        });
        return;
      }
      offsetY.value = nextOffset;
    },
    [clearIOSSettleTimer, isUserInteracting, maxIndex, offsetY, syncIOSSelectedIndex]
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
        Platform.OS === 'ios'
          ? iosSelectedIndexRef.current
          : Math.round(clampNumber(offsetY.value, 0, maxOffset) / WHEEL_ITEM_HEIGHT);
      const nextIndex = resolveSelectableIndex(rawIndex, rawIndex - displayIndexRef.current);
      scrollToIndex(nextIndex, animated);
      return nextIndex;
    },
    [maxOffset, offsetY, resolveSelectableIndex, scrollToIndex]
  );

  const syncCurrentSelection = React.useCallback(() => {
    if (Platform.OS !== 'ios') {
      return Promise.resolve(settleToNearest(false));
    }

    clearIOSSettleTimer();
    resolveIOSSyncRequest(iosSelectedIndexRef.current);

    return new Promise<number>((resolve) => {
      iosSyncResolverRef.current = resolve;

      if (iosPickerRef.current != null && syncY2KitWheelPickerCurrentSelection(iosPickerRef.current)) {
        iosSyncTimerRef.current = setTimeout(() => {
          resolveIOSSyncRequest(iosSelectedIndexRef.current);
        }, IOS_CONFIRM_SYNC_TIMEOUT_MS);
        return;
      }

      resolveIOSSyncRequest(iosSelectedIndexRef.current);
    });
  }, [clearIOSSettleTimer, resolveIOSSyncRequest, settleToNearest]);

  React.useImperativeHandle(
    ref,
    () => ({ scrollToIndex, scrollToValue, settleToNearest, syncCurrentSelection }),
    [scrollToIndex, scrollToValue, settleToNearest, syncCurrentSelection]
  );

  React.useEffect(() => {
    selectedValueRef.current = resolvedValue;
    displayIndexRef.current = displayIndex;
  }, [displayIndex, resolvedValue]);

  React.useEffect(() => {
    if (isControlled || !options.length) return;
    if (findOptionIndex(options, uncontrolledValue) >= 0) return;

    const firstEnabledIndex = findNearestEnabledIndex(options, 0);
    const nextValue = firstEnabledIndex >= 0 ? options[firstEnabledIndex]?.value : options[0]?.value;
    setUncontrolledValue(nextValue ?? null);
  }, [isControlled, options, uncontrolledValue]);

  React.useEffect(() => {
    if (!options.length) {
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
  }, [clearIOSSettleTimer, displayIndex, offsetY, options.length, scrollToIndex, syncIOSSelectedIndex]);

  React.useEffect(
    () => () => {
      clearIOSSettleTimer();
      resolveIOSSyncRequest(iosSelectedIndexRef.current);
    },
    [clearIOSSettleTimer, resolveIOSSyncRequest]
  );

  const handleIOSChange = React.useCallback(
    (event: { nativeEvent: Y2KitWheelPickerChangeEvent }) => {
      const rawIndex = syncIOSSelectedIndex(event.nativeEvent.newIndex);
      const nextIndex = resolveSelectableIndex(rawIndex, rawIndex - displayIndexRef.current);
      resolveIOSSyncRequest(nextIndex);
      scheduleIOSSettle(nextIndex);
    },
    [resolveIOSSyncRequest, resolveSelectableIndex, scheduleIOSSettle, syncIOSSelectedIndex]
  );

  const startInteraction = React.useCallback(() => {
    cancelAnimation(offsetY);
    isUserInteracting.value = true;
    dragStartOffset.value = offsetY.value;
  }, [dragStartOffset, isUserInteracting, offsetY]);

  const updateInteraction = React.useCallback(
    (translationY: number) => {
      offsetY.value = clampNumber(dragStartOffset.value - translationY, 0, maxOffset);
    },
    [dragStartOffset, maxOffset, offsetY]
  );

  const finishInteraction = React.useCallback(
    (velocityY: number) => {
      const currentOffset = clampNumber(offsetY.value, 0, maxOffset);
      const rawIndex = getTargetIndexFromRelease(currentOffset, velocityY, maxIndex);
      const currentIndex = Math.round(currentOffset / WHEEL_ITEM_HEIGHT);
      const nextIndex = resolveSelectableIndex(rawIndex, rawIndex - currentIndex);
      const nextOffset = indexToOffset(nextIndex);
      offsetY.value = withTiming(
        nextOffset,
        {
          duration: getSnapDuration(currentOffset, nextOffset),
          easing: SNAP_EASING,
        },
        (finished) => {
          if (!finished) return;
          isUserInteracting.value = false;
          runOnJS(emitSelectedIndex)(nextIndex, 'user');
        }
      );
    },
    [emitSelectedIndex, isUserInteracting, maxIndex, maxOffset, offsetY, resolveSelectableIndex]
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
    [disabled, emitSelectedIndex, options, scrollToIndex]
  );

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: CENTER_OFFSET - offsetY.value }],
  }));

  const items = React.useMemo(
    () =>
      options.map((item, index) => (
        <View key={`${String(optionKey(item, index))}-${index}`} style={styles.itemContainer}>
          <Animated.Text
            accessibilityLabel={item.accessibilityLabel ?? item.label}
            maxFontSizeMultiplier={getMaxFontScale()}
            numberOfLines={numberOfLines}
            style={[
              styles.itemText,
              { color: itemTextColor },
              itemTextStyle,
              index === displayIndex && [styles.itemTextSelected, { color: selectedTextColor }, selectedItemTextStyle],
              item.disabled && [styles.itemTextDisabled, { color: disabledTextColor }, disabledItemTextStyle],
            ]}
            testID={item.testID}
          >
            {item.label}
          </Animated.Text>
        </View>
      )),
    [
      disabledItemTextStyle,
      disabledTextColor,
      displayIndex,
      itemTextColor,
      itemTextStyle,
      numberOfLines,
      options,
      selectedItemTextStyle,
      selectedTextColor,
    ]
  );

  const nativeItems = React.useMemo(
    () =>
      options.map((item, index) => ({
        label: item.label,
        value: item.value,
        textColor: item.disabled ? disabledTextColor : undefined,
        testID: item.testID ?? `wheel-item-${String(item.value)}-${index}`,
      })),
    [disabledTextColor, options]
  );

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

  if (Platform.OS === 'ios') {
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
        <Y2KitWheelPicker
          ref={iosPickerRef as React.Ref<any>}
          items={nativeItems}
          selectedIndex={iosSelectedIndex}
          onChange={handleIOSChange}
          numberOfLines={numberOfLines}
          rowHeight={IOS_NATIVE_PICKER_ROW_HEIGHT}
          style={styles.iosPicker}
          fontFamily={nativeFontFamily}
          fontSize={nativeFontSize}
          fontStyle={nativeFontStyle}
          fontWeight={nativeFontWeight}
          color={selectedTextColor}
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
        style={[styles.content, contentStyle]}
        pointerEvents="none"
        renderToHardwareTextureAndroid={Platform.OS === 'android'}
        shouldRasterizeIOS={false}
      >
        {items}
      </Animated.View>
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
  iosPicker: {
    width: '100%',
    height: IOS_NATIVE_PICKER_HEIGHT,
  },
  content: {
    width: '100%',
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
