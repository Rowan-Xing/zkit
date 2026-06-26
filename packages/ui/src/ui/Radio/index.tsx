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
import type { Theme } from '../../theme/types';
import { useTheme } from '../../theme/useTheme';
import { Text } from '../Text';

export type RadioValue = string | number;
export type RadioSize = 'sm' | 'md' | 'lg';
export type RadioTone = 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
export type RadioVariant = 'outline' | 'soft' | 'solid';
export type RadioLabelPlacement = 'start' | 'end';
export type RadioGroupOrientation = 'horizontal' | 'vertical';
export type RadioGroupAlign = 'start' | 'center' | 'end' | 'stretch';

export type RadioLayout = {
  indicatorSize?: number;
  indicatorDotSize?: number;
  indicatorBorderWidth?: number;
  gap?: number;
  minTouchTarget?: number;
  focusRingWidth?: number;
  focusRingOffset?: number;
};

export type RadioColors = {
  checkedBackground?: string;
  checkedBorder?: string;
  checkedIndicator?: string;
  uncheckedBackground?: string;
  uncheckedBorder?: string;
  focusRing?: string;
};

export type RadioSlotProps = {
  checked: boolean;
  value?: RadioValue;
  disabled: boolean;
  interactive: boolean;
  size: RadioSize;
  tone: RadioTone;
  variant: RadioVariant;
  select: () => void;
};

type RadioMetrics = {
  indicatorSize: number;
  indicatorDotSize: number;
  indicatorBorderWidth: number;
  gap: number;
  minTouchTarget: number;
  focusRingWidth: number;
  focusRingOffset: number;
};

type RadioTonePalette = {
  accent: string;
  onAccent: string;
};

type ResolvedRadioColors = {
  checkedBackground: string;
  checkedBorder: string;
  checkedIndicator: string;
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

export type RadioRef = React.ComponentRef<typeof Pressable>;

export interface RadioProps extends NativePressableProps {
  value?: RadioValue;

  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  allowDeselect?: boolean;

  disabled?: boolean;

  size?: RadioSize;
  tone?: RadioTone;
  variant?: RadioVariant;
  duration?: number;

  color?: string;
  colors?: RadioColors;
  layout?: RadioLayout;

  label?: React.ReactNode;
  description?: React.ReactNode;
  labelPlacement?: RadioLabelPlacement;
  children?: React.ReactNode | ((slot: RadioSlotProps) => React.ReactNode);

  showIndicator?: boolean;
  indicator?: React.ReactNode | ((slot: RadioSlotProps) => React.ReactNode);

  style?: React.ComponentPropsWithoutRef<typeof Pressable>['style'];
  contentStyle?: StyleProp<ViewStyle>;
  indicatorStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  descriptionStyle?: StyleProp<TextStyle>;
  accessibilityState?: React.ComponentPropsWithoutRef<typeof Pressable>['accessibilityState'];
}

type RadioIndicatorContextValue = {
  checkedSv: SharedValue<number>;
  indicatorSize: number;
  indicatorDotSize: number;
  slot: RadioSlotProps;
  checkedIndicatorColor: string;
  customIndicator?: React.ReactNode | ((slot: RadioSlotProps) => React.ReactNode);
};

const RadioIndicatorContext = React.createContext<RadioIndicatorContextValue | null>(null);

type RadioGroupStoreListener = () => void;

const noopSubscribe = () => () => {};

class RadioGroupStore<T extends RadioValue> {
  private value: T | null;
  private listeners = new Set<RadioGroupStoreListener>();

  constructor(initialValue: T | null) {
    this.value = initialValue;
  }

  subscribe = (listener: RadioGroupStoreListener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  isSelected = (value: T) => Object.is(this.value, value);

  setValue = (value: T | null) => {
    if (Object.is(this.value, value)) return false;
    this.value = value;
    this.emit();
    return true;
  };

  private emit() {
    for (const listener of this.listeners) listener();
  }
}

type RadioGroupContextValue<T extends RadioValue> = {
  store: RadioGroupStore<T>;
  disabled: boolean;
  isControlled: boolean;
  allowDeselect: boolean;
  selectValue: (value: T | null) => void;
  size?: RadioSize;
  tone?: RadioTone;
  variant?: RadioVariant;
  color?: string;
  colors?: RadioColors;
  layout?: RadioLayout;
};

const RadioGroupContext = React.createContext<RadioGroupContextValue<RadioValue> | null>(null);

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
    indicatorDotSize: 8,
    indicatorBorderWidth: 1.5,
    gap: 8,
  },
  md: {
    indicatorSize: 20,
    indicatorDotSize: 9,
    indicatorBorderWidth: 1.5,
    gap: 10,
  },
  lg: {
    indicatorSize: 24,
    indicatorDotSize: 11,
    indicatorBorderWidth: 1.5,
    gap: 12,
  },
} as const satisfies Record<
  RadioSize,
  Omit<RadioMetrics, 'minTouchTarget' | 'focusRingWidth' | 'focusRingOffset'>
>;

const DISABLED_OPACITY = 0.48;
const PRESSED_OPACITY = 0.86;
const PRESSED_SCALE = 0.965;
const VALUE_TIMING_DURATION = 170;
const PRESS_IN_DURATION = 90;
const PRESS_OUT_DURATION = 140;
const FOCUS_DURATION = 120;

function useRadioIndicatorContext() {
  const context = React.useContext(RadioIndicatorContext);
  if (!context) {
    throw new Error('[zkit-ui] RadioIndicator must be rendered inside <Radio />.');
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

function resolveTonePalette(tone: RadioTone, theme: Theme): RadioTonePalette {
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
      onAccent: '#111827',
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
  variant: RadioVariant,
  accent: string,
  onAccent: string,
  colors: RadioColors | undefined,
  theme: Theme,
  scheme: ReturnType<typeof useColorScheme>
): ResolvedRadioColors {
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

  return {
    checkedBackground: resolveColorToken(colors?.checkedBackground, checkedBackground, theme),
    checkedBorder: resolveColorToken(colors?.checkedBorder, accent, theme),
    checkedIndicator: resolveColorToken(colors?.checkedIndicator, checkedIndicator, theme),
    uncheckedBackground: resolveColorToken(colors?.uncheckedBackground, theme.colors.surface, theme),
    uncheckedBorder: resolveColorToken(colors?.uncheckedBorder, fallbackUncheckedBorder, theme),
    focusRing: resolveColorToken(
      colors?.focusRing,
      colorToRgba(accent, scheme === 'dark' ? 0.36 : 0.28) ?? accent,
      theme
    ),
  };
}

function resolveRadioMetrics(size: RadioSize, layout: RadioLayout | undefined): RadioMetrics {
  const token = SIZE_TOKENS[size] ?? SIZE_TOKENS.md;
  const indicatorSize = resolvePositiveNumber(layout?.indicatorSize, wp(token.indicatorSize));

  return {
    indicatorSize,
    indicatorDotSize: resolvePositiveNumber(
      layout?.indicatorDotSize,
      wp(token.indicatorDotSize)
    ),
    indicatorBorderWidth: resolvePositiveNumber(
      layout?.indicatorBorderWidth,
      wp(token.indicatorBorderWidth)
    ),
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

function isRenderProp(children: RadioProps['children']): children is (slot: RadioSlotProps) => React.ReactNode {
  return typeof children === 'function';
}

function isIndicatorRenderProp(
  indicator: RadioIndicatorProps['children'] | RadioProps['indicator']
): indicator is (slot: RadioSlotProps) => React.ReactNode {
  return typeof indicator === 'function';
}

function resolveAlignItems(align: RadioGroupAlign): ViewStyle['alignItems'] {
  if (align === 'center') return 'center';
  if (align === 'end') return 'flex-end';
  if (align === 'stretch') return 'stretch';
  return 'flex-start';
}

function RadioImpl(
  {
    value,
    checked: checkedProp,
    defaultChecked = false,
    onChange,
    allowDeselect,
    disabled = false,
    size: sizeProp,
    tone: toneProp,
    variant: variantProp,
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
  }: RadioProps,
  ref: React.ForwardedRef<RadioRef>
) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { width: viewportWidth } = useWindowDimensions();
  const group = React.useContext(RadioGroupContext);
  const isRTL = I18nManager.isRTL;

  const isStandaloneControlled = checkedProp !== undefined;
  const isGroupItem = group != null && value !== undefined && !isStandaloneControlled;
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState<boolean>(() => defaultChecked);

  const getGroupCheckedSnapshot = React.useCallback(
    () => (group && value !== undefined ? group.store.isSelected(value) : false),
    [group, value]
  );
  const groupChecked = React.useSyncExternalStore(
    group?.store.subscribe ?? noopSubscribe,
    getGroupCheckedSnapshot,
    getGroupCheckedSnapshot
  );

  const checked = isGroupItem
    ? groupChecked
    : isStandaloneControlled
      ? checkedProp!
      : uncontrolledChecked;
  const resolvedDisabled = disabled || Boolean(group?.disabled);
  const interactive = !resolvedDisabled;
  const resolvedAllowDeselect = allowDeselect ?? group?.allowDeselect ?? false;

  const size = sizeProp ?? group?.size ?? 'md';
  const tone = toneProp ?? group?.tone ?? 'primary';
  const variant = variantProp ?? group?.variant ?? 'outline';
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

  const metrics = React.useMemo(() => resolveRadioMetrics(size, layout), [layout, size, viewportWidth]);
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
  const defaultHitSlop = React.useMemo(
    () => resolveHitSlop(metrics.indicatorSize, metrics.indicatorSize, metrics.minTouchTarget),
    [metrics.indicatorSize, metrics.minTouchTarget]
  );
  const resolvedDuration = resolveDuration(duration);
  const valueTiming = React.useMemo(() => toTimingConfig(resolvedDuration), [resolvedDuration]);
  const pressInTiming = React.useMemo(() => toTimingConfig(PRESS_IN_DURATION), []);
  const pressOutTiming = React.useMemo(() => toTimingConfig(PRESS_OUT_DURATION), []);
  const focusTiming = React.useMemo(() => toTimingConfig(FOCUS_DURATION), []);

  const checkedSv = useSharedValue(checked ? 1 : 0);
  const pressSv = useSharedValue(0);
  const focusSv = useSharedValue(0);

  const checkedRef = React.useRef(checked);
  checkedRef.current = checked;
  const groupCheckedRef = React.useRef(groupChecked);
  groupCheckedRef.current = groupChecked;

  React.useEffect(() => {
    if (!isStandaloneControlled && !isGroupItem) return;
    checkedSv.value = withTiming(checked ? 1 : 0, valueTiming);
  }, [checked, checkedSv, isGroupItem, isStandaloneControlled, valueTiming]);

  React.useEffect(() => {
    if (interactive) return;
    pressSv.value = withTiming(0, pressOutTiming);
    focusSv.value = withTiming(0, focusTiming);
  }, [focusSv, focusTiming, interactive, pressOutTiming, pressSv]);

  const commitStandaloneChecked = React.useCallback(
    (next: boolean) => {
      if (!isStandaloneControlled) {
        checkedRef.current = next;
        checkedSv.value = withTiming(next ? 1 : 0, valueTiming);
        setUncontrolledChecked(next);
      }
      onChange?.(next);
    },
    [checkedSv, isStandaloneControlled, onChange, valueTiming]
  );

  const select = React.useCallback(() => {
    if (!interactive) return;

    if (isGroupItem && group && value !== undefined) {
      const isSelected = groupCheckedRef.current;
      if (isSelected && !resolvedAllowDeselect) return;

      const nextValue = isSelected ? null : value;
      if (!group.isControlled) {
        checkedSv.value = withTiming(isSelected ? 0 : 1, valueTiming);
      }
      group.selectValue(nextValue);
      onChange?.(!isSelected);
      return;
    }

    const current = checkedRef.current;
    if (current && !resolvedAllowDeselect) return;
    commitStandaloneChecked(current ? false : true);
  }, [
    checkedSv,
    commitStandaloneChecked,
    group,
    interactive,
    isGroupItem,
    onChange,
    resolvedAllowDeselect,
    value,
    valueTiming,
  ]);

  const handlePress = React.useCallback(
    (event: GestureResponderEvent) => {
      if (interactive) select();
      onPress?.(event);
    },
    [interactive, onPress, select]
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

  const slot = React.useMemo<RadioSlotProps>(
    () => ({
      checked,
      value,
      disabled: resolvedDisabled,
      interactive,
      size,
      tone,
      variant,
      select,
    }),
    [checked, interactive, resolvedDisabled, select, size, tone, value, variant]
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
              disabled={resolvedDisabled}
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
              disabled={resolvedDisabled}
              numberOfLines={2}
              tone={resolvedDisabled ? 'disabled' : 'muted'}
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
  }, [
    children,
    description,
    descriptionStyle,
    label,
    labelStyle,
    resolvedDisabled,
    slot,
  ]);

  const indicatorContext = React.useMemo<RadioIndicatorContextValue>(
    () => ({
      checkedSv,
      indicatorSize: metrics.indicatorSize,
      indicatorDotSize: metrics.indicatorDotSize,
      slot,
      checkedIndicatorColor: resolvedColors.checkedIndicator,
      customIndicator: indicator,
    }),
    [
      checkedSv,
      indicator,
      metrics.indicatorDotSize,
      metrics.indicatorSize,
      resolvedColors.checkedIndicator,
      slot,
    ]
  );

  const visualAnimatedStyle = useAnimatedStyle(() => {
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
    return {
      backgroundColor: interpolateColor(
        checkedSv.value,
        [0, 1],
        [resolvedColors.uncheckedBackground, resolvedColors.checkedBackground]
      ),
      borderColor: interpolateColor(
        checkedSv.value,
        [0, 1],
        [resolvedColors.uncheckedBorder, resolvedColors.checkedBorder]
      ),
    };
  }, [resolvedColors]);

  const indicatorFrameStyle = React.useMemo<ViewStyle>(
    () => ({
      width: metrics.indicatorSize,
      height: metrics.indicatorSize,
      borderRadius: metrics.indicatorSize / 2,
      borderWidth: metrics.indicatorBorderWidth,
    }),
    [metrics.indicatorBorderWidth, metrics.indicatorSize]
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
            borderRadius: metrics.indicatorSize / 2 + metrics.focusRingOffset,
            borderWidth: metrics.focusRingWidth,
            borderColor: resolvedColors.focusRing,
          },
          focusRingAnimatedStyle,
        ]}
      />
      <RadioIndicator />
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
    (state: PressableStateCallbackType) => {
      const userStyle = typeof style === 'function' ? style(state) : style;
      return [styles.root, webCursorStyle, userStyle];
    },
    [style, webCursorStyle]
  );

  return (
    <RadioIndicatorContext.Provider value={indicatorContext}>
      <Pressable
        {...pressableProps}
        ref={ref}
        accessibilityLabel={accessibilityLabel ?? inferredAccessibilityLabel}
        accessibilityRole="radio"
        accessibilityState={{
          ...accessibilityState,
          checked,
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
        <Animated.View style={[styles.visual, visualAnimatedStyle]}>{contentNode}</Animated.View>
      </Pressable>
    </RadioIndicatorContext.Provider>
  );
}

const RadioWithRef = React.forwardRef<RadioRef, RadioProps>(RadioImpl);
RadioWithRef.displayName = 'Radio';

export const Radio = React.memo(RadioWithRef);
Radio.displayName = 'Radio';

export type RadioIndicatorProps = {
  children?: React.ReactNode | ((slot: RadioSlotProps) => React.ReactNode);
  style?: StyleProp<ViewStyle>;
};

export function RadioIndicator({ children, style }: RadioIndicatorProps) {
  const context = useRadioIndicatorContext();
  const customIndicator = children ?? context.customIndicator;

  const dotAnimatedStyle = useAnimatedStyle(() => {
    const opacity = context.checkedSv.value;
    const scale = interpolate(context.checkedSv.value, [0, 1], [0.72, 1]);
    return { opacity, transform: [{ scale }] };
  });

  const resolvedCustomIndicator = isIndicatorRenderProp(customIndicator)
    ? customIndicator(context.slot)
    : customIndicator;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.indicatorLayer,
        {
          width: context.indicatorSize,
          height: context.indicatorSize,
        },
        style,
      ]}
    >
      <Animated.View style={dotAnimatedStyle}>
        {resolvedCustomIndicator ?? (
          <View
            style={{
              width: context.indicatorDotSize,
              height: context.indicatorDotSize,
              borderRadius: context.indicatorDotSize / 2,
              backgroundColor: context.checkedIndicatorColor,
            }}
          />
        )}
      </Animated.View>
    </View>
  );
}

export type RadioGroupProps<T extends RadioValue = RadioValue> = Omit<
  React.ComponentPropsWithoutRef<typeof View>,
  'children' | 'onChange'
> & {
  value?: T | null;
  defaultValue?: T | null;
  onChange?: (value: T | null) => void;
  disabled?: boolean;
  allowDeselect?: boolean;

  orientation?: RadioGroupOrientation;
  align?: RadioGroupAlign;
  wrap?: boolean;
  gap?: number;
  rowGap?: number;
  columnGap?: number;

  size?: RadioSize;
  tone?: RadioTone;
  variant?: RadioVariant;
  color?: string;
  colors?: RadioColors;
  layout?: RadioLayout;

  children: React.ReactNode;
};

export function RadioGroup<T extends RadioValue = RadioValue>({
  value,
  defaultValue,
  onChange,
  disabled = false,
  allowDeselect = false,
  orientation = 'horizontal',
  align = 'start',
  wrap = false,
  gap,
  rowGap,
  columnGap,
  size,
  tone,
  variant,
  color,
  colors,
  layout,
  style,
  children,
  accessibilityState,
  ...viewProps
}: RadioGroupProps<T>) {
  const { width: viewportWidth } = useWindowDimensions();
  const isControlled = value !== undefined;
  const storeRef = React.useRef<RadioGroupStore<T> | null>(null);
  if (!storeRef.current) {
    storeRef.current = new RadioGroupStore<T>((value ?? defaultValue ?? null) as T | null);
  }

  React.useLayoutEffect(() => {
    if (!isControlled) return;
    storeRef.current!.setValue((value ?? null) as T | null);
  }, [isControlled, value]);

  const selectValue = React.useCallback(
    (nextValue: T | null) => {
      if (!isControlled) storeRef.current!.setValue(nextValue);
      onChange?.(nextValue);
    },
    [isControlled, onChange]
  );

  const context = React.useMemo<RadioGroupContextValue<T>>(
    () => ({
      store: storeRef.current!,
      disabled,
      isControlled,
      allowDeselect,
      selectValue,
      size,
      tone,
      variant,
      color,
      colors,
      layout,
    }),
    [
      allowDeselect,
      color,
      colors,
      disabled,
      isControlled,
      layout,
      selectValue,
      size,
      tone,
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
    <RadioGroupContext.Provider value={context as unknown as RadioGroupContextValue<RadioValue>}>
      <View
        {...viewProps}
        accessibilityRole="radiogroup"
        accessibilityState={{
          ...accessibilityState,
          disabled: Boolean(disabled),
        }}
        style={[layoutStyle, style]}
      >
        {children}
      </View>
    </RadioGroupContext.Provider>
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
});
