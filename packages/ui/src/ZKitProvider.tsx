import { ActionDialogProvider } from './services/ActionDialogService/index';
import { ToastProvider } from './services/CardToastService/index';
import { ImagePreviewProvider } from './services/ImagePreviewService/index';
import { LoadingProvider, type LoadingDefaults } from './services/LoadingService/index';
import { PermissionPurposeDialogProvider } from './services/PermissionPurposeDialogService/index';
import { PickerServiceProvider } from './services/PickerService/index';
import { ZKitCoreProvider, type ZKitCoreProviderProps } from './ZKitCoreProvider';

export type ZKitProviderProps = ZKitCoreProviderProps & {
  loading?: LoadingDefaults;
};

// ZKitProvider 是完整应用 Provider：
// - 同时提供 Theme 与 i18n
// - 挂载 Picker / Toast / Dialog / Loading / Permission / ImagePreview 等全局服务
export function ZKitProvider({
  baseTheme,
  theme,
  locale,
  messages,
  missingKeyPolicy,
  loading,
  children,
}: ZKitProviderProps) {
  return (
    <ZKitCoreProvider
      baseTheme={baseTheme}
      theme={theme}
      locale={locale}
      messages={messages}
      missingKeyPolicy={missingKeyPolicy}
    >
      <PickerServiceProvider>
        <ToastProvider>
          <ActionDialogProvider>
            <LoadingProvider defaults={loading}>
              <PermissionPurposeDialogProvider>
                <ImagePreviewProvider>
                  {children}
                </ImagePreviewProvider>
              </PermissionPurposeDialogProvider>
            </LoadingProvider>
          </ActionDialogProvider>
        </ToastProvider>
      </PickerServiceProvider>
    </ZKitCoreProvider>
  );
}
