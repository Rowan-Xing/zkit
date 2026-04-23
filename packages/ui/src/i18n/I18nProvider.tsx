import * as React from 'react';
import { getDefaultI18nConfig } from '../config';
import { locales } from './locales';
import type {
  I18nContextValue,
  I18nMessages,
  I18nMissingKeyPolicy,
  I18nTranslate,
  I18nTranslateParams,
} from './types';

function interpolate(template: string, params?: I18nTranslateParams) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (full, key: string) => {
    const value = params[key];
    if (value === undefined || value === null) return full;
    return String(value);
  });
}

function createTranslator(messages: I18nMessages, missingKeyPolicy: I18nMissingKeyPolicy): I18nTranslate {
  return (key, params) => {
    const raw = messages[key];
    if (raw == null) {
      if (missingKeyPolicy === 'throw') {
        throw new Error(`[y2kit-ui] Missing i18n key: ${key}`);
      }
      return key;
    }
    return interpolate(raw, params);
  };
}

function resolveI18nValue(
  base: Required<ReturnType<typeof getDefaultI18nConfig>>,
  override?: {
    locale?: string;
    messages?: I18nMessages;
    missingKeyPolicy?: I18nMissingKeyPolicy;
  }
): I18nContextValue {
  const locale = override?.locale ?? base.locale;
  // 优先级：override.messages > base.messages > 内置语言包
  const builtinMessages = locales[locale] ?? locales['zh-CN'] ?? {};
  const messages = { ...builtinMessages, ...base.messages, ...(override?.messages ?? {}) };
  const missingKeyPolicy = override?.missingKeyPolicy ?? base.missingKeyPolicy;
  const t = createTranslator(messages, missingKeyPolicy);
  return { locale, messages, missingKeyPolicy, t };
}

export const I18nContext = React.createContext<I18nContextValue>({
  ...resolveI18nValue(getDefaultI18nConfig()),
});

export type I18nProviderProps = {
  locale?: string;
  messages?: I18nMessages;
  missingKeyPolicy?: I18nMissingKeyPolicy;
  children: React.ReactNode;
};

export function I18nProvider({ locale, messages, missingKeyPolicy, children }: I18nProviderProps) {
  const value = React.useMemo(() => {
    const base = getDefaultI18nConfig();
    return resolveI18nValue(base, { locale, messages, missingKeyPolicy });
  }, [locale, messages, missingKeyPolicy]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
