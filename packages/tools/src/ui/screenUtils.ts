import { Dimensions } from 'react-native';

export type ScreenUtilsOptions = {
  baseWidth?: number;
  minFontScale?: number;
};

export function wp(size: number, options: ScreenUtilsOptions = {}) {
  const { baseWidth = 375 } = options;
  const { width } = Dimensions.get('window');
  return (width / baseWidth) * size;
}

export function sp(size: number, options: ScreenUtilsOptions = {}) {
  const { baseWidth = 375, minFontScale = 0.8 } = options;
  const { width } = Dimensions.get('window');
  const scale = width / baseWidth;
  const newSize = size * scale;
  return Math.max(newSize, size * minFontScale);
}

