import type * as React from 'react';
import { I18nProvider } from './i18n/I18nProvider';
import type { I18nMessages, I18nMissingKeyPolicy } from './i18n/types';
import { ActionDialogProvider } from './services/ActionDialogService/index';
import { ToastProvider } from './services/CardToastService/index';
import { ImageCropperProvider } from './services/ImageCropperService/index';
import { ImagePreviewProvider } from './services/ImagePreviewService/index';
import { LoadingProvider } from './services/LoadingService/index';
import { PermissionPurposeDialogProvider } from './services/PermissionPurposeDialogService/index';
import { PickerServiceProvider } from './services/PickerService/index';
import { ThemeProvider } from './theme/ThemeProvider';
import type { Theme, ThemeOverride } from './theme/types';
import { BottomSheetProvider } from './ui/BottomSheet/index';

export type ComponentLibProviderProps = {
  // baseTheme 用于传入完整主题作为基线（例如品牌主题）
  baseTheme?: Theme;
  // theme 用于对 baseTheme 做局部覆盖（例如只改 primary）
  theme?: ThemeOverride;
  locale?: string;
  messages?: I18nMessages;
  missingKeyPolicy?: I18nMissingKeyPolicy;
  children: React.ReactNode;
};

// ComponentLibProvider 是组件库推荐的顶层 Provider：
// - 同时提供 Theme 与 i18n
// - 避免业务方在 App 里层层包裹多个 Provider
export function ComponentLibProvider({
  baseTheme,
  theme,
  locale,
  messages,
  missingKeyPolicy,
  children,
}: ComponentLibProviderProps) {
  return (
    <ThemeProvider baseTheme={baseTheme} theme={theme}>
      <I18nProvider locale={locale} messages={messages} missingKeyPolicy={missingKeyPolicy}>
        <BottomSheetProvider>
          <PickerServiceProvider>
            <ToastProvider>
              <ActionDialogProvider>
                <LoadingProvider>
                  <PermissionPurposeDialogProvider>
                    <ImagePreviewProvider>
                      <ImageCropperProvider>{children}</ImageCropperProvider>
                    </ImagePreviewProvider>
                  </PermissionPurposeDialogProvider>
                </LoadingProvider>
              </ActionDialogProvider>
            </ToastProvider>
          </PickerServiceProvider>
        </BottomSheetProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
