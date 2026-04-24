import * as React from 'react';
import { Pressable, StyleProp, StyleSheet, useColorScheme, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { wp } from 'y2kit-tools';
import { useTheme } from '../../theme/useTheme';
import { Text } from '../Text';

export type RadioItemValue = string | number | boolean;

export type RadioSlotProps = {
  checked: boolean;
  itemValue?: RadioItemValue;
  disabled: boolean;
  toggle: () => void;
};

type RadioContextValue = {
  checkedSv: SharedValue<number>;
  size: number;
  dotColor: string;
};

const RadioContext = React.createContext<RadioContextValue | null>(null);

type RadioGroupStoreListener = () => void;

const noopSubscribe = () => () => {};

class RadioGroupStore<T extends RadioItemValue> {
  private _value: T | null;
  private listeners = new Set<RadioGroupStoreListener>();

  constructor(initialValue: T | null) {
    this._value = initialValue ?? null;
  }

  subscribe = (listener: RadioGroupStoreListener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getValue = () => this._value;

  isSelected = (v: T) => Object.is(this._value, v);

  setValue = (value: T | null) => {
    if (Object.is(this._value, value)) return false;
    this._value = value;
    this.emit();
    return true;
  };

  private emit() {
    for (const l of this.listeners) l();
  }
}

type RadioGroupContextValue<T extends RadioItemValue> = {
  store: RadioGroupStore<T>;
  disabled: boolean;
  isControlled: boolean;
  selectValue: (value: T) => void;
};

const RadioGroupContext = React.createContext<RadioGroupContextValue<RadioItemValue> | null>(null);

function useRadioContext() {
  const ctx = React.useContext(RadioContext);
  if (!ctx) {
    throw new Error('[y2kit-ui] RadioIndicator must be wrapped in <Radio />');
  }
  return ctx;
}

function isRenderProp(children: RadioProps['children']): children is (slot: RadioSlotProps) => React.ReactNode {
  return typeof children === 'function';
}

function toTimingConfig(duration: number) {
  return { duration, easing: Easing.out(Easing.cubic) } as const;
}

function parseNumberLike(input: number | string | undefined) {
  if (typeof input === 'number') return input;
  if (typeof input !== 'string') return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const n = trimmed.endsWith('px') ? parseFloat(trimmed.slice(0, -2)) : parseFloat(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

export type RadioProps = Omit<
  React.ComponentPropsWithoutRef<typeof Pressable>,
  'style' | 'children' | 'onPressIn' | 'onPressOut'
> & {
  itemValue?: RadioItemValue;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  children?: React.ReactNode | ((slot: RadioSlotProps) => React.ReactNode);
  style?: StyleProp<ViewStyle>;
  indicatorStyle?: StyleProp<ViewStyle>;
  labelSpace?: number;
  hiddenIndicator?: boolean;
  unCheckColor?: string;
  darkUnCheckColor?: string;
  duration?: number;
  size?: number;
  borderWidth?: number;
  color?: string;
  labelDirection?: 'left' | 'right';
  showLabel?: boolean;
  labelFontSize?: number;
  testID?: string;
};

export function Radio({
  itemValue,
  checked: checkedProp,
  defaultChecked = false,
  onCheckedChange,
  disabled = false,
  label,
  children,
  style,
  indicatorStyle,
  labelSpace,
  hiddenIndicator = false,
  unCheckColor,
  darkUnCheckColor,
  duration = 180,
  size,
  borderWidth,
  color,
  labelDirection = 'left',
  showLabel = true,
  labelFontSize,
  testID,
  onPress,
  ...pressableProps
}: RadioProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const group = React.useContext(RadioGroupContext);

  const resolvedDisabled = disabled || Boolean(group?.disabled);

  const isControlled = checkedProp !== undefined;
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState<boolean>(() => defaultChecked);

  const isGroupItem = group != null && itemValue !== undefined && !isControlled;
  const getGroupCheckedSnapshot = React.useCallback(
    () => (group && itemValue !== undefined ? group.store.isSelected(itemValue) : false),
    [group, itemValue]
  );
  const groupChecked = React.useSyncExternalStore(
    group?.store.subscribe ?? noopSubscribe,
    getGroupCheckedSnapshot,
    getGroupCheckedSnapshot
  );

  const checked = isGroupItem ? groupChecked : isControlled ? checkedProp! : uncontrolledChecked;

  const resolvedSize = size ?? wp(20);
  const resolvedBorderWidth = borderWidth ?? wp(1.5);
  const resolvedPrimary = color ?? theme.colors.primary;
  const resolvedUncheck = React.useMemo(() => {
    if (scheme === 'dark' && darkUnCheckColor != null) return darkUnCheckColor;
    return unCheckColor ?? theme.colors.border;
  }, [darkUnCheckColor, scheme, theme.colors.border, unCheckColor]);
  const resolvedLabelSpace = labelSpace ?? wp(10);
  const resolvedLabelFontSize = labelFontSize ?? wp(15);
  const timing = React.useMemo(() => toTimingConfig(duration), [duration]);
  const indicatorFrameStyle = React.useMemo(
    () => ({
      width: resolvedSize,
      height: resolvedSize,
      borderWidth: resolvedBorderWidth,
      borderRadius: resolvedSize / 2,
    }),
    [resolvedBorderWidth, resolvedSize]
  );
  const labelMarginStyle = React.useMemo(() => {
    if (hiddenIndicator) return null;
    return labelDirection === 'right'
      ? { marginRight: resolvedLabelSpace }
      : { marginLeft: resolvedLabelSpace };
  }, [hiddenIndicator, labelDirection, resolvedLabelSpace]);

  const checkedSv = useSharedValue(checked ? 1 : 0);
  const pressSv = useSharedValue(0);

  React.useEffect(() => {
    checkedSv.value = withTiming(checked ? 1 : 0, timing);
  }, [checked, checkedSv, timing]);

  const rootAnimatedStyle = useAnimatedStyle(() => {
    const pressedOpacity = interpolate(pressSv.value, [0, 1], [1, 0.85]);
    return { opacity: resolvedDisabled ? 0.55 : pressedOpacity };
  }, [resolvedDisabled]);

  const indicatorAnimatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: theme.colors.surface,
      borderColor: interpolateColor(checkedSv.value, [0, 1], [resolvedUncheck, resolvedPrimary]),
    };
  }, [resolvedPrimary, resolvedUncheck, theme.colors.surface]);

  const emitCheckedChange = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledChecked(next);
      onCheckedChange?.(next);
    },
    [isControlled, onCheckedChange]
  );

  const toggle = React.useCallback(() => {
    if (resolvedDisabled) return;
    if (isGroupItem && group && itemValue !== undefined) {
      if (!groupChecked) {
        if (!group.isControlled) {
          checkedSv.value = withTiming(1, timing);
        }
        group.selectValue(itemValue);
      }
      return;
    }

    const next = !checked;
    if (!isControlled) {
      checkedSv.value = withTiming(next ? 1 : 0, timing);
    }
    emitCheckedChange(next);
  }, [
    checked,
    checkedSv,
    emitCheckedChange,
    group,
    groupChecked,
    isControlled,
    isGroupItem,
    itemValue,
    resolvedDisabled,
    timing,
  ]);

  const renderedLabel = React.useMemo(() => {
    if (!showLabel) return null;
    if (isRenderProp(children)) {
      return children({
        checked,
        itemValue,
        disabled: resolvedDisabled,
        toggle,
      });
    }
    if (children != null) return children;
    if (label) {
      return (
        <Text
          style={[
            styles.label,
            { fontSize: resolvedLabelFontSize, color: theme.colors.onSurface },
            resolvedDisabled ? { color: theme.colors.disabled } : null,
          ]}
        >
          {label}
        </Text>
      );
    }
    return null;
  }, [checked, children, itemValue, label, resolvedDisabled, resolvedLabelFontSize, showLabel, theme.colors.disabled, theme.colors.onSurface, toggle]);

  const indicatorContext = React.useMemo<RadioContextValue>(
    () => ({
      checkedSv,
      size: resolvedSize,
      dotColor: resolvedPrimary,
    }),
    [checkedSv, resolvedPrimary, resolvedSize]
  );

  const indicatorNode = hiddenIndicator ? null : (
    <RadioContext.Provider value={indicatorContext}>
      <Animated.View
        style={[
          styles.indicatorOuter,
          indicatorFrameStyle,
          indicatorAnimatedStyle,
          indicatorStyle,
        ]}
      >
        <RadioIndicator />
      </Animated.View>
    </RadioContext.Provider>
  );
  const labelNode = renderedLabel ? (
    <View style={[styles.labelWrap, labelMarginStyle]}>{renderedLabel}</View>
  ) : null;
  const content = labelDirection === 'right' ? (
    <>
      {labelNode}
      {indicatorNode}
    </>
  ) : (
    <>
      {indicatorNode}
      {labelNode}
    </>
  );

  return (
    <Pressable
      {...pressableProps}
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ checked: Boolean(checked), disabled: Boolean(resolvedDisabled) }}
      disabled={resolvedDisabled}
      onPress={(e) => {
        toggle();
        onPress?.(e);
      }}
      onPressIn={() => {
        if (resolvedDisabled) return;
        pressSv.value = withTiming(1, timing);
      }}
      onPressOut={() => {
        pressSv.value = withTiming(0, timing);
      }}
      style={[styles.row, style]}
    >
      <Animated.View style={[styles.content, rootAnimatedStyle]}>{content}</Animated.View>
    </Pressable>
  );
}

export type RadioIndicatorProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function RadioIndicator({ children, style }: RadioIndicatorProps) {
  const ctx = useRadioContext();

  const dotAnimatedStyle = useAnimatedStyle(() => {
    const opacity = ctx.checkedSv.value;
    const scale = interpolate(ctx.checkedSv.value, [0, 1], [0.7, 1]);
    return { opacity, transform: [{ scale }] };
  }, []);

  const dotSize = Math.max(6, Math.round(ctx.size * 0.5));

  return (
    <View pointerEvents="none" style={[styles.indicatorInner, style]}>
      <Animated.View style={dotAnimatedStyle}>
        {children ?? (
          <View
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: ctx.dotColor,
            }}
          />
        )}
      </Animated.View>
    </View>
  );
}

export type RadioGroupProps<T extends RadioItemValue = RadioItemValue> = Omit<
  React.ComponentPropsWithoutRef<typeof View>,
  'children'
> & {
  value?: T | null;
  defaultValue?: T | null;
  onValueChange?: (value: T | null) => void;
  disabled?: boolean;
  direction?: 'row' | 'column';
  align?: 'left' | 'center' | 'right';
  gap?: number | string | [number | string, number | string];
  children: React.ReactNode;
};

export function RadioGroup<T extends RadioItemValue = RadioItemValue>({
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  direction = 'row',
  align = 'left',
  gap = 20,
  style,
  children,
  ...viewProps
}: RadioGroupProps<T>) {
  const isControlled = value !== undefined;
  const storeRef = React.useRef<RadioGroupStore<T> | null>(null);
  if (!storeRef.current) {
    storeRef.current = new RadioGroupStore<T>(((isControlled ? value : defaultValue) ?? null) as T | null);
  }

  React.useLayoutEffect(() => {
    if (!isControlled) return;
    storeRef.current!.setValue((value ?? null) as T | null);
  }, [isControlled, value]);

  const selectValue = React.useCallback(
    (v: T) => {
      if (!isControlled) storeRef.current!.setValue(v);
      onValueChange?.(v);
    },
    [isControlled, onValueChange]
  );

  const ctx = React.useMemo<RadioGroupContextValue<T>>(
    () => ({
      store: storeRef.current!,
      disabled,
      isControlled,
      selectValue,
    }),
    [disabled, isControlled, selectValue]
  );

  const flexDirection = direction === 'column' ? 'column' : 'row';
  const alignKey = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';

  const gapStyle = React.useMemo(() => {
    const raw = gap;
    if (Array.isArray(raw)) {
      const col = parseNumberLike(raw[0]) ?? 0;
      const row = parseNumberLike(raw[1]) ?? 0;
      return { columnGap: col, rowGap: row } as ViewStyle;
    }
    const n = parseNumberLike(raw) ?? 0;
    return { columnGap: n, rowGap: n } as ViewStyle;
  }, [gap]);

  const layoutStyle: ViewStyle =
    flexDirection === 'row'
      ? { flexDirection, alignItems: 'center', justifyContent: alignKey }
      : { flexDirection, alignItems: alignKey, justifyContent: 'flex-start' };

  return (
    <RadioGroupContext.Provider value={ctx as any}>
      <View {...viewProps} style={[layoutStyle, gapStyle, style]}>
        {children}
      </View>
    </RadioGroupContext.Provider>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicatorOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {},
  labelWrap: {
    flexShrink: 1,
    minWidth: 0,
  },
});
