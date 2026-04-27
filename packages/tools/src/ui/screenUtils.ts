import { Dimensions } from 'react-native';

export type ScaleRounding = 'none' | 'round' | 'floor' | 'ceil';

export type ScreenUtilsConfig = {
  baseWidth?: number;
  minFontScale?: number;
  maxFontScale?: number;
  rounding?: ScaleRounding;
};

export type ScreenUtilsOptions = ScreenUtilsConfig;

const DEFAULT_BASE_WIDTH = 375;
const DEFAULT_MIN_FONT_SCALE = 0.8;
const DEFAULT_ROUNDING: ScaleRounding = 'none';

export const DEFAULT_SCREEN_BASE_WIDTH = DEFAULT_BASE_WIDTH;
export const DEFAULT_SCREEN_MIN_FONT_SCALE = DEFAULT_MIN_FONT_SCALE;

let screenConfig: Required<Pick<ScreenUtilsConfig, 'baseWidth' | 'minFontScale' | 'rounding'>> &
  Pick<ScreenUtilsConfig, 'maxFontScale'> = {
    baseWidth: DEFAULT_BASE_WIDTH,
    minFontScale: DEFAULT_MIN_FONT_SCALE,
    maxFontScale: undefined,
    rounding: DEFAULT_ROUNDING,
  };

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const resolvePositive = (value: unknown, fallback: number): number =>
  isFiniteNumber(value) && value > 0 ? value : fallback;

const resolveNonNegative = (value: unknown, fallback: number): number =>
  isFiniteNumber(value) && value >= 0 ? value : fallback;

const resolveMaxFontScale = (
  value: unknown,
  fallback: number | undefined,
  minFontScale: number
): number | undefined => {
  if (value === undefined) return fallback;
  if (!isFiniteNumber(value) || value <= 0) return fallback;
  return Math.max(value, minFontScale);
};

const resolveRounding = (value: unknown, fallback: ScaleRounding): ScaleRounding => {
  if (value === 'round' || value === 'floor' || value === 'ceil' || value === 'none') {
    return value;
  }
  return fallback;
};

const getWindowWidth = (): number => {
  const width = Dimensions.get('window')?.width;
  return resolvePositive(width, DEFAULT_BASE_WIDTH);
};

const roundSize = (size: number, rounding: ScaleRounding): number => {
  switch (rounding) {
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

const resolveOptions = (options: ScreenUtilsOptions) => {
  const minFontScale = resolveNonNegative(options.minFontScale, screenConfig.minFontScale);
  const maxFontScale = resolveMaxFontScale(
    options.maxFontScale,
    screenConfig.maxFontScale,
    minFontScale
  );

  return {
    baseWidth: resolvePositive(options.baseWidth, screenConfig.baseWidth),
    minFontScale,
    maxFontScale,
    rounding: resolveRounding(options.rounding, screenConfig.rounding),
  };
};

export function configureScreenUtils(config: ScreenUtilsConfig = {}) {
  const next = resolveOptions(config);
  screenConfig = next;
}

export function getScreenUtilsConfig(): Required<
  Pick<ScreenUtilsConfig, 'baseWidth' | 'minFontScale' | 'rounding'>
> &
  Pick<ScreenUtilsConfig, 'maxFontScale'> {
  return { ...screenConfig };
}

export function getScreenScale(options: Pick<ScreenUtilsOptions, 'baseWidth'> = {}) {
  const baseWidth = resolvePositive(options.baseWidth, screenConfig.baseWidth);
  return getWindowWidth() / baseWidth;
}

export function wp(size: number, options: ScreenUtilsOptions = {}) {
  if (!isFiniteNumber(size)) return 0;
  const resolved = resolveOptions(options);
  return roundSize(size * getScreenScale(resolved), resolved.rounding);
}

export function sp(size: number, options: ScreenUtilsOptions = {}) {
  if (!isFiniteNumber(size)) return 0;

  const resolved = resolveOptions(options);
  const rawScale = getScreenScale(resolved);
  const fontScale = Math.max(
    resolved.minFontScale,
    resolved.maxFontScale === undefined ? rawScale : Math.min(rawScale, resolved.maxFontScale)
  );

  return roundSize(size * fontScale, resolved.rounding);
}
