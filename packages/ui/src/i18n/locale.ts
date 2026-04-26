import { NativeModules } from 'react-native';

export const DEFAULT_I18N_LOCALE = 'zh-CN';

const SUPPORTED_BUILTIN_LOCALES = ['zh-CN', 'zh-TW', 'en-US', 'ja'] as const;
const TRADITIONAL_CHINESE_REGIONS = new Set(['HK', 'MO', 'TW']);

type BuiltinLocale = (typeof SUPPORTED_BUILTIN_LOCALES)[number];
type NavigatorLike = {
  language?: string;
  languages?: readonly string[];
  userLanguage?: string;
};
type NativeSettings = Record<string, unknown>;
type NativeModulesWithLocale = typeof NativeModules & {
  I18nManager?: {
    localeIdentifier?: unknown;
  };
  SettingsManager?: {
    settings?: NativeSettings;
  };
};

function getString(value: unknown) {
  const next = typeof value === 'string' ? value.trim() : '';
  return next.length > 0 ? next : undefined;
}

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const next = getString(item);
    return next ? [next] : [];
  });
}

function normalizeLocaleParts(locale: string) {
  const parts = locale
    .replace(/_/g, '-')
    .split('-')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return null;

  return {
    language: parts[0].toLowerCase(),
    subtags: parts.slice(1).map((part) => part.toUpperCase()),
  };
}

function matchBuiltinLocale(locale?: string | null): BuiltinLocale | undefined {
  const rawLocale = getString(locale);
  if (!rawLocale) return undefined;

  const exactLocale = SUPPORTED_BUILTIN_LOCALES.find(
    (supportedLocale) => supportedLocale.toLowerCase() === rawLocale.toLowerCase()
  );
  if (exactLocale) return exactLocale;

  const normalized = normalizeLocaleParts(rawLocale);
  if (!normalized) return undefined;

  if (normalized.language === 'zh') {
    const usesTraditionalChinese =
      normalized.subtags.includes('HANT') ||
      normalized.subtags.some((subtag) => TRADITIONAL_CHINESE_REGIONS.has(subtag));
    return usesTraditionalChinese ? 'zh-TW' : 'zh-CN';
  }

  if (normalized.language === 'en') return 'en-US';
  if (normalized.language === 'ja') return 'ja';

  return undefined;
}

export function resolveBuiltinLocale(locale?: string | null): BuiltinLocale {
  return matchBuiltinLocale(locale) ?? DEFAULT_I18N_LOCALE;
}

function getSystemLocaleCandidates() {
  const nativeModules = (NativeModules ?? {}) as NativeModulesWithLocale;
  const settings = nativeModules.SettingsManager?.settings;
  const navigator = (globalThis as { navigator?: NavigatorLike }).navigator;

  return [
    getString(settings?.AppleLocale),
    ...getStringArray(settings?.AppleLanguages),
    getString(nativeModules.I18nManager?.localeIdentifier),
    ...(navigator?.languages ?? []),
    getString(navigator?.language),
    getString(navigator?.userLanguage),
  ];
}

export function getSystemLocale() {
  return getSystemLocaleCandidates().find((candidate) => getString(candidate));
}

export function resolveSystemBuiltinLocale() {
  for (const candidate of getSystemLocaleCandidates()) {
    const locale = matchBuiltinLocale(candidate);
    if (locale) return locale;
  }

  return DEFAULT_I18N_LOCALE;
}
