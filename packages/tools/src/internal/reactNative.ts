declare const require: undefined | ((id: string) => unknown);

export type ReactNativePlatformOS =
  | 'android'
  | 'ios'
  | 'macos'
  | 'native'
  | 'web'
  | 'windows'
  | string;

export type ReactNativeWindowMetrics = {
  width?: number;
  height?: number;
  scale?: number;
  fontScale?: number;
};

type ReactNativeDimensionsChange = {
  window?: ReactNativeWindowMetrics;
  screen?: ReactNativeWindowMetrics;
};

type ReactNativeDimensionsSubscription = {
  remove?: () => void;
};

export type ReactNativeModuleLike = {
  Dimensions?: {
    get?: (dimension: 'window' | 'screen') => ReactNativeWindowMetrics;
    addEventListener?: (
      event: 'change',
      listener: (payload: ReactNativeDimensionsChange) => void
    ) => ReactNativeDimensionsSubscription | (() => void) | undefined;
  };
  PixelRatio?: {
    get?: () => number;
    getFontScale?: () => number;
    roundToNearestPixel?: (size: number) => number;
  };
  Platform?: {
    OS?: ReactNativePlatformOS;
    constants?: Record<string, unknown>;
  };
  Text?: unknown;
  TextInput?: unknown;
};

let cachedReactNative: ReactNativeModuleLike | null | undefined;

export function getReactNative(): ReactNativeModuleLike | null {
  if (cachedReactNative !== undefined) return cachedReactNative;

  if (typeof require !== 'function') {
    cachedReactNative = null;
    return cachedReactNative;
  }

  try {
    const loaded = require('react-native');
    cachedReactNative = loaded && typeof loaded === 'object'
      ? (loaded as ReactNativeModuleLike)
      : null;
  } catch {
    cachedReactNative = null;
  }

  return cachedReactNative;
}

export function getReactNativePlatformOS(): ReactNativePlatformOS | 'unknown' {
  const os = getReactNative()?.Platform?.OS;
  return typeof os === 'string' && os ? os : 'unknown';
}
