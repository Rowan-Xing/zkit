import { defaultTheme } from './theme/defaultTheme';
import { mergeTheme } from './theme/mergeTheme';
import type { Theme, ThemeOverride } from './theme/types';
import type { I18nMessages, I18nMissingKeyPolicy } from './i18n/types';

// y2kit-ui 提供两类“全局默认配置”入口：
// 1) Theme：用于给所有组件提供默认 tokens（颜色等）
// 2) i18n：用于给所有组件提供默认文案字典/缺失策略
//
// 推荐在应用启动时调用一次 configureComponentLib()（例如在 app entry），
// 这样即便业务侧没有包 Provider，组件库也能拿到一致的默认值。
export type ComponentLibI18nConfig = {
  // locale 目前仅用于透传；组件内部可据此选择 key 前缀或做格式化扩展
  locale?: string;
  // messages 是 key -> 文案 的扁平字典，组件内部用 t(key) 获取
  messages?: I18nMessages;
  // missingKeyPolicy:
  // - key：找不到 key 就直接回显 key（对线上更友好）
  // - throw：找不到 key 直接抛错（对开发/测试更“fail-fast”）
  missingKeyPolicy?: I18nMissingKeyPolicy;
};

export type ComponentLibConfig = {
  // theme 是“覆盖对象”，只需要传你要改的字段即可（未传字段回落到 defaultTheme）
  theme?: ThemeOverride;
  i18n?: ComponentLibI18nConfig;
};

let componentLibConfig: ComponentLibConfig = {};

// 合并式更新：多次调用会按层级合并（不会把之前的 i18n 整块覆盖掉）
export function configureComponentLib(next: ComponentLibConfig) {
  componentLibConfig = {
    ...componentLibConfig,
    ...next,
    i18n: {
      ...componentLibConfig.i18n,
      ...next.i18n,
    },
  };
}

export function getComponentLibConfig(): ComponentLibConfig {
  return componentLibConfig;
}

// getDefaultTheme 用于生成“当前有效的默认主题”：
// - defaultTheme 作为组件库内置基线
// - configureComponentLib({ theme }) 提供全局覆盖
// - ThemeProvider({ theme }) 再做实例级覆盖（优先级更高）
export function getDefaultTheme(): Theme {
  return mergeTheme(defaultTheme, componentLibConfig.theme);
}

// getDefaultI18nConfig 用于生成“当前有效的默认 i18n 配置”：
// - configureComponentLib({ i18n }) 可在应用启动时设定默认 locale/messages
// - I18nProvider({ ... }) 可在局部覆盖（例如某个子树临时切换语言）
export function getDefaultI18nConfig(): Required<ComponentLibI18nConfig> {
  return {
    locale: componentLibConfig.i18n?.locale ?? 'zh-CN',
    messages: componentLibConfig.i18n?.messages ?? {},
    missingKeyPolicy: componentLibConfig.i18n?.missingKeyPolicy ?? 'key',
  };
}
