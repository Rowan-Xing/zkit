import * as React from 'react';
import {
  FloatingDebugger,
  FloatingDebuggerController,
  SliderCaptcha,
  actionDialog,
  loading,
  permissionPurposeDialog,
  pickerService,
  toast,
  useI18n,
} from 'y2kit-ui';
import { initRouterGuard } from 'y2kit-tools';

import { captchaChallenge } from '../data';
import { wait } from '../demoUtils';
import { ServicesSection, ToolsSection } from '../sections/PlaygroundSections';
import { TabScreenShell } from './TabScreenShell';

export const ToolsScreen = React.memo(function ToolsScreen() {
  const { t } = useI18n();

  const [serviceChoice, setServiceChoice] = React.useState('tokens');
  const [captchaVisible, setCaptchaVisible] = React.useState(false);
  const [routerGuardStatus, setRouterGuardStatus] = React.useState(() => t('example.router.ready'));

  const handleGlobalPicker = React.useCallback(async () => {
    const result = await pickerService.pick({
      list: [
        { id: 'tokens', title: t('example.area.tokens') },
        { id: 'forms', title: t('example.area.forms') },
        { id: 'overlays', title: t('example.area.overlays') },
      ],
      value: serviceChoice,
      title: t('example.globalPicker.title'),
    });

    if (!result) return;
    setServiceChoice(String(result.value));
    toast.info(t('example.toast.selected', { label: result.label }), 1200);
  }, [serviceChoice, t]);

  const handleDialog = React.useCallback(async () => {
    const confirmed = await actionDialog.confirm({
      title: t('example.dialog.title'),
      content: t('example.dialog.content'),
      confirmText: t('example.dialog.confirm'),
      cancelText: t('example.common.cancel'),
      footer: { layout: 'row' },
    });

    if (confirmed) {
      toast.success(t('example.dialog.confirmed'), 1200);
    }
  }, [t]);

  const handleLoading = React.useCallback(async () => {
    await loading.withPromise(wait(900), {
      loadingText: t('example.loading.loading'),
      successText: t('example.loading.success'),
      errorText: t('example.loading.error'),
    });
  }, [t]);

  const handlePermissionPurpose = React.useCallback(() => {
    const purpose = permissionPurposeDialog.show({
      permission: 'camera',
      title: t('example.permission.title'),
      message: t('example.permission.message'),
      scopeKey: 'example-camera',
    });

    setTimeout(() => {
      purpose.hide();
    }, 2600);
  }, [t]);

  const openCaptcha = React.useCallback(() => {
    setCaptchaVisible(true);
  }, []);

  const closeCaptcha = React.useCallback(() => {
    setCaptchaVisible(false);
  }, []);

  const verifyCaptcha = React.useCallback(
    async (payload: { progress: number }) => {
      await wait(240);
      return payload.progress > 0.24
        ? { success: true }
        : { success: false, message: t('example.captcha.slideFarther') };
    },
    [t]
  );

  const handleCaptchaVerified = React.useCallback(() => {
    setCaptchaVisible(false);
    toast.success(t('example.captcha.verifiedToast'), 1200);
  }, [t]);

  const handleDebuggerOpen = React.useCallback(() => {
    FloatingDebuggerController.show?.();
  }, []);

  const handleRouterGuardDemo = React.useCallback(() => {
    const events: string[] = [];
    const router = {
      push: (path: string) => {
        events.push(`push ${path}`);
      },
      replace: (path: string) => {
        events.push(`replace ${path}`);
      },
      navigate: (path: string) => {
        events.push(`navigate ${path}`);
      },
      back: () => {
        events.push('back');
      },
    };

    const destroy = initRouterGuard({ router, fallbackLockMs: 700 });
    router.push('/components');
    router.push('/components');
    router.back();
    destroy();

    setRouterGuardStatus(events.length === 2 ? t('example.router.blocked') : events.join(' -> '));
    toast.info(t('example.router.tested'), 1200);
  }, [t]);

  return (
    <>
      <TabScreenShell withTopInset={false}>
        <ServicesSection
          serviceChoice={t(`example.area.${serviceChoice}`)}
          onCaptchaOpen={openCaptcha}
          onDebuggerOpen={handleDebuggerOpen}
          onDialog={handleDialog}
          onGlobalPicker={handleGlobalPicker}
          onLoading={handleLoading}
          onPermissionPurpose={handlePermissionPurpose}
        />
        <ToolsSection
          routerGuardStatus={routerGuardStatus}
          onRouterGuardDemo={handleRouterGuardDemo}
        />
      </TabScreenShell>

      <SliderCaptcha
        visible={captchaVisible}
        onClose={closeCaptcha}
        loadChallenge={() => captchaChallenge}
        verifyChallenge={verifyCaptcha}
        onVerified={handleCaptchaVerified}
        texts={{
          title: t('example.captcha.title'),
          verifyFailed: t('example.captcha.failed'),
          verifySuccess: t('example.captcha.success'),
        }}
      />
      <FloatingDebugger initialVisible={false} enableNetworkTab />
    </>
  );
});
