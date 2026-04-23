import type { Theme, ThemeOverride } from './types';

// mergeTheme 用于实现“部分覆盖”体验：
// - 业务侧只改 colors.primary 时，只需传 { colors: { primary } }
// - 未覆盖字段回落到 base
export function mergeTheme(base: Theme, override?: ThemeOverride): Theme {
  if (!override) return base;
  return {
    ...base,
    ...override,
    colors: {
      ...base.colors,
      ...(override.colors ?? {}),
    },
  };
}
