export { wp, sp } from './ui/screenUtils';
export type { ScreenUtilsOptions } from './ui/screenUtils';

export {
  applyGlobalFontScale,
  configureFontScaling,
  getMaxFontScale,
  DEFAULT_MAX_FONT_SCALE,
  MAX_FONT_SCALE,
} from './ui/fontScaling';
export type { ApplyGlobalFontScaleOptions, FontScalingConfig } from './ui/fontScaling';

export { getPhoneBrand } from './device/getPhoneBrand';
export type { PhoneBrand } from './device/getPhoneBrand';

export { initRouterGuard } from './navigation/routerGuard';
export type {
  RouterGuardOptions,
  RouterLike,
} from './navigation/routerGuard';

export { getExtra, getEnv, getRequiredEnv } from './config/runtimeConfig';
export { default as runtimeConfig } from './config/runtimeConfig';
