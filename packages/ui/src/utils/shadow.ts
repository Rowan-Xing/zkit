import { Platform, processColor, type ViewStyle } from 'react-native';

export type ShadowStyleOptions = {
  color?: string;
  elevation?: number;
  offsetX?: number;
  offsetY?: number;
  opacity?: number;
  radius?: number;
};

function normalizeOpacity(opacity: number) {
  if (!Number.isFinite(opacity)) return 1;
  return Math.max(0, Math.min(1, opacity));
}

function colorToRgba(color: string, opacity: number) {
  const processed = processColor(color);
  if (typeof processed !== 'number') return undefined;

  const normalized = processed >>> 0;
  const r = (normalized >> 16) & 255;
  const g = (normalized >> 8) & 255;
  const b = normalized & 255;
  return `rgba(${r},${g},${b},${normalizeOpacity(opacity)})`;
}

function resolveWebShadowColor(color: string, opacity: number) {
  return colorToRgba(color, opacity) ?? color;
}

export function createShadowStyle({
  color = '#000000',
  elevation,
  offsetX = 0,
  offsetY = 0,
  opacity = 0.14,
  radius = 0,
}: ShadowStyleOptions): ViewStyle {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `${offsetX}px ${offsetY}px ${radius}px ${resolveWebShadowColor(color, opacity)}`,
    } as ViewStyle;
  }

  const style: ViewStyle = {
    shadowColor: color,
    shadowOffset: { width: offsetX, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
  };

  if (elevation !== undefined) {
    style.elevation = elevation;
  }

  return style;
}
