import * as React from 'react';
import { ThemeContext } from './ThemeProvider';

// useTheme 用于在组件内部读取当前主题
// - 如果应用侧包了 ThemeProvider：返回合并后的主题
// - 如果没有包 ThemeProvider：返回 defaultTheme（由 ThemeContext 默认值提供）
export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  return ctx.getTheme?.() ?? ctx.theme;
}
