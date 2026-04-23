import type { Theme } from './types';

// defaultTheme 是组件库的默认主题：
// - 当应用侧不包 ThemeProvider 时，组件会使用这套默认颜色
// - 当应用侧包了 ThemeProvider 且只覆盖部分字段时，未覆盖的字段也会从这里补齐
export const defaultTheme: Theme = {
  colors: {
    // 默认主色（偏深色），适合作为按钮等强调元素背景
    primary: '#111827',
    // 主色上的文字/图标颜色
    onPrimary: '#FFFFFF',

    // 默认次要色（浅背景）
    secondary: '#EEF2FF',
    // 次要色上的文字/图标颜色
    onSecondary: '#111827',

    // 默认表面背景（卡片、控件背景）
    surface: '#FFFFFF',
    // 表面上的文字/图标颜色
    onSurface: '#111827',

    // 默认边框色
    border: '#d9d9d9',
    // 弱化文字色
    muted: '#6B7280',
    // 禁用态颜色（这里复用 muted）
    disabled: '#6B7280',
  },
};
