import * as React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { EasingFunction } from 'react-native-reanimated';
import { wp } from 'y2kit-tools';
import { useTheme } from '../../theme/useTheme';
import { Text } from '../Text';

export type AccordionType = 'single' | 'multiple';
export type AccordionValue = string | number;

type AccordionStoreListener = () => void;

const DEFAULT_DURATION = 220;
const DEFAULT_EASING = Easing.out(Easing.cubic);
const PRESS_TIMING = { duration: 120, easing: Easing.out(Easing.cubic) } as const;

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

function resolveDuration(duration: number | undefined) {
  if (duration == null) return DEFAULT_DURATION;
  if (!Number.isFinite(duration)) return DEFAULT_DURATION;
  return Math.max(0, duration);
}

function getNextValues<T extends AccordionValue>(
  current: readonly T[],
  value: T,
  type: AccordionType,
  collapsible: boolean
) {
  const open = hasValue(current, value);
  if (type === 'single') {
    if (open) return collapsible ? [] : current.slice();
    return [value];
  }

  if (open) return current.filter((item) => !sameValue(item, value));
  return [...current, value];
}

function hasRenderableNode(node: React.ReactNode) {
  return node !== null && node !== undefined && node !== false;
}

function resolveSlot<T extends AccordionValue>(
  slot: React.ReactNode | ((state: AccordionItemState<T>) => React.ReactNode) | undefined,
  state: AccordionItemState<T>
) {
  return typeof slot === 'function' ? slot(state) : slot;
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

type AccordionContextValue<T extends AccordionValue> = {
  store: AccordionStore<T>;
  type: AccordionType;
  collapsible: boolean;
  disabled: boolean;
  duration: number;
  easing: EasingFunction;
  toggleItem: (value: T) => void;
};

const AccordionContext = React.createContext<AccordionContextValue<AccordionValue> | null>(null);

export type AccordionItemState<T extends AccordionValue = AccordionValue> = {
  open: boolean;
  disabled: boolean;
  value: T;
  toggle: () => void;
};

type AccordionItemContextValue<T extends AccordionValue> = AccordionItemState<T> & {
  duration: number;
  easing: EasingFunction;
};

const AccordionItemContext = React.createContext<AccordionItemContextValue<AccordionValue> | null>(null);

function useAccordionContext<T extends AccordionValue = AccordionValue>() {
  const ctx = React.useContext(AccordionContext);
  if (!ctx) {
    throw new Error('[y2kit-ui] Accordion components must be wrapped in <Accordion />');
  }
  return ctx as unknown as AccordionContextValue<T>;
}

function useAccordionItemContext<T extends AccordionValue = AccordionValue>() {
  const ctx = React.useContext(AccordionItemContext);
  if (!ctx) {
    throw new Error('[y2kit-ui] AccordionTrigger/Content/Indicator must be wrapped in <AccordionItem />');
  }
  return ctx as AccordionItemContextValue<T>;
}

type AccordionBaseProps = Omit<React.ComponentPropsWithoutRef<typeof View>, 'children' | 'style'> & {
  disabled?: boolean;
  duration?: number;
  easing?: EasingFunction;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
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
    disabled = false,
    duration,
    easing = DEFAULT_EASING,
    style,
    children,
    ...viewProps
  } = props;

  const type: AccordionType = props.type ?? 'single';
  const collapsible = type === 'single' ? Boolean((props as AccordionSingleProps<T>).collapsible) : true;
  const resolvedDuration = resolveDuration(duration);
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

  const toggleItem = React.useCallback(
    (value: T) => {
      if (disabled) return;
      const current = store.getValues();
      const next = getNextValues(current, value, type, collapsible);
      if (areValuesEqual(current, next)) return;

      if (!isControlled) store.setValues(next);
      emitChange(next);
    },
    [collapsible, disabled, emitChange, isControlled, store, type]
  );

  const ctx = React.useMemo<AccordionContextValue<T>>(
    () => ({
      store,
      type,
      collapsible,
      disabled,
      duration: resolvedDuration,
      easing,
      toggleItem,
    }),
    [collapsible, disabled, easing, resolvedDuration, store, toggleItem, type]
  );

  return (
    <AccordionContext.Provider value={ctx as unknown as AccordionContextValue<AccordionValue>}>
      <View {...viewProps} style={style}>
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
  ...viewProps
}: AccordionItemProps<T>) {
  const theme = useTheme();
  const accordion = useAccordionContext<T>();
  const getOpenSnapshot = React.useCallback(() => accordion.store.isOpen(value), [accordion.store, value]);
  const open = React.useSyncExternalStore(
    accordion.store.subscribe,
    getOpenSnapshot,
    getOpenSnapshot
  );
  const resolvedDisabled = accordion.disabled || disabled;

  const toggle = React.useCallback(() => {
    if (resolvedDisabled) return;
    accordion.toggleItem(value);
  }, [accordion, resolvedDisabled, value]);

  const itemCtx = React.useMemo<AccordionItemContextValue<T>>(
    () => ({
      open,
      disabled: resolvedDisabled,
      value,
      toggle,
      duration: accordion.duration,
      easing: accordion.easing,
    }),
    [accordion.duration, accordion.easing, open, resolvedDisabled, toggle, value]
  );

  return (
    <AccordionItemContext.Provider value={itemCtx as AccordionItemContextValue<AccordionValue>}>
      <Animated.View
        {...viewProps}
        accessibilityState={{ ...viewProps.accessibilityState, disabled: resolvedDisabled, expanded: open }}
        layout={LinearTransition.duration(accordion.duration).easing(accordion.easing)}
        style={[
          styles.item,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          style,
        ]}
      >
        {children}
      </Animated.View>
    </AccordionItemContext.Provider>
  );
}

export type AccordionTriggerRenderState<T extends AccordionValue = AccordionValue> = AccordionItemState<T>;

type NativeTriggerProps = Omit<
  React.ComponentPropsWithoutRef<typeof Pressable>,
  'children' | 'disabled' | 'style'
>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type AccordionTriggerProps<T extends AccordionValue = AccordionValue> = NativeTriggerProps & {
  children?: React.ReactNode | ((state: AccordionTriggerRenderState<T>) => React.ReactNode);
  title?: React.ReactNode | ((state: AccordionTriggerRenderState<T>) => React.ReactNode);
  left?: React.ReactNode | ((state: AccordionTriggerRenderState<T>) => React.ReactNode);
  right?: React.ReactNode | ((state: AccordionTriggerRenderState<T>) => React.ReactNode);
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
};

export function AccordionTrigger<T extends AccordionValue = AccordionValue>({
  children,
  title,
  left,
  right,
  disabled: disabledProp = false,
  style,
  contentStyle,
  titleStyle,
  onPress,
  onPressIn,
  onPressOut,
  accessibilityRole,
  accessibilityState,
  ...pressableProps
}: AccordionTriggerProps<T>) {
  const theme = useTheme();
  const item = useAccordionItemContext<T>();
  const disabled = item.disabled || disabledProp;
  const pressSv = useSharedValue(0);

  const state = React.useMemo<AccordionTriggerRenderState<T>>(
    () => ({
      open: item.open,
      disabled,
      value: item.value,
      toggle: item.toggle,
    }),
    [disabled, item.open, item.toggle, item.value]
  );

  const leftNode = resolveSlot(left, state);
  const rightNode = right === undefined ? <AccordionIndicator /> : resolveSlot(right, state);
  const childNode = resolveSlot(children, state);
  const titleNode = resolveSlot(title, state);
  const mainNode = hasRenderableNode(childNode) ? childNode : titleNode;

  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      opacity: disabled ? 0.55 : 1 - pressSv.value * 0.1,
      transform: [{ scale: 1 - pressSv.value * 0.006 }],
    };
  }, [disabled]);

  const renderedMain =
    typeof mainNode === 'string' || typeof mainNode === 'number' ? (
      <Text
        numberOfLines={1}
        style={[
          styles.title,
          { color: disabled ? theme.colors.disabled : theme.colors.onSurface },
          titleStyle,
        ]}
      >
        {mainNode}
      </Text>
    ) : (
      mainNode
    );

  return (
    <AnimatedPressable
      {...pressableProps}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityState={{
        ...accessibilityState,
        expanded: item.open,
        disabled,
      }}
      disabled={disabled}
      onPress={(event) => {
        item.toggle();
        onPress?.(event);
      }}
      onPressIn={(event) => {
        if (!disabled) pressSv.value = withTiming(1, PRESS_TIMING);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressSv.value = withTiming(0, PRESS_TIMING);
        onPressOut?.(event);
      }}
      style={[
        styles.trigger,
        item.open ? styles.triggerOpen : null,
        { borderBottomColor: theme.colors.border },
        style,
      ]}
    >
      <Animated.View style={[styles.triggerContent, animatedContentStyle, contentStyle]}>
        {hasRenderableNode(leftNode) ? <View style={styles.left}>{leftNode}</View> : null}
        <View style={styles.main}>{renderedMain}</View>
        {hasRenderableNode(rightNode) ? <View style={styles.right}>{rightNode}</View> : null}
      </Animated.View>
    </AnimatedPressable>
  );
}

export type AccordionContentProps = Omit<
  React.ComponentPropsWithoutRef<typeof View>,
  'children' | 'style'
> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function AccordionContent({ children, style, ...viewProps }: AccordionContentProps) {
  const item = useAccordionItemContext();
  if (!item.open) return null;

  const fadeInDuration = Math.min(180, item.duration);
  const fadeOutDuration = Math.min(140, item.duration);

  return (
    <Animated.View
      {...viewProps}
      entering={FadeIn.duration(fadeInDuration).easing(item.easing)}
      exiting={FadeOut.duration(fadeOutDuration).easing(item.easing)}
      layout={LinearTransition.duration(item.duration).easing(item.easing)}
      style={[styles.content, style]}
    >
      {children}
    </Animated.View>
  );
}

export type AccordionIndicatorProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  color?: string;
  size?: number;
  strokeWidth?: number;
  fromDeg?: number;
  toDeg?: number;
};

export function AccordionIndicator({
  children,
  style,
  color,
  size,
  strokeWidth,
  fromDeg = -90,
  toDeg = 0,
}: AccordionIndicatorProps) {
  const theme = useTheme();
  const item = useAccordionItemContext();
  const progress = useSharedValue(item.open ? 1 : 0);

  React.useEffect(() => {
    progress.value = withTiming(item.open ? 1 : 0, {
      duration: item.duration,
      easing: item.easing,
    });
  }, [item.duration, item.easing, item.open, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const deg = fromDeg + (toDeg - fromDeg) * progress.value;
    return { transform: [{ rotateZ: `${deg}deg` }] };
  }, [fromDeg, toDeg]);

  const resolvedSize = size ?? wp(22);
  const resolvedStrokeWidth = strokeWidth ?? wp(2);
  const chevronSize = Math.max(6, Math.round(resolvedSize * 0.34));
  const resolvedColor = color ?? (item.disabled ? theme.colors.disabled : theme.colors.muted);

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
    borderRadius: wp(12),
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  trigger: {
    paddingHorizontal: wp(14),
    paddingVertical: wp(12),
  },
  triggerOpen: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  triggerContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: wp(10),
  },
  left: {
    flexShrink: 0,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  right: {
    flexShrink: 0,
  },
  title: {
    fontSize: wp(16),
    fontWeight: '600',
    includeFontPadding: false,
  },
  content: {
    paddingBottom: wp(14),
    paddingHorizontal: wp(14),
    paddingTop: wp(2),
  },
  indicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    transform: [{ rotate: '45deg' }],
  },
});
