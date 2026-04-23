// Theme 是组件库内部约定的“主题对象”结构
// 目前只包含 colors，后续如果需要也可以增加 spacing / radii / typography 等字段
export type Theme = {
  colors: {
    // 组件主色，例如按钮、选中态等强调色
    primary: string;
    // 主色上的前景色（通常是文字颜色），要求与 primary 有足够对比度
    onPrimary: string;

    // 次要色，常用于弱一点的按钮、标签背景等
    secondary: string;
    // 次要色上的前景色
    onSecondary: string;

    // 一般面的背景色（例如卡片、默认控件背景）
    surface: string;
    // 一般面上的前景色（例如普通文字颜色）
    onSurface: string;

    // 边框颜色（输入框边框、分割线等）
    border: string;

    // 次要文字、提示文字等弱一点的颜色
    muted: string;

    // 禁用态文字/图标颜色
    disabled: string;
  };
};

// ThemeOverride 用于在应用侧覆盖默认主题：
// - 可以只传入部分字段（Partial），未传入的会回落到 defaultTheme
// - colors 也是部分覆盖，便于只改 primary 这类场景
export type ThemeOverride = Partial<Theme> & {
  colors?: Partial<Theme['colors']>;
};
