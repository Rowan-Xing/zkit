import * as React from 'react';
import type {
  ColorSchemeName,
  DimensionValue,
  GestureResponderEvent,
  Insets,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import {
  Platform,
  Pressable,
  StyleSheet,
  processColor,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { wp } from 'y2kit-tools';
import type { Theme } from '../../theme/types';
import { useTheme } from '../../theme/useTheme';
import { LoadingSpinner } from '../LoadingSpinner';
import { Text } from '../Text';

export type ButtonVariant = 'solid' | 'soft' | 'outline' | 'ghost' | 'link';
export type ButtonTone = 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
export type ButtonShape = 'rounded' | 'pill' | 'square';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ButtonIconPlacement = 'start' | 'end';
export type ButtonPressEffect =
  | 'auto'
  | 'none'
  | 'opacity'
  | 'scale'
  | 'highlight'
  | 'scale-highlight'
  | 'scale-opacity';
export type ButtonLoadingMode = 'inline' | 'overlay';
export type ButtonBorderStyle = 'solid' | 'dashed';
export type ButtonGradientDirection =
  | 'to right'
  | 'to left'
  | 'to bottom'
  | 'to top'
  | 'to bottom right'
  | 'to bottom left'
  | 'to top right'
  | 'to top left'
  | `${number}deg`;
export type ButtonGradientPoint = { x: number; y: number };
export type ButtonGradient = {
  colors: string[];
  direction?: ButtonGradientDirection;
  start?: ButtonGradientPoint;
  end?: ButtonGradientPoint;
};
export type ButtonShadowSize = 'none' | 'sm' | 'md' | 'lg';
export type ButtonShadowConfig = {
  color?: string;
  opacity?: number;
  radius?: number;
  offsetX?: number;
  offsetY?: number;
  elevation?: number;
};
export type ButtonShadow = ButtonShadowSize | ButtonShadowConfig;
export type ButtonBorder = {
  width?: number;
  style?: ButtonBorderStyle;
  color?: string;
};
export type ButtonLayout = {
  width?: DimensionValue;
  minWidth?: DimensionValue;
  maxWidth?: DimensionValue;
  height?: DimensionValue;
  minHeight?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  gap?: number;
  radius?: number;
  iconSize?: number;
  loadingSize?: number;
  textSize?: number;
  textLineHeight?: number;
};
export type ButtonColors = {
  color?: string;
  background?: string;
  text?: string;
  border?: string;
  disabledBackground?: string;
  disabledText?: string;
  disabledBorder?: string;
  loading?: string;
  pressedOverlay?: string;
};

type NativePressableProps = Omit<
  React.ComponentPropsWithoutRef<typeof Pressable>,
  'accessibilityRole' | 'accessibilityState' | 'children' | 'disabled' | 'style'
>;

export type ButtonRef = React.ComponentRef<typeof Pressable>;

export interface ButtonProps extends NativePressableProps {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
  shape?: ButtonShape;
  block?: boolean;
  disabled?: boolean;
  loading?: boolean;
  loadingMode?: ButtonLoadingMode;
  pressEffect?: ButtonPressEffect;

  icon?: React.ReactNode;
  iconPlacement?: ButtonIconPlacement;
  iconOnly?: boolean;

  color?: string;
  colors?: ButtonColors;
  border?: ButtonBorder;
  layout?: ButtonLayout;
  gradient?: ButtonGradient;
  shadow?: ButtonShadow;

  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityState?: React.ComponentPropsWithoutRef<typeof Pressable>['accessibilityState'];
}

type ButtonMetrics = {
  minHeight: number;
  paddingHorizontal: number;
  paddingVertical: number;
  gap: number;
  radius: number;
  iconOnlySide: number;
  iconSize: number;
  loadingSize: number;
  textSize: number;
  textLineHeight: number;
  borderWidth: number;
  linkPaddingVertical: number;
  minTouchTarget: number;
};

type TonePalette = {
  color: string;
  onColor: string;
};

type VisualColors = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  loadingColor: string;
};

type LinearGradientProps = {
  pointerEvents?: 'none';
  colors: string[];
  start?: ButtonGradientPoint;
  end?: ButtonGradientPoint;
  style?: StyleProp<ViewStyle>;
};

type LinearGradientConfig = {
  colors: string[];
  start?: ButtonGradientPoint;
  end?: ButtonGradientPoint;
};

type PressEffectFlags = {
  highlight: boolean;
  opacity: boolean;
  scale: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESS_TIMING = {
  duration: 120,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;
const LOADING_TIMING = {
  duration: 180,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

const DISABLED_OPACITY = 0.52;
const PRESSED_OPACITY = 0.82;
const PRESSED_SCALE = 0.985;

const SEMANTIC_COLORS: Record<string, string> = {
  danger: '#DC2626',
  error: '#DC2626',
  info: '#2563EB',
  success: '#16A34A',
  warn: '#D97706',
  warning: '#D97706',
};

const SIZE_TOKENS = {
  xs: {
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
    radius: 10,
    iconOnlySide: 32,
    iconSize: 15,
    loadingSize: 15,
    textSize: 13,
    textLineHeight: 18,
  },
  sm: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
    radius: 12,
    iconOnlySide: 36,
    iconSize: 16,
    loadingSize: 16,
    textSize: 14,
    textLineHeight: 19,
  },
  md: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    radius: 14,
    iconOnlySide: 44,
    iconSize: 18,
    loadingSize: 18,
    textSize: 15,
    textLineHeight: 21,
  },
  lg: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 9,
    radius: 16,
    iconOnlySide: 48,
    iconSize: 20,
    loadingSize: 20,
    textSize: 16,
    textLineHeight: 22,
  },
  xl: {
    minHeight: 56,
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 10,
    radius: 18,
    iconOnlySide: 56,
    iconSize: 22,
    loadingSize: 22,
    textSize: 17,
    textLineHeight: 24,
  },
} as const satisfies Record<
  ButtonSize,
  Omit<ButtonMetrics, 'borderWidth' | 'linkPaddingVertical' | 'minTouchTarget'>
>;

const GRADIENT_DIRECTIONS: Record<string, Pick<LinearGradientConfig, 'start' | 'end'>> = {
  'to bottom': { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } },
  'to bottom left': { start: { x: 1, y: 0 }, end: { x: 0, y: 1 } },
  'to bottom right': { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  'to left': { start: { x: 1, y: 0.5 }, end: { x: 0, y: 0.5 } },
  'to right': { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } },
  'to top': { start: { x: 0.5, y: 1 }, end: { x: 0.5, y: 0 } },
  'to top left': { start: { x: 1, y: 1 }, end: { x: 0, y: 0 } },
  'to top right': { start: { x: 0, y: 1 }, end: { x: 1, y: 0 } },
};

let cachedLinearGradientComponent: React.ComponentType<LinearGradientProps> | null | undefined;

function resolveMetrics(size: ButtonSize): ButtonMetrics {
  const token = SIZE_TOKENS[size] ?? SIZE_TOKENS.md;
  return {
    minHeight: wp(token.minHeight),
    paddingHorizontal: wp(token.paddingHorizontal),
    paddingVertical: wp(token.paddingVertical),
    gap: wp(token.gap),
    radius: wp(token.radius),
    iconOnlySide: wp(token.iconOnlySide),
    iconSize: wp(token.iconSize),
    loadingSize: wp(token.loadingSize),
    textSize: wp(token.textSize),
    textLineHeight: wp(token.textLineHeight),
    borderWidth: wp(1),
    linkPaddingVertical: wp(2),
    minTouchTarget: wp(44),
  };
}

function isPrimitiveTextChild(children: React.ReactNode): children is string | number {
  return typeof children === 'string' || typeof children === 'number';
}

function normalizeNumber(input: unknown) {
  if (typeof input === 'number') return Number.isFinite(input) ? input : undefined;
  if (typeof input !== 'string') return undefined;

  const value = input.trim();
  if (!value || value === 'auto' || value.endsWith('%')) return undefined;

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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

function resolveTonePalette(tone: ButtonTone, theme: Theme): TonePalette {
  if (tone === 'neutral') {
    return {
      color: theme.colors.onSurface,
      onColor: theme.colors.surface,
    };
  }

  if (tone === 'success') {
    return {
      color: SEMANTIC_COLORS.success,
      onColor: '#FFFFFF',
    };
  }

  if (tone === 'warning') {
    return {
      color: SEMANTIC_COLORS.warning,
      onColor: '#111827',
    };
  }

  if (tone === 'danger') {
    return {
      color: SEMANTIC_COLORS.danger,
      onColor: '#FFFFFF',
    };
  }

  if (tone === 'info') {
    return {
      color: SEMANTIC_COLORS.info,
      onColor: '#FFFFFF',
    };
  }

  return {
    color: theme.colors.primary,
    onColor: theme.colors.onPrimary,
  };
}

function degToVector(deg: number) {
  const rad = (deg * Math.PI) / 180;
  const x = Math.cos(rad);
  const y = Math.sin(rad);
  const len = Math.sqrt(x * x + y * y) || 1;
  return { x: x / len, y: y / len };
}

function parseGradient(gradient: ButtonGradient | undefined): LinearGradientConfig | undefined {
  if (!gradient || gradient.colors.length < 2) return undefined;

  const colors = gradient.colors.map((x) => String(x).trim()).filter(Boolean);
  if (colors.length < 2) return undefined;

  if (gradient.start || gradient.end) {
    return { colors, start: gradient.start, end: gradient.end };
  }

  const direction = gradient.direction?.toLowerCase();
  if (!direction) return { colors };

  if (direction.startsWith('to ')) {
    return { colors, ...GRADIENT_DIRECTIONS[direction] };
  }

  const deg = Number.parseFloat(direction.replace('deg', '').trim());
  if (!Number.isFinite(deg)) return { colors };

  const v = degToVector(deg);
  return {
    colors,
    start: { x: 0.5 - v.x * 0.5, y: 0.5 - v.y * 0.5 },
    end: { x: 0.5 + v.x * 0.5, y: 0.5 + v.y * 0.5 },
  };
}

function pickLinearGradientComponent() {
  if (cachedLinearGradientComponent !== undefined) return cachedLinearGradientComponent;

  try {
    const mod = require('expo-linear-gradient') as {
      LinearGradient?: React.ComponentType<LinearGradientProps>;
    };
    cachedLinearGradientComponent = mod.LinearGradient ?? null;
  } catch {
    cachedLinearGradientComponent = null;
  }

  return cachedLinearGradientComponent;
}

function resolveShadowStyle(
  shadow: ButtonShadow | undefined,
  scheme: ColorSchemeName,
  variant: ButtonVariant
): ViewStyle | undefined {
  if (!shadow || shadow === 'none' || variant === 'ghost' || variant === 'link') return undefined;

  if (typeof shadow === 'object') {
    const radius = Math.max(0, shadow.radius ?? wp(10));
    return {
      shadowColor: shadow.color ?? '#000000',
      shadowOffset: {
        width: shadow.offsetX ?? 0,
        height: shadow.offsetY ?? wp(3),
      },
      shadowOpacity: shadow.opacity ?? (scheme === 'dark' ? 0.28 : 0.14),
      shadowRadius: radius,
      elevation: shadow.elevation ?? Math.max(0, Math.round(radius * 0.55)),
    };
  }

  const level = shadow === 'sm' ? 1 : shadow === 'md' ? 2 : shadow === 'lg' ? 3 : 0;
  if (level <= 0) return undefined;

  const radius = wp(level * 5 + 3);
  return {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: wp(level + 1) },
    shadowOpacity: scheme === 'dark' ? 0.26 : 0.14,
    shadowRadius: radius,
    elevation: Math.max(0, Math.round(radius * 0.55)),
  };
}

function resolveVisualColors({
  accentColor,
  colors,
  gradientCfg,
  hasGradientBackground,
  palette,
  theme,
  variant,
  visualDisabled,
}: {
  accentColor: string;
  colors?: ButtonColors;
  gradientCfg?: LinearGradientConfig;
  hasGradientBackground: boolean;
  palette: TonePalette;
  theme: Theme;
  variant: ButtonVariant;
  visualDisabled: boolean;
}): VisualColors {
  const fallbackGradientColor = resolveColorToken(gradientCfg?.colors[0], accentColor, theme);
  const solidBackground = gradientCfg ? fallbackGradientColor : accentColor;
  const softBackground = colorToRgba(accentColor, 0.12) ?? theme.colors.secondary;
  const softBorder = colorToRgba(accentColor, 0.2) ?? theme.colors.border;

  let backgroundColor = 'transparent';
  let borderColor = 'transparent';
  let textColor = accentColor;

  if (variant === 'solid') {
    backgroundColor = solidBackground;
    textColor = palette.onColor;
  } else if (variant === 'soft') {
    backgroundColor = softBackground;
    borderColor = softBorder;
  } else if (variant === 'outline') {
    borderColor = accentColor;
  }

  backgroundColor = colors?.background ?? backgroundColor;
  borderColor = colors?.border ?? borderColor;
  textColor = colors?.text ?? textColor;

  if (hasGradientBackground) {
    backgroundColor = 'transparent';
    borderColor = colors?.border ?? 'transparent';
    textColor = colors?.text ?? palette.onColor;
  }

  if (visualDisabled) {
    const disabledBackground =
      variant === 'solid' || variant === 'soft' ? theme.colors.secondary : 'transparent';
    backgroundColor = colors?.disabledBackground ?? disabledBackground;
    borderColor = colors?.disabledBorder ?? (variant === 'outline' ? theme.colors.border : borderColor);
    textColor = colors?.disabledText ?? theme.colors.disabled;
  }

  return {
    backgroundColor,
    borderColor,
    textColor,
    loadingColor: colors?.loading ?? textColor,
  };
}

function resolvePressEffect(effect: ButtonPressEffect, interactionDisabled: boolean): ButtonPressEffect {
  if (interactionDisabled) return 'none';
  if (effect !== 'auto') return effect;
  return 'scale-opacity';
}

function resolvePressEffectFlags(effect: ButtonPressEffect): PressEffectFlags {
  return {
    highlight: effect === 'highlight' || effect === 'scale-highlight',
    opacity: effect === 'opacity' || effect === 'scale-opacity',
    scale: effect === 'scale' || effect === 'scale-highlight' || effect === 'scale-opacity',
  };
}

function resolveOverlay({
  accentColor,
  colors,
  hasGradientBackground,
  variant,
}: {
  accentColor: string;
  colors?: ButtonColors;
  hasGradientBackground: boolean;
  variant: ButtonVariant;
}) {
  if (colors?.pressedOverlay) {
    return { color: colors.pressedOverlay, strength: 0.12 };
  }

  if (variant === 'solid' || hasGradientBackground) {
    return { color: '#000000', strength: 0.1 };
  }

  if (variant === 'soft') {
    return { color: '#000000', strength: 0.06 };
  }

  return { color: accentColor, strength: 0.1 };
}

function resolveRootSizeStyle({
  block,
  iconOnly,
  layout,
  metrics,
  variant,
}: {
  block: boolean;
  iconOnly: boolean;
  layout?: ButtonLayout;
  metrics: ButtonMetrics;
  variant: ButtonVariant;
}): ViewStyle {
  const width = layout?.width ?? (block ? '100%' : undefined);
  const height = layout?.height;
  const iconSide = normalizeNumber(width) ?? normalizeNumber(height) ?? metrics.iconOnlySide;

  if (iconOnly) {
    return {
      ...(width !== undefined ? { width } : { width: iconSide }),
      ...(height !== undefined ? { height } : { height: iconSide }),
      ...(layout?.minWidth !== undefined ? { minWidth: layout.minWidth } : undefined),
      ...(layout?.maxWidth !== undefined ? { maxWidth: layout.maxWidth } : undefined),
    };
  }

  return {
    ...(width !== undefined ? { width } : undefined),
    ...(height !== undefined ? { height } : undefined),
    ...(layout?.minWidth !== undefined ? { minWidth: layout.minWidth } : undefined),
    ...(layout?.maxWidth !== undefined ? { maxWidth: layout.maxWidth } : undefined),
    ...(layout?.minHeight !== undefined
      ? { minHeight: layout.minHeight }
      : variant === 'link'
        ? undefined
        : { minHeight: metrics.minHeight }),
  };
}

function resolveContentSizeStyle(rootSizeStyle: ViewStyle, iconOnly: boolean): ViewStyle {
  const nextStyle: ViewStyle = {};

  if (iconOnly || rootSizeStyle.width !== undefined) nextStyle.width = '100%';
  if (iconOnly || rootSizeStyle.height !== undefined) nextStyle.height = '100%';
  else if (rootSizeStyle.minHeight !== undefined) nextStyle.minHeight = rootSizeStyle.minHeight;

  return nextStyle;
}

function resolveSideLength(rootSizeStyle: ViewStyle, iconOnly: boolean, layout: ButtonLayout | undefined, metrics: ButtonMetrics) {
  const height = normalizeNumber(rootSizeStyle.height);
  if (height != null) return height;
  if (iconOnly) return normalizeNumber(rootSizeStyle.width) ?? metrics.iconOnlySide;
  return layout?.minHeight ?? metrics.minHeight;
}

function resolveRadiusStyle({
  iconOnly,
  layout,
  metrics,
  rootSizeStyle,
  shape,
}: {
  iconOnly: boolean;
  layout?: ButtonLayout;
  metrics: ButtonMetrics;
  rootSizeStyle: ViewStyle;
  shape: ButtonShape;
}): ViewStyle {
  if (shape === 'square') return { borderRadius: 0 };

  if (shape === 'pill') {
    const radius = resolveSideLength(rootSizeStyle, iconOnly, layout, metrics) / 2;
    return {
      borderBottomLeftRadius: radius,
      borderBottomRightRadius: radius,
      borderRadius: radius,
      borderTopLeftRadius: radius,
      borderTopRightRadius: radius,
    };
  }

  return { borderRadius: layout?.radius ?? metrics.radius };
}

function resolvePaddingStyle({
  iconOnly,
  layout,
  metrics,
  variant,
}: {
  iconOnly: boolean;
  layout?: ButtonLayout;
  metrics: ButtonMetrics;
  variant: ButtonVariant;
}): ViewStyle {
  if (iconOnly) return {};

  if (variant === 'link') {
    return {
      paddingHorizontal: 0,
      paddingVertical: layout?.paddingVertical ?? metrics.linkPaddingVertical,
    };
  }

  return {
    paddingHorizontal: layout?.paddingHorizontal ?? metrics.paddingHorizontal,
    paddingVertical: layout?.paddingVertical ?? metrics.paddingVertical,
  };
}

function resolveBorderStyle({
  border,
  metrics,
  theme,
  visualColors,
  variant,
}: {
  border?: ButtonBorder;
  metrics: ButtonMetrics;
  theme: Theme;
  visualColors: VisualColors;
  variant: ButtonVariant;
}): ViewStyle {
  const defaultBorderWidth = variant === 'outline' ? metrics.borderWidth : undefined;
  const width = border?.width ?? defaultBorderWidth;
  if (width == null) return {};

  return {
    borderColor:
      border?.color ??
      (visualColors.borderColor === 'transparent' ? theme.colors.border : visualColors.borderColor),
    borderStyle: border?.style ?? 'solid',
    borderWidth: width,
  };
}

function resolveDefaultHitSlop({
  iconOnly,
  layout,
  metrics,
  rootSizeStyle,
  variant,
}: {
  iconOnly: boolean;
  layout?: ButtonLayout;
  metrics: ButtonMetrics;
  rootSizeStyle: ViewStyle;
  variant: ButtonVariant;
}): Insets | undefined {
  if (variant === 'link') {
    const visualHeight =
      (layout?.textLineHeight ?? metrics.textLineHeight) +
      (layout?.paddingVertical ?? metrics.linkPaddingVertical) * 2;
    const vertical = Math.max(wp(6), (metrics.minTouchTarget - visualHeight) / 2);

    return {
      bottom: vertical,
      left: wp(8),
      right: wp(8),
      top: vertical,
    };
  }

  const side = resolveSideLength(rootSizeStyle, iconOnly, layout, metrics);
  const slop = Math.max(0, (metrics.minTouchTarget - side) / 2);
  if (slop <= 0) return undefined;

  return {
    bottom: slop,
    left: iconOnly ? slop : 0,
    right: iconOnly ? slop : 0,
    top: slop,
  };
}

function resolveIconBoxStyle(visible: boolean, iconSize: number): ViewStyle {
  if (!visible) return {};

  return {
    alignItems: 'center',
    height: iconSize,
    justifyContent: 'center',
    overflow: 'hidden',
  };
}

function resolveWebCursorStyle(disabled: boolean): ViewStyle | undefined {
  if (Platform.OS !== 'web') return undefined;
  return { cursor: disabled ? 'not-allowed' : 'pointer' } as ViewStyle;
}

function ButtonImpl(
  {
    variant = 'solid',
    tone = 'primary',
    size = 'md',
    shape = 'rounded',
    block = false,
    disabled = false,
    loading = false,
    loadingMode = 'inline',
    pressEffect = 'auto',
    icon,
    iconPlacement = 'start',
    iconOnly = false,
    color,
    colors,
    border,
    layout,
    gradient,
    shadow = 'none',
    children,
    style,
    contentStyle,
    textStyle,
    accessibilityLabel,
    accessibilityState,
    hitSlop,
    onPress,
    onPressIn,
    onPressOut,
    testID,
    ...pressableProps
  }: ButtonProps,
  ref: React.ForwardedRef<ButtonRef>
) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { width: viewportWidth } = useWindowDimensions();

  const metrics = React.useMemo(() => resolveMetrics(size), [size, viewportWidth]);
  const palette = React.useMemo(() => resolveTonePalette(tone, theme), [theme, tone]);
  const accentColor = React.useMemo(
    () => resolveColorToken(color ?? colors?.color, palette.color, theme),
    [color, colors?.color, palette.color, theme]
  );

  const gradientCfg = React.useMemo(() => parseGradient(gradient), [gradient]);
  const LinearGradientComponent = React.useMemo(
    () => (variant === 'solid' && gradientCfg ? (pickLinearGradientComponent() ?? undefined) : undefined),
    [gradientCfg, variant]
  );
  const hasGradientBackground = Boolean(variant === 'solid' && gradientCfg && LinearGradientComponent);

  const interactionDisabled = disabled || loading;
  const visualDisabled = disabled;
  const resolvedLoadingMode = iconOnly ? 'overlay' : loadingMode;
  const centeredLoading = resolvedLoadingMode !== 'inline';

  const visualColors = React.useMemo(
    () =>
      resolveVisualColors({
        accentColor,
        colors,
        gradientCfg,
        hasGradientBackground,
        palette,
        theme,
        variant,
        visualDisabled,
      }),
    [accentColor, colors, gradientCfg, hasGradientBackground, palette, theme, variant, visualDisabled]
  );

  const rootSizeStyle = React.useMemo(
    () =>
      resolveRootSizeStyle({
        block,
        iconOnly,
        layout,
        metrics,
        variant,
      }),
    [block, iconOnly, layout, metrics, variant]
  );
  const contentSizeStyle = React.useMemo(
    () => resolveContentSizeStyle(rootSizeStyle, iconOnly),
    [iconOnly, rootSizeStyle]
  );
  const radiusStyle = React.useMemo(
    () =>
      resolveRadiusStyle({
        iconOnly,
        layout,
        metrics,
        rootSizeStyle,
        shape,
      }),
    [iconOnly, layout, metrics, rootSizeStyle, shape]
  );
  const paddingStyle = React.useMemo(
    () =>
      resolvePaddingStyle({
        iconOnly,
        layout,
        metrics,
        variant,
      }),
    [iconOnly, layout, metrics, variant]
  );
  const borderStyle = React.useMemo(
    () =>
      resolveBorderStyle({
        border,
        metrics,
        theme,
        visualColors,
        variant,
      }),
    [border, metrics, theme, variant, visualColors]
  );
  const shadowStyle = React.useMemo(() => resolveShadowStyle(shadow, scheme, variant), [scheme, shadow, variant]);
  const webCursorStyle = React.useMemo(
    () => resolveWebCursorStyle(interactionDisabled),
    [interactionDisabled]
  );
  const defaultHitSlop = React.useMemo(
    () =>
      resolveDefaultHitSlop({
        iconOnly,
        layout,
        metrics,
        rootSizeStyle,
        variant,
      }),
    [iconOnly, layout, metrics, rootSizeStyle, variant]
  );

  const resolvedText = React.useMemo(() => {
    if (children == null) return null;
    if (!isPrimitiveTextChild(children)) return children;

    return (
      <Text
        numberOfLines={1}
        style={[
          styles.text,
          {
            color: visualColors.textColor,
            fontSize: layout?.textSize ?? metrics.textSize,
            lineHeight: layout?.textLineHeight ?? metrics.textLineHeight,
          },
          variant === 'link' ? styles.linkText : null,
          textStyle,
        ]}
      >
        {children}
      </Text>
    );
  }, [
    children,
    layout?.textLineHeight,
    layout?.textSize,
    metrics.textLineHeight,
    metrics.textSize,
    textStyle,
    variant,
    visualColors.textColor,
  ]);

  const hasText = resolvedText != null;
  const hasIcon = icon != null;
  const iconSize = layout?.iconSize ?? metrics.iconSize;
  const loadingSize = layout?.loadingSize ?? metrics.loadingSize;
  const contentGap = layout?.gap ?? metrics.gap;
  const iconBaseBoxStyle = React.useMemo(() => resolveIconBoxStyle(hasIcon, iconSize), [hasIcon, iconSize]);
  const iconPlacedBoxStyle = React.useMemo((): ViewStyle => {
    if (!hasIcon) return {};
    const gap = hasText ? contentGap : 0;
    return {
      width: iconSize,
      ...(iconPlacement === 'end' ? { marginLeft: gap } : { marginRight: gap }),
    };
  }, [contentGap, hasIcon, hasText, iconPlacement, iconSize]);

  const inferredAccessibilityLabel =
    iconOnly && isPrimitiveTextChild(children) ? String(children) : undefined;
  const resolvedAccessibilityLabel = accessibilityLabel ?? inferredAccessibilityLabel;

  const pressSv = useSharedValue(0);
  const loadingSv = useSharedValue(loading ? 1 : 0);
  const [spinnerMounted, setSpinnerMounted] = React.useState(loading);
  const hideSpinnerTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolvedPressEffect = React.useMemo(
    () => resolvePressEffect(pressEffect, interactionDisabled),
    [interactionDisabled, pressEffect]
  );
  const pressEffectFlags = React.useMemo(
    () => resolvePressEffectFlags(resolvedPressEffect),
    [resolvedPressEffect]
  );
  const pressHighlightEnabled = pressEffectFlags.highlight;
  const pressOpacityEnabled = pressEffectFlags.opacity;
  const pressScaleEnabled = pressEffectFlags.scale;
  const pressOverlay = React.useMemo(
    () =>
      resolveOverlay({
        accentColor,
        colors,
        hasGradientBackground,
        variant,
      }),
    [accentColor, colors, hasGradientBackground, variant]
  );

  React.useEffect(() => {
    if (interactionDisabled || resolvedPressEffect === 'none') {
      pressSv.value = 0;
    }
  }, [interactionDisabled, pressSv, resolvedPressEffect]);

  React.useEffect(() => {
    if (hideSpinnerTimerRef.current) {
      clearTimeout(hideSpinnerTimerRef.current);
      hideSpinnerTimerRef.current = null;
    }

    if (loading) {
      setSpinnerMounted(true);
    }

    loadingSv.value = withTiming(loading ? 1 : 0, LOADING_TIMING);

    if (!loading) {
      hideSpinnerTimerRef.current = setTimeout(() => {
        setSpinnerMounted(false);
      }, LOADING_TIMING.duration);
    }

    return () => {
      if (hideSpinnerTimerRef.current) {
        clearTimeout(hideSpinnerTimerRef.current);
        hideSpinnerTimerRef.current = null;
      }
    };
  }, [loading, loadingSv]);

  const rootAnimatedStyle = useAnimatedStyle(() => {
    const baseOpacity = visualDisabled ? DISABLED_OPACITY : 1;
    const scale = pressScaleEnabled
      ? interpolate(pressSv.value, [0, 1], [1, PRESSED_SCALE])
      : 1;
    const opacity = pressOpacityEnabled
      ? interpolate(pressSv.value, [0, 1], [baseOpacity, PRESSED_OPACITY])
      : baseOpacity;

    return {
      opacity,
      transform: [{ scale }],
    };
  }, [pressOpacityEnabled, pressScaleEnabled, visualDisabled]);

  const overlayAnimatedStyle = useAnimatedStyle(() => {
    const opacity = pressHighlightEnabled
      ? interpolate(pressSv.value, [0, 1], [0, pressOverlay.strength])
      : 0;
    return { opacity };
  }, [pressHighlightEnabled, pressOverlay.strength]);

  const inlineSpinnerAnimatedStyle = useAnimatedStyle(() => {
    const width = interpolate(loadingSv.value, [0, 1], [0, loadingSize]);
    const marginRight = interpolate(loadingSv.value, [0, 1], [0, hasText ? contentGap : 0]);
    const opacity = interpolate(loadingSv.value, [0, 1], [0, 1]);
    const scale = interpolate(loadingSv.value, [0, 1], [0.92, 1]);

    return {
      marginRight,
      opacity,
      transform: [{ scale }],
      width,
    };
  }, [contentGap, hasText, loadingSize, loadingSv]);

  const centeredSpinnerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(loadingSv.value, [0, 1], [0, 1]);
    const scale = interpolate(loadingSv.value, [0, 1], [0.92, 1]);
    return {
      opacity,
      transform: [{ scale }],
    };
  }, [loadingSv]);

  const iconAnimatedStyle = useAnimatedStyle(() => {
    if (!hasIcon || iconOnly) return { opacity: 0, width: 0 };

    const margin = interpolate(loadingSv.value, [0, 1], [hasText ? contentGap : 0, 0]);
    const opacity = interpolate(loadingSv.value, [0, 1], [1, 0]);
    const scale = interpolate(loadingSv.value, [0, 1], [1, 0.92]);
    const width = interpolate(loadingSv.value, [0, 1], [iconSize, 0]);

    return {
      opacity,
      transform: [{ scale }],
      width,
      ...(iconPlacement === 'end' ? { marginLeft: margin } : { marginRight: margin }),
    };
  }, [contentGap, hasIcon, hasText, iconOnly, iconPlacement, iconSize, loadingSv]);

  const contentAnimatedStyle = useAnimatedStyle(() => {
    if (centeredLoading || iconOnly) {
      const opacity = interpolate(loadingSv.value, [0, 1], [1, 0]);
      const scale = interpolate(loadingSv.value, [0, 1], [1, 0.98]);
      return { opacity, transform: [{ scale }] };
    }

    const translateX = interpolate(loadingSv.value, [0, 1], [0, metrics.linkPaddingVertical]);
    return { transform: [{ translateX }] };
  }, [centeredLoading, iconOnly, loadingSv, metrics.linkPaddingVertical]);

  const spinnerVisible = loading || spinnerMounted;
  const showContent = !iconOnly;

  const handlePress = React.useCallback(
    (event: GestureResponderEvent) => {
      if (interactionDisabled) return;
      onPress?.(event);
    },
    [interactionDisabled, onPress]
  );

  const handlePressIn = React.useCallback(
    (event: GestureResponderEvent) => {
      if (!interactionDisabled && resolvedPressEffect !== 'none') {
        pressSv.value = withTiming(1, PRESS_TIMING);
      }
      onPressIn?.(event);
    },
    [interactionDisabled, onPressIn, pressSv, resolvedPressEffect]
  );

  const handlePressOut = React.useCallback(
    (event: GestureResponderEvent) => {
      if (!interactionDisabled && resolvedPressEffect !== 'none') {
        pressSv.value = withTiming(0, PRESS_TIMING);
      }
      onPressOut?.(event);
    },
    [interactionDisabled, onPressOut, pressSv, resolvedPressEffect]
  );

  return (
    <AnimatedPressable
      {...pressableProps}
      ref={ref}
      accessibilityLabel={resolvedAccessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{
        ...accessibilityState,
        busy: Boolean(loading || accessibilityState?.busy),
        disabled: Boolean(interactionDisabled || accessibilityState?.disabled),
      }}
      disabled={interactionDisabled}
      hitSlop={hitSlop ?? defaultHitSlop}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.root, rootSizeStyle, radiusStyle, shadowStyle, rootAnimatedStyle, webCursorStyle, style]}
      testID={testID}
    >
      <View
        pointerEvents="none"
        style={[
          styles.content,
          contentSizeStyle,
          paddingStyle,
          radiusStyle,
          borderStyle,
          { backgroundColor: visualColors.backgroundColor },
          contentStyle,
        ]}
      >
        {LinearGradientComponent && gradientCfg ? (
          <LinearGradientComponent
            pointerEvents="none"
            colors={gradientCfg.colors}
            start={gradientCfg.start}
            end={gradientCfg.end}
            style={[StyleSheet.absoluteFillObject, radiusStyle]}
          />
        ) : null}

        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            radiusStyle,
            { backgroundColor: pressOverlay.color },
            overlayAnimatedStyle,
          ]}
        />

        {iconOnly ? (
          <>
            <Animated.View style={[styles.centerOverlay, centeredSpinnerAnimatedStyle]}>
              {spinnerVisible ? (
                <LoadingSpinner
                  animating={spinnerVisible}
                  color={visualColors.loadingColor}
                  size={loadingSize}
                />
              ) : null}
            </Animated.View>
            {icon ?? resolvedText ? (
              <Animated.View style={contentAnimatedStyle}>{icon ?? resolvedText}</Animated.View>
            ) : null}
          </>
        ) : centeredLoading ? (
          <>
            <Animated.View style={[styles.centerContent, contentAnimatedStyle]}>
              {icon && iconPlacement === 'start' ? (
                <View style={[iconBaseBoxStyle, iconPlacedBoxStyle]}>{icon}</View>
              ) : null}
              {showContent ? resolvedText : null}
              {icon && iconPlacement === 'end' ? (
                <View style={[iconBaseBoxStyle, iconPlacedBoxStyle]}>{icon}</View>
              ) : null}
            </Animated.View>
            <Animated.View style={[styles.centerOverlay, centeredSpinnerAnimatedStyle]}>
              {spinnerVisible ? (
                <LoadingSpinner
                  animating={spinnerVisible}
                  color={visualColors.loadingColor}
                  size={loadingSize}
                />
              ) : null}
            </Animated.View>
          </>
        ) : (
          <>
            <Animated.View style={[styles.spinnerBox, { height: loadingSize }, inlineSpinnerAnimatedStyle]}>
              {spinnerVisible ? (
                <LoadingSpinner
                  animating={spinnerVisible}
                  color={visualColors.loadingColor}
                  size={loadingSize}
                />
              ) : null}
            </Animated.View>

            {icon && iconPlacement === 'start' ? (
              <Animated.View style={[iconBaseBoxStyle, iconAnimatedStyle]}>{icon}</Animated.View>
            ) : null}

            {resolvedText ? <Animated.View style={contentAnimatedStyle}>{resolvedText}</Animated.View> : null}

            {icon && iconPlacement === 'end' ? (
              <Animated.View style={[iconBaseBoxStyle, iconAnimatedStyle]}>{icon}</Animated.View>
            ) : null}
          </>
        )}
      </View>
    </AnimatedPressable>
  );
}

const ButtonWithRef = React.forwardRef<ButtonRef, ButtonProps>(ButtonImpl);
ButtonWithRef.displayName = 'Button';

export const Button = React.memo(ButtonWithRef);
Button.displayName = 'Button';

const styles = StyleSheet.create({
  centerContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  centerOverlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  linkText: {
    textDecorationLine: 'underline',
  },
  root: {},
  spinnerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: {
    flexShrink: 1,
    fontWeight: '600',
    letterSpacing: 0,
    textAlign: 'center',
  },
});
