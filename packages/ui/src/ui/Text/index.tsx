import * as React from 'react';
import { Platform, StyleSheet, Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { getMaxFontScale } from 'y2kit-tools';

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
  if (Platform.OS === 'android' && Number(Platform.Version) < 28) {
    return clamped >= 600 ? 'bold' : 'normal';
  }

  if (clamped === 400) return 'normal';
  if (clamped === 700) return 'bold';
  return String(clamped) as TextStyle['fontWeight'];
}

export type TextProps = RNTextProps;

export function Text({ style, children, ...rest }: TextProps) {
  const finalStyle = React.useMemo(() => {
    const flat = StyleSheet.flatten(style);
    if (!flat) return undefined;

    const { fontWeight, ...restStyle } = flat;

    // If no fontWeight specified, return as-is
    if (fontWeight == null) return flat;

    const normalized = normalizeFontWeight(fontWeight);

    return {
      ...restStyle,
      fontWeight: normalized,
    };
  }, [style]);

  return (
    <RNText maxFontSizeMultiplier={getMaxFontScale()} style={finalStyle} {...rest}>
      {children}
    </RNText>
  );
}
