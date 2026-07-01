import * as React from 'react';
import type { Theme, ThemeOverride } from './types';
import { mergeTheme } from './mergeTheme';
import { getDefaultTheme } from '../config';

type ThemeContextValue = {
  theme: Theme;
  getTheme: () => Theme;
};

// ThemeContext 用于在组件树中向下传递主题对象。
// 这里提供默认值（getDefaultTheme），这样即使应用侧没有包 ThemeProvider：
// - useTheme() 也不会返回 undefined
// - 组件仍能正常渲染（使用组件库默认主题 + 全局配置覆盖）
export const ThemeContext = React.createContext<ThemeContextValue>({
  theme: getDefaultTheme(),
  getTheme: getDefaultTheme,
});

export type ThemeProviderProps = {
  // baseTheme 允许应用侧提供“完整主题对象”作为基线（例如某个品牌主题）
  // 然后再用 theme 进行局部覆盖。
  baseTheme?: Theme;
  // theme 是覆盖对象（Partial），只需要传你要改的字段即可
  theme?: ThemeOverride;
  children: React.ReactNode;
};

export function ThemeProvider({ baseTheme, theme, children }: ThemeProviderProps) {
  const value = React.useMemo(() => {
    // 优先级（低 -> 高）：
    // 1) defaultTheme
    // 2) configureZKit({ theme })
    // 3) ThemeProvider({ baseTheme })
    // 4) ThemeProvider({ theme })
    const finalTheme = mergeTheme(baseTheme ?? getDefaultTheme(), theme);
    return { theme: finalTheme, getTheme: () => finalTheme };
  }, [baseTheme, theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
