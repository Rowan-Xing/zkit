import * as React from 'react';
import {
  Platform,
  StyleSheet,
  Text as RNText,
  type AccessibilityState,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
  processColor,
  useWindowDimensions,
} from 'react-native';
import { getMaxFontSizeMultiplier, wp } from 'zkit-tools';
import type { Theme } from '../../theme/types';
import { useTheme } from '../../theme/useTheme';

export type TextVariant = 'body' | 'label' | 'caption' | 'title' | 'heading' | 'display' | 'code';
export type TextSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
export type TextSizeValue = TextSize | number;
export type TextTone =
  | 'default'
  | 'neutral'
  | 'muted'
  | 'subtle'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'disabled'
  | 'inverse'
  | 'onPrimary'
  | 'onSecondary'
  | 'inherit';
export type TextWeight =
  | 'regular'
  | 'medium'
  | 'semibold'
  | 'bold'
  | 'heavy'
  | 'black'
  | NonNullable<TextStyle['fontWeight']>;
export type TextTruncate = boolean | number;

type NativeTextProps = Omit<RNTextProps, 'style' | 'disabled' | 'numberOfLines' | 'ellipsizeMode'>;

export type TextRef = React.ComponentRef<typeof RNText>;

export interface TextProps extends NativeTextProps {
  /**
   * Semantic typography preset. Prefer this over raw font styles.
   */
  variant?: TextVariant;
  /**
   * Named type scale token, or a numeric native font size.
   */
  size?: TextSizeValue;
  /**
   * Optional line height in design pixels. Style still wins as the final escape hatch.
   */
  lineHeight?: number;
  weight?: TextWeight;
  tone?: TextTone;
  /**
   * Theme color token, semantic token, or processable native color.
   */
  color?: string;
  align?: TextStyle['textAlign'];
  transform?: TextStyle['textTransform'];
  truncate?: TextTruncate;
  tabularNumbers?: boolean;
  disabled?: boolean;
  numberOfLines?: RNTextProps['numberOfLines'];
  ellipsizeMode?: RNTextProps['ellipsizeMode'];
  style?: StyleProp<TextStyle>;
}

type TypographyToken = {
  fontSize: number;
  lineHeight: number;
};

type VariantToken = {
  size: TextSize;
  weight: TextWeight;
  fontFamily?: TextStyle['fontFamily'];
};

const SEMANTIC_COLORS = {
  danger: '#DC2626',
  error: '#DC2626',
  info: '#2563EB',
  success: '#16A34A',
  warn: '#D97706',
  warning: '#D97706',
} as const;

const SIZE_TOKENS = {
  '2xs': { fontSize: 11, lineHeight: 14 },
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 13, lineHeight: 18 },
  md: { fontSize: 15, lineHeight: 21 },
  lg: { fontSize: 17, lineHeight: 24 },
  xl: { fontSize: 20, lineHeight: 28 },
  '2xl': { fontSize: 24, lineHeight: 32 },
  '3xl': { fontSize: 30, lineHeight: 38 },
  '4xl': { fontSize: 36, lineHeight: 44 },
} as const satisfies Record<TextSize, TypographyToken>;

const MONOSPACE_FONT_FAMILY = Platform.select({
  android: 'monospace',
  ios: 'Menlo',
  web: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  default: 'monospace',
});

const VARIANT_TOKENS = {
  body: {
    size: 'md',
    weight: 'regular',
  },
  label: {
    size: 'sm',
    weight: 'medium',
  },
  caption: {
    size: 'xs',
    weight: 'regular',
  },
  title: {
    size: 'lg',
    weight: 'semibold',
  },
  heading: {
    size: '2xl',
    weight: 'bold',
  },
  display: {
    size: '3xl',
    weight: 'bold',
  },
  code: {
    size: 'sm',
    weight: 'regular',
    fontFamily: MONOSPACE_FONT_FAMILY,
  },
} as const satisfies Record<TextVariant, VariantToken>;

const WEB_NAMED_WEIGHT_MAP: Record<string, number> = {
  black: 900,
  bold: 700,
  book: 400,
  demibold: 600,
  extrabold: 800,
  extralight: 200,
  hairline: 100,
  heavy: 900,
  light: 300,
  medium: 500,
  normal: 400,
  regular: 400,
  semibold: 600,
  thin: 100,
  ultrabold: 800,
  ultralight: 200,
};

const baseStyles = StyleSheet.create({
  root: {
    includeFontPadding: false,
    margin: 0,
    padding: 0,
  },
});

const DEFAULT_LINE_HEIGHT_RATIO = 1.4;
const NestedTextContext = React.createContext(false);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isProcessableColor(color: string) {
  return processColor(color) != null;
}

function normalizeFontWeight(weight: TextStyle['fontWeight']): TextStyle['fontWeight'] {
  if (weight == null) return undefined;

  const weightStr = String(weight).trim().toLowerCase();
  const compactWeight = weightStr.replace(/[\s_-]/g, '');

  let normalizedNumericWeight: number | undefined;

  if (compactWeight === 'lighter') normalizedNumericWeight = 300;
  if (compactWeight === 'bolder') normalizedNumericWeight = 700;

  if (normalizedNumericWeight == null && WEB_NAMED_WEIGHT_MAP[compactWeight] != null) {
    normalizedNumericWeight = WEB_NAMED_WEIGHT_MAP[compactWeight];
  }

  if (normalizedNumericWeight == null) {
    const parsed = Number.parseInt(weightStr, 10);
    if (Number.isNaN(parsed)) return 'normal';
    normalizedNumericWeight = Math.round(parsed / 100) * 100;
  }

  const clamped = Math.max(100, Math.min(900, normalizedNumericWeight));
  const androidApiLevel =
    typeof Platform.Version === 'number' ? Platform.Version : Number.parseInt(String(Platform.Version), 10);

  if (Platform.OS === 'android' && Number.isFinite(androidApiLevel) && androidApiLevel < 28) {
    return clamped >= 600 ? 'bold' : 'normal';
  }

  if (clamped === 400) return 'normal';
  if (clamped === 700) return 'bold';
  return String(clamped) as TextStyle['fontWeight'];
}

function resolveTextWeight(weight: TextWeight): TextStyle['fontWeight'] {
  switch (weight) {
    case 'regular':
      return '400';
    case 'medium':
      return '500';
    case 'semibold':
      return '600';
    case 'bold':
      return '700';
    case 'heavy':
      return '800';
    case 'black':
      return '900';
    default:
      return weight;
  }
}

function resolveToneColor(colors: Theme['colors'], tone: TextTone): string | undefined {
  switch (tone) {
    case 'inherit':
      return undefined;
    case 'primary':
      return colors.primary;
    case 'success':
      return SEMANTIC_COLORS.success;
    case 'warning':
      return SEMANTIC_COLORS.warning;
    case 'danger':
      return SEMANTIC_COLORS.danger;
    case 'info':
      return SEMANTIC_COLORS.info;
    case 'muted':
      return colors.muted;
    case 'subtle':
      return colors.disabled;
    case 'disabled':
      return colors.disabled;
    case 'inverse':
    case 'onPrimary':
      return colors.onPrimary;
    case 'onSecondary':
      return colors.onSecondary;
    case 'default':
    case 'neutral':
    default:
      return colors.onSurface;
  }
}

function resolveColorToken(input: string | undefined, fallback: string | undefined, theme: Theme) {
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
                    : key === 'subtle' || key === 'disabled'
                      ? theme.colors.disabled
                      : SEMANTIC_COLORS[key as keyof typeof SEMANTIC_COLORS] ?? key;

  return isProcessableColor(resolved) ? resolved : fallback;
}

function resolveTypographyToken(size: TextSizeValue): TypographyToken {
  if (typeof size === 'string') {
    return SIZE_TOKENS[size] ?? SIZE_TOKENS.md;
  }

  if (!isFiniteNumber(size)) return SIZE_TOKENS.md;

  const fontSize = Math.max(0, size);
  return {
    fontSize,
    lineHeight: Math.ceil(fontSize * DEFAULT_LINE_HEIGHT_RATIO),
  };
}

function shouldScaleTypographyToken(size: TextSizeValue) {
  return typeof size === 'string' || !isFiniteNumber(size);
}

function readStyleNumber(style: TextStyle | undefined, key: 'fontSize' | 'lineHeight') {
  const value = style?.[key];
  return isFiniteNumber(value) ? Math.max(0, value) : undefined;
}

function resolveTypographyStyle({
  explicitLineHeight,
  hasExplicitSize,
  shouldUseVariantDefaults,
  size,
  styleFontSize,
  styleLineHeight,
}: {
  explicitLineHeight: number | undefined;
  hasExplicitSize: boolean;
  shouldUseVariantDefaults: boolean;
  size: TextSizeValue;
  styleFontSize: number | undefined;
  styleLineHeight: number | undefined;
}): TextStyle | undefined {
  const shouldResolveSize = hasExplicitSize || shouldUseVariantDefaults;
  const token = shouldResolveSize ? resolveTypographyToken(size) : undefined;
  const shouldScaleToken = shouldResolveSize ? shouldScaleTypographyToken(size) : false;
  const nextStyle: TextStyle = {};
  let hasStyle = false;

  if (token) {
    nextStyle.fontSize = shouldScaleToken ? wp(token.fontSize) : token.fontSize;
    hasStyle = true;
  }

  if (styleLineHeight != null) {
    return hasStyle ? nextStyle : undefined;
  }

  if (isFiniteNumber(explicitLineHeight)) {
    nextStyle.lineHeight = Math.max(0, explicitLineHeight);
    hasStyle = true;
  } else if (token && styleFontSize == null) {
    nextStyle.lineHeight = shouldScaleToken ? wp(token.lineHeight) : token.lineHeight;
    hasStyle = true;
  }

  return hasStyle ? nextStyle : undefined;
}

function normalizeStyleFontWeight(
  style: StyleProp<TextStyle>,
  flattenedStyle: TextStyle | undefined
): StyleProp<TextStyle> {
  if (!style) return style;

  const fontWeight = flattenedStyle?.fontWeight;
  if (fontWeight == null) return style;

  const normalizedFontWeight = normalizeFontWeight(fontWeight);
  if (normalizedFontWeight === fontWeight) return style;

  return [style, { fontWeight: normalizedFontWeight }];
}

function resolveNumberOfLines(truncate: TextTruncate | undefined, numberOfLines: RNTextProps['numberOfLines']) {
  if (truncate === true) return 1;
  if (typeof truncate === 'number' && Number.isFinite(truncate)) {
    return Math.max(1, Math.floor(truncate));
  }
  return numberOfLines;
}

function resolveAccessibilityState(
  disabled: boolean,
  accessibilityState: AccessibilityState | undefined
): AccessibilityState | undefined {
  if (!disabled) return accessibilityState;
  return {
    ...accessibilityState,
    disabled: true,
  };
}

const TextBase = React.forwardRef<TextRef, TextProps>(function Text(
  {
    variant: variantProp,
    size,
    lineHeight,
    weight,
    tone = 'default',
    color,
    align,
    transform,
    truncate,
    tabularNumbers = false,
    disabled = false,
    style,
    maxFontSizeMultiplier,
    allowFontScaling,
    numberOfLines,
    ellipsizeMode,
    accessibilityState,
    children,
    ...rest
  },
  ref
) {
  const nested = React.useContext(NestedTextContext);
  const theme = useTheme();
  const { width: viewportWidth } = useWindowDimensions();
  const hasExplicitVariant = variantProp != null;
  const shouldUseVariantDefaults = !nested || hasExplicitVariant;
  const variant = variantProp ?? 'body';
  const variantToken: VariantToken = VARIANT_TOKENS[variant] ?? VARIANT_TOKENS.body;
  const hasExplicitSize = size != null;
  const resolvedSize = size ?? variantToken.size;
  const resolvedWeight = weight ?? (shouldUseVariantDefaults ? variantToken.weight : undefined);
  const toneColor = resolveToneColor(theme.colors, disabled ? 'disabled' : tone);
  const resolvedColor = resolveColorToken(color, toneColor, theme);
  const resolvedNumberOfLines = resolveNumberOfLines(truncate, numberOfLines);
  const resolvedEllipsizeMode = truncate ? (ellipsizeMode ?? 'tail') : ellipsizeMode;
  const resolvedAccessibilityState = React.useMemo(
    () => resolveAccessibilityState(disabled, accessibilityState),
    [accessibilityState, disabled]
  );

  const flattenedStyle = React.useMemo(() => StyleSheet.flatten(style), [style]);
  const styleFontSize = readStyleNumber(flattenedStyle, 'fontSize');
  const styleLineHeight = readStyleNumber(flattenedStyle, 'lineHeight');
  const typographyStyle = React.useMemo(
    () =>
      resolveTypographyStyle({
        explicitLineHeight: lineHeight,
        hasExplicitSize,
        shouldUseVariantDefaults,
        size: resolvedSize,
        styleFontSize,
        styleLineHeight,
      }),
    [
      hasExplicitSize,
      lineHeight,
      resolvedSize,
      shouldUseVariantDefaults,
      styleFontSize,
      styleLineHeight,
      viewportWidth,
    ]
  );

  const semanticStyle = React.useMemo<TextStyle>(() => {
    const nextStyle: TextStyle = {
      fontVariant: tabularNumbers ? ['tabular-nums'] : undefined,
      textAlign: align,
      textTransform: transform,
    };

    if (shouldUseVariantDefaults && variantToken.fontFamily !== undefined) {
      nextStyle.fontFamily = variantToken.fontFamily;
    }

    if (resolvedWeight !== undefined) {
      nextStyle.fontWeight = normalizeFontWeight(resolveTextWeight(resolvedWeight));
    }

    if (resolvedColor !== undefined) {
      nextStyle.color = resolvedColor;
    }

    return nextStyle;
  }, [
    align,
    resolvedColor,
    resolvedWeight,
    shouldUseVariantDefaults,
    tabularNumbers,
    transform,
    variantToken.fontFamily,
  ]);

  const normalizedStyle = React.useMemo(() => normalizeStyleFontWeight(style, flattenedStyle), [flattenedStyle, style]);
  const finalStyle = React.useMemo<StyleProp<TextStyle>>(
    () =>
      normalizedStyle
        ? [baseStyles.root, typographyStyle, semanticStyle, normalizedStyle]
        : [baseStyles.root, typographyStyle, semanticStyle],
    [normalizedStyle, semanticStyle, typographyStyle]
  );

  return (
    <NestedTextContext.Provider value>
      <RNText
        ref={ref}
        {...rest}
        accessibilityState={resolvedAccessibilityState}
        allowFontScaling={allowFontScaling}
        disabled={disabled}
        ellipsizeMode={resolvedEllipsizeMode}
        maxFontSizeMultiplier={
          allowFontScaling === false ? maxFontSizeMultiplier : (maxFontSizeMultiplier ?? getMaxFontSizeMultiplier())
        }
        numberOfLines={resolvedNumberOfLines}
        style={finalStyle}
      >
        {children}
      </RNText>
    </NestedTextContext.Provider>
  );
});

TextBase.displayName = 'Text';

export const Text = React.memo(TextBase);
Text.displayName = 'Text';
