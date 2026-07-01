import { defaultTheme } from './theme/defaultTheme';
import { mergeTheme } from './theme/mergeTheme';
import type { Theme, ThemeOverride } from './theme/types';
import { resolveSystemBuiltinLocale } from './i18n/locale';
import type { I18nMessages, I18nMissingKeyPolicy } from './i18n/types';

// zkit-ui 提供两类“全局默认配置”入口：
// 1) Theme：用于给所有组件提供默认 tokens（颜色等）
// 2) i18n：用于给所有组件提供默认文案字典/缺失策略
//
// 推荐在应用启动时调用一次 configureZKit()（例如在 app entry），
// 这样即便业务侧没有包 Provider，组件库也能拿到一致的默认值。
export type ZKitI18nConfig = {
  // locale 目前仅用于透传；组件内部可据此选择 key 前缀或做格式化扩展
  locale?: string;
  // messages 是 key -> 文案 的扁平字典，组件内部用 t(key) 获取
  messages?: I18nMessages;
  // missingKeyPolicy:
  // - key：找不到 key 就直接回显 key（对线上更友好）
  // - throw：找不到 key 直接抛错（对开发/测试更“fail-fast”）
  missingKeyPolicy?: I18nMissingKeyPolicy;
};

export type ZKitConfig = {
  // theme 是“覆盖对象”，只需要传你要改的字段即可（未传字段回落到 defaultTheme）
  theme?: ThemeOverride;
  i18n?: ZKitI18nConfig;
};

let zKitConfig: ZKitConfig = {};

// 合并式更新：多次调用会按层级合并（不会把之前的 i18n 整块覆盖掉）
export function configureZKit(next: ZKitConfig) {
  zKitConfig = {
    ...zKitConfig,
    ...next,
    i18n: {
      ...zKitConfig.i18n,
      ...next.i18n,
    },
  };
}

export function getZKitConfig(): ZKitConfig {
  return zKitConfig;
}

// getDefaultTheme 用于生成“当前有效的默认主题”：
// - defaultTheme 作为组件库内置基线
// - configureZKit({ theme }) 提供全局覆盖
// - ThemeProvider({ theme }) 再做实例级覆盖（优先级更高）
export function getDefaultTheme(): Theme {
  return mergeTheme(defaultTheme, zKitConfig.theme);
}

// getDefaultI18nConfig 用于生成“当前有效的默认 i18n 配置”：
// - configureZKit({ i18n }) 可在应用启动时设定默认 locale/messages
// - I18nProvider({ ... }) 可在局部覆盖（例如某个子树临时切换语言）
export function getDefaultI18nConfig(): Required<ZKitI18nConfig> {
  return {
    locale: zKitConfig.i18n?.locale ?? resolveSystemBuiltinLocale(),
    messages: zKitConfig.i18n?.messages ?? {},
    missingKeyPolicy: zKitConfig.i18n?.missingKeyPolicy ?? 'key',
  };
}
