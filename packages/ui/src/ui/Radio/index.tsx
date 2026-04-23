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
    if (Object.is(this._value, value)) return;
    this._value = value;
    this.emit();
  };

  private emit() {
    for (const l of this.listeners) l();
  }
}

type RadioGroupContextValue<T extends RadioItemValue> = {
  store: RadioGroupStore<T>;
  disabled: boolean;
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
  value?: boolean;
  defaultValue?: boolean;
  onValueChange?: (checked: boolean) => void;
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
  value: valueProp,
  defaultValue = false,
  onValueChange,
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

  const isControlled = valueProp !== undefined;
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState<boolean>(defaultValue);

  const isGroupItem = group != null && itemValue != null && !isControlled;
  const groupChecked = React.useSyncExternalStore(
    group?.store.subscribe ?? (() => () => {}),
    () => (group && itemValue != null ? group.store.isSelected(itemValue) : false),
    () => (group && itemValue != null ? group.store.isSelected(itemValue) : false)
  );

  const checked = isGroupItem ? groupChecked : isControlled ? valueProp! : uncontrolledChecked;

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

  const setChecked = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledChecked(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange]
  );

  const toggle = React.useCallback(() => {
    if (resolvedDisabled) return;
    if (isGroupItem && group && itemValue != null) {
      if (!groupChecked) {
        checkedSv.value = withTiming(1, timing);
        group.selectValue(itemValue);
      }
      return;
    }

    const next = !checked;
    checkedSv.value = withTiming(next ? 1 : 0, timing);
    setChecked(next);
  }, [checked, checkedSv, group, groupChecked, isGroupItem, itemValue, resolvedDisabled, setChecked, timing]);

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

  const order: Array<'indicator' | 'label'> = labelDirection === 'right' ? ['label', 'indicator'] : ['indicator', 'label'];

  const content = (
    <>
      {order.map((part) => {
        if (part === 'indicator') {
          if (hiddenIndicator) return null;
          return (
            <RadioContext.Provider
              key="indicator"
              value={{
                checkedSv,
                size: resolvedSize,
                dotColor: resolvedPrimary,
              }}
            >
              <Animated.View
                style={[
                  styles.indicatorOuter,
                  {
                    width: resolvedSize,
                    height: resolvedSize,
                    borderWidth: resolvedBorderWidth,
                    borderRadius: resolvedSize / 2,
                  },
                  indicatorAnimatedStyle,
                  indicatorStyle,
                ]}
              >
                <RadioIndicator />
              </Animated.View>
            </RadioContext.Provider>
          );
        }
        if (!renderedLabel) return null;
        const marginStyle =
          hiddenIndicator
            ? null
            : labelDirection === 'right'
              ? { marginRight: resolvedLabelSpace }
              : { marginLeft: resolvedLabelSpace };
        return (
          <View key="label" style={[styles.labelWrap, marginStyle]}>
            {renderedLabel}
          </View>
        );
      })}
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
    storeRef.current = new RadioGroupStore<T>((defaultValue ?? null) as T | null);
  }

  React.useEffect(() => {
    if (!isControlled) return;
    storeRef.current!.setValue((value ?? null) as T | null);
  }, [isControlled, value]);

  const selectValue = React.useCallback(
    (v: T) => {
      storeRef.current!.setValue(v);
      onValueChange?.(v);
    },
    [onValueChange]
  );

  const ctx = React.useMemo<RadioGroupContextValue<T>>(
    () => ({
      store: storeRef.current!,
      disabled,
      selectValue,
    }),
    [disabled, selectValue]
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

