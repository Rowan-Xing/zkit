import * as React from 'react';
import {
  Platform,
  StyleSheet,
  Text as RNText,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';
import { getMaxFontScale, wp } from 'y2kit-tools';
import type { Theme } from '../../theme/types';
import { useTheme } from '../../theme/useTheme';

export type TextVariant = 'body' | 'label' | 'caption' | 'title' | 'subtitle' | 'heading' | 'display';
export type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
export type TextTone =
  | 'default'
  | 'neutral'
  | 'muted'
  | 'primary'
  | 'secondary'
  | 'disabled'
  | 'onPrimary'
  | 'onSecondary'
  | 'inherit';
export type TextWeight =
  | 'regular'
  | 'medium'
  | 'semibold'
  | 'heavy'
  | 'black'
  | NonNullable<TextStyle['fontWeight']>;

type NativeTextProps = Omit<RNTextProps, 'style'>;
type TextStyleLike = StyleProp<TextStyle> | readonly TextStyleLike[];

export type TextRef = React.ComponentRef<typeof RNText>;

export interface TextProps extends NativeTextProps {
  /**
   * 语义化排版预设；`style` 只作为最终 escape hatch。
   */
  variant?: TextVariant;
  size?: TextSize;
  weight?: TextWeight;
  tone?: TextTone;
  color?: string;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
}

const WEB_NAMED_WEIGHT_MAP: Record<string, number> = {
  hairline: 100,
  thin: 100,
  ultralight: 200,
  extralight: 200,
  light: 300,
  normal: 400,
  regular: 400,
  book: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  ultrabold: 800,
  black: 900,
  heavy: 900,
};

const TEXT_SIZE_STYLES = StyleSheet.create<Record<TextSize, TextStyle>>({
  xs: {
    fontSize: wp(12),
    lineHeight: wp(16),
  },
  sm: {
    fontSize: wp(13),
    lineHeight: wp(18),
  },
  md: {
    fontSize: wp(15),
    lineHeight: wp(21),
  },
  lg: {
    fontSize: wp(17),
    lineHeight: wp(24),
  },
  xl: {
    fontSize: wp(20),
    lineHeight: wp(28),
  },
  '2xl': {
    fontSize: wp(24),
    lineHeight: wp(32),
  },
  '3xl': {
    fontSize: wp(30),
    lineHeight: wp(38),
  },
});

const VARIANT_DEFAULTS = {
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
  subtitle: {
    size: 'md',
    weight: 'regular',
  },
  heading: {
    size: '2xl',
    weight: 'bold',
  },
  display: {
    size: '3xl',
    weight: 'bold',
  },
} as const satisfies Record<TextVariant, { size: TextSize; weight: TextWeight }>;

/**
 * 统一 fontWeight 在不同平台的格式
 * iOS: 完整支持 'normal', 'bold', '100'-'900'
 * Android 9.0+: 完整支持数字权重 '100'-'900'
 * Android < 9.0: 只支持 'normal', 'bold'，中间值会被映射
 */
function normalizeFontWeight(weight: TextStyle['fontWeight']): TextStyle['fontWeight'] {
  if (weight == null) return undefined;

  const weightStr = String(weight).trim().toLowerCase();
  const compactWeight = weightStr.replace(/[\s_-]/g, '');

  let normalizedNumericWeight: number | undefined;

  // Web 常见的相对权重。由于 RN 无父级字重上下文，这里选择可预期的固定映射。
  if (compactWeight === 'lighter') normalizedNumericWeight = 300;
  if (compactWeight === 'bolder') normalizedNumericWeight = 700;

  if (normalizedNumericWeight == null && WEB_NAMED_WEIGHT_MAP[compactWeight] != null) {
    normalizedNumericWeight = WEB_NAMED_WEIGHT_MAP[compactWeight];
  }

  if (normalizedNumericWeight == null) {
    const parsed = Number.parseInt(weightStr, 10);
    if (Number.isNaN(parsed)) {
      return 'normal';
    }
    // 与 web 心智一致：允许传入任意数字，统一到 100~900 且步长 100
    normalizedNumericWeight = Math.round(parsed / 100) * 100;
  }

  const clamped = Math.max(100, Math.min(900, normalizedNumericWeight));

  // Android < 9 (API 28) 无法稳定支持中间字重，显式降级避免不同机型表现不一致
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
    case 'heavy':
      return '800';
    case 'black':
      return '900';
    default:
      return weight;
  }
}

function resolveToneColor(colors: Theme['colors'], tone: TextTone | undefined): string | undefined {
  switch (tone ?? 'default') {
    case 'inherit':
      return undefined;
    case 'primary':
      return colors.primary;
    case 'secondary':
      return colors.onSecondary;
    case 'muted':
      return colors.muted;
    case 'disabled':
      return colors.disabled;
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

function normalizeStyleFontWeight(style: TextStyleLike): TextStyleLike {
  if (!style) return style;

  if (Array.isArray(style)) {
    let normalizedItems: TextStyleLike[] | undefined;

    for (let index = 0; index < style.length; index += 1) {
      const item = style[index] as TextStyleLike;
      const normalizedItem = normalizeStyleFontWeight(item);

      if (normalizedItem !== item) {
        if (!normalizedItems) {
          normalizedItems = style.slice(0, index) as TextStyleLike[];
        }
        normalizedItems.push(normalizedItem);
      } else if (normalizedItems) {
        normalizedItems.push(item);
      }
    }

    return normalizedItems ?? style;
  }

  if (typeof style !== 'object') return style;

  const textStyle = style as TextStyle;
  const fontWeight = textStyle.fontWeight;
  if (fontWeight == null) return style;

  const normalizedFontWeight = normalizeFontWeight(fontWeight);
  if (normalizedFontWeight === fontWeight) return style;

  return {
    ...textStyle,
    fontWeight: normalizedFontWeight,
  };
}

const TextBase = React.forwardRef<TextRef, TextProps>(function Text(
  {
    variant = 'body',
    size,
    weight,
    tone = 'default',
    color,
    align,
    style,
    maxFontSizeMultiplier,
    children,
    ...rest
  },
  ref
) {
  const theme = useTheme();
  const variantDefaults = VARIANT_DEFAULTS[variant];
  const resolvedSize = size ?? variantDefaults.size;
  const resolvedWeight = weight ?? variantDefaults.weight;
  const resolvedColor = color ?? resolveToneColor(theme.colors, tone);

  const semanticStyle = React.useMemo<TextStyle>(() => {
    const nextStyle: TextStyle = {
      fontWeight: normalizeFontWeight(resolveTextWeight(resolvedWeight)),
    };

    if (resolvedColor !== undefined) {
      nextStyle.color = resolvedColor;
    }

    if (align !== undefined) {
      nextStyle.textAlign = align;
    }

    return nextStyle;
  }, [align, resolvedColor, resolvedWeight]);

  const normalizedStyle = React.useMemo(() => normalizeStyleFontWeight(style) as StyleProp<TextStyle>, [style]);
  const sizeStyle = TEXT_SIZE_STYLES[resolvedSize];

  const finalStyle = React.useMemo<StyleProp<TextStyle>>(
    () => (normalizedStyle ? [sizeStyle, semanticStyle, normalizedStyle] : [sizeStyle, semanticStyle]),
    [normalizedStyle, semanticStyle, sizeStyle]
  );

  return (
    <RNText
      ref={ref}
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? getMaxFontScale()}
      style={finalStyle}
    >
      {children}
    </RNText>
  );
});

TextBase.displayName = 'Text';

export const Text = TextBase;
