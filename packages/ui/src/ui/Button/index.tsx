import * as React from 'react';
import type { DimensionValue } from 'react-native';
import {
  ColorSchemeName,
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  processColor,
  useColorScheme,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { wp } from 'y2kit-tools';
import { useTheme } from '../../theme/useTheme';
import { LoadingSpinner } from '../LoadingSpinner';
import { Text } from '../Text';

type BorderOrRadiusToken = string | number;
type BorderOrRadius = BorderOrRadiusToken | Array<BorderOrRadiusToken>;

/** @deprecated Use ButtonVariant instead. */
export type ButtonSkin = 'thin' | 'outlined' | 'text' | 'normal' | 'dashed';
export type ButtonVariant = 'solid' | 'soft' | 'outline' | 'ghost' | 'link';
export type ButtonTone = 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
export type ButtonShape = 'default' | 'pill' | 'square';
export type ButtonSizePreset = 'sm' | 'md' | 'lg';
export type ButtonPressEffect =
  | 'auto'
  | 'none'
  | 'opacity'
  | 'scale'
  | 'darken'
  | 'scale-darken'
  | 'scale-opacity';

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

type ResolvedTonePalette = {
  baseColor: string;
  solidTextColor: string;
};

type NativePressableProps = Omit<
  React.ComponentPropsWithoutRef<typeof Pressable>,
  'style' | 'children' | 'disabled' | 'onPressIn' | 'onPressOut'
>;

export interface ButtonProps extends NativePressableProps {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  shape?: ButtonShape;
  sizePreset?: ButtonSizePreset;
  pressEffect?: ButtonPressEffect;

  /**
   * @deprecated Use `variant` instead.
   * - normal -> solid
   * - thin -> soft
   * - outlined -> outline
   * - dashed -> outline + dashed border
   * - text -> ghost
   */
  skin?: ButtonSkin;

  borderWidth?: BorderOrRadius;

  /**
   * @deprecated Use `radius` or `shape` instead.
   * 兼容旧版 API：支持四角配置。
   */
  round?: BorderOrRadius;

  /**
   * 新版统一圆角。
   */
  radius?: number;

  /**
   * @deprecated Use `shape="pill"` instead.
   * 兼容旧版 API：胶囊按钮。
   */
  rounded?: boolean;

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

  /**
   * 新版语义化“仅图标按钮”。
   */
  iconOnly?: boolean;

  /**
   * @deprecated Use `iconOnly` instead.
   * 兼容旧版 API。
   */
  btnIcon?: boolean;

  loading?: boolean;
  loadingSize?: number;
  fontSize?: number;

  /**
   * 颜色优先级：
   * 1) 显式 bgColor/fontColor 等覆盖
   * 2) color
   * 3) tone
   * 4) theme
   */
  color?: string;
  bgColor?: string;
  darkBgColor?: string;
  fontColor?: string;
  darkFontColor?: string;

  /**
   * @deprecated Use `darkFontColor` instead.
   * 兼容旧版拼写。
   */
  darkFontColorColor?: string;

  disabledBgColor?: string;
  disabledDarkBgColor?: string;
  disabledFontColor?: string;
  disabledDarkFontColor?: string;
  disabledBorderColor?: string;
  disabledDarkBorderColor?: string;

  linear?: string[];
  shadow?: string | number | Array<string | number>;

  /**
   * @deprecated Use `pressEffect="none"` instead.
   * 兼容旧版 API；等价于 pressEffect="none"。
   */
  disableHover?: boolean;

  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SEMANTIC_COLORS: Record<string, string> = {
  warn: '#F59E0B',
  warning: '#F59E0B',
  error: '#EF4444',
  success: '#22C55E',
  danger: '#DC2626',
  info: '#3B82F6',
};

const SIZE_PRESETS: Record<ButtonSizePreset, ButtonSizeConfig> = {
  sm: {
    minHeight: wp(36),
    paddingHorizontal: wp(12),
    paddingVertical: wp(7),
    fontSize: wp(14),
    gap: wp(6),
    radius: wp(12),
    iconOnlySide: wp(36),
    iconSize: wp(16),
    loadingSize: wp(16),
  },
  md: {
    minHeight: wp(40),
    paddingHorizontal: wp(16),
    paddingVertical: wp(9),
    fontSize: wp(16),
    gap: wp(8),
    radius: wp(14),
    iconOnlySide: wp(46),
    iconSize: wp(18),
    loadingSize: wp(20),
  },
  lg: {
    minHeight: wp(48),
    paddingHorizontal: wp(20),
    paddingVertical: wp(11),
    fontSize: wp(17),
    gap: wp(10),
    radius: wp(16),
    iconOnlySide: wp(52),
    iconSize: wp(20),
    loadingSize: wp(22),
  },
};

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

function resolveVariantFromSkin(skin: ButtonSkin | undefined): ButtonVariant | undefined {
  if (!skin) return undefined;
  if (skin === 'normal') return 'solid';
  if (skin === 'thin') return 'soft';
  if (skin === 'outlined' || skin === 'dashed') return 'outline';
  return 'ghost';
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

function normalizeBoxEdgeArray(
  input: BorderOrRadius | undefined
): [number, number, number, number] | undefined {
  if (input == null) return undefined;
  if (!Array.isArray(input)) {
    const n = normalizeNumber(input);
    if (n == null) return undefined;
    return [n, n, n, n];
  }
  const items = input.map((x) => normalizeNumber(x)).filter((x): x is number => x != null);
  if (items.length === 0) return undefined;
  if (items.length === 1) return [items[0], items[0], items[0], items[0]];
  if (items.length === 2) return [items[0], items[1], items[0], items[1]];
  if (items.length === 3) return [items[0], items[1], items[2], items[1]];
  return [items[0], items[1], items[2], items[3]];
}

function resolveBorderWidths(borderWidth: BorderOrRadius | undefined) {
  const edges = normalizeBoxEdgeArray(borderWidth);
  if (!edges) return undefined;
  const [left, top, right, bottom] = edges;
  return {
    borderLeftWidth: left,
    borderTopWidth: top,
    borderRightWidth: right,
    borderBottomWidth: bottom,
  } satisfies ViewStyle;
}

function resolveCornerRadii(round: BorderOrRadius | undefined) {
  const corners = normalizeBoxEdgeArray(round);
  if (!corners) return undefined;
  const [topLeft, topRight, bottomRight, bottomLeft] = corners;
  return {
    borderTopLeftRadius: topLeft,
    borderTopRightRadius: topRight,
    borderBottomRightRadius: bottomRight,
    borderBottomLeftRadius: bottomLeft,
  } satisfies ViewStyle;
}

function resolveShadowStyle(
  shadow: ButtonProps['shadow'],
  scheme: ColorSchemeName,
  variant: ButtonVariant
): ViewStyle | undefined {
  if (shadow === 'none') return { elevation: 0, shadowOpacity: 0 };

  const implicitEnabled = shadow === '' && variant !== 'ghost' && variant !== 'link';
  const raw =
    shadow === ''
      ? implicitEnabled
        ? 1
        : undefined
      : typeof shadow === 'string' || typeof shadow === 'number'
        ? shadow
        : undefined;
  const level = normalizeNumber(raw);

  if (level == null) {
    if (Array.isArray(shadow) && shadow.length >= 4) {
      const x = normalizeNumber(shadow[0]) ?? 0;
      const y = normalizeNumber(shadow[1]) ?? wp(1);
      const blur = Math.max(0, normalizeNumber(shadow[2]) ?? wp(6));
      const color = String(shadow[3] ?? '#000000');
      return {
        shadowColor: color,
        shadowOffset: { width: x, height: y },
        shadowRadius: blur,
        shadowOpacity: 0.18,
        elevation: Math.max(0, Math.round(blur * 0.6)),
      };
    }
    return undefined;
  }

  const blur = Math.max(0, level) * wp(6);
  return {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: wp(2) },
    shadowRadius: blur,
    shadowOpacity: scheme === 'dark' ? 0.25 : 0.16,
    elevation: Math.max(0, Math.round(blur * 0.6)),
  };
}

type LinearConfig = {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
};

function degToVector(deg: number) {
  const rad = (deg * Math.PI) / 180;
  const x = Math.cos(rad);
  const y = Math.sin(rad);
  const len = Math.sqrt(x * x + y * y) || 1;
  return { x: x / len, y: y / len };
}

function parseLinear(linear: string[] | undefined): LinearConfig | undefined {
  if (!linear || linear.length < 2) return undefined;
  const raw = linear.map((x) => String(x));

  const first = raw[0]?.trim() ?? '';
  const hasDirection = first.includes('deg') || first.startsWith('to ');
  const colors = (hasDirection ? raw.slice(1) : raw).filter(Boolean);
  if (colors.length < 2) return undefined;

  if (!hasDirection) return { colors };

  if (first.startsWith('to ')) {
    const key = first.toLowerCase();
    if (key === 'to right') return { colors, start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } };
    if (key === 'to left') return { colors, start: { x: 1, y: 0.5 }, end: { x: 0, y: 0.5 } };
    if (key === 'to bottom') return { colors, start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } };
    if (key === 'to top') return { colors, start: { x: 0.5, y: 1 }, end: { x: 0.5, y: 0 } };
    if (key === 'to bottom right') return { colors, start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
    if (key === 'to bottom left') return { colors, start: { x: 1, y: 0 }, end: { x: 0, y: 1 } };
    if (key === 'to top right') return { colors, start: { x: 0, y: 1 }, end: { x: 1, y: 0 } };
    if (key === 'to top left') return { colors, start: { x: 1, y: 1 }, end: { x: 0, y: 0 } };
    return { colors };
  }

  const n = parseFloat(first.replace('deg', '').trim());
  if (!Number.isFinite(n)) return { colors };
  const v = degToVector(n);
  return {
    colors,
    start: { x: 0.5 - v.x * 0.5, y: 0.5 - v.y * 0.5 },
    end: { x: 0.5 + v.x * 0.5, y: 0.5 + v.y * 0.5 },
  };
}

function pickLinearGradientComponent() {
  try {
    const mod = require('expo-linear-gradient') as { LinearGradient?: React.ComponentType<any> };
    return mod.LinearGradient ?? null;
  } catch {
    return null;
  }
}

export function Button({
  variant,
  tone = 'primary',
  shape = 'default',
  sizePreset = 'md',
  pressEffect = 'auto',
  skin,
  borderWidth,
  round,
  radius,
  rounded = false,
  width,
  height,
  block = false,
  disabled = false,
  icon,
  iconSize,
  iconPosition = 'start',
  iconOnly,
  btnIcon = false,
  loading = false,
  loadingSize,
  fontSize,
  minHeight,
  paddingHorizontal,
  paddingVertical,
  gap,
  color,
  bgColor,
  darkBgColor,
  fontColor,
  darkFontColor,
  darkFontColorColor,
  disabledBgColor,
  disabledDarkBgColor,
  disabledFontColor,
  disabledDarkFontColor,
  disabledBorderColor,
  disabledDarkBorderColor,
  linear,
  shadow = 'none',
  disableHover = false,
  children,
  style,
  contentStyle,
  textStyle,
  onPress,
  testID,
  accessibilityState,
  accessibilityLabel,
  ...pressableProps
}: ButtonProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const sizeConfig = SIZE_PRESETS[sizePreset] ?? SIZE_PRESETS.md;

  const resolvedVariant = variant ?? resolveVariantFromSkin(skin) ?? 'solid';
  const dashedBorder = skin === 'dashed';
  const resolvedIconOnly = iconOnly ?? btnIcon;

  const resolvedInteractionDisabled = disabled || loading;
  const resolvedVisualDisabled = disabled;

  const resolvedTonePalette = React.useMemo(() => resolveTonePalette(tone, theme), [theme, tone]);
  const resolvedPrimary = React.useMemo(
    () => resolveColorToken(color, resolvedTonePalette.baseColor),
    [color, resolvedTonePalette.baseColor]
  );

  const resolvedBgOverride = scheme === 'dark' ? darkBgColor : bgColor;
  const resolvedFontOverride =
    scheme === 'dark' ? (darkFontColor ?? darkFontColorColor) : fontColor;
  const resolvedDisabledBgOverride = scheme === 'dark' ? disabledDarkBgColor : disabledBgColor;
  const resolvedDisabledFontOverride =
    scheme === 'dark' ? disabledDarkFontColor : disabledFontColor;
  const resolvedDisabledBorderOverride =
    scheme === 'dark' ? disabledDarkBorderColor : disabledBorderColor;

  const linearCfg = React.useMemo(() => parseLinear(linear), [linear]);
  const LinearGradientComponent = React.useMemo<React.ComponentType<any> | undefined>(
    () => (linearCfg ? (pickLinearGradientComponent() ?? undefined) : undefined),
    [linearCfg]
  );
  const hasGradientBackground = Boolean(linearCfg && LinearGradientComponent);

  const resolvedBorderWidth = React.useMemo(() => resolveBorderWidths(borderWidth), [borderWidth]);
  const resolvedCornerRadii = React.useMemo(() => resolveCornerRadii(round), [round]);
  const resolvedShadow = React.useMemo(
    () => resolveShadowStyle(shadow, scheme, resolvedVariant),
    [resolvedVariant, scheme, shadow]
  );

  const defaultMinHeight = sizeConfig.minHeight;
  const defaultPaddingX = sizeConfig.paddingHorizontal;
  const defaultPaddingY = sizeConfig.paddingVertical;
  const defaultFontSize = sizeConfig.fontSize;
  const defaultRadius = sizeConfig.radius;
  const defaultIconOnlySide = sizeConfig.iconOnlySide;
  const defaultGap = sizeConfig.gap;
  const defaultIconSize = sizeConfig.iconSize;
  const defaultLoadingSize = sizeConfig.loadingSize;

  const resolvedButtonSizeStyle = React.useMemo<ViewStyle>(() => {
    const widthFromBlock = block ? '100%' : undefined;
    const resolvedW = width ?? widthFromBlock;
    const resolvedH = height;
    const resolvedMinHeight = minHeight ?? defaultMinHeight;
    const squareSide = normalizeNumber(width) ?? normalizeNumber(height) ?? defaultIconOnlySide;

    if (resolvedIconOnly) {
      return {
        ...(resolvedW !== undefined ? { width: resolvedW } : { width: squareSide }),
        ...(resolvedH !== undefined ? { height: resolvedH } : { height: squareSide }),
      };
    }

    return {
      ...(resolvedW !== undefined ? { width: resolvedW } : null),
      ...(resolvedH !== undefined ? { height: resolvedH } : null),
      minHeight: resolvedMinHeight,
    };
  }, [block, defaultIconOnlySide, defaultMinHeight, height, minHeight, resolvedIconOnly, width]);

  const resolvedRadiusStyle = React.useMemo<ViewStyle>(() => {
    if (rounded || shape === 'pill') {
      const side =
        normalizeNumber(resolvedButtonSizeStyle.height) ??
        normalizeNumber(resolvedButtonSizeStyle.width) ??
        minHeight ??
        defaultMinHeight;
      const r = side / 2;
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

    if (resolvedCornerRadii) {
      return { ...resolvedCornerRadii };
    }

    if (typeof radius === 'number' && Number.isFinite(radius)) {
      return { borderRadius: radius };
    }

    return { borderRadius: defaultRadius };
  }, [
    defaultMinHeight,
    defaultRadius,
    minHeight,
    radius,
    resolvedButtonSizeStyle.height,
    resolvedButtonSizeStyle.width,
    resolvedCornerRadii,
    rounded,
    shape,
  ]);

  const resolvedVisualColors = React.useMemo(() => {
    const finalBg = resolvedBgOverride ?? resolvedPrimary;
    const thinBg = pickRgbaFromColor(finalBg, 0.12);
    const thinBorder = pickRgbaFromColor(finalBg, 0.22);
    const fallbackLinearBg = resolveColorToken(linearCfg?.colors[0], finalBg);

    if (hasGradientBackground) {
      return {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: resolvedVisualDisabled
          ? (resolvedDisabledFontOverride ?? theme.colors.disabled)
          : (resolvedFontOverride ?? resolvedTonePalette.solidTextColor),
      };
    }

    if (resolvedVariant === 'ghost' || resolvedVariant === 'link') {
      return {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: resolvedVisualDisabled
          ? (resolvedDisabledFontOverride ?? theme.colors.disabled)
          : (resolvedFontOverride ?? finalBg),
      };
    }

    if (resolvedVariant === 'outline') {
      return {
        backgroundColor: 'transparent',
        borderColor: resolvedVisualDisabled
          ? (resolvedDisabledBorderOverride ?? theme.colors.border)
          : finalBg,
        textColor: resolvedVisualDisabled
          ? (resolvedDisabledFontOverride ?? theme.colors.disabled)
          : (resolvedFontOverride ?? finalBg),
      };
    }

    if (resolvedVariant === 'soft') {
      return {
        backgroundColor: resolvedVisualDisabled
          ? (resolvedDisabledBgOverride ?? theme.colors.secondary)
          : (thinBg ?? theme.colors.secondary),
        borderColor: resolvedVisualDisabled
          ? (resolvedDisabledBorderOverride ?? theme.colors.border)
          : (thinBorder ?? theme.colors.border),
        textColor: resolvedVisualDisabled
          ? (resolvedDisabledFontOverride ?? theme.colors.disabled)
          : (resolvedFontOverride ?? finalBg),
      };
    }

    return {
      backgroundColor: resolvedVisualDisabled
        ? (resolvedDisabledBgOverride ?? theme.colors.secondary)
        : linearCfg
          ? fallbackLinearBg
          : finalBg,
      borderColor: 'transparent',
      textColor: resolvedVisualDisabled
        ? (resolvedDisabledFontOverride ?? theme.colors.disabled)
        : (resolvedFontOverride ?? resolvedTonePalette.solidTextColor),
    };
  }, [
    hasGradientBackground,
    linearCfg,
    resolvedBgOverride,
    resolvedDisabledBgOverride,
    resolvedDisabledBorderOverride,
    resolvedDisabledFontOverride,
    resolvedFontOverride,
    resolvedPrimary,
    resolvedTonePalette.solidTextColor,
    resolvedVariant,
    resolvedVisualDisabled,
    theme.colors.border,
    theme.colors.disabled,
    theme.colors.secondary,
  ]);

  const resolvedContentPaddingStyle = React.useMemo<ViewStyle>(() => {
    if (resolvedIconOnly) return {};
    const px = paddingHorizontal ?? defaultPaddingX;
    const py = paddingVertical ?? defaultPaddingY;
    if (resolvedVariant === 'link') {
      return { paddingHorizontal: 0, paddingVertical: Math.max(wp(2), py * 0.25) };
    }
    return { paddingHorizontal: px, paddingVertical: py };
  }, [
    defaultPaddingX,
    defaultPaddingY,
    paddingHorizontal,
    paddingVertical,
    resolvedIconOnly,
    resolvedVariant,
  ]);

  const resolvedText = React.useMemo(() => {
    if (children == null) return null;
    if (typeof children === 'string' || typeof children === 'number') {
      return (
        <Text
          numberOfLines={1}
          style={[
            styles.textBase,
            { fontSize: fontSize ?? defaultFontSize, color: resolvedVisualColors.textColor },
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
    defaultFontSize,
    fontSize,
    resolvedVariant,
    resolvedVisualColors.textColor,
    textStyle,
  ]);

  const hasText = Boolean(resolvedText);
  const hasIcon = icon != null;

  const resolvedIconSize = React.useMemo(() => {
    if (typeof iconSize === 'number' && Number.isFinite(iconSize)) return iconSize;
    const side =
      normalizeNumber(resolvedButtonSizeStyle.height) ??
      normalizeNumber(resolvedButtonSizeStyle.width) ??
      (resolvedIconOnly ? defaultIconOnlySide : (minHeight ?? defaultMinHeight));
    return Math.max(defaultIconSize, Math.round(side * 0.45));
  }, [
    defaultIconOnlySide,
    defaultIconSize,
    defaultMinHeight,
    iconSize,
    minHeight,
    resolvedButtonSizeStyle.height,
    resolvedButtonSizeStyle.width,
    resolvedIconOnly,
  ]);

  const resolvedIconNode = React.useMemo(() => (icon == null ? null : icon), [icon]);
  const resolvedIconOnlyNode = resolvedIconNode ?? resolvedText;

  const inferredAccessibilityLabel =
    resolvedIconOnly && (typeof children === 'string' || typeof children === 'number')
      ? String(children)
      : undefined;
  const resolvedAccessibilityLabel = accessibilityLabel ?? inferredAccessibilityLabel;

  const pressSv = useSharedValue(0);
  const timing = React.useMemo(() => ({ duration: 140, easing: Easing.out(Easing.cubic) }), []);

  const loadingSv = useSharedValue(loading ? 1 : 0);
  const loadingTiming = React.useMemo(
    () => ({ duration: 200, easing: Easing.out(Easing.cubic) }),
    []
  );
  const [spinnerMounted, setSpinnerMounted] = React.useState(loading);
  const hideSpinnerTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolvedPressEffect = React.useMemo<ButtonPressEffect>(() => {
    if (disableHover) return 'none';
    if (resolvedInteractionDisabled) return 'none';
    if (pressEffect !== 'auto') return pressEffect;
    return 'scale-opacity';
  }, [disableHover, pressEffect, resolvedInteractionDisabled]);

  const pressDarkenEnabled =
    resolvedPressEffect === 'darken' || resolvedPressEffect === 'scale-darken';
  const pressScaleEnabled =
    resolvedPressEffect === 'scale' ||
    resolvedPressEffect === 'scale-darken' ||
    resolvedPressEffect === 'scale-opacity';
  const pressOpacityEnabled =
    resolvedPressEffect === 'opacity' || resolvedPressEffect === 'scale-opacity';

  const resolvedPressOverlayColor = React.useMemo(() => {
    if (!pressDarkenEnabled) return '#000000';
    if (hasGradientBackground || resolvedVariant === 'solid' || resolvedVariant === 'soft')
      return '#000000';
    return resolvedPrimary;
  }, [hasGradientBackground, pressDarkenEnabled, resolvedPrimary, resolvedVariant]);

  const resolvedPressOverlayStrength = React.useMemo(() => {
    if (!pressDarkenEnabled) return 0;
    if (hasGradientBackground || resolvedVariant === 'solid') return 0.12;
    if (resolvedVariant === 'soft') return 0.08;
    return 0.08;
  }, [hasGradientBackground, pressDarkenEnabled, resolvedVariant]);

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
    } else {
      hideSpinnerTimerRef.current = setTimeout(() => {
        setSpinnerMounted(false);
      }, loadingTiming.duration);
    }

    loadingSv.value = withTiming(loading ? 1 : 0, loadingTiming);

    return () => {
      if (hideSpinnerTimerRef.current) {
        clearTimeout(hideSpinnerTimerRef.current);
        hideSpinnerTimerRef.current = null;
      }
    };
  }, [loading, loadingSv, loadingTiming]);

  const rootAnimatedStyle = useAnimatedStyle(() => {
    const baseOpacity = resolvedVisualDisabled ? 0.55 : 1;
    const scale = pressScaleEnabled ? interpolate(pressSv.value, [0, 1], [1, 0.98]) : 1;
    const opacity = pressOpacityEnabled
      ? interpolate(pressSv.value, [0, 1], [baseOpacity, 0.84])
      : baseOpacity;
    return {
      opacity,
      transform: [{ scale }],
    };
  }, [pressOpacityEnabled, pressScaleEnabled, resolvedVisualDisabled]);

  const pressOverlayAnimatedStyle = useAnimatedStyle(() => {
    const opacity = pressDarkenEnabled
      ? interpolate(pressSv.value, [0, 1], [0, resolvedPressOverlayStrength])
      : 0;
    return { opacity };
  }, [pressDarkenEnabled, resolvedPressOverlayStrength]);

  const handlePress = React.useCallback(
    (e: any) => {
      if (resolvedInteractionDisabled) return;
      onPress?.(e);
    },
    [onPress, resolvedInteractionDisabled]
  );

  const resolvedBorderStyle = React.useMemo<ViewStyle>(() => {
    const isOutlineLike = resolvedVariant === 'outline' || dashedBorder;
    const baseBorderWidth =
      resolvedBorderWidth ?? (isOutlineLike ? { borderWidth: wp(1.5) } : undefined);
    const borderStyle = dashedBorder ? 'dashed' : 'solid';
    const borderColor =
      resolvedVisualColors.borderColor !== 'transparent'
        ? resolvedVisualColors.borderColor
        : theme.colors.border;
    return {
      ...(baseBorderWidth ?? null),
      ...(baseBorderWidth ? { borderStyle } : null),
      ...(baseBorderWidth ? { borderColor } : null),
    };
  }, [
    dashedBorder,
    resolvedBorderWidth,
    resolvedVariant,
    resolvedVisualColors.borderColor,
    theme.colors.border,
  ]);

  const resolvedIconBaseBoxStyle = React.useMemo<ViewStyle>(() => {
    if (!hasIcon) return {};
    return {
      height: resolvedIconSize,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    };
  }, [hasIcon, resolvedIconSize]);

  const resolvedLoadingSize = React.useMemo(() => {
    if (typeof loadingSize === 'number' && Number.isFinite(loadingSize)) return loadingSize;
    const baseMinH = minHeight ?? defaultMinHeight;
    const sideFromH = normalizeNumber(resolvedButtonSizeStyle.height);
    const sideFromW = normalizeNumber(resolvedButtonSizeStyle.width);
    const side = sideFromH ?? sideFromW ?? (resolvedIconOnly ? defaultIconOnlySide : baseMinH);
    return Math.max(defaultLoadingSize, Math.round(side * 0.45));
  }, [
    defaultIconOnlySide,
    defaultLoadingSize,
    defaultMinHeight,
    loadingSize,
    minHeight,
    resolvedButtonSizeStyle.height,
    resolvedButtonSizeStyle.width,
    resolvedIconOnly,
  ]);

  const spinnerSize = resolvedLoadingSize;
  const loadingTextShift = React.useMemo(() => wp(2), []);

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

  return (
    <AnimatedPressable
      {...pressableProps}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={resolvedAccessibilityLabel}
      accessibilityState={{
        ...accessibilityState,
        disabled: Boolean(resolvedInteractionDisabled),
        busy: Boolean(loading),
      }}
      disabled={resolvedInteractionDisabled}
      onPressIn={() => {
        if (resolvedInteractionDisabled || resolvedPressEffect === 'none') return;
        pressSv.value = withTiming(1, timing);
      }}
      onPressOut={() => {
        if (resolvedInteractionDisabled || resolvedPressEffect === 'none') return;
        pressSv.value = withTiming(0, timing);
      }}
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
        {GradientComponent && linearCfg ? (
          <GradientComponent
            pointerEvents="none"
            colors={linearCfg.colors}
            start={linearCfg.start}
            end={linearCfg.end}
            style={[StyleSheet.absoluteFill, resolvedRadiusStyle]}
          />
        ) : null}

        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            resolvedRadiusStyle,
            { backgroundColor: resolvedPressOverlayColor },
            pressOverlayAnimatedStyle,
          ]}
        />

        {resolvedIconOnly ? (
          <>
            <Animated.View style={[styles.centerOverlay, spinnerBoxAnimatedStyle]}>
              <LoadingSpinner
                animating={spinnerMounted}
                color={resolvedVisualColors.textColor}
                size={spinnerSize}
              />
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
              <LoadingSpinner
                animating={spinnerMounted}
                color={resolvedVisualColors.textColor}
                size={spinnerSize}
              />
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
    letterSpacing: wp(0.2),
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'center',
  },
  linkText: {
    textDecorationLine: 'underline',
  },
});
