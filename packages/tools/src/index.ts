export {
  configureViewportScale,
  getViewportFontScale,
  getViewportMetrics,
  getViewportScale,
  getViewportScaleConfig,
  scaleFont,
  scaleSize,
  sp,
  subscribeViewportMetrics,
  wp,
  DEFAULT_VIEWPORT_BASE_WIDTH,
  DEFAULT_VIEWPORT_FALLBACK_WIDTH,
  DEFAULT_VIEWPORT_MAX_FONT_SCALE,
  DEFAULT_VIEWPORT_MAX_SCALE,
  DEFAULT_VIEWPORT_MIN_FONT_SCALE,
  DEFAULT_VIEWPORT_MIN_SCALE,
  DEFAULT_VIEWPORT_SCALE_ROUNDING,
} from './layout/scaling';
export type {
  ScaleRounding,
  ViewportMetrics,
  ViewportMetricsListener,
  ViewportScaleConfig,
  ViewportScaleOptions,
  ViewportScaleSnapshot,
} from './layout/scaling';

export {
  configureFontSizeMultiplier,
  getGlobalTextScalingLimitSnapshot,
  getMaxFontSizeMultiplier,
  installGlobalTextScalingLimit,
  uninstallGlobalTextScalingLimit,
  DEFAULT_MAX_FONT_SIZE_MULTIPLIER,
} from './accessibility/fontScaling';
export type {
  FontSizeMultiplierConfig,
  GlobalTextScalingLimitOptions,
  GlobalTextScalingLimitSnapshot,
} from './accessibility/fontScaling';

export { getDeviceBrand, resolveDeviceBrand } from './device/deviceBrand';
export type { DeviceBrand, DeviceBrandInput } from './device/deviceBrand';

export { createRouterGuard } from './navigation/routerGuard';
export type {
  RouterGuardBlockReason,
  RouterGuardController,
  RouterGuardEvent,
  RouterGuardOptions,
  RouterGuardSnapshot,
  RouterGuardUnlockReason,
  RouterLike,
  RouterMethod,
} from './navigation/routerGuard';

export {
  configureRuntimeConfig,
  getRuntimeConfig,
  getRuntimeString,
  getRuntimeValue,
  hasRuntimeValue,
  requireRuntimeString,
  resetRuntimeConfig,
  tryGetRuntimeConfig,
  tryGetRuntimeString,
} from './config/runtimeConfig';
export type {
  RuntimeConfig,
  RuntimeConfigError,
  RuntimeConfigErrorCode,
  RuntimeConfigPrimitive,
  RuntimeConfigSource,
  RuntimeConfigValue,
} from './config/runtimeConfig';
