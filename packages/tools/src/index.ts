export {
  wp,
  sp,
  configureScreenUtils,
  getScreenScale,
  getScreenUtilsConfig,
  DEFAULT_SCREEN_BASE_WIDTH,
  DEFAULT_SCREEN_MIN_FONT_SCALE,
} from './ui/screenUtils';
export type { ScaleRounding, ScreenUtilsConfig, ScreenUtilsOptions } from './ui/screenUtils';

export {
  applyGlobalFontScale,
  configureFontScaling,
  getMaxFontScale,
  DEFAULT_MAX_FONT_SCALE,
  MAX_FONT_SCALE,
} from './ui/fontScaling';
export type { ApplyGlobalFontScaleOptions, FontScalingConfig } from './ui/fontScaling';

export { getPhoneBrand, resolvePhoneBrand } from './device/getPhoneBrand';
export type { PhoneBrand, PhoneBrandInput } from './device/getPhoneBrand';

export { initRouterGuard } from './navigation/routerGuard';
export type {
  RouterGuardEvent,
  RouterGuardOptions,
  RouterLike,
  RouterMethod,
  RouterGuardUnlockReason,
} from './navigation/routerGuard';

export {
  getExtra,
  getEnv,
  getRequiredEnv,
  getRuntimeConfig,
  hasEnv,
  tryGetEnv,
} from './config/runtimeConfig';
export type { RuntimeConfig } from './config/runtimeConfig';
export { default as runtimeConfig } from './config/runtimeConfig';
