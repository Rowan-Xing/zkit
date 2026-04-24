import * as React from 'react';
import type {
  ColorSchemeName,
  DimensionValue,
  GestureResponderEvent,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import {
  Pressable,
  StyleSheet,
  processColor,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/useTheme';
import { LoadingSpinner } from '../LoadingSpinner';
import { Text } from '../Text';

export type ButtonVariant = 'solid' | 'soft' | 'outline' | 'ghost' | 'link';
export type ButtonTone = 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
export type ButtonShape = 'rounded' | 'pill' | 'square';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonPressEffect =
  | 'auto'
  | 'none'
  | 'opacity'
  | 'scale'
  | 'darken'
  | 'scale-darken'
  | 'scale-opacity';
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

type ButtonSizeConfig = {
  minHeight: number;
  paddingHorizontal: number;
  paddingVertical: number;
  fontSize: number;
  gap: number;
  radius: number;
  iconOnlySide: number;
  iconSize: number;
  loadingSize: number;
};

type ButtonSizeConfigToken = ButtonSizeConfig;

type ButtonMetrics = {
  metricScale: number;
  sizeConfig: ButtonSizeConfig;
  outlineBorderWidth: number;
  linkMinPaddingY: number;
  loadingTextShift: number;
};

type ResolvedTonePalette = {
  baseColor: string;
  solidTextColor: string;
};

type NativePressableProps = Omit<
  React.ComponentPropsWithoutRef<typeof Pressable>,
  'style' | 'children' | 'disabled'
>;

export type ButtonRef = React.ComponentRef<typeof Pressable>;

export interface ButtonProps extends NativePressableProps {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  shape?: ButtonShape;
  size?: ButtonSize;
  pressEffect?: ButtonPressEffect;

  borderWidth?: number;
  borderStyle?: ButtonBorderStyle;
  radius?: number;

  width?: DimensionValue;
  height?: DimensionValue;
  minHeight?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  gap?: number;
  block?: boolean;
  disabled?: boolean;

  icon?: React.ReactNode;
  iconSize?: number;
  iconPosition?: 'start' | 'end';
  iconOnly?: boolean;

  loading?: boolean;
  loadingSize?: number;
  fontSize?: number;

  /**
   * 颜色优先级：
   * 1) 显式 backgroundColor/textColor 等覆盖
   * 2) color
   * 3) tone
   * 4) theme
   */
  color?: string;
  backgroundColor?: string;
  textColor?: string;
  disabledBackgroundColor?: string;
  disabledTextColor?: string;
  disabledBorderColor?: string;

  gradient?: ButtonGradient;
  shadow?: ButtonShadow;

  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonVisualColors = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

type PressEffectFlags = {
  darken: boolean;
  scale: boolean;
  opacity: boolean;
};

type LinearGradientProps = {
  pointerEvents?: 'none';
  colors: string[];
  start?: ButtonGradientPoint;
  end?: ButtonGradientPoint;
  style?: StyleProp<ViewStyle>;
};

const PRESS_TIMING = { duration: 140, easing: Easing.out(Easing.cubic) } as const;
const LOADING_TIMING = { duration: 200, easing: Easing.out(Easing.cubic) } as const;
const DISABLED_OPACITY = 0.55;
const PRESSED_OPACITY = 0.84;
const PRESSED_SCALE = 0.98;
const BASE_SCREEN_WIDTH = 375;
const MIN_TOUCH_TARGET = 44;
const LINK_TOUCH_SLOP_X = 8;
const LINK_TOUCH_SLOP_Y = 6;

const SEMANTIC_COLORS: Record<string, string> = {
  warn: '#F59E0B',
  warning: '#F59E0B',
  error: '#EF4444',
  success: '#22C55E',
  danger: '#DC2626',
  info: '#3B82F6',
};

const SIZE_TOKENS: Record<ButtonSize, ButtonSizeConfigToken> = {
  sm: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 14,
    gap: 6,
    radius: 12,
    iconOnlySide: 36,
    iconSize: 16,
    loadingSize: 16,
  },
  md: {
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 9,
    fontSize: 16,
    gap: 8,
    radius: 14,
    iconOnlySide: 46,
    iconSize: 18,
    loadingSize: 20,
  },
  lg: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 11,
    fontSize: 17,
    gap: 10,
    radius: 16,
    iconOnlySide: 52,
    iconSize: 20,
    loadingSize: 22,
  },
};

function resolveMetricScale(windowWidth: number) {
  if (!Number.isFinite(windowWidth) || windowWidth <= 0) return 1;
  return windowWidth / BASE_SCREEN_WIDTH;
}

function scaleMetric(size: number, scale: number) {
  return size * scale;
}

function resolveButtonMetrics(
  size: ButtonSize | undefined,
  windowWidth: number
): ButtonMetrics {
  const scale = resolveMetricScale(windowWidth);
  const token = SIZE_TOKENS[size ?? 'md'] ?? SIZE_TOKENS.md;

  return {
    metricScale: scale,
    sizeConfig: {
      minHeight: scaleMetric(token.minHeight, scale),
      paddingHorizontal: scaleMetric(token.paddingHorizontal, scale),
      paddingVertical: scaleMetric(token.paddingVertical, scale),
      fontSize: scaleMetric(token.fontSize, scale),
      gap: scaleMetric(token.gap, scale),
      radius: scaleMetric(token.radius, scale),
      iconOnlySide: scaleMetric(token.iconOnlySide, scale),
      iconSize: scaleMetric(token.iconSize, scale),
      loadingSize: scaleMetric(token.loadingSize, scale),
    },
    outlineBorderWidth: scaleMetric(1.5, scale),
    linkMinPaddingY: scaleMetric(2, scale),
    loadingTextShift: scaleMetric(2, scale),
  };
}

function normalizeNumber(input: unknown) {
  if (typeof input === 'number') return Number.isFinite(input) ? input : undefined;
  if (typeof input === 'string') {
    const s = input.trim();
    if (s === '' || s === 'auto') return undefined;
    if (s.endsWith('%')) return undefined;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function pickRgbaFromColor(inputColor: string, alpha: number) {
  const intColor = processColor(inputColor);
  if (typeof intColor !== 'number') return undefined;
  const normalized = intColor >>> 0;
  const r = (normalized >> 16) & 255;
  const g = (normalized >> 8) & 255;
  const b = normalized & 255;
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r},${g},${b},${a})`;
}

function resolveColorToken(token: string | undefined, fallback: string) {
  if (!token) return fallback;
  const raw = String(token).trim();
  return SEMANTIC_COLORS[raw] ?? raw;
}

function isPrimitiveTextChild(children: React.ReactNode): children is string | number {
  return typeof children === 'string' || typeof children === 'number';
}

function resolveTonePalette(
  tone: ButtonTone | undefined,
  theme: ReturnType<typeof useTheme>
): ResolvedTonePalette {
  if (tone === 'neutral') {
    return {
      baseColor: theme.colors.onSurface,
      solidTextColor: theme.colors.surface,
    };
  }

  if (tone === 'success') {
    return {
      baseColor: SEMANTIC_COLORS.success,
      solidTextColor: '#FFFFFF',
    };
  }

  if (tone === 'warning') {
    return {
      baseColor: SEMANTIC_COLORS.warning,
      solidTextColor: '#111827',
    };
  }

  if (tone === 'danger') {
    return {
      baseColor: SEMANTIC_COLORS.danger,
      solidTextColor: '#FFFFFF',
    };
  }

  if (tone === 'info') {
    return {
      baseColor: SEMANTIC_COLORS.info,
      solidTextColor: '#FFFFFF',
    };
  }

  return {
    baseColor: theme.colors.primary,
    solidTextColor: theme.colors.onPrimary,
  };
}

function resolveShadowStyle(
  shadow: ButtonProps['shadow'],
  scheme: ColorSchemeName,
  variant: ButtonVariant,
  metricScale: number
): ViewStyle | undefined {
  if (shadow === 'none') return { elevation: 0, shadowOpacity: 0 };
  if (variant === 'ghost' || variant === 'link') return undefined;

  const preset = typeof shadow === 'string' ? shadow : undefined;
  const presetLevel = preset === 'sm' ? 1 : preset === 'md' ? 2 : preset === 'lg' ? 3 : 0;

  if (typeof shadow === 'object' && shadow != null) {
    const radius = Math.max(0, shadow.radius ?? scaleMetric(8, metricScale));
    return {
      shadowColor: shadow.color ?? '#000000',
      shadowOffset: {
        width: shadow.offsetX ?? 0,
        height: shadow.offsetY ?? scaleMetric(2, metricScale),
      },
      shadowRadius: radius,
      shadowOpacity: shadow.opacity ?? (scheme === 'dark' ? 0.25 : 0.16),
      elevation: shadow.elevation ?? Math.max(0, Math.round(radius * 0.6)),
    };
  }

  if (presetLevel <= 0) return undefined;

  const blur = presetLevel * scaleMetric(6, metricScale);
  return {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: scaleMetric(2, metricScale) },
    shadowRadius: blur,
    shadowOpacity: scheme === 'dark' ? 0.25 : 0.16,
    elevation: Math.max(0, Math.round(blur * 0.6)),
  };
}

type LinearConfig = {
  colors: string[];
  start?: ButtonGradientPoint;
  end?: ButtonGradientPoint;
};

const GRADIENT_DIRECTIONS: Record<string, Pick<LinearConfig, 'start' | 'end'>> = {
  'to right': { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } },
  'to left': { start: { x: 1, y: 0.5 }, end: { x: 0, y: 0.5 } },
  'to bottom': { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } },
  'to top': { start: { x: 0.5, y: 1 }, end: { x: 0.5, y: 0 } },
  'to bottom right': { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  'to bottom left': { start: { x: 1, y: 0 }, end: { x: 0, y: 1 } },
  'to top right': { start: { x: 0, y: 1 }, end: { x: 1, y: 0 } },
  'to top left': { start: { x: 1, y: 1 }, end: { x: 0, y: 0 } },
};

let cachedLinearGradientComponent: React.ComponentType<LinearGradientProps> | null | undefined;

function degToVector(deg: number) {
  const rad = (deg * Math.PI) / 180;
  const x = Math.cos(rad);
  const y = Math.sin(rad);
  const len = Math.sqrt(x * x + y * y) || 1;
  return { x: x / len, y: y / len };
}

function parseGradient(gradient: ButtonGradient | undefined): LinearConfig | undefined {
  if (!gradient || !Array.isArray(gradient.colors) || gradient.colors.length < 2) return undefined;
  const colors = gradient.colors.map((x) => String(x)).filter(Boolean);
  if (colors.length < 2) return undefined;

  if (gradient.start || gradient.end) {
    return { colors, start: gradient.start, end: gradient.end };
  }

  const direction = gradient.direction?.toLowerCase();
  if (!direction) return { colors };

  if (direction.startsWith('to ')) {
    return { colors, ...GRADIENT_DIRECTIONS[direction] };
  }

  const n = parseFloat(direction.replace('deg', '').trim());
  if (!Number.isFinite(n)) return { colors };
  const v = degToVector(n);
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

function resolveButtonSizeStyle({
  block,
  width,
  height,
  minHeight,
  iconOnly,
  sizeConfig,
}: {
  block: boolean;
  width?: DimensionValue;
  height?: DimensionValue;
  minHeight?: number;
  iconOnly: boolean;
  sizeConfig: ButtonSizeConfig;
}): ViewStyle {
  const widthFromBlock = block ? '100%' : undefined;
  const resolvedWidth = width ?? widthFromBlock;
  const squareSide = normalizeNumber(width) ?? normalizeNumber(height) ?? sizeConfig.iconOnlySide;

  if (iconOnly) {
    return {
      width: resolvedWidth ?? squareSide,
      height: height ?? squareSide,
    };
  }

  return {
    ...(resolvedWidth !== undefined ? { width: resolvedWidth } : undefined),
    ...(height !== undefined ? { height } : undefined),
    minHeight: minHeight ?? sizeConfig.minHeight,
  };
}

function resolveButtonSideLength(
  sizeStyle: ViewStyle,
  iconOnly: boolean,
  minHeight: number | undefined,
  sizeConfig: ButtonSizeConfig
) {
  const heightSide = normalizeNumber(sizeStyle.height);
  if (heightSide != null) return heightSide;

  if (iconOnly) {
    return normalizeNumber(sizeStyle.width) ?? sizeConfig.iconOnlySide;
  }

  return minHeight ?? sizeConfig.minHeight;
}

function resolveRadiusStyle({
  shape,
  sizeStyle,
  iconOnly,
  minHeight,
  radius,
  sizeConfig,
}: {
  shape: ButtonShape;
  sizeStyle: ViewStyle;
  iconOnly: boolean;
  minHeight?: number;
  radius?: number;
  sizeConfig: ButtonSizeConfig;
}): ViewStyle {
  if (shape === 'pill') {
    const r = resolveButtonSideLength(sizeStyle, iconOnly, minHeight, sizeConfig) / 2;
    return {
      borderRadius: r,
      borderTopLeftRadius: r,
      borderTopRightRadius: r,
      borderBottomRightRadius: r,
      borderBottomLeftRadius: r,
    };
  }

  if (shape === 'square') {
    return { borderRadius: 0 };
  }

  if (typeof radius === 'number' && Number.isFinite(radius)) {
    return { borderRadius: radius };
  }

  return { borderRadius: sizeConfig.radius };
}

function resolveVisualColors({
  variant,
  visualDisabled,
  hasGradientBackground,
  gradientCfg,
  bgOverride,
  fontOverride,
  disabledBgOverride,
  disabledFontOverride,
  disabledBorderOverride,
  primary,
  tonePalette,
  theme,
}: {
  variant: ButtonVariant;
  visualDisabled: boolean;
  hasGradientBackground: boolean;
  gradientCfg?: LinearConfig;
  bgOverride?: string;
  fontOverride?: string;
  disabledBgOverride?: string;
  disabledFontOverride?: string;
  disabledBorderOverride?: string;
  primary: string;
  tonePalette: ResolvedTonePalette;
  theme: ReturnType<typeof useTheme>;
}): ButtonVisualColors {
  const finalBg = bgOverride ?? primary;
  const disabledTextColor = disabledFontOverride ?? theme.colors.disabled;
  const fallbackGradientBg = resolveColorToken(gradientCfg?.colors[0], finalBg);

  if (hasGradientBackground) {
    return {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: visualDisabled ? disabledTextColor : (fontOverride ?? tonePalette.solidTextColor),
    };
  }

  if (variant === 'ghost' || variant === 'link') {
    return {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: visualDisabled ? disabledTextColor : (fontOverride ?? finalBg),
    };
  }

  if (variant === 'outline') {
    return {
      backgroundColor: 'transparent',
      borderColor: visualDisabled ? (disabledBorderOverride ?? theme.colors.border) : finalBg,
      textColor: visualDisabled ? disabledTextColor : (fontOverride ?? finalBg),
    };
  }

  if (variant === 'soft') {
    const softBg = pickRgbaFromColor(finalBg, 0.12) ?? theme.colors.secondary;
    const softBorder = pickRgbaFromColor(finalBg, 0.22) ?? theme.colors.border;

    return {
      backgroundColor: visualDisabled ? (disabledBgOverride ?? theme.colors.secondary) : softBg,
      borderColor: visualDisabled ? (disabledBorderOverride ?? theme.colors.border) : softBorder,
      textColor: visualDisabled ? disabledTextColor : (fontOverride ?? finalBg),
    };
  }

  return {
    backgroundColor: visualDisabled
      ? (disabledBgOverride ?? theme.colors.secondary)
      : gradientCfg
        ? fallbackGradientBg
        : finalBg,
    borderColor: 'transparent',
    textColor: visualDisabled ? disabledTextColor : (fontOverride ?? tonePalette.solidTextColor),
  };
}

function resolveContentPaddingStyle({
  iconOnly,
  variant,
  paddingHorizontal,
  paddingVertical,
  sizeConfig,
  linkMinPaddingY,
}: {
  iconOnly: boolean;
  variant: ButtonVariant;
  paddingHorizontal?: number;
  paddingVertical?: number;
  sizeConfig: ButtonSizeConfig;
  linkMinPaddingY: number;
}): ViewStyle {
  if (iconOnly) return {};

  const px = paddingHorizontal ?? sizeConfig.paddingHorizontal;
  const py = paddingVertical ?? sizeConfig.paddingVertical;

  if (variant === 'link') {
    return { paddingHorizontal: 0, paddingVertical: Math.max(linkMinPaddingY, py * 0.25) };
  }

  return { paddingHorizontal: px, paddingVertical: py };
}

function resolvePressEffect({
  interactionDisabled,
  pressEffect,
}: {
  interactionDisabled: boolean;
  pressEffect: ButtonPressEffect;
}): ButtonPressEffect {
  if (interactionDisabled) return 'none';
  if (pressEffect !== 'auto') return pressEffect;
  return 'scale-opacity';
}

function resolvePressEffectFlags(pressEffect: ButtonPressEffect): PressEffectFlags {
  return {
    darken: pressEffect === 'darken' || pressEffect === 'scale-darken',
    scale:
      pressEffect === 'scale' ||
      pressEffect === 'scale-darken' ||
      pressEffect === 'scale-opacity',
    opacity: pressEffect === 'opacity' || pressEffect === 'scale-opacity',
  };
}

function resolvePressOverlay({
  darken,
  hasGradientBackground,
  variant,
  primary,
}: {
  darken: boolean;
  hasGradientBackground: boolean;
  variant: ButtonVariant;
  primary: string;
}) {
  if (!darken) return { color: '#000000', strength: 0 };

  const isFilled = hasGradientBackground || variant === 'solid' || variant === 'soft';
  return {
    color: isFilled ? '#000000' : primary,
    strength: hasGradientBackground || variant === 'solid' ? 0.12 : 0.08,
  };
}

function resolveBorderStyle({
  variant,
  borderStyle,
  borderWidth,
  visualColors,
  theme,
  outlineBorderWidth,
}: {
  variant: ButtonVariant;
  borderStyle: ButtonBorderStyle;
  borderWidth?: number;
  visualColors: ButtonVisualColors;
  theme: ReturnType<typeof useTheme>;
  outlineBorderWidth: number;
}): ViewStyle {
  const isOutlineLike = variant === 'outline' || borderStyle === 'dashed';
  const resolvedBorderWidth = borderWidth ?? (isOutlineLike ? outlineBorderWidth : undefined);
  if (resolvedBorderWidth == null) return {};

  return {
    borderWidth: resolvedBorderWidth,
    borderStyle,
    borderColor:
      visualColors.borderColor !== 'transparent' ? visualColors.borderColor : theme.colors.border,
  };
}

function resolveIconBoxStyle(hasIcon: boolean, iconSize: number): ViewStyle {
  if (!hasIcon) return {};

  return {
    height: iconSize,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };
}

function resolveIconSize({
  iconSize,
  sizeStyle,
  iconOnly,
  minHeight,
  sizeConfig,
}: {
  iconSize?: number;
  sizeStyle: ViewStyle;
  iconOnly: boolean;
  minHeight?: number;
  sizeConfig: ButtonSizeConfig;
}) {
  if (typeof iconSize === 'number' && Number.isFinite(iconSize)) return iconSize;
  const side = resolveButtonSideLength(sizeStyle, iconOnly, minHeight, sizeConfig);
  return Math.max(sizeConfig.iconSize, Math.round(side * 0.45));
}

function resolveLoadingSize({
  loadingSize,
  sizeStyle,
  iconOnly,
  minHeight,
  sizeConfig,
}: {
  loadingSize?: number;
  sizeStyle: ViewStyle;
  iconOnly: boolean;
  minHeight?: number;
  sizeConfig: ButtonSizeConfig;
}) {
  if (typeof loadingSize === 'number' && Number.isFinite(loadingSize)) return loadingSize;
  const side = resolveButtonSideLength(sizeStyle, iconOnly, minHeight, sizeConfig);
  return Math.max(sizeConfig.loadingSize, Math.round(side * 0.45));
}

function resolveDefaultHitSlop({
  variant,
  iconOnly,
  sizeStyle,
  minHeight,
  sizeConfig,
}: {
  variant: ButtonVariant;
  iconOnly: boolean;
  sizeStyle: ViewStyle;
  minHeight?: number;
  sizeConfig: ButtonSizeConfig;
}): ButtonProps['hitSlop'] | undefined {
  if (variant === 'link') {
    return {
      top: LINK_TOUCH_SLOP_Y,
      bottom: LINK_TOUCH_SLOP_Y,
      left: LINK_TOUCH_SLOP_X,
      right: LINK_TOUCH_SLOP_X,
    };
  }

  const side = resolveButtonSideLength(sizeStyle, iconOnly, minHeight, sizeConfig);
  const slop = Math.max(0, (MIN_TOUCH_TARGET - side) / 2);
  if (slop <= 0) return undefined;

  return {
    top: slop,
    bottom: slop,
    left: iconOnly ? slop : 0,
    right: iconOnly ? slop : 0,
  };
}

function ButtonImpl({
  variant,
  tone = 'primary',
  shape = 'rounded',
  size = 'md',
  pressEffect = 'auto',
  radius,
  borderWidth,
  borderStyle = 'solid',
  width,
  height,
  block = false,
  disabled = false,
  icon,
  iconSize,
  iconPosition = 'start',
  iconOnly = false,
  loading = false,
  loadingSize,
  fontSize,
  minHeight,
  paddingHorizontal,
  paddingVertical,
  gap,
  color,
  backgroundColor,
  textColor,
  disabledBackgroundColor,
  disabledTextColor,
  disabledBorderColor,
  gradient,
  shadow = 'none',
  children,
  style,
  contentStyle,
  textStyle,
  onPress,
  onPressIn,
  onPressOut,
  testID,
  hitSlop,
  accessibilityState,
  accessibilityLabel,
  ...pressableProps
}: ButtonProps, ref: React.ForwardedRef<ButtonRef>) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { width: windowWidth } = useWindowDimensions();
  const {
    metricScale,
    sizeConfig,
    outlineBorderWidth,
    linkMinPaddingY,
    loadingTextShift,
  } = React.useMemo(
    () => resolveButtonMetrics(size, windowWidth),
    [size, windowWidth]
  );

  const resolvedVariant = variant ?? 'solid';
  const resolvedIconOnly = iconOnly;

  const resolvedInteractionDisabled = disabled || loading;
  const resolvedVisualDisabled = disabled;

  const resolvedTonePalette = React.useMemo(() => resolveTonePalette(tone, theme), [theme, tone]);
  const resolvedPrimary = React.useMemo(
    () => resolveColorToken(color, resolvedTonePalette.baseColor),
    [color, resolvedTonePalette.baseColor]
  );

  const resolvedBgOverride = backgroundColor;
  const resolvedFontOverride = textColor;
  const resolvedDisabledBgOverride = disabledBackgroundColor;
  const resolvedDisabledFontOverride = disabledTextColor;
  const resolvedDisabledBorderOverride = disabledBorderColor;

  const gradientCfg = React.useMemo(() => parseGradient(gradient), [gradient]);
  const LinearGradientComponent = React.useMemo<
    React.ComponentType<LinearGradientProps> | undefined
  >(
    () => (gradientCfg ? (pickLinearGradientComponent() ?? undefined) : undefined),
    [gradientCfg]
  );
  const hasGradientBackground = Boolean(gradientCfg && LinearGradientComponent);

  const resolvedShadow = React.useMemo(
    () => resolveShadowStyle(shadow, scheme, resolvedVariant, metricScale),
    [metricScale, resolvedVariant, scheme, shadow]
  );

  const defaultGap = sizeConfig.gap;
  const resolvedButtonSizeStyle = React.useMemo(
    () =>
      resolveButtonSizeStyle({
        block,
        width,
        height,
        minHeight,
        iconOnly: resolvedIconOnly,
        sizeConfig,
      }),
    [block, height, minHeight, resolvedIconOnly, sizeConfig, width]
  );

  const resolvedRadiusStyle = React.useMemo(
    () =>
      resolveRadiusStyle({
        shape,
        sizeStyle: resolvedButtonSizeStyle,
        iconOnly: resolvedIconOnly,
        minHeight,
        radius,
        sizeConfig,
      }),
    [
      minHeight,
      radius,
      resolvedButtonSizeStyle,
      resolvedIconOnly,
      shape,
      sizeConfig,
    ]
  );

  const resolvedVisualColors = React.useMemo(
    () =>
      resolveVisualColors({
        variant: resolvedVariant,
        visualDisabled: resolvedVisualDisabled,
        hasGradientBackground,
        gradientCfg,
        bgOverride: resolvedBgOverride,
        fontOverride: resolvedFontOverride,
        disabledBgOverride: resolvedDisabledBgOverride,
        disabledFontOverride: resolvedDisabledFontOverride,
        disabledBorderOverride: resolvedDisabledBorderOverride,
        primary: resolvedPrimary,
        tonePalette: resolvedTonePalette,
        theme,
      }),
    [
      hasGradientBackground,
      gradientCfg,
      resolvedBgOverride,
      resolvedDisabledBgOverride,
      resolvedDisabledBorderOverride,
      resolvedDisabledFontOverride,
      resolvedFontOverride,
      resolvedPrimary,
      resolvedTonePalette,
      resolvedVariant,
      resolvedVisualDisabled,
      theme,
    ]
  );

  const resolvedContentPaddingStyle = React.useMemo(
    () =>
      resolveContentPaddingStyle({
        iconOnly: resolvedIconOnly,
        variant: resolvedVariant,
        paddingHorizontal,
        paddingVertical,
        sizeConfig,
        linkMinPaddingY,
      }),
    [linkMinPaddingY, paddingHorizontal, paddingVertical, resolvedIconOnly, resolvedVariant, sizeConfig]
  );

  const resolvedText = React.useMemo(() => {
    if (children == null) return null;
    if (isPrimitiveTextChild(children)) {
      return (
        <Text
          numberOfLines={1}
          style={[
            styles.textBase,
            { fontSize: fontSize ?? sizeConfig.fontSize, color: resolvedVisualColors.textColor },
            resolvedVariant === 'link' ? styles.linkText : null,
            textStyle,
          ]}
        >
          {children}
        </Text>
      );
    }
    return children;
  }, [
    children,
    fontSize,
    resolvedVariant,
    resolvedVisualColors.textColor,
    sizeConfig.fontSize,
    textStyle,
  ]);

  const hasText = Boolean(resolvedText);
  const hasIcon = icon != null;

  const resolvedIconSize = React.useMemo(
    () =>
      resolveIconSize({
        iconSize,
        sizeStyle: resolvedButtonSizeStyle,
        iconOnly: resolvedIconOnly,
        minHeight,
        sizeConfig,
      }),
    [iconSize, minHeight, resolvedButtonSizeStyle, resolvedIconOnly, sizeConfig]
  );

  const resolvedIconNode = icon ?? null;
  const resolvedIconOnlyNode = resolvedIconNode ?? resolvedText;

  const inferredAccessibilityLabel =
    resolvedIconOnly && isPrimitiveTextChild(children)
      ? String(children)
      : undefined;
  const resolvedAccessibilityLabel = accessibilityLabel ?? inferredAccessibilityLabel;

  const pressSv = useSharedValue(0);
  const loadingSv = useSharedValue(loading ? 1 : 0);
  const [spinnerMounted, setSpinnerMounted] = React.useState(loading);
  const hideSpinnerTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolvedPressEffect = React.useMemo(
    () =>
      resolvePressEffect({
        interactionDisabled: resolvedInteractionDisabled,
        pressEffect,
      }),
    [pressEffect, resolvedInteractionDisabled]
  );

  const pressEffectFlags = React.useMemo(
    () => resolvePressEffectFlags(resolvedPressEffect),
    [resolvedPressEffect]
  );
  const {
    darken: pressDarkenEnabled,
    opacity: pressOpacityEnabled,
    scale: pressScaleEnabled,
  } = pressEffectFlags;

  const resolvedPressOverlay = React.useMemo(
    () =>
      resolvePressOverlay({
        darken: pressDarkenEnabled,
        hasGradientBackground,
        variant: resolvedVariant,
        primary: resolvedPrimary,
      }),
    [hasGradientBackground, pressDarkenEnabled, resolvedPrimary, resolvedVariant]
  );

  React.useEffect(() => {
    if (resolvedInteractionDisabled || resolvedPressEffect === 'none') {
      pressSv.value = 0;
    }
  }, [pressSv, resolvedInteractionDisabled, resolvedPressEffect]);

  React.useEffect(() => {
    if (hideSpinnerTimerRef.current) {
      clearTimeout(hideSpinnerTimerRef.current);
      hideSpinnerTimerRef.current = null;
    }

    if (loading) {
      setSpinnerMounted(true);
    }

    loadingSv.value = withTiming(loading ? 1 : 0, LOADING_TIMING);

    if (!loading && spinnerMounted) {
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
  }, [loading, loadingSv, spinnerMounted]);

  const rootAnimatedStyle = useAnimatedStyle(() => {
    const baseOpacity = resolvedVisualDisabled ? DISABLED_OPACITY : 1;
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
  }, [pressOpacityEnabled, pressScaleEnabled, resolvedVisualDisabled]);

  const pressOverlayAnimatedStyle = useAnimatedStyle(() => {
    const opacity = pressDarkenEnabled
      ? interpolate(pressSv.value, [0, 1], [0, resolvedPressOverlay.strength])
      : 0;
    return { opacity };
  }, [pressDarkenEnabled, resolvedPressOverlay.strength]);

  const handlePress = React.useCallback(
    (e: GestureResponderEvent) => {
      if (resolvedInteractionDisabled) return;
      onPress?.(e);
    },
    [onPress, resolvedInteractionDisabled]
  );

  const handlePressIn = React.useCallback(
    (e: GestureResponderEvent) => {
      if (!resolvedInteractionDisabled && resolvedPressEffect !== 'none') {
        pressSv.value = withTiming(1, PRESS_TIMING);
      }
      onPressIn?.(e);
    },
    [onPressIn, pressSv, resolvedInteractionDisabled, resolvedPressEffect]
  );

  const handlePressOut = React.useCallback(
    (e: GestureResponderEvent) => {
      if (!resolvedInteractionDisabled && resolvedPressEffect !== 'none') {
        pressSv.value = withTiming(0, PRESS_TIMING);
      }
      onPressOut?.(e);
    },
    [onPressOut, pressSv, resolvedInteractionDisabled, resolvedPressEffect]
  );

  const resolvedBorderStyle = React.useMemo(
    () =>
      resolveBorderStyle({
        variant: resolvedVariant,
        borderStyle,
        borderWidth,
        visualColors: resolvedVisualColors,
        theme,
        outlineBorderWidth,
      }),
    [borderStyle, borderWidth, outlineBorderWidth, resolvedVariant, resolvedVisualColors, theme]
  );

  const resolvedIconBaseBoxStyle = React.useMemo(
    () => resolveIconBoxStyle(hasIcon, resolvedIconSize),
    [hasIcon, resolvedIconSize]
  );

  const resolvedLoadingSize = React.useMemo(
    () =>
      resolveLoadingSize({
        loadingSize,
        sizeStyle: resolvedButtonSizeStyle,
        iconOnly: resolvedIconOnly,
        minHeight,
        sizeConfig,
      }),
    [loadingSize, minHeight, resolvedButtonSizeStyle, resolvedIconOnly, sizeConfig]
  );

  const spinnerSize = resolvedLoadingSize;
  const spinnerVisible = loading || spinnerMounted;

  const spinnerBoxAnimatedStyle = useAnimatedStyle(() => {
    const mr = hasText && !resolvedIconOnly ? (gap ?? defaultGap) : 0;
    const width = resolvedIconOnly
      ? spinnerSize
      : interpolate(loadingSv.value, [0, 1], [0, spinnerSize]);
    const opacity = interpolate(loadingSv.value, [0, 1], [0, 1]);
    const marginRight = resolvedIconOnly ? 0 : interpolate(loadingSv.value, [0, 1], [0, mr]);
    const scale = interpolate(loadingSv.value, [0, 1], [0.92, 1]);
    return {
      width,
      marginRight,
      opacity,
      transform: [{ scale }],
    };
  }, [defaultGap, gap, hasText, loadingSv, resolvedIconOnly, spinnerSize]);

  const iconBoxAnimatedStyle = useAnimatedStyle(() => {
    if (!hasIcon || resolvedIconOnly) return { width: 0, opacity: 0 };
    const space = hasText ? (gap ?? defaultGap) : 0;
    const width = interpolate(loadingSv.value, [0, 1], [resolvedIconSize, 0]);
    const opacity = interpolate(loadingSv.value, [0, 1], [1, 0]);
    const marginValue = interpolate(loadingSv.value, [0, 1], [space, 0]);
    const scale = interpolate(loadingSv.value, [0, 1], [1, 0.92]);
    return {
      width,
      opacity,
      ...(iconPosition === 'end' ? { marginLeft: marginValue } : { marginRight: marginValue }),
      transform: [{ scale }],
    };
  }, [
    defaultGap,
    gap,
    hasIcon,
    hasText,
    iconPosition,
    loadingSv,
    resolvedIconOnly,
    resolvedIconSize,
  ]);

  const contentAnimatedStyle = useAnimatedStyle(() => {
    if (resolvedIconOnly) {
      const opacity = interpolate(loadingSv.value, [0, 1], [1, 0]);
      const scale = interpolate(loadingSv.value, [0, 1], [1, 0.98]);
      return { opacity, transform: [{ scale }] };
    }
    const translateX = interpolate(loadingSv.value, [0, 1], [0, loadingTextShift]);
    return { transform: [{ translateX }] };
  }, [loadingSv, loadingTextShift, resolvedIconOnly]);

  const shouldClipRoot =
    shadow === 'none' || resolvedVariant === 'ghost' || resolvedVariant === 'link';
  const GradientComponent = hasGradientBackground ? LinearGradientComponent : undefined;
  const defaultHitSlop = React.useMemo(
    () =>
      resolveDefaultHitSlop({
        variant: resolvedVariant,
        iconOnly: resolvedIconOnly,
        sizeStyle: resolvedButtonSizeStyle,
        minHeight,
        sizeConfig,
      }),
    [minHeight, resolvedButtonSizeStyle, resolvedIconOnly, resolvedVariant, sizeConfig]
  );

  return (
    <AnimatedPressable
      {...pressableProps}
      ref={ref}
      testID={testID}
      hitSlop={hitSlop !== undefined ? hitSlop : defaultHitSlop}
      accessibilityRole="button"
      accessibilityLabel={resolvedAccessibilityLabel}
      accessibilityState={{
        ...accessibilityState,
        disabled: Boolean(resolvedInteractionDisabled),
        busy: Boolean(loading || accessibilityState?.busy),
      }}
      disabled={resolvedInteractionDisabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[
        styles.root,
        resolvedButtonSizeStyle,
        resolvedRadiusStyle,
        shouldClipRoot ? styles.clip : null,
        resolvedShadow,
        rootAnimatedStyle,
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.content,
          resolvedContentPaddingStyle,
          resolvedRadiusStyle,
          resolvedBorderStyle,
          hasGradientBackground
            ? styles.transparentBg
            : { backgroundColor: resolvedVisualColors.backgroundColor },
          contentStyle,
        ]}
      >
        {GradientComponent && gradientCfg ? (
          <GradientComponent
            pointerEvents="none"
            colors={gradientCfg.colors}
            start={gradientCfg.start}
            end={gradientCfg.end}
            style={[StyleSheet.absoluteFill, resolvedRadiusStyle]}
          />
        ) : null}

        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            resolvedRadiusStyle,
            { backgroundColor: resolvedPressOverlay.color },
            pressOverlayAnimatedStyle,
          ]}
        />

        {resolvedIconOnly ? (
          <>
            <Animated.View style={[styles.centerOverlay, spinnerBoxAnimatedStyle]}>
              {spinnerVisible ? (
                <LoadingSpinner
                  animating={spinnerVisible}
                  color={resolvedVisualColors.textColor}
                  size={spinnerSize}
                />
              ) : null}
            </Animated.View>
            {resolvedIconOnlyNode ? (
              <Animated.View style={contentAnimatedStyle}>{resolvedIconOnlyNode}</Animated.View>
            ) : null}
          </>
        ) : (
          <>
            <Animated.View
              style={[styles.spinnerBox, { height: spinnerSize }, spinnerBoxAnimatedStyle]}
            >
              {spinnerVisible ? (
                <LoadingSpinner
                  animating={spinnerVisible}
                  color={resolvedVisualColors.textColor}
                  size={spinnerSize}
                />
              ) : null}
            </Animated.View>

            {resolvedIconNode && iconPosition === 'start' ? (
              <Animated.View style={[resolvedIconBaseBoxStyle, iconBoxAnimatedStyle]}>
                {resolvedIconNode}
              </Animated.View>
            ) : null}

            {resolvedText ? (
              <Animated.View style={contentAnimatedStyle}>{resolvedText}</Animated.View>
            ) : null}

            {resolvedIconNode && iconPosition === 'end' ? (
              <Animated.View style={[resolvedIconBaseBoxStyle, iconBoxAnimatedStyle]}>
                {resolvedIconNode}
              </Animated.View>
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
  root: {},
  clip: {
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  spinnerBox: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transparentBg: {
    backgroundColor: 'transparent',
  },
  centerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBase: {
    letterSpacing: 0,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'center',
  },
  linkText: {
    textDecorationLine: 'underline',
  },
});
