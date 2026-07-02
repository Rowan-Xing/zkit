import type * as React from 'react';
import { I18nProvider } from './i18n/I18nProvider';
import type { I18nMessages, I18nMissingKeyPolicy } from './i18n/types';
import { ThemeProvider } from './theme/ThemeProvider';
import type { Theme, ThemeOverride } from './theme/types';

export type ZKitCoreProviderProps = {
  // baseTheme 用于传入完整主题作为基线（例如品牌主题）
  baseTheme?: Theme;
  // theme 用于对 baseTheme 做局部覆盖（例如只改 primary）
  theme?: ThemeOverride;
  locale?: string;
  messages?: I18nMessages;
  missingKeyPolicy?: I18nMissingKeyPolicy;
  children: React.ReactNode;
};

// ZKitCoreProvider 只提供轻量核心上下文，不挂载任何全局浮层或选择器服务。
export function ZKitCoreProvider({
  baseTheme,
  theme,
  locale,
  messages,
  missingKeyPolicy,
  children,
}: ZKitCoreProviderProps) {
  return (
    <ThemeProvider baseTheme={baseTheme} theme={theme}>
      <I18nProvider locale={locale} messages={messages} missingKeyPolicy={missingKeyPolicy}>
        {children}
      </I18nProvider>
    </ThemeProvider>
  );
}
