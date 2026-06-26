import * as React from 'react';
import type {
  GestureResponderEvent,
  PressableStateCallbackType,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { Pressable, StyleSheet, View, processColor } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { EasingFunction, SharedValue, WithTimingConfig } from 'react-native-reanimated';
import { wp } from 'zkit-tools';
import type { Theme } from '../../theme/types';
import { useTheme } from '../../theme/useTheme';
import { Text } from '../Text';

export type AccordionType = 'single' | 'multiple';
export type AccordionValue = string | number;
export type AccordionVariant = 'card' | 'filled' | 'plain';
export type AccordionTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type AccordionSize = 'sm' | 'md' | 'lg';
export type AccordionMountStrategy = 'eager' | 'lazy' | 'unmountOnExit';
export type AccordionPressEffect = 'none' | 'opacity' | 'scale' | 'scale-opacity';

export type AccordionAnimationConfig = {
  duration?: number;
  easing?: EasingFunction;
  reduceMotion?: ReduceMotion;
};

export type AccordionItemState<T extends AccordionValue = AccordionValue> = {
  open: boolean;
  disabled: boolean;
  value: T;
  toggle: () => void;
  setOpen: (open: boolean) => void;
};

export type AccordionSlot<T extends AccordionValue = AccordionValue> =
  | React.ReactNode
  | ((state: AccordionItemState<T>) => React.ReactNode);

export type AccordionTriggerRenderState<T extends AccordionValue = AccordionValue> =
  AccordionItemState<T>;

type AccordionStoreListener = () => void;

type AccordionMetrics = {
  itemGap: number;
  itemRadius: number;
  triggerMinHeight: number;
  triggerPaddingHorizontal: number;
  triggerPaddingVertical: number;
  triggerGap: number;
  titleFontSize: number;
  titleLineHeight: number;
  descriptionFontSize: number;
  descriptionLineHeight: number;
  contentPaddingHorizontal: number;
  contentPaddingTop: number;
  contentPaddingBottom: number;
  contentOffset: number;
  indicatorSize: number;
  indicatorStrokeWidth: number;
  borderWidth: number;
};

type AccordionColors = {
  accent: string;
  surface: string;
  border: string;
  divider: string;
  title: string;
  description: string;
  disabled: string;
};

type ResolvedAccordionAnimation = {
  duration: number;
  easing: EasingFunction;
  timing: WithTimingConfig;
};

type AccordionContextValue<T extends AccordionValue> = {
  store: AccordionStore<T>;
  type: AccordionType;
  collapsible: boolean;
  disabled: boolean;
  variant: AccordionVariant;
  size: AccordionSize;
  tone: AccordionTone;
  mountStrategy: AccordionMountStrategy;
  metrics: AccordionMetrics;
  colors: AccordionColors;
  animation: ResolvedAccordionAnimation;
  itemStyle?: StyleProp<ViewStyle>;
  setItemOpen: (value: T, open: boolean) => void;
};

type AccordionItemContextValue<T extends AccordionValue> = AccordionItemState<T> & {
  openProgress: SharedValue<number>;
  metrics: AccordionMetrics;
  colors: AccordionColors;
  animation: ResolvedAccordionAnimation;
  mountStrategy: AccordionMountStrategy;
  triggerId: string;
  contentId: string;
};

const DEFAULT_DURATION = 220;
const DEFAULT_EASING = Easing.out(Easing.cubic);
const PRESS_IN_DURATION = 90;
const PRESS_OUT_DURATION = 140;

const SEMANTIC_COLORS: Record<string, string> = {
  danger: '#DC2626',
  error: '#DC2626',
  info: '#2563EB',
  success: '#16A34A',
  warn: '#D97706',
  warning: '#D97706',
};

const SIZE_TOKENS = {
  sm: {
    itemGap: 8,
    itemRadius: 12,
    triggerMinHeight: 44,
    triggerPaddingHorizontal: 12,
    triggerPaddingVertical: 10,
    triggerGap: 8,
    titleFontSize: 14,
    titleLineHeight: 19,
    descriptionFontSize: 12,
    descriptionLineHeight: 17,
    contentPaddingHorizontal: 12,
    contentPaddingTop: 0,
    contentPaddingBottom: 12,
    contentOffset: 4,
    indicatorSize: 20,
    indicatorStrokeWidth: 2,
  },
  md: {
    itemGap: 10,
    itemRadius: 14,
    triggerMinHeight: 46,
    triggerPaddingHorizontal: 14,
    triggerPaddingVertical: 12,
    triggerGap: 10,
    titleFontSize: 15,
    titleLineHeight: 21,
    descriptionFontSize: 13,
    descriptionLineHeight: 18,
    contentPaddingHorizontal: 14,
    contentPaddingTop: 2,
    contentPaddingBottom: 14,
    contentOffset: 5,
    indicatorSize: 22,
    indicatorStrokeWidth: 2,
  },
  lg: {
    itemGap: 12,
    itemRadius: 16,
    triggerMinHeight: 52,
    triggerPaddingHorizontal: 16,
    triggerPaddingVertical: 14,
    triggerGap: 12,
    titleFontSize: 16,
    titleLineHeight: 23,
    descriptionFontSize: 14,
    descriptionLineHeight: 20,
    contentPaddingHorizontal: 16,
    contentPaddingTop: 3,
    contentPaddingBottom: 16,
    contentOffset: 6,
    indicatorSize: 24,
    indicatorStrokeWidth: 2.25,
  },
} as const satisfies Record<AccordionSize, Omit<AccordionMetrics, 'borderWidth'>>;

const AccordionContext = React.createContext<AccordionContextValue<AccordionValue> | null>(null);
const AccordionItemContext = React.createContext<AccordionItemContextValue<AccordionValue> | null>(null);

function sameValue(a: AccordionValue, b: AccordionValue) {
  return Object.is(a, b) || a === b;
}

function hasValue<T extends AccordionValue>(values: readonly T[], value: T) {
  return values.some((item) => sameValue(item, value));
}

function uniqueValues<T extends AccordionValue>(values: readonly T[]) {
  const next: T[] = [];
  for (const value of values) {
    if (!hasValue(next, value)) next.push(value);
  }
  return next;
}

function areValuesEqual<T extends AccordionValue>(a: readonly T[], b: readonly T[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (!sameValue(a[i], b[i])) return false;
  }
  return true;
}

function normalizePropValues<T extends AccordionValue>(
  type: AccordionType,
  value: T | readonly T[] | null | undefined
) {
  if (type === 'multiple') {
    return Array.isArray(value) ? uniqueValues(value) : [];
  }
  if (value == null || Array.isArray(value)) return [];
  return [value];
}

function getNextValues<T extends AccordionValue>(
  current: readonly T[],
  value: T,
  open: boolean,
  type: AccordionType,
  collapsible: boolean
) {
  const isOpen = hasValue(current, value);

  if (type === 'single') {
    if (open) return isOpen ? current.slice() : [value];
    if (!isOpen) return current.slice();
    return collapsible ? [] : current.slice();
  }

  if (open) return isOpen ? current.slice() : [...current, value];
  return isOpen ? current.filter((item) => !sameValue(item, value)) : current.slice();
}

function resolveDuration(duration: number | undefined) {
  if (duration == null || !Number.isFinite(duration)) return DEFAULT_DURATION;
  return Math.max(0, duration);
}

function resolveAnimation(animation: AccordionAnimationConfig | false | undefined): ResolvedAccordionAnimation {
  const duration = animation === false ? 0 : resolveDuration(animation?.duration);
  const easing = animation === false ? DEFAULT_EASING : animation?.easing ?? DEFAULT_EASING;
  const reduceMotion = animation === false ? ReduceMotion.Always : animation?.reduceMotion ?? ReduceMotion.System;

  return {
    duration,
    easing,
    timing: {
      duration,
      easing,
      reduceMotion,
    },
  };
}

function resolveMetrics(size: AccordionSize): AccordionMetrics {
  const token = SIZE_TOKENS[size] ?? SIZE_TOKENS.md;
  return {
    itemGap: wp(token.itemGap),
    itemRadius: wp(token.itemRadius),
    triggerMinHeight: wp(token.triggerMinHeight),
    triggerPaddingHorizontal: wp(token.triggerPaddingHorizontal),
    triggerPaddingVertical: wp(token.triggerPaddingVertical),
    triggerGap: wp(token.triggerGap),
    titleFontSize: wp(token.titleFontSize),
    titleLineHeight: wp(token.titleLineHeight),
    descriptionFontSize: wp(token.descriptionFontSize),
    descriptionLineHeight: wp(token.descriptionLineHeight),
    contentPaddingHorizontal: wp(token.contentPaddingHorizontal),
    contentPaddingTop: wp(token.contentPaddingTop),
    contentPaddingBottom: wp(token.contentPaddingBottom),
    contentOffset: wp(token.contentOffset),
    indicatorSize: wp(token.indicatorSize),
    indicatorStrokeWidth: wp(token.indicatorStrokeWidth),
    borderWidth: wp(1),
  };
}

function isProcessableColor(color: string) {
  return processColor(color) != null;
}

function colorToRgba(color: string, alpha: number) {
  const processed = processColor(color);
  if (typeof processed !== 'number') return undefined;

  const normalized = processed >>> 0;
  const r = (normalized >> 16) & 255;
  const g = (normalized >> 8) & 255;
  const b = normalized & 255;
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r},${g},${b},${a})`;
}

function resolveColorToken(input: string | undefined, fallback: string, theme: Theme) {
  if (input == null) return fallback;

  const key = input.trim();
  if (!key) return fallback;

  const resolved =
    key === 'primary'
      ? theme.colors.primary
      : key === 'onPrimary'
        ? theme.colors.onPrimary
        : key === 'secondary' || key === 'neutral'
          ? theme.colors.secondary
          : key === 'onSecondary'
            ? theme.colors.onSecondary
            : key === 'surface'
              ? theme.colors.surface
              : key === 'onSurface'
                ? theme.colors.onSurface
                : key === 'border'
                  ? theme.colors.border
                  : key === 'muted'
                    ? theme.colors.muted
                    : key === 'disabled'
                      ? theme.colors.disabled
                      : SEMANTIC_COLORS[key] ?? key;

  return isProcessableColor(resolved) ? resolved : fallback;
}

function resolveToneColor(tone: AccordionTone, theme: Theme) {
  if (tone === 'primary') return theme.colors.primary;
  if (tone === 'success') return SEMANTIC_COLORS.success;
  if (tone === 'warning') return SEMANTIC_COLORS.warning;
  if (tone === 'danger') return SEMANTIC_COLORS.danger;
  if (tone === 'info') return SEMANTIC_COLORS.info;
  return theme.colors.muted;
}

function resolveColors(
  variant: AccordionVariant,
  tone: AccordionTone,
  color: string | undefined,
  theme: Theme
): AccordionColors {
  const accent = resolveColorToken(color, resolveToneColor(tone, theme), theme);
  const accentSoft = colorToRgba(accent, 0.08);
  const dividerSoft = colorToRgba(accent, 0.16);

  if (variant === 'filled') {
    return {
      accent,
      surface: tone === 'neutral' ? theme.colors.secondary : accentSoft ?? theme.colors.secondary,
      border: 'transparent',
      divider: dividerSoft ?? theme.colors.border,
      title: theme.colors.onSurface,
      description: theme.colors.muted,
      disabled: theme.colors.disabled,
    };
  }

  if (variant === 'plain') {
    return {
      accent,
      surface: 'transparent',
      border: 'transparent',
      divider: theme.colors.border,
      title: theme.colors.onSurface,
      description: theme.colors.muted,
      disabled: theme.colors.disabled,
    };
  }

  return {
    accent,
    surface: theme.colors.surface,
    border: theme.colors.border,
    divider: theme.colors.border,
    title: theme.colors.onSurface,
    description: theme.colors.muted,
    disabled: theme.colors.disabled,
  };
}

function resolveSlot<T extends AccordionValue>(
  slot: AccordionSlot<T> | undefined,
  state: AccordionItemState<T>
) {
  return typeof slot === 'function' ? slot(state) : slot;
}

function hasRenderableNode(node: React.ReactNode) {
  return node !== null && node !== undefined && node !== false;
}

function isPrimitiveTextNode(node: React.ReactNode): node is string | number {
  return typeof node === 'string' || typeof node === 'number';
}

function sanitizeNativeId(input: string) {
  return input.replace(/[^a-zA-Z0-9_-]/g, '');
}

function useAccordionContext<T extends AccordionValue = AccordionValue>() {
  const ctx = React.useContext(AccordionContext);
  if (!ctx) {
    throw new Error('[zkit-ui] Accordion components must be wrapped in <Accordion />');
  }
  return ctx as unknown as AccordionContextValue<T>;
}

function useAccordionItemContext<T extends AccordionValue = AccordionValue>() {
  const ctx = React.useContext(AccordionItemContext);
  if (!ctx) {
    throw new Error('[zkit-ui] AccordionTrigger/Content/Indicator must be wrapped in <AccordionItem />');
  }
  return ctx as AccordionItemContextValue<T>;
}

class AccordionStore<T extends AccordionValue> {
  private values: T[];
  private listeners = new Set<AccordionStoreListener>();

  constructor(initialValues: readonly T[]) {
    this.values = uniqueValues(initialValues);
  }

  subscribe = (listener: AccordionStoreListener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getValues = () => this.values;

  isOpen = (value: T) => hasValue(this.values, value);

  setValues = (values: readonly T[]) => {
    const next = uniqueValues(values);
    if (areValuesEqual(this.values, next)) return false;

    this.values = next;
    this.emit();
    return true;
  };

  private emit() {
    for (const listener of this.listeners) listener();
  }
}

type AccordionBaseProps = Omit<React.ComponentPropsWithoutRef<typeof View>, 'children' | 'style'> & {
  children: React.ReactNode;
  disabled?: boolean;
  variant?: AccordionVariant;
  tone?: AccordionTone;
  size?: AccordionSize;
  color?: string;
  animation?: AccordionAnimationConfig | false;
  mountStrategy?: AccordionMountStrategy;
  itemGap?: number;
  itemStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
};

export type AccordionSingleProps<T extends AccordionValue = AccordionValue> = AccordionBaseProps & {
  type?: 'single';
  collapsible?: boolean;
  value?: T | null;
  defaultValue?: T | null;
  onChange?: (value: T | null) => void;
};

export type AccordionMultipleProps<T extends AccordionValue = AccordionValue> = AccordionBaseProps & {
  type: 'multiple';
  value?: readonly T[];
  defaultValue?: readonly T[];
  onChange?: (value: T[]) => void;
};

export type AccordionProps<T extends AccordionValue = AccordionValue> =
  | AccordionSingleProps<T>
  | AccordionMultipleProps<T>;

export function Accordion<T extends AccordionValue = AccordionValue>(props: AccordionProps<T>) {
  const {
    children,
    disabled = false,
    variant = 'card',
    tone = 'neutral',
    size = 'md',
    color,
    animation,
    mountStrategy = 'eager',
    itemGap,
    itemStyle,
    style,
    ...viewProps
  } = props;
  const theme = useTheme();

  const type: AccordionType = props.type ?? 'single';
  const collapsible = type === 'single' ? (props as AccordionSingleProps<T>).collapsible ?? true : true;
  const isControlled = props.value !== undefined;
  const controlledValues = React.useMemo(
    () => (isControlled ? normalizePropValues(type, props.value as T | readonly T[] | null | undefined) : []),
    [isControlled, props.value, type]
  );

  const storeRef = React.useRef<AccordionStore<T> | null>(null);
  if (!storeRef.current) {
    const initialValue = isControlled ? props.value : props.defaultValue;
    storeRef.current = new AccordionStore<T>(
      normalizePropValues(type, initialValue as T | readonly T[] | null | undefined)
    );
  }
  const store = storeRef.current;
  const onChange = props.onChange;

  React.useLayoutEffect(() => {
    if (!isControlled) return;
    store.setValues(controlledValues);
  }, [controlledValues, isControlled, store]);

  React.useLayoutEffect(() => {
    if (isControlled || type !== 'single') return;
    const current = store.getValues();
    if (current.length > 1) store.setValues(current.slice(0, 1));
  }, [isControlled, store, type]);

  const emitChange = React.useCallback(
    (next: readonly T[]) => {
      if (type === 'multiple') {
        (onChange as ((value: T[]) => void) | undefined)?.(next.slice());
        return;
      }
      (onChange as ((value: T | null) => void) | undefined)?.(next[0] ?? null);
    },
    [onChange, type]
  );

  const setItemOpen = React.useCallback(
    (value: T, open: boolean) => {
      if (disabled) return;

      const current = store.getValues();
      const next = getNextValues(current, value, open, type, collapsible);
      if (areValuesEqual(current, next)) return;

      if (!isControlled) store.setValues(next);
      emitChange(next);
    },
    [collapsible, disabled, emitChange, isControlled, store, type]
  );

  const metrics = React.useMemo(() => {
    const resolved = resolveMetrics(size);
    return itemGap === undefined ? resolved : { ...resolved, itemGap };
  }, [itemGap, size]);
  const colors = React.useMemo(() => resolveColors(variant, tone, color, theme), [color, theme, tone, variant]);
  const resolvedAnimation = React.useMemo(() => resolveAnimation(animation), [animation]);
  const rootStyle = React.useMemo(() => [{ gap: metrics.itemGap }, style], [metrics.itemGap, style]);

  const ctx = React.useMemo<AccordionContextValue<T>>(
    () => ({
      store,
      type,
      collapsible,
      disabled,
      variant,
      size,
      tone,
      mountStrategy,
      metrics,
      colors,
      animation: resolvedAnimation,
      itemStyle,
      setItemOpen,
    }),
    [
      store,
      type,
      collapsible,
      disabled,
      variant,
      size,
      tone,
      mountStrategy,
      metrics,
      colors,
      resolvedAnimation,
      itemStyle,
      setItemOpen,
    ]
  );

  return (
    <AccordionContext.Provider value={ctx as unknown as AccordionContextValue<AccordionValue>}>
      <View {...viewProps} style={rootStyle}>
        {children}
      </View>
    </AccordionContext.Provider>
  );
}

export type AccordionItemProps<T extends AccordionValue = AccordionValue> = Omit<
  React.ComponentPropsWithoutRef<typeof View>,
  'children' | 'style'
> & {
  value: T;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

export function AccordionItem<T extends AccordionValue = AccordionValue>({
  value,
  disabled = false,
  style,
  children,
  accessibilityState,
  ...viewProps
}: AccordionItemProps<T>) {
  const accordion = useAccordionContext<T>();
  const reactId = React.useId();
  const idBase = React.useMemo(() => `zkit-accordion-${sanitizeNativeId(reactId)}`, [reactId]);
  const triggerId = `${idBase}-trigger`;
  const contentId = `${idBase}-content`;

  const getOpenSnapshot = React.useCallback(() => accordion.store.isOpen(value), [accordion.store, value]);
  const open = React.useSyncExternalStore(
    accordion.store.subscribe,
    getOpenSnapshot,
    getOpenSnapshot
  );
  const resolvedDisabled = accordion.disabled || disabled;
  const openProgress = useSharedValue(open ? 1 : 0);

  React.useEffect(() => {
    openProgress.value = withTiming(open ? 1 : 0, accordion.animation.timing);
  }, [accordion.animation, open, openProgress]);

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (resolvedDisabled) return;
      accordion.setItemOpen(value, nextOpen);
    },
    [accordion, resolvedDisabled, value]
  );

  const toggle = React.useCallback(() => {
    setOpen(!open);
  }, [open, setOpen]);

  const itemCtx = React.useMemo<AccordionItemContextValue<T>>(
    () => ({
      open,
      disabled: resolvedDisabled,
      value,
      toggle,
      setOpen,
      openProgress,
      metrics: accordion.metrics,
      colors: accordion.colors,
      animation: accordion.animation,
      mountStrategy: accordion.mountStrategy,
      triggerId,
      contentId,
    }),
    [
      accordion.animation,
      accordion.colors,
      accordion.metrics,
      accordion.mountStrategy,
      contentId,
      open,
      openProgress,
      resolvedDisabled,
      setOpen,
      toggle,
      triggerId,
      value,
    ]
  );

  const itemStyle = React.useMemo(
    () => [
      styles.item,
      {
        backgroundColor: accordion.colors.surface,
        borderColor: accordion.colors.border,
        borderRadius: accordion.metrics.itemRadius,
        borderWidth: accordion.variant === 'plain' ? 0 : accordion.metrics.borderWidth,
      },
      accordion.itemStyle,
      style,
    ],
    [
      accordion.colors.border,
      accordion.colors.surface,
      accordion.itemStyle,
      accordion.metrics.borderWidth,
      accordion.metrics.itemRadius,
      accordion.variant,
      style,
    ]
  );

  return (
    <AccordionItemContext.Provider value={itemCtx as AccordionItemContextValue<AccordionValue>}>
      <Animated.View
        {...viewProps}
        accessibilityState={{
          ...accessibilityState,
          disabled: resolvedDisabled,
          expanded: open,
        }}
        style={itemStyle}
      >
        {children}
      </Animated.View>
    </AccordionItemContext.Provider>
  );
}

type NativeTriggerProps = Omit<
  React.ComponentPropsWithoutRef<typeof Pressable>,
  'children' | 'disabled' | 'style'
>;

export type AccordionTriggerProps<T extends AccordionValue = AccordionValue> = NativeTriggerProps & {
  children?: AccordionSlot<T>;
  title?: AccordionSlot<T>;
  description?: AccordionSlot<T>;
  leading?: AccordionSlot<T>;
  trailing?: AccordionSlot<T>;
  indicator?: AccordionSlot<T> | false;
  disabled?: boolean;
  pressEffect?: AccordionPressEffect;
  titleNumberOfLines?: number;
  descriptionNumberOfLines?: number;
  style?: React.ComponentPropsWithoutRef<typeof Pressable>['style'];
  contentStyle?: StyleProp<ViewStyle>;
  textContainerStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  descriptionStyle?: StyleProp<TextStyle>;
};

export function AccordionTrigger<T extends AccordionValue = AccordionValue>({
  children,
  title,
  description,
  leading,
  trailing,
  indicator,
  disabled: disabledProp = false,
  pressEffect = 'scale-opacity',
  titleNumberOfLines = 1,
  descriptionNumberOfLines = 2,
  style,
  contentStyle,
  textContainerStyle,
  titleStyle,
  descriptionStyle,
  onPress,
  onPressIn,
  onPressOut,
  accessibilityRole,
  accessibilityState,
  nativeID,
  ...pressableProps
}: AccordionTriggerProps<T>) {
  const item = useAccordionItemContext<T>();
  const disabled = item.disabled || disabledProp;
  const pressSv = useSharedValue(0);

  const state = React.useMemo<AccordionItemState<T>>(
    () => ({
      open: item.open,
      disabled,
      value: item.value,
      toggle: item.toggle,
      setOpen: item.setOpen,
    }),
    [disabled, item.open, item.setOpen, item.toggle, item.value]
  );

  const leadingNode = resolveSlot(leading, state);
  const trailingNode = resolveSlot(trailing, state);
  const indicatorNode = indicator === false
    ? null
    : resolveSlot(indicator === undefined ? <AccordionIndicator /> : indicator, state);
  const childNode = resolveSlot(children, state);
  const titleNode = resolveSlot(title, state);
  const descriptionNode = resolveSlot(description, state);
  const hasCustomChildren = hasRenderableNode(childNode);

  const pressInTiming = React.useMemo(
    () => ({
      duration: PRESS_IN_DURATION,
      easing: item.animation.easing,
      reduceMotion: ReduceMotion.System,
    }),
    [item.animation.easing]
  );
  const pressOutTiming = React.useMemo(
    () => ({
      duration: PRESS_OUT_DURATION,
      easing: item.animation.easing,
      reduceMotion: ReduceMotion.System,
    }),
    [item.animation.easing]
  );

  React.useEffect(() => {
    if (!disabled) return;
    pressSv.value = withTiming(0, pressOutTiming);
  }, [disabled, pressOutTiming, pressSv]);

  const animatedContentStyle = useAnimatedStyle(() => {
    const opacityEnabled = pressEffect === 'opacity' || pressEffect === 'scale-opacity';
    const scaleEnabled = pressEffect === 'scale' || pressEffect === 'scale-opacity';
    const opacity = disabled ? 0.52 : opacityEnabled ? interpolate(pressSv.value, [0, 1], [1, 0.86]) : 1;
    const scale = scaleEnabled ? interpolate(pressSv.value, [0, 1], [1, 0.992]) : 1;

    return {
      opacity,
      transform: [{ scale }],
    };
  }, [disabled, pressEffect]);

  const renderedTitle = isPrimitiveTextNode(titleNode) ? (
    <Text
      numberOfLines={titleNumberOfLines}
      style={[
        styles.title,
        {
          color: disabled ? item.colors.disabled : item.colors.title,
          fontSize: item.metrics.titleFontSize,
          lineHeight: item.metrics.titleLineHeight,
        },
        titleStyle,
      ]}
    >
      {titleNode}
    </Text>
  ) : (
    titleNode
  );
  const renderedDescription = isPrimitiveTextNode(descriptionNode) ? (
    <Text
      numberOfLines={descriptionNumberOfLines}
      style={[
        styles.description,
        {
          color: disabled ? item.colors.disabled : item.colors.description,
          fontSize: item.metrics.descriptionFontSize,
          lineHeight: item.metrics.descriptionLineHeight,
        },
        descriptionStyle,
      ]}
    >
      {descriptionNode}
    </Text>
  ) : (
    descriptionNode
  );

  const renderedMain = hasCustomChildren ? (
    childNode
  ) : (
    <View style={[styles.textStack, textContainerStyle]}>
      {hasRenderableNode(renderedTitle) ? renderedTitle : null}
      {hasRenderableNode(renderedDescription) ? renderedDescription : null}
    </View>
  );

  const resolvedStyle = React.useCallback(
    (stateArg: PressableStateCallbackType) => {
      const userStyle = typeof style === 'function' ? style(stateArg) : style;
      return [
        styles.trigger,
        {
          minHeight: item.metrics.triggerMinHeight,
          paddingHorizontal: item.metrics.triggerPaddingHorizontal,
          paddingVertical: item.metrics.triggerPaddingVertical,
          borderBottomColor: item.open ? item.colors.divider : 'transparent',
          borderBottomWidth: item.metrics.borderWidth,
        },
        userStyle,
      ];
    },
    [
      item.colors.divider,
      item.metrics.borderWidth,
      item.metrics.triggerMinHeight,
      item.metrics.triggerPaddingHorizontal,
      item.metrics.triggerPaddingVertical,
      item.open,
      style,
    ]
  );

  const handlePress = React.useCallback(
    (event: GestureResponderEvent) => {
      if (disabled) return;
      item.toggle();
      onPress?.(event);
    },
    [disabled, item, onPress]
  );

  const handlePressIn = React.useCallback(
    (event: GestureResponderEvent) => {
      if (!disabled && pressEffect !== 'none') {
        pressSv.value = withTiming(1, pressInTiming);
      }
      onPressIn?.(event);
    },
    [disabled, onPressIn, pressEffect, pressInTiming, pressSv]
  );

  const handlePressOut = React.useCallback(
    (event: GestureResponderEvent) => {
      pressSv.value = withTiming(0, pressOutTiming);
      onPressOut?.(event);
    },
    [onPressOut, pressOutTiming, pressSv]
  );

  return (
    <Pressable
      {...pressableProps}
      nativeID={nativeID ?? item.triggerId}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityState={{
        ...accessibilityState,
        expanded: item.open,
        disabled,
      }}
      disabled={disabled}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={resolvedStyle}
    >
      <Animated.View
        style={[
          styles.triggerContent,
          { gap: item.metrics.triggerGap },
          animatedContentStyle,
          contentStyle,
        ]}
      >
        {hasRenderableNode(leadingNode) ? <View style={styles.leading}>{leadingNode}</View> : null}
        <View style={styles.main}>{renderedMain}</View>
        {hasRenderableNode(trailingNode) ? <View style={styles.trailing}>{trailingNode}</View> : null}
        {hasRenderableNode(indicatorNode) ? <View style={styles.indicatorSlot}>{indicatorNode}</View> : null}
      </Animated.View>
    </Pressable>
  );
}

export type AccordionContentProps = Omit<
  React.ComponentPropsWithoutRef<typeof View>,
  'children' | 'style'
> & {
  children: React.ReactNode;
  mountStrategy?: AccordionMountStrategy;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

export function AccordionContent({
  children,
  mountStrategy,
  style,
  containerStyle,
  nativeID,
  accessibilityElementsHidden,
  importantForAccessibility,
  onLayout,
  ...viewProps
}: AccordionContentProps) {
  const item = useAccordionItemContext();
  const strategy = mountStrategy ?? item.mountStrategy;
  const measuredHeight = useSharedValue(0);
  const lastMeasuredHeightRef = React.useRef(0);
  const [hasOpened, setHasOpened] = React.useState(item.open);
  const [renderForExit, setRenderForExit] = React.useState(
    strategy === 'eager' || strategy === 'lazy' || item.open
  );

  React.useEffect(() => {
    if (item.open) {
      setHasOpened(true);
      setRenderForExit(true);
      return undefined;
    }

    if (strategy === 'eager' || strategy === 'lazy') {
      setRenderForExit(true);
      return undefined;
    }

    if (item.animation.duration <= 0) {
      setRenderForExit(false);
      return undefined;
    }

    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setRenderForExit(false);
    }, item.animation.duration);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [item.animation.duration, item.open, strategy]);

  const shouldRender =
    strategy === 'eager' ||
    item.open ||
    (strategy === 'lazy' && hasOpened) ||
    (strategy === 'unmountOnExit' && renderForExit);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const progress = item.openProgress.value;
    return {
      height: measuredHeight.value * progress,
      opacity: interpolate(progress, [0, 0.2, 1], [0, 1, 1]),
    };
  }, []);

  const animatedInnerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            item.openProgress.value,
            [0, 1],
            [-item.metrics.contentOffset, 0]
          ),
        },
      ],
    };
  }, [item.metrics.contentOffset]);

  const handleLayout = React.useCallback<NonNullable<AccordionContentProps['onLayout']>>(
    (event) => {
      const nextHeight = event.nativeEvent.layout.height;
      const prevHeight = lastMeasuredHeightRef.current;
      lastMeasuredHeightRef.current = nextHeight;

      if (item.open && prevHeight > 0 && item.animation.duration > 0) {
        measuredHeight.value = withTiming(nextHeight, item.animation.timing);
      } else {
        measuredHeight.value = nextHeight;
      }

      onLayout?.(event);
    },
    [item.animation.duration, item.animation.timing, item.open, measuredHeight, onLayout]
  );

  React.useEffect(() => {
    if (shouldRender) return;
    lastMeasuredHeightRef.current = 0;
    measuredHeight.value = 0;
  }, [measuredHeight, shouldRender]);

  if (!shouldRender) return null;

  const hidden = !item.open;

  return (
    <Animated.View
      pointerEvents={item.open ? 'auto' : 'none'}
      style={[styles.contentContainer, animatedContainerStyle, containerStyle]}
    >
      <Animated.View style={animatedInnerStyle}>
        <View
          {...viewProps}
          nativeID={nativeID ?? item.contentId}
          accessibilityElementsHidden={accessibilityElementsHidden ?? hidden}
          importantForAccessibility={importantForAccessibility ?? (hidden ? 'no-hide-descendants' : 'auto')}
          onLayout={handleLayout}
          style={[
            styles.content,
            {
              paddingBottom: item.metrics.contentPaddingBottom,
              paddingHorizontal: item.metrics.contentPaddingHorizontal,
              paddingTop: item.metrics.contentPaddingTop,
            },
            style,
          ]}
        >
          {children}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export type AccordionIndicatorProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  color?: string;
  size?: number;
  strokeWidth?: number;
  closedRotation?: number;
  openRotation?: number;
};

export function AccordionIndicator({
  children,
  style,
  color,
  size,
  strokeWidth,
  closedRotation = -90,
  openRotation = 0,
}: AccordionIndicatorProps) {
  const item = useAccordionItemContext();
  const resolvedSize = size ?? item.metrics.indicatorSize;
  const resolvedStrokeWidth = strokeWidth ?? item.metrics.indicatorStrokeWidth;
  const chevronSize = Math.max(wp(6), Math.round(resolvedSize * 0.34));
  const resolvedColor = color ?? (item.disabled ? item.colors.disabled : item.colors.accent);

  const animatedStyle = useAnimatedStyle(() => {
    const deg = closedRotation + (openRotation - closedRotation) * item.openProgress.value;
    return {
      transform: [{ rotateZ: `${deg}deg` }],
    };
  }, [closedRotation, openRotation]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.indicator, { width: resolvedSize, height: resolvedSize }, animatedStyle, style]}
    >
      {children ?? (
        <View
          style={[
            styles.chevron,
            {
              width: chevronSize,
              height: chevronSize,
              borderRightWidth: resolvedStrokeWidth,
              borderBottomWidth: resolvedStrokeWidth,
              borderRightColor: resolvedColor,
              borderBottomColor: resolvedColor,
            },
          ]}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  item: {
    overflow: 'hidden',
  },
  trigger: {
    justifyContent: 'center',
  },
  triggerContent: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  leading: {
    flexShrink: 0,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  trailing: {
    flexShrink: 0,
  },
  indicatorSlot: {
    flexShrink: 0,
  },
  textStack: {
    flexShrink: 1,
    minWidth: 0,
  },
  title: {
    fontWeight: '600',
    includeFontPadding: false,
  },
  description: {
    includeFontPadding: false,
    marginTop: wp(2),
  },
  contentContainer: {
    overflow: 'hidden',
  },
  content: {},
  indicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    transform: [{ rotate: '45deg' }],
  },
});
