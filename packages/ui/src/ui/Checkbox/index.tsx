import * as React from 'react';
import type {
  GestureResponderEvent,
  Insets,
  PressableStateCallbackType,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import {
  I18nManager,
  Platform,
  Pressable,
  processColor,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { wp } from 'zkit-tools';
import CheckSvg from '../../assets/icons/check.svg';
import type { Theme } from '../../theme/types';
import { useTheme } from '../../theme/useTheme';
import { Text } from '../Text';

export type CheckboxCheckedState = boolean | 'indeterminate';
export type CheckboxValue = string | number;
export type CheckboxSize = 'sm' | 'md' | 'lg';
export type CheckboxTone = 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
export type CheckboxVariant = 'solid' | 'soft' | 'outline';
export type CheckboxShape = 'rounded' | 'square' | 'circle';
export type CheckboxLabelPlacement = 'start' | 'end';
export type CheckboxGroupOrientation = 'horizontal' | 'vertical';
export type CheckboxGroupAlign = 'start' | 'center' | 'end' | 'stretch';

export type CheckboxLayout = {
  indicatorSize?: number;
  indicatorRadius?: number;
  indicatorBorderWidth?: number;
  indicatorIconSize?: number;
  gap?: number;
  minTouchTarget?: number;
  focusRingWidth?: number;
  focusRingOffset?: number;
};

export type CheckboxColors = {
  checkedBackground?: string;
  checkedBorder?: string;
  checkedIndicator?: string;
  indeterminateBackground?: string;
  indeterminateBorder?: string;
  indeterminateIndicator?: string;
  uncheckedBackground?: string;
  uncheckedBorder?: string;
  focusRing?: string;
};

export type CheckboxSlotProps = {
  checked: boolean;
  indeterminate: boolean;
  state: CheckboxCheckedState;
  value?: CheckboxValue;
  disabled: boolean;
  interactive: boolean;
  size: CheckboxSize;
  tone: CheckboxTone;
  variant: CheckboxVariant;
  toggle: () => void;
};

type CheckboxMetrics = {
  indicatorSize: number;
  indicatorRadius: number;
  indicatorBorderWidth: number;
  indicatorIconSize: number;
  gap: number;
  minTouchTarget: number;
  focusRingWidth: number;
  focusRingOffset: number;
};

type CheckboxTonePalette = {
  accent: string;
  onAccent: string;
};

type ResolvedCheckboxColors = {
  checkedBackground: string;
  checkedBorder: string;
  checkedIndicator: string;
  indeterminateBackground: string;
  indeterminateBorder: string;
  indeterminateIndicator: string;
  uncheckedBackground: string;
  uncheckedBorder: string;
  focusRing: string;
};

type NativePressableProps = Omit<
  React.ComponentPropsWithoutRef<typeof Pressable>,
  'accessibilityRole' | 'accessibilityState' | 'children' | 'disabled' | 'style' | 'onChange'
>;

type PressableFocusEvent = Parameters<
  NonNullable<React.ComponentPropsWithoutRef<typeof Pressable>['onFocus']>
>[0];
type PressableBlurEvent = Parameters<
  NonNullable<React.ComponentPropsWithoutRef<typeof Pressable>['onBlur']>
>[0];

export type CheckboxRef = React.ComponentRef<typeof Pressable>;

export interface CheckboxProps extends NativePressableProps {
  value?: CheckboxValue;

  checked?: CheckboxCheckedState;
  defaultChecked?: CheckboxCheckedState;
  onChange?: (checked: CheckboxCheckedState) => void;

  disabled?: boolean;

  size?: CheckboxSize;
  tone?: CheckboxTone;
  variant?: CheckboxVariant;
  shape?: CheckboxShape;
  duration?: number;

  color?: string;
  colors?: CheckboxColors;
  layout?: CheckboxLayout;

  label?: React.ReactNode;
  description?: React.ReactNode;
  labelPlacement?: CheckboxLabelPlacement;
  children?: React.ReactNode | ((slot: CheckboxSlotProps) => React.ReactNode);

  showIndicator?: boolean;
  indicator?: React.ReactNode | ((slot: CheckboxSlotProps) => React.ReactNode);

  style?: React.ComponentPropsWithoutRef<typeof Pressable>['style'];
  contentStyle?: StyleProp<ViewStyle>;
  indicatorStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  descriptionStyle?: StyleProp<TextStyle>;
  accessibilityState?: React.ComponentPropsWithoutRef<typeof Pressable>['accessibilityState'];
}

type CheckboxIndicatorContextValue = {
  checkedSv: SharedValue<number>;
  indeterminateSv: SharedValue<number>;
  boxSize: number;
  slot: CheckboxSlotProps;
  indeterminateIndicatorColor: string;
  defaultIcon: React.ReactNode;
  customIndicator?: React.ReactNode | ((slot: CheckboxSlotProps) => React.ReactNode);
};

const CheckboxIndicatorContext = React.createContext<CheckboxIndicatorContextValue | null>(null);

type CheckboxGroupStoreListener = () => void;

const noopSubscribe = () => () => {};

class CheckboxGroupStore<T extends CheckboxValue> {
  private values: Set<T>;
  private listeners = new Set<CheckboxGroupStoreListener>();

  constructor(initialValues: readonly T[]) {
    this.values = new Set(initialValues);
  }

  subscribe = (listener: CheckboxGroupStoreListener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  has = (value: T) => this.values.has(value);

  getToggledValues = (value: T) => {
    const next = new Set(this.values);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return Array.from(next);
  };

  setValues = (values: readonly T[]) => {
    const next = new Set(values);
    if (next.size === this.values.size) {
      let same = true;
      for (const value of next) {
        if (!this.values.has(value)) {
          same = false;
          break;
        }
      }
      if (same) return false;
    }

    this.values = next;
    this.emit();
    return true;
  };

  private emit() {
    for (const listener of this.listeners) listener();
  }
}

type CheckboxGroupContextValue<T extends CheckboxValue> = {
  store: CheckboxGroupStore<T>;
  disabled: boolean;
  isControlled: boolean;
  toggleValue: (value: T) => void;
  size?: CheckboxSize;
  tone?: CheckboxTone;
  variant?: CheckboxVariant;
  shape?: CheckboxShape;
  color?: string;
  colors?: CheckboxColors;
  layout?: CheckboxLayout;
};

const CheckboxGroupContext = React.createContext<CheckboxGroupContextValue<CheckboxValue> | null>(null);

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
    indicatorSize: 18,
    indicatorRadius: 4,
    indicatorBorderWidth: 1.5,
    indicatorIconSize: 12,
    gap: 8,
  },
  md: {
    indicatorSize: 20,
    indicatorRadius: 5,
    indicatorBorderWidth: 1.5,
    indicatorIconSize: 14,
    gap: 10,
  },
  lg: {
    indicatorSize: 24,
    indicatorRadius: 6,
    indicatorBorderWidth: 1.5,
    indicatorIconSize: 16,
    gap: 12,
  },
} as const satisfies Record<
  CheckboxSize,
  Omit<CheckboxMetrics, 'minTouchTarget' | 'focusRingWidth' | 'focusRingOffset'>
>;

const DISABLED_OPACITY = 0.48;
const PRESSED_OPACITY = 0.86;
const PRESSED_SCALE = 0.965;
const VALUE_TIMING_DURATION = 170;
const PRESS_IN_DURATION = 90;
const PRESS_OUT_DURATION = 140;
const FOCUS_DURATION = 120;

function useCheckboxIndicatorContext() {
  const context = React.useContext(CheckboxIndicatorContext);
  if (!context) {
    throw new Error('[zkit-ui] CheckboxIndicator must be rendered inside <Checkbox />.');
  }
  return context;
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
    key === 'default' || key === 'neutral' || key === 'onSurface'
      ? theme.colors.onSurface
      : key === 'primary'
        ? theme.colors.primary
        : key === 'onPrimary' || key === 'inverse'
          ? theme.colors.onPrimary
          : key === 'secondary'
            ? theme.colors.secondary
            : key === 'onSecondary'
              ? theme.colors.onSecondary
              : key === 'surface'
                ? theme.colors.surface
                : key === 'border'
                  ? theme.colors.border
                  : key === 'muted'
                    ? theme.colors.muted
                    : key === 'disabled' || key === 'subtle'
                      ? theme.colors.disabled
                      : SEMANTIC_COLORS[key] ?? key;

  return isProcessableColor(resolved) ? resolved : fallback;
}

function resolveTonePalette(tone: CheckboxTone, theme: Theme): CheckboxTonePalette {
  if (tone === 'neutral') {
    return {
      accent: theme.colors.onSurface,
      onAccent: theme.colors.surface,
    };
  }

  if (tone === 'success') {
    return {
      accent: SEMANTIC_COLORS.success,
      onAccent: '#FFFFFF',
    };
  }

  if (tone === 'warning') {
    return {
      accent: SEMANTIC_COLORS.warning,
      onAccent: '#FFFFFF',
    };
  }

  if (tone === 'danger') {
    return {
      accent: SEMANTIC_COLORS.danger,
      onAccent: '#FFFFFF',
    };
  }

  if (tone === 'info') {
    return {
      accent: SEMANTIC_COLORS.info,
      onAccent: '#FFFFFF',
    };
  }

  return {
    accent: theme.colors.primary,
    onAccent: theme.colors.onPrimary,
  };
}

function resolveVariantColors(
  variant: CheckboxVariant,
  accent: string,
  onAccent: string,
  colors: CheckboxColors | undefined,
  theme: Theme,
  scheme: ReturnType<typeof useColorScheme>
): ResolvedCheckboxColors {
  const softAlpha = scheme === 'dark' ? 0.24 : 0.14;
  const fallbackSoftBackground = colorToRgba(accent, softAlpha) ?? theme.colors.secondary;
  const fallbackUncheckedBorder =
    colorToRgba(theme.colors.onSurface, scheme === 'dark' ? 0.28 : 0.18) ?? theme.colors.border;
  const checkedBackground =
    variant === 'solid'
      ? accent
      : variant === 'soft'
        ? fallbackSoftBackground
        : theme.colors.surface;
  const checkedIndicator = variant === 'solid' ? onAccent : accent;

  const resolvedCheckedBackground = resolveColorToken(
    colors?.checkedBackground,
    checkedBackground,
    theme
  );
  const resolvedCheckedBorder = resolveColorToken(colors?.checkedBorder, accent, theme);
  const resolvedCheckedIndicator = resolveColorToken(
    colors?.checkedIndicator,
    checkedIndicator,
    theme
  );

  return {
    checkedBackground: resolvedCheckedBackground,
    checkedBorder: resolvedCheckedBorder,
    checkedIndicator: resolvedCheckedIndicator,
    indeterminateBackground: resolveColorToken(
      colors?.indeterminateBackground,
      resolvedCheckedBackground,
      theme
    ),
    indeterminateBorder: resolveColorToken(colors?.indeterminateBorder, resolvedCheckedBorder, theme),
    indeterminateIndicator: resolveColorToken(
      colors?.indeterminateIndicator,
      resolvedCheckedIndicator,
      theme
    ),
    uncheckedBackground: resolveColorToken(colors?.uncheckedBackground, theme.colors.surface, theme),
    uncheckedBorder: resolveColorToken(colors?.uncheckedBorder, fallbackUncheckedBorder, theme),
    focusRing: resolveColorToken(
      colors?.focusRing,
      colorToRgba(accent, scheme === 'dark' ? 0.36 : 0.28) ?? accent,
      theme
    ),
  };
}

function resolveCheckboxMetrics(
  size: CheckboxSize,
  shape: CheckboxShape,
  layout: CheckboxLayout | undefined
): CheckboxMetrics {
  const token = SIZE_TOKENS[size] ?? SIZE_TOKENS.md;
  const indicatorSize = resolvePositiveNumber(layout?.indicatorSize, wp(token.indicatorSize));
  const fallbackRadius =
    shape === 'circle' ? indicatorSize / 2 : shape === 'square' ? 0 : wp(token.indicatorRadius);

  return {
    indicatorSize,
    indicatorRadius: resolveNonNegativeNumber(layout?.indicatorRadius, fallbackRadius),
    indicatorBorderWidth: resolvePositiveNumber(
      layout?.indicatorBorderWidth,
      wp(token.indicatorBorderWidth)
    ),
    indicatorIconSize: resolvePositiveNumber(layout?.indicatorIconSize, wp(token.indicatorIconSize)),
    gap: resolveNonNegativeNumber(layout?.gap, wp(token.gap)),
    minTouchTarget: resolvePositiveNumber(layout?.minTouchTarget, wp(44)),
    focusRingWidth: resolvePositiveNumber(layout?.focusRingWidth, wp(2)),
    focusRingOffset: resolveNonNegativeNumber(layout?.focusRingOffset, wp(3)),
  };
}

function resolvePositiveNumber(value: number | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function resolveNonNegativeNumber(value: number | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function resolveDuration(duration: number | undefined) {
  if (duration == null || !Number.isFinite(duration)) return VALUE_TIMING_DURATION;
  return Math.max(0, duration);
}

function toTimingConfig(duration: number) {
  return {
    duration,
    easing: Easing.out(Easing.cubic),
    reduceMotion: ReduceMotion.System,
  } as const;
}

function resolveHitSlop(width: number, height: number, minTouchTarget: number): Insets | undefined {
  const vertical = Math.max(0, (minTouchTarget - height) / 2);
  const horizontal = Math.max(0, (minTouchTarget - width) / 2);
  if (vertical === 0 && horizontal === 0) return undefined;
  return {
    top: vertical,
    bottom: vertical,
    left: horizontal,
    right: horizontal,
  };
}

function resolveWebCursorStyle(disabled: boolean): ViewStyle | undefined {
  if (Platform.OS !== 'web') return undefined;
  return { cursor: disabled ? 'not-allowed' : 'pointer' } as ViewStyle;
}

function isPrimitiveText(node: React.ReactNode): node is string | number {
  return typeof node === 'string' || typeof node === 'number';
}

function isRenderProp(children: CheckboxProps['children']): children is (slot: CheckboxSlotProps) => React.ReactNode {
  return typeof children === 'function';
}

function isIndicatorRenderProp(
  indicator: CheckboxIndicatorProps['children'] | CheckboxProps['indicator']
): indicator is (slot: CheckboxSlotProps) => React.ReactNode {
  return typeof indicator === 'function';
}

function getNextCheckedState(current: CheckboxCheckedState): CheckboxCheckedState {
  if (current === 'indeterminate') return true;
  return !current;
}

function resolveAlignItems(align: CheckboxGroupAlign): ViewStyle['alignItems'] {
  if (align === 'center') return 'center';
  if (align === 'end') return 'flex-end';
  if (align === 'stretch') return 'stretch';
  return 'flex-start';
}

function CheckboxImpl(
  {
    value,
    checked: checkedProp,
    defaultChecked = false,
    onChange,
    disabled = false,
    size: sizeProp,
    tone: toneProp,
    variant: variantProp,
    shape: shapeProp,
    duration,
    color: colorProp,
    colors: colorsProp,
    layout: layoutProp,
    label,
    description,
    labelPlacement = 'end',
    children,
    showIndicator = true,
    indicator,
    style,
    contentStyle,
    indicatorStyle,
    labelStyle,
    descriptionStyle,
    accessibilityLabel,
    accessibilityState,
    hitSlop,
    onPress,
    onPressIn,
    onPressOut,
    onFocus,
    onBlur,
    testID,
    ...pressableProps
  }: CheckboxProps,
  ref: React.ForwardedRef<CheckboxRef>
) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { width: viewportWidth } = useWindowDimensions();
  const group = React.useContext(CheckboxGroupContext);
  const isRTL = I18nManager.isRTL;

  const isStandaloneControlled = checkedProp !== undefined;
  const isGroupItem = group != null && value !== undefined && !isStandaloneControlled;
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState<CheckboxCheckedState>(() => defaultChecked);

  const getGroupCheckedSnapshot = React.useCallback(
    () => (group && value !== undefined ? group.store.has(value) : false),
    [group, value]
  );
  const groupChecked = React.useSyncExternalStore(
    group?.store.subscribe ?? noopSubscribe,
    getGroupCheckedSnapshot,
    getGroupCheckedSnapshot
  );

  const state: CheckboxCheckedState = isGroupItem
    ? groupChecked
    : isStandaloneControlled
      ? checkedProp!
      : uncontrolledChecked;
  const checked = state === true;
  const indeterminate = state === 'indeterminate';
  const active = state !== false;
  const resolvedDisabled = disabled || Boolean(group?.disabled);
  const interactive = !resolvedDisabled;

  const size = sizeProp ?? group?.size ?? 'md';
  const tone = toneProp ?? group?.tone ?? 'primary';
  const variant = variantProp ?? group?.variant ?? 'solid';
  const shape = shapeProp ?? group?.shape ?? 'rounded';
  const color = colorProp ?? group?.color;
  const colors = React.useMemo(
    () =>
      group?.colors || colorsProp
        ? {
            ...group?.colors,
            ...colorsProp,
          }
        : undefined,
    [colorsProp, group?.colors]
  );
  const layout = React.useMemo(
    () =>
      group?.layout || layoutProp
        ? {
            ...group?.layout,
            ...layoutProp,
          }
        : undefined,
    [group?.layout, layoutProp]
  );

  const metrics = React.useMemo(
    () => resolveCheckboxMetrics(size, shape, layout),
    [layout, shape, size, viewportWidth]
  );
  const tonePalette = React.useMemo(() => resolveTonePalette(tone, theme), [theme, tone]);
  const accent = React.useMemo(
    () => resolveColorToken(color, tonePalette.accent, theme),
    [color, theme, tonePalette.accent]
  );
  const resolvedColors = React.useMemo(
    () => resolveVariantColors(variant, accent, tonePalette.onAccent, colors, theme, scheme),
    [accent, colors, scheme, theme, tonePalette.onAccent, variant]
  );
  const webCursorStyle = React.useMemo(
    () => resolveWebCursorStyle(resolvedDisabled),
    [resolvedDisabled]
  );
  const resolvedDuration = resolveDuration(duration);
  const valueTiming = React.useMemo(() => toTimingConfig(resolvedDuration), [resolvedDuration]);
  const pressInTiming = React.useMemo(() => toTimingConfig(PRESS_IN_DURATION), []);
  const pressOutTiming = React.useMemo(() => toTimingConfig(PRESS_OUT_DURATION), []);
  const focusTiming = React.useMemo(() => toTimingConfig(FOCUS_DURATION), []);
  const defaultHitSlop = React.useMemo(
    () => resolveHitSlop(metrics.indicatorSize, metrics.indicatorSize, metrics.minTouchTarget),
    [metrics.indicatorSize, metrics.minTouchTarget]
  );

  const checkedSv = useSharedValue(active ? 1 : 0);
  const indeterminateSv = useSharedValue(indeterminate ? 1 : 0);
  const pressSv = useSharedValue(0);
  const focusSv = useSharedValue(0);

  const stateRef = React.useRef<CheckboxCheckedState>(state);
  stateRef.current = state;
  const groupCheckedRef = React.useRef(groupChecked);
  groupCheckedRef.current = groupChecked;

  React.useEffect(() => {
    if (!isStandaloneControlled && !isGroupItem) return;
    checkedSv.value = withTiming(active ? 1 : 0, valueTiming);
    indeterminateSv.value = withTiming(indeterminate ? 1 : 0, valueTiming);
  }, [
    active,
    checkedSv,
    indeterminate,
    indeterminateSv,
    isGroupItem,
    isStandaloneControlled,
    valueTiming,
  ]);

  React.useEffect(() => {
    if (interactive) return;
    pressSv.value = withTiming(0, pressOutTiming);
    focusSv.value = withTiming(0, focusTiming);
  }, [focusSv, focusTiming, interactive, pressOutTiming, pressSv]);

  const commitStandaloneState = React.useCallback(
    (next: CheckboxCheckedState) => {
      if (!isStandaloneControlled) {
        stateRef.current = next;
        checkedSv.value = withTiming(next !== false ? 1 : 0, valueTiming);
        indeterminateSv.value = withTiming(next === 'indeterminate' ? 1 : 0, valueTiming);
        setUncontrolledChecked(next);
      }
      onChange?.(next);
    },
    [checkedSv, indeterminateSv, isStandaloneControlled, onChange, valueTiming]
  );

  const toggle = React.useCallback(() => {
    if (!interactive) return;

    if (isGroupItem && group && value !== undefined) {
      const next = !groupCheckedRef.current;
      if (!group.isControlled) {
        checkedSv.value = withTiming(next ? 1 : 0, valueTiming);
        indeterminateSv.value = withTiming(0, valueTiming);
      }
      group.toggleValue(value);
      onChange?.(next);
      return;
    }

    commitStandaloneState(getNextCheckedState(stateRef.current));
  }, [
    checkedSv,
    commitStandaloneState,
    group,
    indeterminateSv,
    interactive,
    isGroupItem,
    onChange,
    value,
    valueTiming,
  ]);

  const handlePress = React.useCallback(
    (event: GestureResponderEvent) => {
      if (interactive) toggle();
      onPress?.(event);
    },
    [interactive, onPress, toggle]
  );

  const handlePressIn = React.useCallback(
    (event: GestureResponderEvent) => {
      if (interactive) {
        pressSv.value = withTiming(1, pressInTiming);
      }
      onPressIn?.(event);
    },
    [interactive, onPressIn, pressInTiming, pressSv]
  );

  const handlePressOut = React.useCallback(
    (event: GestureResponderEvent) => {
      pressSv.value = withTiming(0, pressOutTiming);
      onPressOut?.(event);
    },
    [onPressOut, pressOutTiming, pressSv]
  );

  const handleFocus = React.useCallback(
    (event: PressableFocusEvent) => {
      if (interactive) {
        focusSv.value = withTiming(1, focusTiming);
      }
      onFocus?.(event);
    },
    [focusSv, focusTiming, interactive, onFocus]
  );

  const handleBlur = React.useCallback(
    (event: PressableBlurEvent) => {
      focusSv.value = withTiming(0, focusTiming);
      onBlur?.(event);
    },
    [focusSv, focusTiming, onBlur]
  );

  const slot = React.useMemo<CheckboxSlotProps>(
    () => ({
      checked,
      indeterminate,
      state,
      value,
      disabled: resolvedDisabled,
      interactive,
      size,
      tone,
      variant,
      toggle,
    }),
    [checked, indeterminate, interactive, resolvedDisabled, size, state, tone, toggle, value, variant]
  );

  const renderedContent = React.useMemo(() => {
    if (isRenderProp(children)) return children(slot);
    if (children != null) return children;
    if (label == null && description == null) return null;

    return (
      <View style={styles.copy}>
        {label != null ? (
          isPrimitiveText(label) ? (
            <Text
              numberOfLines={1}
              variant="label"
              style={labelStyle}
            >
              {label}
            </Text>
          ) : (
            label
          )
        ) : null}
        {description != null ? (
          isPrimitiveText(description) ? (
            <Text
              numberOfLines={2}
              tone="muted"
              variant="caption"
              style={descriptionStyle}
            >
              {description}
            </Text>
          ) : (
            description
          )
        ) : null}
      </View>
    );
  }, [children, description, descriptionStyle, label, labelStyle, resolvedDisabled, slot]);

  const defaultIcon = React.useMemo(
    () => (
      <CheckSvg
        width={metrics.indicatorIconSize}
        height={metrics.indicatorIconSize}
        color={resolvedColors.checkedIndicator}
      />
    ),
    [metrics.indicatorIconSize, resolvedColors.checkedIndicator]
  );

  const indicatorContext = React.useMemo<CheckboxIndicatorContextValue>(
    () => ({
      checkedSv,
      indeterminateSv,
      boxSize: metrics.indicatorSize,
      slot,
      indeterminateIndicatorColor: resolvedColors.indeterminateIndicator,
      defaultIcon,
      customIndicator: indicator,
    }),
    [
      checkedSv,
      defaultIcon,
      indicator,
      indeterminateSv,
      metrics.indicatorSize,
      resolvedColors.indeterminateIndicator,
      slot,
    ]
  );

  const rootAnimatedStyle = useAnimatedStyle(() => {
    const opacity = resolvedDisabled
      ? DISABLED_OPACITY
      : interpolate(pressSv.value, [0, 1], [1, PRESSED_OPACITY]);
    return { opacity };
  }, [resolvedDisabled]);

  const indicatorPressAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressSv.value, [0, 1], [1, PRESSED_SCALE]);
    return { transform: [{ scale }] };
  });

  const focusRingAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: focusSv.value,
      transform: [{ scale: interpolate(focusSv.value, [0, 1], [0.96, 1]) }],
    };
  });

  const indicatorAnimatedStyle = useAnimatedStyle(() => {
    const activeBackground = interpolateColor(
      indeterminateSv.value,
      [0, 1],
      [resolvedColors.checkedBackground, resolvedColors.indeterminateBackground]
    );
    const activeBorder = interpolateColor(
      indeterminateSv.value,
      [0, 1],
      [resolvedColors.checkedBorder, resolvedColors.indeterminateBorder]
    );

    return {
      backgroundColor: interpolateColor(
        checkedSv.value,
        [0, 1],
        [resolvedColors.uncheckedBackground, activeBackground]
      ),
      borderColor: interpolateColor(
        checkedSv.value,
        [0, 1],
        [resolvedColors.uncheckedBorder, activeBorder]
      ),
    };
  }, [resolvedColors]);

  const indicatorFrameStyle = React.useMemo<ViewStyle>(
    () => ({
      width: metrics.indicatorSize,
      height: metrics.indicatorSize,
      borderRadius: metrics.indicatorRadius,
      borderWidth: metrics.indicatorBorderWidth,
    }),
    [metrics.indicatorBorderWidth, metrics.indicatorRadius, metrics.indicatorSize]
  );

  const indicatorNode = showIndicator ? (
    <Animated.View
      style={[
        styles.indicatorFrame,
        indicatorFrameStyle,
        indicatorPressAnimatedStyle,
        indicatorAnimatedStyle,
        indicatorStyle,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.focusRing,
          {
            top: -metrics.focusRingOffset,
            bottom: -metrics.focusRingOffset,
            left: -metrics.focusRingOffset,
            right: -metrics.focusRingOffset,
            borderRadius: metrics.indicatorRadius + metrics.focusRingOffset,
            borderWidth: metrics.focusRingWidth,
            borderColor: resolvedColors.focusRing,
          },
          focusRingAnimatedStyle,
        ]}
      />
      <CheckboxIndicator />
    </Animated.View>
  ) : null;

  const hasContent = renderedContent != null;
  const contentBeforeIndicator =
    (labelPlacement === 'start' && !isRTL) || (labelPlacement === 'end' && isRTL);
  const contentNode = hasContent ? (
    <View style={[styles.content, contentStyle]}>
      {contentBeforeIndicator ? (
        <>
          <View style={[styles.contentSlot, showIndicator ? { marginEnd: metrics.gap } : null]}>
            {renderedContent}
          </View>
          {indicatorNode}
        </>
      ) : (
        <>
          {indicatorNode}
          <View style={[styles.contentSlot, showIndicator ? { marginStart: metrics.gap } : null]}>
            {renderedContent}
          </View>
        </>
      )}
    </View>
  ) : (
    indicatorNode
  );
  const inferredAccessibilityLabel = isPrimitiveText(label) ? String(label) : undefined;
  const resolvedStyle = React.useCallback(
    (stateArg: PressableStateCallbackType) => {
      const userStyle = typeof style === 'function' ? style(stateArg) : style;
      return [styles.root, webCursorStyle, userStyle];
    },
    [style, webCursorStyle]
  );

  return (
    <CheckboxIndicatorContext.Provider value={indicatorContext}>
      <Pressable
        {...pressableProps}
        ref={ref}
        accessibilityLabel={accessibilityLabel ?? inferredAccessibilityLabel}
        accessibilityRole="checkbox"
        accessibilityState={{
          ...accessibilityState,
          checked: indeterminate ? 'mixed' : checked,
          disabled: Boolean(resolvedDisabled),
        }}
        disabled={resolvedDisabled}
        hitSlop={hitSlop ?? defaultHitSlop}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={resolvedStyle}
        testID={testID}
      >
        <Animated.View style={[styles.visual, rootAnimatedStyle]}>{contentNode}</Animated.View>
      </Pressable>
    </CheckboxIndicatorContext.Provider>
  );
}

const CheckboxWithRef = React.forwardRef<CheckboxRef, CheckboxProps>(CheckboxImpl);
CheckboxWithRef.displayName = 'Checkbox';

export const Checkbox = React.memo(CheckboxWithRef);
Checkbox.displayName = 'Checkbox';

export type CheckboxIndicatorProps = {
  children?: React.ReactNode | ((slot: CheckboxSlotProps) => React.ReactNode);
  style?: StyleProp<ViewStyle>;
};

export function CheckboxIndicator({ children, style }: CheckboxIndicatorProps) {
  const context = useCheckboxIndicatorContext();
  const customIndicator = children ?? context.customIndicator;

  const checkedIconAnimatedStyle = useAnimatedStyle(() => {
    const opacity = context.checkedSv.value * (1 - context.indeterminateSv.value);
    const scale = interpolate(context.checkedSv.value, [0, 1], [0.78, 1]);
    return { opacity, transform: [{ scale }] };
  });

  const indeterminateAnimatedStyle = useAnimatedStyle(() => {
    const opacity = context.checkedSv.value * context.indeterminateSv.value;
    const scale = interpolate(context.indeterminateSv.value, [0, 1], [0.82, 1]);
    return { opacity, transform: [{ scale }] };
  });

  const customIndicatorAnimatedStyle = useAnimatedStyle(() => {
    const opacity = context.checkedSv.value;
    const scale = interpolate(context.checkedSv.value, [0, 1], [0.78, 1]);
    return { opacity, transform: [{ scale }] };
  });

  const indeterminateWidth = Math.max(wp(8), Math.round(context.boxSize * 0.56));
  const indeterminateHeight = Math.max(wp(2), Math.round(context.boxSize * 0.11));
  const resolvedCustomIndicator = isIndicatorRenderProp(customIndicator)
    ? customIndicator(context.slot)
    : customIndicator;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.indicatorLayer,
        {
          width: context.boxSize,
          height: context.boxSize,
        },
        style,
      ]}
    >
      {resolvedCustomIndicator != null ? (
        <Animated.View style={customIndicatorAnimatedStyle}>{resolvedCustomIndicator}</Animated.View>
      ) : (
        <>
          <Animated.View style={indeterminateAnimatedStyle}>
            <View
              style={{
                width: indeterminateWidth,
                height: indeterminateHeight,
                borderRadius: indeterminateHeight / 2,
                backgroundColor: context.indeterminateIndicatorColor,
              }}
            />
          </Animated.View>
          <Animated.View style={[styles.iconLayer, checkedIconAnimatedStyle]}>
            {context.defaultIcon}
          </Animated.View>
        </>
      )}
    </View>
  );
}

export type CheckboxGroupProps<T extends CheckboxValue = CheckboxValue> = Omit<
  React.ComponentPropsWithoutRef<typeof View>,
  'children'
> & {
  value?: readonly T[];
  defaultValue?: readonly T[];
  onChange?: (value: T[]) => void;
  disabled?: boolean;

  orientation?: CheckboxGroupOrientation;
  align?: CheckboxGroupAlign;
  wrap?: boolean;
  gap?: number;
  rowGap?: number;
  columnGap?: number;

  size?: CheckboxSize;
  tone?: CheckboxTone;
  variant?: CheckboxVariant;
  shape?: CheckboxShape;
  color?: string;
  colors?: CheckboxColors;
  layout?: CheckboxLayout;

  children: React.ReactNode;
};

export function CheckboxGroup<T extends CheckboxValue = CheckboxValue>({
  value,
  defaultValue,
  onChange,
  disabled = false,
  orientation = 'horizontal',
  align = 'start',
  wrap = false,
  gap,
  rowGap,
  columnGap,
  size,
  tone,
  variant,
  shape,
  color,
  colors,
  layout,
  style,
  children,
  ...viewProps
}: CheckboxGroupProps<T>) {
  const { width: viewportWidth } = useWindowDimensions();
  const isControlled = value !== undefined;
  const storeRef = React.useRef<CheckboxGroupStore<T> | null>(null);
  if (!storeRef.current) {
    storeRef.current = new CheckboxGroupStore<T>(value ?? defaultValue ?? []);
  }

  React.useLayoutEffect(() => {
    if (!isControlled) return;
    storeRef.current!.setValues(value ?? []);
  }, [isControlled, value]);

  const toggleValue = React.useCallback(
    (nextValue: T) => {
      const next = storeRef.current!.getToggledValues(nextValue);
      if (!isControlled) storeRef.current!.setValues(next);
      onChange?.(next);
    },
    [isControlled, onChange]
  );

  const context = React.useMemo<CheckboxGroupContextValue<T>>(
    () => ({
      store: storeRef.current!,
      disabled,
      isControlled,
      toggleValue,
      size,
      tone,
      variant,
      shape,
      color,
      colors,
      layout,
    }),
    [
      color,
      colors,
      disabled,
      isControlled,
      layout,
      shape,
      size,
      tone,
      toggleValue,
      variant,
    ]
  );

  const defaultGap = React.useMemo(() => wp(12), [viewportWidth]);
  const resolvedGap = resolveNonNegativeNumber(gap, defaultGap);
  const resolvedRowGap = resolveNonNegativeNumber(rowGap, resolvedGap);
  const resolvedColumnGap = resolveNonNegativeNumber(columnGap, resolvedGap);
  const layoutStyle = React.useMemo<ViewStyle>(
    () => ({
      alignItems: resolveAlignItems(align),
      columnGap: resolvedColumnGap,
      flexDirection: orientation === 'vertical' ? 'column' : 'row',
      flexWrap: wrap ? 'wrap' : 'nowrap',
      rowGap: resolvedRowGap,
    }),
    [align, orientation, resolvedColumnGap, resolvedRowGap, wrap]
  );

  return (
    <CheckboxGroupContext.Provider
      value={context as unknown as CheckboxGroupContextValue<CheckboxValue>}
    >
      <View {...viewProps} style={[layoutStyle, style]}>
        {children}
      </View>
    </CheckboxGroupContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
  },
  visual: {
    alignItems: 'center',
    flexDirection: 'row',
    minWidth: 0,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    minWidth: 0,
  },
  contentSlot: {
    flexShrink: 1,
    minWidth: 0,
  },
  copy: {
    flexShrink: 1,
    minWidth: 0,
  },
  indicatorFrame: {
    alignItems: 'center',
    flexShrink: 0,
    justifyContent: 'center',
    overflow: 'visible',
  },
  focusRing: {
    position: 'absolute',
  },
  indicatorLayer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
