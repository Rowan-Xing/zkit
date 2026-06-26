import {
  clamp,
  isFiniteNumber,
  resolveNonNegativeNumber,
  resolvePositiveNumber,
} from '../internal/number';
import { getReactNative, type ReactNativeWindowMetrics } from '../internal/reactNative';

export type ScaleRounding = 'none' | 'pixel' | 'round' | 'floor' | 'ceil';

export type ViewportMetrics = {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
};

export type ViewportScaleConfig = {
  baseWidth?: number;
  fallbackWidth?: number;
  minScale?: number;
  maxScale?: number;
  minFontScale?: number;
  maxFontScale?: number;
  rounding?: ScaleRounding;
};

export type ViewportScaleOptions = ViewportScaleConfig;

export type ViewportScaleSnapshot = Required<ViewportScaleConfig>;

export type ViewportMetricsListener = (metrics: ViewportMetrics) => void;

export const DEFAULT_VIEWPORT_BASE_WIDTH = 375;
export const DEFAULT_VIEWPORT_FALLBACK_WIDTH = DEFAULT_VIEWPORT_BASE_WIDTH;
export const DEFAULT_VIEWPORT_MIN_SCALE = 0.85;
export const DEFAULT_VIEWPORT_MAX_SCALE = 1.2;
export const DEFAULT_VIEWPORT_MIN_FONT_SCALE = 0.85;
export const DEFAULT_VIEWPORT_MAX_FONT_SCALE = 1.2;
export const DEFAULT_VIEWPORT_SCALE_ROUNDING: ScaleRounding = 'pixel';

const listeners = new Set<ViewportMetricsListener>();

let removeDimensionsListener: (() => void) | null = null;
let scaleConfig: ViewportScaleSnapshot = {
  baseWidth: DEFAULT_VIEWPORT_BASE_WIDTH,
  fallbackWidth: DEFAULT_VIEWPORT_FALLBACK_WIDTH,
  minScale: DEFAULT_VIEWPORT_MIN_SCALE,
  maxScale: DEFAULT_VIEWPORT_MAX_SCALE,
  minFontScale: DEFAULT_VIEWPORT_MIN_FONT_SCALE,
  maxFontScale: DEFAULT_VIEWPORT_MAX_FONT_SCALE,
  rounding: DEFAULT_VIEWPORT_SCALE_ROUNDING,
};

const resolveRounding = (value: unknown, fallback: ScaleRounding): ScaleRounding => {
  switch (value) {
    case 'none':
    case 'pixel':
    case 'round':
    case 'floor':
    case 'ceil':
      return value;
    default:
      return fallback;
  }
};

const resolveScaleConfig = (options?: ViewportScaleOptions): ViewportScaleSnapshot => {
  if (!options) return scaleConfig;

  const baseWidth = resolvePositiveNumber(options.baseWidth, scaleConfig.baseWidth);
  const fallbackWidth = resolvePositiveNumber(options.fallbackWidth, scaleConfig.fallbackWidth);
  const minScale = resolveNonNegativeNumber(options.minScale, scaleConfig.minScale);
  const maxScale = Math.max(
    minScale,
    resolvePositiveNumber(options.maxScale, scaleConfig.maxScale)
  );
  const minFontScale = resolveNonNegativeNumber(options.minFontScale, scaleConfig.minFontScale);
  const maxFontScale = Math.max(
    minFontScale,
    resolvePositiveNumber(options.maxFontScale, scaleConfig.maxFontScale)
  );

  return {
    baseWidth,
    fallbackWidth,
    minScale,
    maxScale,
    minFontScale,
    maxFontScale,
    rounding: resolveRounding(options.rounding, scaleConfig.rounding),
  };
};

const normalizeMetrics = (
  metrics: ReactNativeWindowMetrics | undefined,
  fallbackWidth: number
): ViewportMetrics => {
  const rn = getReactNative();
  const pixelRatio = rn?.PixelRatio;
  const ratio = pixelRatio?.get?.();
  const fontScale = pixelRatio?.getFontScale?.();
  const width = resolvePositiveNumber(metrics?.width, fallbackWidth);

  return {
    width,
    height: resolvePositiveNumber(metrics?.height, width),
    scale: resolvePositiveNumber(metrics?.scale, resolvePositiveNumber(ratio, 1)),
    fontScale: resolvePositiveNumber(metrics?.fontScale, resolvePositiveNumber(fontScale, 1)),
  };
};

const readViewportMetrics = (fallbackWidth = scaleConfig.fallbackWidth): ViewportMetrics => {
  const metrics = getReactNative()?.Dimensions?.get?.('window');
  return normalizeMetrics(metrics, fallbackWidth);
};

const notifyViewportMetricsChange = (metrics: ViewportMetrics) => {
  for (const listener of Array.from(listeners)) {
    listener(metrics);
  }
};

const ensureDimensionsListener = () => {
  if (removeDimensionsListener || listeners.size === 0) return;

  const addEventListener = getReactNative()?.Dimensions?.addEventListener;
  if (typeof addEventListener !== 'function') return;

  const subscription = addEventListener('change', (payload) => {
    notifyViewportMetricsChange(normalizeMetrics(payload?.window, scaleConfig.fallbackWidth));
  });

  if (typeof subscription === 'function') {
    removeDimensionsListener = subscription;
  } else if (typeof subscription?.remove === 'function') {
    removeDimensionsListener = () => subscription.remove?.();
  }
};

const teardownDimensionsListenerIfIdle = () => {
  if (listeners.size > 0 || !removeDimensionsListener) return;
  const remove = removeDimensionsListener;
  removeDimensionsListener = null;
  remove();
};

const getScale = (metrics: ViewportMetrics, config: ViewportScaleSnapshot): number =>
  clamp(metrics.width / config.baseWidth, config.minScale, config.maxScale);

const getFontScale = (metrics: ViewportMetrics, config: ViewportScaleSnapshot): number =>
  clamp(metrics.width / config.baseWidth, config.minFontScale, config.maxFontScale);

const roundToNearestPixel = (size: number): number => {
  const round = getReactNative()?.PixelRatio?.roundToNearestPixel;
  if (typeof round === 'function') return round(size);
  return Math.round(size * 100) / 100;
};

const applyRounding = (size: number, rounding: ScaleRounding): number => {
  switch (rounding) {
    case 'pixel':
      return roundToNearestPixel(size);
    case 'round':
      return Math.round(size);
    case 'floor':
      return Math.floor(size);
    case 'ceil':
      return Math.ceil(size);
    case 'none':
    default:
      return size;
  }
};

export function configureViewportScale(config: ViewportScaleConfig = {}): ViewportScaleSnapshot {
  scaleConfig = resolveScaleConfig(config);
  return getViewportScaleConfig();
}

export function getViewportScaleConfig(): ViewportScaleSnapshot {
  return { ...scaleConfig };
}

export function getViewportMetrics(): ViewportMetrics {
  return readViewportMetrics();
}

export function subscribeViewportMetrics(listener: ViewportMetricsListener): () => void {
  listeners.add(listener);
  ensureDimensionsListener();
  listener(readViewportMetrics());

  return () => {
    listeners.delete(listener);
    teardownDimensionsListenerIfIdle();
  };
}

export function getViewportScale(
  options?: Pick<ViewportScaleOptions, 'baseWidth' | 'fallbackWidth' | 'minScale' | 'maxScale'>
): number {
  const config = resolveScaleConfig(options);
  return getScale(readViewportMetrics(config.fallbackWidth), config);
}

export function getViewportFontScale(
  options?: Pick<
    ViewportScaleOptions,
    'baseWidth' | 'fallbackWidth' | 'minFontScale' | 'maxFontScale'
  >
): number {
  const config = resolveScaleConfig(options);
  return getFontScale(readViewportMetrics(config.fallbackWidth), config);
}

export function scaleSize(size: number, options?: ViewportScaleOptions): number {
  if (!isFiniteNumber(size)) return 0;
  const config = resolveScaleConfig(options);
  const value = size * getScale(readViewportMetrics(config.fallbackWidth), config);
  return applyRounding(value, config.rounding);
}

export function scaleFont(size: number, options?: ViewportScaleOptions): number {
  if (!isFiniteNumber(size)) return 0;
  const config = resolveScaleConfig(options);
  const value = size * getFontScale(readViewportMetrics(config.fallbackWidth), config);
  return applyRounding(value, config.rounding);
}

export const wp = scaleSize;
export const sp = scaleFont;
