// I18nMessages 使用扁平字典，便于：
// - 接入现有业务多语言系统（通常也是 key-value）
// - 做静态分析/漏 key 校验（后续可扩展）
export type I18nMessages = Record<string, string>;

// missingKeyPolicy:
// - key：找不到 key 时回显 key（避免线上崩溃）
// - throw：找不到 key 时抛错（更适合开发/测试的 fail-fast）
export type I18nMissingKeyPolicy = 'key' | 'throw';

export type I18nTranslateParams = Record<string, string | number>;

export type I18nTranslate = (key: string, params?: I18nTranslateParams) => string;

export type I18nContextValue = {
  // locale 目前主要用于透传；未来可扩展数字/日期格式化等能力
  locale: string;
  messages: I18nMessages;
  missingKeyPolicy: I18nMissingKeyPolicy;
  t: I18nTranslate;
};
