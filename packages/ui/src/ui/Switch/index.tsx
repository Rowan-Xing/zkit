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
import { wp } from 'zkit-tools';
import type { Theme } from '../../theme/types';
import { useTheme } from '../../theme/useTheme';
import { LoadingSpinner } from '../LoadingSpinner';
import { Text } from '../Text';

export type SwitchSize = 'sm' | 'md' | 'lg';
export type SwitchTone = 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
export type SwitchLabelPlacement = 'start' | 'end';

export type SwitchStateText = {
  checked?: string;
  unchecked?: string;
};

export type SwitchLayout = {
  width?: number;
  height?: number;
  thumbInset?: number;
  radius?: number;
  labelGap?: number;
  textInset?: number;
  textSize?: number;
  textLineHeight?: number;
};

export type SwitchColors = {
  checkedTrack?: string;
  uncheckedTrack?: string;
  thumb?: string;
  checkedThumb?: string;
  uncheckedThumb?: string;
  checkedText?: string;
  uncheckedText?: string;
  focusRing?: string;
  loading?: string;
};

export type SwitchSlotProps = {
  checked: boolean;
  disabled: boolean;
  loading: boolean;
  interactive: boolean;
  size: SwitchSize;
  tone: SwitchTone;
  toggle: () => void;
};

type SwitchMetrics = {
  width: number;
  height: number;
  thumbInset: number;
  labelGap: number;
  textInset: number;
  textSize: number;
  textLineHeight: number;
  textSlotMinWidth: number;
  minTouchTarget: number;
  focusRingWidth: number;
  focusRingOffset: number;
};

type SwitchTonePalette = {
  checkedTrack: string;
  checkedText: string;
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

export type SwitchRef = React.ComponentRef<typeof Pressable>;

export interface SwitchProps extends NativePressableProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;

  disabled?: boolean;
  loading?: boolean;
  loadingIndicator?: React.ReactNode;

  size?: SwitchSize;
  tone?: SwitchTone;
  duration?: number;

  color?: string;
  colors?: SwitchColors;
  layout?: SwitchLayout;
  stateText?: SwitchStateText;

  label?: React.ReactNode;
  description?: React.ReactNode;
  labelPlacement?: SwitchLabelPlacement;
  children?: React.ReactNode | ((slot: SwitchSlotProps) => React.ReactNode);

  style?: React.ComponentPropsWithoutRef<typeof Pressable>['style'];
  contentStyle?: StyleProp<ViewStyle>;
  trackStyle?: StyleProp<ViewStyle>;
  thumbStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  descriptionStyle?: StyleProp<TextStyle>;
  stateTextStyle?: StyleProp<TextStyle>;
  accessibilityState?: React.ComponentPropsWithoutRef<typeof Pressable>['accessibilityState'];
}

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
    width: 44,
    height: 26,
    thumbInset: 2,
    labelGap: 10,
    textInset: 4,
    textSize: 11,
    textLineHeight: 13,
    textSlotMinWidth: 24,
  },
  md: {
    width: 52,
    height: 32,
    thumbInset: 3,
    labelGap: 12,
    textInset: 5,
    textSize: 12,
    textLineHeight: 14,
    textSlotMinWidth: 30,
  },
  lg: {
    width: 64,
    height: 38,
    thumbInset: 3,
    labelGap: 14,
    textInset: 6,
    textSize: 13,
    textLineHeight: 16,
    textSlotMinWidth: 36,
  },
} as const satisfies Record<
  SwitchSize,
  Omit<SwitchMetrics, 'minTouchTarget' | 'focusRingWidth' | 'focusRingOffset'>
>;

const DISABLED_OPACITY = 0.48;
const PRESSED_OPACITY = 0.92;
const STATE_TEXT_WIDTH_FACTOR = 0.58;
const VALUE_TIMING_DURATION = 180;
const PRESS_IN_DURATION = 90;
const PRESS_OUT_DURATION = 140;
const FOCUS_DURATION = 120;

function resolveSwitchMetrics(size: SwitchSize): SwitchMetrics {
  const token = SIZE_TOKENS[size] ?? SIZE_TOKENS.md;
  return {
    width: wp(token.width),
    height: wp(token.height),
    thumbInset: wp(token.thumbInset),
    labelGap: wp(token.labelGap),
    textInset: wp(token.textInset),
    textSize: wp(token.textSize),
    textLineHeight: wp(token.textLineHeight),
    textSlotMinWidth: wp(token.textSlotMinWidth),
    minTouchTarget: wp(44),
    focusRingWidth: wp(2),
    focusRingOffset: wp(3),
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

function resolveTonePalette(tone: SwitchTone, theme: Theme): SwitchTonePalette {
  if (tone === 'neutral') {
    return {
      checkedTrack: theme.colors.onSurface,
      checkedText: theme.colors.surface,
    };
  }

  if (tone === 'success') {
    return {
      checkedTrack: SEMANTIC_COLORS.success,
      checkedText: '#FFFFFF',
    };
  }

  if (tone === 'warning') {
    return {
      checkedTrack: SEMANTIC_COLORS.warning,
      checkedText: '#111827',
    };
  }

  if (tone === 'danger') {
    return {
      checkedTrack: SEMANTIC_COLORS.danger,
      checkedText: '#FFFFFF',
    };
  }

  if (tone === 'info') {
    return {
      checkedTrack: SEMANTIC_COLORS.info,
      checkedText: '#FFFFFF',
    };
  }

  return {
    checkedTrack: theme.colors.primary,
    checkedText: theme.colors.onPrimary,
  };
}

function resolveUncheckedTrackFallback(scheme: ReturnType<typeof useColorScheme>, theme: Theme) {
  if (scheme === 'dark') return '#374151';
  return colorToRgba(theme.colors.onSurface, 0.12) ?? theme.colors.border;
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
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

function isRenderProp(children: SwitchProps['children']): children is (slot: SwitchSlotProps) => React.ReactNode {
  return typeof children === 'function';
}

function getTextLength(text: string | undefined) {
  return text == null ? 0 : Array.from(text).length;
}

function SwitchImpl(
  {
    checked: checkedProp,
    defaultChecked = false,
    onCheckedChange,
    disabled = false,
    loading = false,
    loadingIndicator,
    size = 'md',
    tone = 'primary',
    duration,
    color,
    colors,
    layout,
    stateText,
    label,
    description,
    labelPlacement = 'start',
    children,
    style,
    contentStyle,
    trackStyle,
    thumbStyle,
    labelStyle,
    descriptionStyle,
    stateTextStyle,
    accessibilityLabel,
    accessibilityState,
    accessibilityValue,
    hitSlop,
    onPress,
    onPressIn,
    onPressOut,
    onFocus,
    onBlur,
    testID,
    ...pressableProps
  }: SwitchProps,
  ref: React.ForwardedRef<SwitchRef>
) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { width: viewportWidth } = useWindowDimensions();
  const isRTL = I18nManager.isRTL;

  const isControlled = checkedProp !== undefined;
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState<boolean>(() => defaultChecked);
  const checked = isControlled ? checkedProp! : uncontrolledChecked;
  const checkedRef = React.useRef(checked);
  checkedRef.current = checked;

  const interactionDisabled = disabled || loading;
  const interactive = !interactionDisabled;

  const metrics = React.useMemo(() => resolveSwitchMetrics(size), [size, viewportWidth]);
  const tonePalette = React.useMemo(() => resolveTonePalette(tone, theme), [theme, tone]);

  const checkedTrackColor = React.useMemo(
    () => resolveColorToken(color ?? colors?.checkedTrack, tonePalette.checkedTrack, theme),
    [color, colors?.checkedTrack, theme, tonePalette.checkedTrack]
  );
  const uncheckedTrackColor = React.useMemo(
    () => resolveColorToken(colors?.uncheckedTrack, resolveUncheckedTrackFallback(scheme, theme), theme),
    [colors?.uncheckedTrack, scheme, theme]
  );
  const checkedThumbColor = React.useMemo(
    () => resolveColorToken(colors?.checkedThumb ?? colors?.thumb, theme.colors.surface, theme),
    [colors?.checkedThumb, colors?.thumb, theme]
  );
  const uncheckedThumbColor = React.useMemo(
    () => resolveColorToken(colors?.uncheckedThumb ?? colors?.thumb, theme.colors.surface, theme),
    [colors?.thumb, colors?.uncheckedThumb, theme]
  );
  const checkedTextColor = React.useMemo(
    () => resolveColorToken(colors?.checkedText, tonePalette.checkedText, theme),
    [colors?.checkedText, theme, tonePalette.checkedText]
  );
  const uncheckedTextColor = React.useMemo(
    () =>
      resolveColorToken(
        colors?.uncheckedText,
        scheme === 'dark' ? '#E5E7EB' : theme.colors.muted,
        theme
      ),
    [colors?.uncheckedText, scheme, theme]
  );
  const focusRingColor = React.useMemo(
    () =>
      resolveColorToken(
        colors?.focusRing,
        colorToRgba(checkedTrackColor, scheme === 'dark' ? 0.36 : 0.28) ?? checkedTrackColor,
        theme
      ),
    [checkedTrackColor, colors?.focusRing, scheme, theme]
  );
  const loadingColor = React.useMemo(
    () => resolveColorToken(colors?.loading, checked ? checkedTrackColor : theme.colors.muted, theme),
    [checked, checkedTrackColor, colors?.loading, theme]
  );
  const thumbColorChanges = checkedThumbColor !== uncheckedThumbColor;

  const trackHeight = resolvePositiveNumber(layout?.height, metrics.height);
  const baseTrackWidth = Math.max(trackHeight, resolvePositiveNumber(layout?.width, metrics.width));
  const onePx = wp(1);
  const resolvedThumbInset = clampNumber(
    resolveNonNegativeNumber(layout?.thumbInset, metrics.thumbInset),
    0,
    Math.max(0, (trackHeight - onePx) / 2)
  );
  const thumbSize = Math.max(onePx, trackHeight - resolvedThumbInset * 2);
  const stateTextSize = resolvePositiveNumber(layout?.textSize, metrics.textSize);
  const stateTextLineHeight = resolvePositiveNumber(layout?.textLineHeight, metrics.textLineHeight);
  const stateTextInset = resolveNonNegativeNumber(layout?.textInset, metrics.textInset);
  const labelGap = resolveNonNegativeNumber(layout?.labelGap, metrics.labelGap);
  const hasStateText = stateText?.checked != null || stateText?.unchecked != null;
  const maxStateTextLength = Math.max(getTextLength(stateText?.checked), getTextLength(stateText?.unchecked));
  const stateTextSlotWidth = hasStateText
    ? Math.max(
        metrics.textSlotMinWidth,
        maxStateTextLength * stateTextSize * STATE_TEXT_WIDTH_FACTOR + stateTextInset * 2
      )
    : 0;
  const trackWidth = hasStateText
    ? Math.max(baseTrackWidth, thumbSize + resolvedThumbInset + stateTextSlotWidth)
    : baseTrackWidth;
  const travel = Math.max(0, trackWidth - thumbSize - resolvedThumbInset * 2);
  const thumbStart = isRTL ? trackWidth - thumbSize - resolvedThumbInset : resolvedThumbInset;
  const travelDirection = isRTL ? -1 : 1;
  const trackRadius = Math.max(0, layout?.radius ?? trackHeight / 2);
  const thumbRadius = Math.max(0, Math.min(thumbSize / 2, trackRadius - resolvedThumbInset));
  const defaultHitSlop = React.useMemo(
    () => resolveHitSlop(trackWidth, trackHeight, metrics.minTouchTarget),
    [metrics.minTouchTarget, trackHeight, trackWidth]
  );
  const thumbShadowStyle = React.useMemo<ViewStyle>(
    () => ({
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: wp(1) },
      shadowOpacity: scheme === 'dark' ? 0.28 : 0.14,
      shadowRadius: wp(4),
      elevation: wp(1),
    }),
    [scheme]
  );
  const webCursorStyle = React.useMemo(
    () => resolveWebCursorStyle(interactionDisabled),
    [interactionDisabled]
  );

  const resolvedDuration = resolveDuration(duration);
  const valueTiming = React.useMemo(() => toTimingConfig(resolvedDuration), [resolvedDuration]);
  const pressInTiming = React.useMemo(() => toTimingConfig(PRESS_IN_DURATION), []);
  const pressOutTiming = React.useMemo(() => toTimingConfig(PRESS_OUT_DURATION), []);
  const focusTiming = React.useMemo(() => toTimingConfig(FOCUS_DURATION), []);

  const progressSv = useSharedValue(checked ? 1 : 0);
  const pressSv = useSharedValue(0);
  const focusSv = useSharedValue(0);

  React.useEffect(() => {
    if (!isControlled) return;
    progressSv.value = withTiming(checked ? 1 : 0, valueTiming);
  }, [checked, isControlled, progressSv, valueTiming]);

  React.useEffect(() => {
    if (interactive) return;
    pressSv.value = withTiming(0, pressOutTiming);
    focusSv.value = withTiming(0, focusTiming);
  }, [focusSv, focusTiming, interactive, pressOutTiming, pressSv]);

  const commitChecked = React.useCallback(
    (next: boolean) => {
      if (!isControlled) {
        checkedRef.current = next;
        progressSv.value = withTiming(next ? 1 : 0, valueTiming);
        setUncontrolledChecked(next);
      }
      onCheckedChange?.(next);
    },
    [isControlled, onCheckedChange, progressSv, valueTiming]
  );

  const toggle = React.useCallback(() => {
    if (interactionDisabled) return;
    commitChecked(!checkedRef.current);
  }, [commitChecked, interactionDisabled]);

  const handlePress = React.useCallback(
    (event: GestureResponderEvent) => {
      if (!interactionDisabled) {
        commitChecked(!checkedRef.current);
      }
      onPress?.(event);
    },
    [commitChecked, interactionDisabled, onPress]
  );

  const handlePressIn = React.useCallback(
    (event: GestureResponderEvent) => {
      if (!interactionDisabled) {
        pressSv.value = withTiming(1, pressInTiming);
      }
      onPressIn?.(event);
    },
    [interactionDisabled, onPressIn, pressInTiming, pressSv]
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
      if (!interactionDisabled) {
        focusSv.value = withTiming(1, focusTiming);
      }
      onFocus?.(event);
    },
    [focusSv, focusTiming, interactionDisabled, onFocus]
  );

  const handleBlur = React.useCallback(
    (event: PressableBlurEvent) => {
      focusSv.value = withTiming(0, focusTiming);
      onBlur?.(event);
    },
    [focusSv, focusTiming, onBlur]
  );

  const visualAnimatedStyle = useAnimatedStyle(() => {
    const pressedOpacity = interpolate(pressSv.value, [0, 1], [1, PRESSED_OPACITY]);
    const opacity = disabled ? DISABLED_OPACITY : pressedOpacity;
    return { opacity };
  }, [disabled]);

  const focusRingAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(focusSv.value, [0, 1], [0, 1]);
    const scale = interpolate(focusSv.value, [0, 1], [0.96, 1]);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const checkedTrackAnimatedStyle = useAnimatedStyle(() => {
    return { opacity: progressSv.value };
  });

  const thumbAnimatedStyle = useAnimatedStyle(() => {
    if (!thumbColorChanges) {
      return {
        transform: [{ translateX: travel * travelDirection * progressSv.value }],
      };
    }

    return {
      backgroundColor: interpolateColor(progressSv.value, [0, 1], [uncheckedThumbColor, checkedThumbColor]),
      transform: [{ translateX: travel * travelDirection * progressSv.value }],
    };
  }, [checkedThumbColor, thumbColorChanges, travel, travelDirection, uncheckedThumbColor]);

  const checkedTextAnimatedStyle = useAnimatedStyle(() => {
    return { opacity: progressSv.value };
  });

  const uncheckedTextAnimatedStyle = useAnimatedStyle(() => {
    return { opacity: 1 - progressSv.value };
  });

  const checkedTextSlotStyle = React.useMemo<ViewStyle>(
    () =>
      isRTL
        ? {
            left: thumbSize + resolvedThumbInset,
            right: 0,
            paddingLeft: stateTextInset,
            paddingRight: stateTextInset,
          }
        : {
            left: 0,
            right: thumbSize + resolvedThumbInset,
            paddingLeft: stateTextInset,
            paddingRight: stateTextInset,
          },
    [isRTL, resolvedThumbInset, stateTextInset, thumbSize]
  );
  const uncheckedTextSlotStyle = React.useMemo<ViewStyle>(
    () =>
      isRTL
        ? {
            left: 0,
            right: thumbSize + resolvedThumbInset,
            paddingLeft: stateTextInset,
            paddingRight: stateTextInset,
          }
        : {
            left: thumbSize + resolvedThumbInset,
            right: 0,
            paddingLeft: stateTextInset,
            paddingRight: stateTextInset,
          },
    [isRTL, resolvedThumbInset, stateTextInset, thumbSize]
  );

  const slot = React.useMemo<SwitchSlotProps>(
    () => ({
      checked,
      disabled: interactionDisabled,
      loading,
      interactive,
      size,
      tone,
      toggle,
    }),
    [checked, interactionDisabled, interactive, loading, size, tone, toggle]
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
              disabled={interactionDisabled}
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
              disabled={interactionDisabled}
              numberOfLines={2}
              tone={interactionDisabled ? 'disabled' : 'muted'}
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
  }, [children, description, descriptionStyle, interactionDisabled, label, labelStyle, slot]);

  const hasContent = renderedContent != null;
  const inferredAccessibilityLabel = isPrimitiveText(label) ? String(label) : undefined;
  const resolvedAccessibilityValue =
    accessibilityValue ??
    (hasStateText
      ? {
          text: checked ? (stateText?.checked ?? '') : (stateText?.unchecked ?? ''),
        }
      : undefined);
  const resolvedStyle = React.useCallback(
    (state: PressableStateCallbackType) => {
      const userStyle = typeof style === 'function' ? style(state) : style;
      return [styles.root, webCursorStyle, userStyle];
    },
    [style, webCursorStyle]
  );

  const switchNode = (
    <Animated.View
      style={[
        styles.visual,
        {
          width: trackWidth,
          height: trackHeight,
          borderRadius: trackRadius,
        },
        visualAnimatedStyle,
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
            borderWidth: metrics.focusRingWidth,
            borderRadius: trackRadius + metrics.focusRingOffset,
            borderColor: focusRingColor,
          },
          focusRingAnimatedStyle,
        ]}
      />
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            borderRadius: trackRadius,
            backgroundColor: uncheckedTrackColor,
          },
          trackStyle,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            borderRadius: trackRadius,
            backgroundColor: checkedTrackColor,
          },
          checkedTrackAnimatedStyle,
        ]}
      />

      {hasStateText ? (
        <View pointerEvents="none" style={styles.stateTextLayer}>
          <Animated.View style={[styles.stateTextSlot, checkedTextSlotStyle, checkedTextAnimatedStyle]}>
            <Text
              allowFontScaling={false}
              ellipsizeMode="clip"
              numberOfLines={1}
              style={[
                styles.stateText,
                {
                  color: checkedTextColor,
                  fontSize: stateTextSize,
                  lineHeight: stateTextLineHeight,
                },
                stateTextStyle,
              ]}
            >
              {stateText?.checked ?? ''}
            </Text>
          </Animated.View>
          <Animated.View style={[styles.stateTextSlot, uncheckedTextSlotStyle, uncheckedTextAnimatedStyle]}>
            <Text
              allowFontScaling={false}
              ellipsizeMode="clip"
              numberOfLines={1}
              style={[
                styles.stateText,
                {
                  color: uncheckedTextColor,
                  fontSize: stateTextSize,
                  lineHeight: stateTextLineHeight,
                },
                stateTextStyle,
              ]}
            >
              {stateText?.unchecked ?? ''}
            </Text>
          </Animated.View>
        </View>
      ) : null}

      <Animated.View
        style={[
          styles.thumb,
          {
            width: thumbSize,
            height: thumbSize,
            left: thumbStart,
            top: resolvedThumbInset,
            borderRadius: thumbRadius,
            backgroundColor: uncheckedThumbColor,
          },
          thumbAnimatedStyle,
          thumbShadowStyle,
          thumbStyle,
        ]}
      >
        {loading ? (
          loadingIndicator ?? (
            <LoadingSpinner
              size={Math.max(wp(12), thumbSize * 0.58)}
              color={loadingColor}
            />
          )
        ) : null}
      </Animated.View>
    </Animated.View>
  );

  const contentNode = hasContent ? (
    <View
      style={[
        styles.content,
        contentStyle,
      ]}
    >
      {labelPlacement === 'start' ? (
        <>
          <View style={[styles.contentSlot, { marginEnd: labelGap }]}>{renderedContent}</View>
          {switchNode}
        </>
      ) : (
        <>
          {switchNode}
          <View style={[styles.contentSlot, { marginStart: labelGap }]}>{renderedContent}</View>
        </>
      )}
    </View>
  ) : (
    switchNode
  );

  return (
    <Pressable
      {...pressableProps}
      ref={ref}
      accessibilityLabel={accessibilityLabel ?? inferredAccessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{
        ...accessibilityState,
        checked,
        disabled: Boolean(interactionDisabled),
        busy: Boolean(loading || accessibilityState?.busy),
      }}
      accessibilityValue={resolvedAccessibilityValue}
      disabled={interactionDisabled}
      hitSlop={hitSlop ?? defaultHitSlop}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={resolvedStyle}
      testID={testID}
    >
      {contentNode}
    </Pressable>
  );
}

const SwitchWithRef = React.forwardRef<SwitchRef, SwitchProps>(SwitchImpl);
SwitchWithRef.displayName = 'Switch';

export const Switch = React.memo(SwitchWithRef);
Switch.displayName = 'Switch';

const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
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
  visual: {
    flexShrink: 0,
    overflow: 'visible',
  },
  focusRing: {
    position: 'absolute',
  },
  stateTextLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTextSlot: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stateText: {
    includeFontPadding: false,
    fontWeight: '600',
    margin: 0,
    padding: 0,
    textAlign: 'center',
  },
  thumb: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
});
