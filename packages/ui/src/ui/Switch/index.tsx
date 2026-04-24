import * as React from 'react';
import type {
  GestureResponderEvent,
  Insets,
  PressableStateCallbackType,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Pressable, processColor, StyleSheet, useColorScheme, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { wp } from 'y2kit-tools';
import { useTheme } from '../../theme/useTheme';
import type { Theme } from '../../theme/types';
import { LoadingSpinner } from '../LoadingSpinner';
import { Text } from '../Text';

export type SwitchSize = 'sm' | 'md' | 'lg';
export type SwitchTone = 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';

type SwitchMetrics = {
  width: number;
  height: number;
  thumbInset: number;
  fontSize: number;
  labelInset: number;
};

type SwitchTonePalette = {
  checkedTrackColor: string;
  checkedLabelColor: string;
};

type NativePressableProps = Omit<
  React.ComponentPropsWithoutRef<typeof Pressable>,
  'accessibilityRole' | 'accessibilityState' | 'children' | 'disabled' | 'style' | 'onChange'
>;

const SEMANTIC_COLORS: Record<string, string> = {
  warn: '#F59E0B',
  warning: '#F59E0B',
  error: '#EF4444',
  success: '#22C55E',
  danger: '#DC2626',
  info: '#3B82F6',
};

const TRACK_PRESSED_SCALE = 0.985;
const THUMB_PRESSED_SCALE = 0.96;
const DISABLED_OPACITY = 0.5;
const VALUE_TIMING_DURATION = 180;
const PRESS_IN_DURATION = 90;
const PRESS_OUT_DURATION = 140;

function resolveSwitchMetrics(size: SwitchSize): SwitchMetrics {
  if (size === 'sm') {
    return {
      width: wp(46),
      height: wp(26),
      thumbInset: wp(2),
      fontSize: wp(11),
      labelInset: wp(2),
    };
  }

  if (size === 'lg') {
    return {
      width: wp(72),
      height: wp(40),
      thumbInset: wp(2.5),
      fontSize: wp(13),
      labelInset: wp(4),
    };
  }

  return {
    width: wp(58),
    height: wp(32),
    thumbInset: wp(2),
    fontSize: wp(13),
    labelInset: wp(3),
  };
}

function resolveTonePalette(tone: SwitchTone, theme: Theme): SwitchTonePalette {
  if (tone === 'neutral') {
    return {
      checkedTrackColor: theme.colors.secondary,
      checkedLabelColor: theme.colors.onSecondary,
    };
  }

  if (tone === 'success') {
    return {
      checkedTrackColor: SEMANTIC_COLORS.success,
      checkedLabelColor: '#FFFFFF',
    };
  }

  if (tone === 'warning') {
    return {
      checkedTrackColor: SEMANTIC_COLORS.warning,
      checkedLabelColor: '#111827',
    };
  }

  if (tone === 'danger') {
    return {
      checkedTrackColor: SEMANTIC_COLORS.danger,
      checkedLabelColor: '#FFFFFF',
    };
  }

  if (tone === 'info') {
    return {
      checkedTrackColor: SEMANTIC_COLORS.info,
      checkedLabelColor: '#FFFFFF',
    };
  }

  return {
    checkedTrackColor: theme.colors.primary,
    checkedLabelColor: theme.colors.onPrimary,
  };
}

function resolveColorToken(input: string | undefined, fallback: string, theme: Theme) {
  if (input == null) return fallback;
  const key = input.trim();
  if (!key) return fallback;

  const resolved =
    key === 'primary'
      ? theme.colors.primary
      : key === 'secondary' || key === 'neutral'
        ? theme.colors.secondary
        : key === 'surface'
          ? theme.colors.surface
          : key === 'border'
            ? theme.colors.border
            : key === 'muted'
              ? theme.colors.muted
              : SEMANTIC_COLORS[key] ?? key;

  return processColor(resolved) == null ? fallback : resolved;
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function resolveDuration(duration: number | undefined) {
  if (duration == null) return VALUE_TIMING_DURATION;
  if (!Number.isFinite(duration)) return VALUE_TIMING_DURATION;
  return Math.max(0, duration);
}

function toTimingConfig(duration: number) {
  return {
    duration,
    easing: Easing.out(Easing.cubic),
    reduceMotion: ReduceMotion.System,
  } as const;
}

function resolveHitSlop(width: number, height: number): Insets | undefined {
  const minTouchTarget = wp(44);
  const zeroPx = wp(0);
  const vertical = Math.max(zeroPx, (minTouchTarget - height) / 2);
  const horizontal = Math.max(zeroPx, (minTouchTarget - width) / 2);
  if (vertical === zeroPx && horizontal === zeroPx) return undefined;
  return {
    top: vertical,
    bottom: vertical,
    left: horizontal,
    right: horizontal,
  };
}

export type SwitchProps = NativePressableProps & {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;

  disabled?: boolean;
  loading?: boolean;

  size?: SwitchSize;
  tone?: SwitchTone;
  duration?: number;

  color?: string;
  uncheckedColor?: string;
  darkUncheckedColor?: string;
  thumbColor?: string;
  checkedLabelColor?: string;
  uncheckedLabelColor?: string;

  checkedLabel?: string;
  uncheckedLabel?: string;

  thumbInset?: number;
  radius?: number;

  style?: React.ComponentPropsWithoutRef<typeof Pressable>['style'];
  trackStyle?: StyleProp<ViewStyle>;
  thumbStyle?: StyleProp<ViewStyle>;
  accessibilityState?: React.ComponentPropsWithoutRef<typeof Pressable>['accessibilityState'];
  testID?: string;
};

export function Switch({
  checked: checkedProp,
  defaultChecked = false,
  onChange,
  disabled = false,
  loading = false,
  size = 'md',
  tone = 'primary',
  duration,
  color,
  uncheckedColor,
  darkUncheckedColor,
  thumbColor,
  checkedLabelColor,
  uncheckedLabelColor,
  checkedLabel,
  uncheckedLabel,
  thumbInset,
  radius,
  style,
  trackStyle,
  thumbStyle,
  testID,
  hitSlop,
  onPress,
  onPressIn,
  onPressOut,
  accessibilityState,
  ...pressableProps
}: SwitchProps) {
  const theme = useTheme();
  const scheme = useColorScheme();

  const isControlled = checkedProp !== undefined;
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState<boolean>(() => defaultChecked);
  const checked = isControlled ? checkedProp : uncontrolledChecked;
  const interactive = !disabled && !loading;

  const tonePalette = React.useMemo(() => resolveTonePalette(tone, theme), [theme, tone]);
  const checkedTrackColor = React.useMemo(
    () => resolveColorToken(color, tonePalette.checkedTrackColor, theme),
    [color, theme, tonePalette.checkedTrackColor]
  );
  const resolvedCheckedLabelColor = checkedLabelColor ?? tonePalette.checkedLabelColor;
  const resolvedUncheckedLabelColor = uncheckedLabelColor ?? (scheme === 'dark' ? '#F9FAFB' : theme.colors.onSurface);
  const uncheckedTrackColor = React.useMemo(() => {
    const fallback = scheme === 'dark' ? '#374151' : theme.colors.border;
    const candidate = scheme === 'dark' ? darkUncheckedColor ?? uncheckedColor : uncheckedColor;
    return resolveColorToken(candidate, fallback, theme);
  }, [darkUncheckedColor, scheme, theme, uncheckedColor]);
  const resolvedThumbColor = React.useMemo(
    () => resolveColorToken(thumbColor, theme.colors.surface, theme),
    [theme, thumbColor]
  );

  const zeroPx = wp(0);
  const onePx = wp(1);
  const labelShift = wp(2);
  const metrics = React.useMemo(() => resolveSwitchMetrics(size), [size]);
  const resolvedThumbInset = React.useMemo(() => {
    const rawInset = thumbInset ?? metrics.thumbInset;
    return clampNumber(rawInset, zeroPx, Math.max(zeroPx, (metrics.height - onePx) / 2));
  }, [metrics.height, metrics.thumbInset, onePx, thumbInset, zeroPx]);
  const thumbSize = Math.max(onePx, metrics.height - resolvedThumbInset * 2);
  const travel = Math.max(zeroPx, metrics.width - thumbSize - resolvedThumbInset * 2);
  const resolvedRadius = radius ?? metrics.height / 2;
  const trackRadius = Math.max(zeroPx, resolvedRadius);
  const thumbRadius = Math.max(zeroPx, Math.min(thumbSize / 2, trackRadius - resolvedThumbInset));
  const labelPaddingHorizontal = metrics.labelInset;
  const checkedLabelSlotStyle = React.useMemo(
    () => ({
      left: zeroPx,
      right: thumbSize + resolvedThumbInset,
      paddingLeft: labelPaddingHorizontal + resolvedThumbInset,
      paddingRight: labelPaddingHorizontal,
    }),
    [labelPaddingHorizontal, resolvedThumbInset, thumbSize, zeroPx]
  );
  const uncheckedLabelSlotStyle = React.useMemo(
    () => ({
      left: thumbSize + resolvedThumbInset,
      right: zeroPx,
      paddingLeft: labelPaddingHorizontal,
      paddingRight: labelPaddingHorizontal + resolvedThumbInset,
    }),
    [labelPaddingHorizontal, resolvedThumbInset, thumbSize, zeroPx]
  );
  const thumbShadowStyle = React.useMemo(
    () => ({
      shadowRadius: wp(6),
      shadowOffset: { width: wp(0), height: wp(2) },
      elevation: wp(2),
    }),
    []
  );
  const hasLabels = checkedLabel != null || uncheckedLabel != null;
  const resolvedDuration = resolveDuration(duration);
  const valueTiming = React.useMemo(() => toTimingConfig(resolvedDuration), [resolvedDuration]);
  const pressInTiming = React.useMemo(() => toTimingConfig(PRESS_IN_DURATION), []);
  const pressOutTiming = React.useMemo(() => toTimingConfig(PRESS_OUT_DURATION), []);
  const defaultHitSlop = React.useMemo(
    () => resolveHitSlop(metrics.width, metrics.height),
    [metrics.height, metrics.width]
  );

  const progressSv = useSharedValue(checked ? 1 : 0);
  const pressSv = useSharedValue(0);

  React.useEffect(() => {
    if (!isControlled) return;
    progressSv.value = withTiming(checked ? 1 : 0, valueTiming);
  }, [checked, isControlled, progressSv, valueTiming]);

  React.useEffect(() => {
    if (interactive) return;
    pressSv.value = withTiming(0, pressOutTiming);
  }, [interactive, pressOutTiming, pressSv]);

  const containerAnimatedStyle = useAnimatedStyle(() => {
    const pressedOpacity = interpolate(pressSv.value, [0, 1], [1, 0.9]);
    const pressedScale = interpolate(pressSv.value, [0, 1], [1, TRACK_PRESSED_SCALE]);
    return {
      opacity: disabled ? DISABLED_OPACITY : pressedOpacity,
      transform: [{ scale: pressedScale }],
    };
  }, [disabled]);

  const trackAnimatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(progressSv.value, [0, 1], [uncheckedTrackColor, checkedTrackColor]),
    };
  }, [checkedTrackColor, uncheckedTrackColor]);

  const thumbAnimatedStyle = useAnimatedStyle(() => {
    const pressedScale = interpolate(pressSv.value, [0, 1], [1, THUMB_PRESSED_SCALE]);
    return {
      transform: [{ translateX: travel * progressSv.value }, { scale: pressedScale }],
    };
  }, [travel]);

  const checkedLabelAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: progressSv.value,
      transform: [{ translateX: interpolate(progressSv.value, [0, 1], [-labelShift, zeroPx]) }],
    };
  }, [labelShift, zeroPx]);

  const uncheckedLabelAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: 1 - progressSv.value,
      transform: [{ translateX: interpolate(progressSv.value, [0, 1], [zeroPx, labelShift]) }],
    };
  }, [labelShift, zeroPx]);

  const commitChecked = React.useCallback(
    (next: boolean) => {
      if (!isControlled) {
        progressSv.value = withTiming(next ? 1 : 0, valueTiming);
        setUncontrolledChecked(next);
      }
      onChange?.(next);
    },
    [isControlled, onChange, progressSv, valueTiming]
  );

  const handlePress = React.useCallback(
    (event: GestureResponderEvent) => {
      if (!interactive) return;
      commitChecked(!checked);
      onPress?.(event);
    },
    [checked, commitChecked, interactive, onPress]
  );

  const handlePressIn = React.useCallback(
    (event: GestureResponderEvent) => {
      if (!interactive) return;
      pressSv.value = withTiming(1, pressInTiming);
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

  const resolvedStyle = React.useCallback(
    (state: PressableStateCallbackType) => {
      const userStyle = typeof style === 'function' ? style(state) : style;
      return [styles.root, userStyle];
    },
    [style]
  );

  return (
    <Pressable
      {...pressableProps}
      testID={testID}
      accessibilityRole="switch"
      accessibilityState={{
        ...accessibilityState,
        checked,
        disabled: !interactive,
        busy: loading,
      }}
      disabled={!interactive}
      hitSlop={hitSlop ?? defaultHitSlop}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={resolvedStyle}
    >
      <Animated.View
        style={[
          styles.visual,
          {
            width: metrics.width,
            height: metrics.height,
            borderRadius: trackRadius,
          },
          containerAnimatedStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.track,
            {
              borderRadius: trackRadius,
            },
            trackAnimatedStyle,
            trackStyle,
          ]}
        />

        {hasLabels ? (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              styles.labels,
            ]}
          >
            <Animated.View
              style={[
                styles.labelLayer,
                styles.checkedLabelLayer,
                checkedLabelSlotStyle,
                checkedLabelAnimatedStyle,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.labelText,
                  {
                    color: resolvedCheckedLabelColor,
                    fontSize: metrics.fontSize,
                  },
                ]}
              >
                {checkedLabel ?? ''}
              </Text>
            </Animated.View>
            <Animated.View
              style={[
                styles.labelLayer,
                styles.uncheckedLabelLayer,
                uncheckedLabelSlotStyle,
                uncheckedLabelAnimatedStyle,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.labelText,
                  {
                    color: resolvedUncheckedLabelColor,
                    fontSize: metrics.fontSize,
                  },
                ]}
              >
                {uncheckedLabel ?? ''}
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
              left: resolvedThumbInset,
              top: resolvedThumbInset,
              borderRadius: thumbRadius,
              backgroundColor: resolvedThumbColor,
            },
            thumbAnimatedStyle,
            thumbShadowStyle,
            thumbStyle,
          ]}
        >
          {loading ? (
            <LoadingSpinner
              size={Math.max(wp(12), thumbSize * 0.58)}
              color={checked ? checkedTrackColor : theme.colors.muted}
            />
          ) : null}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
  },
  visual: {
    overflow: 'visible',
  },
  track: {
    ...StyleSheet.absoluteFillObject,
  },
  thumb: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.16,
  },
  labels: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedLabelLayer: {
    alignItems: 'flex-start',
  },
  uncheckedLabelLayer: {
    alignItems: 'flex-end',
  },
  labelText: {
    includeFontPadding: false,
    fontWeight: '600',
  },
});
