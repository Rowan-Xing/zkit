import * as React from 'react';
import { ColorSchemeName, Pressable, StyleProp, StyleSheet, useColorScheme, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { wp } from 'y2kit-tools';
import { useTheme } from '../../theme/useTheme';
import { LoadingSpinner } from '../LoadingSpinner';
import { Text } from '../Text';

type SwitchSize = 'small' | 'normal' | 'large';

function parsePx(value: number | string | undefined, fallback: number) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (trimmed.endsWith('px')) {
    const n = parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(n) ? n : fallback;
  }
  const n = parseFloat(trimmed);
  return Number.isFinite(n) ? n : fallback;
}

function resolveNamedColor(input: string | undefined, themePrimary: string) {
  if (!input) return undefined;
  const key = input.trim();
  if (!key) return undefined;
  if (key === 'primary') return themePrimary;
  if (key === 'danger') return '#F97316';
  if (key === 'success') return '#22C55E';
  if (key === 'error') return '#EF4444';
  if (key === 'info') return '#E5E7EB';
  return key;
}

function sizeToTrack(size: SwitchSize) {
  if (size === 'small') return { width: wp(44), height: wp(24), fontSize: wp(12) };
  if (size === 'large') return { width: wp(74), height: wp(40), fontSize: wp(14) };
  return { width: wp(58), height: wp(32), fontSize: wp(13) };
}

export type SwitchProps = Omit<
  React.ComponentPropsWithoutRef<typeof Pressable>,
  'style' | 'disabled' | 'onPressIn' | 'onPressOut' | 'onPress'
> & {
  color?: string;
  bgColor?: string;
  darkBgColor?: string;
  btnColor?: string;
  size?: SwitchSize;
  space?: number | string;

  value?: boolean;
  defaultValue?: boolean;
  onValueChange?: (next: boolean) => void;

  disabled?: boolean;
  loading?: boolean;
  label?: [string, string] | string[];
  round?: string | number;

  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Switch({
  color,
  bgColor = 'info',
  darkBgColor,
  btnColor = 'white',
  size = 'normal',
  space = '2px',
  value: valueProp,
  defaultValue = false,
  onValueChange,
  disabled = false,
  loading = false,
  label,
  round,
  style,
  testID,
  ...pressableProps
}: SwitchProps) {
  const theme = useTheme();
  const scheme: ColorSchemeName = useColorScheme();

  const isControlled = valueProp !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = React.useState<boolean>(defaultValue);
  const value = valueProp ?? uncontrolledValue;

  const track = React.useMemo(() => sizeToTrack(size), [size]);
  const padding = React.useMemo(() => parsePx(space, wp(2)), [space]);
  const trackRadius = React.useMemo(() => {
    const r = round === '' || round == null ? track.height / 2 : parsePx(round, track.height / 2);
    return Math.max(0, r);
  }, [round, track.height]);
  const knobSize = React.useMemo(() => Math.max(1, track.height - padding * 2), [padding, track.height]);
  const knobRadius = React.useMemo(() => Math.max(0, Math.min(knobSize / 2, trackRadius - padding)), [knobSize, padding, trackRadius]);
  const travel = React.useMemo(() => Math.max(0, track.width - knobSize - padding * 2), [knobSize, padding, track.width]);

  const activeColor = React.useMemo(
    () => resolveNamedColor(color, theme.colors.primary) ?? theme.colors.primary,
    [color, theme.colors.primary]
  );
  const inactiveColor = React.useMemo(() => {
    const isDark = scheme === 'dark';
    const raw = isDark ? darkBgColor : bgColor;
    return resolveNamedColor(raw, theme.colors.primary) ?? (isDark ? '#374151' : '#E5E7EB');
  }, [bgColor, darkBgColor, scheme, theme.colors.primary]);
  const knobColor = React.useMemo(() => resolveNamedColor(btnColor, theme.colors.primary) ?? btnColor, [btnColor, theme.colors.primary]);

  const enabled = !disabled && !loading;

  const progressSv = useSharedValue(value ? 1 : 0);
  const pressSv = useSharedValue(0);

  React.useEffect(() => {
    progressSv.value = withTiming(value ? 1 : 0, { duration: 180, easing: Easing.out(Easing.cubic) });
  }, [progressSv, value]);

  const trackAnimatedStyle = useAnimatedStyle(() => {
    const bg = interpolateColor(progressSv.value, [0, 1], [inactiveColor, activeColor]);
    const scale = interpolate(pressSv.value, [0, 1], [1, 0.98]);
    return {
      backgroundColor: bg,
      transform: [{ scale }],
    };
  }, [activeColor, inactiveColor]);

  const knobAnimatedStyle = useAnimatedStyle(() => {
    const x = travel * progressSv.value;
    return {
      transform: [{ translateX: x }],
    };
  }, [travel]);

  const labelOnStyle = useAnimatedStyle(() => ({ opacity: progressSv.value }), []);
  const labelOffStyle = useAnimatedStyle(() => ({ opacity: 1 - progressSv.value }), []);

  const labelPair = React.useMemo(() => {
    if (!label || label.length < 2) return null;
    return [String(label[0] ?? ''), String(label[1] ?? '')] as const;
  }, [label]);

  const setValue = React.useCallback(
    (next: boolean) => {
      onValueChange?.(next);
      if (!isControlled) setUncontrolledValue(next);
    },
    [isControlled, onValueChange]
  );

  const handlePress = React.useCallback(() => {
    if (!enabled) return;
    const next = !value;
    setValue(next);
  }, [enabled, setValue, value]);

  const rootOpacity = disabled ? 0.45 : 1;

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !enabled }}
      testID={testID}
      disabled={!enabled}
      onPress={handlePress}
      onPressIn={() => {
        pressSv.value = withTiming(1, { duration: 90, easing: Easing.out(Easing.cubic) });
      }}
      onPressOut={() => {
        pressSv.value = withTiming(0, { duration: 140, easing: Easing.out(Easing.cubic) });
      }}
      style={[{ opacity: loading ? 1 : rootOpacity }, style]}
      {...pressableProps}
    >
      <Animated.View
        style={[
          styles.track,
          {
            width: track.width,
            height: track.height,
            borderRadius: trackRadius,
            padding,
          },
          trackAnimatedStyle,
        ]}
      >
        {labelPair ? (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.labels, { paddingHorizontal: padding + wp(8) }]}>
            <Animated.View style={labelOnStyle}>
              <Text style={[styles.labelText, { fontSize: track.fontSize, color: theme.colors.onPrimary }]} numberOfLines={1}>
                {labelPair[0]}
              </Text>
            </Animated.View>
            <Animated.View style={labelOffStyle}>
              <Text style={[styles.labelText, { fontSize: track.fontSize, color: '#111827' }]} numberOfLines={1}>
                {labelPair[1]}
              </Text>
            </Animated.View>
          </View>
        ) : null}

        <Animated.View
          style={[
            styles.knob,
            {
              width: knobSize,
              height: knobSize,
              left: padding,
              top: padding,
              borderRadius: knobRadius,
              backgroundColor: knobColor,
            },
            knobAnimatedStyle,
          ]}
        >
          {loading ? (
            <LoadingSpinner size={Math.max(12, knobSize * 0.58)} color={value ? theme.colors.onPrimary : theme.colors.muted} />
          ) : null}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    justifyContent: 'center',
  },
  knob: {
    position: 'absolute',
    left: 0,
    top: 0,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  labels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelText: {
    includeFontPadding: false,
  },
});
