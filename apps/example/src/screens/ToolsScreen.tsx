import * as React from 'react';
import {
  SliderCaptcha,
  actionDialog,
  loading,
  permissionPurposeDialog,
  pickerService,
  toast,
  useI18n,
} from 'zkit-ui';
import { createRouterGuard } from 'zkit-tools';

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
      options: [
        { value: 'tokens', label: t('example.area.tokens') },
        { value: 'forms', label: t('example.area.forms') },
        { value: 'overlays', label: t('example.area.overlays') },
      ],
      value: serviceChoice,
      title: t('example.globalPicker.title'),
    });

    if (!result) return;
    setServiceChoice(String(result.value));
    toast.info(t('example.toast.selected', { label: result.label }), { duration: 1200 });
  }, [serviceChoice, t]);

  const handleDialog = React.useCallback(async () => {
    const confirmed = await actionDialog.confirm({
      title: t('example.dialog.title'),
      message: t('example.dialog.content'),
      confirmLabel: t('example.dialog.confirm'),
      cancelLabel: t('example.common.cancel'),
      footer: { layout: 'row' },
    });

    if (confirmed) {
      toast.success(t('example.dialog.confirmed'), { duration: 1200 });
    }
  }, [t]);

  const handleLoading = React.useCallback(async () => {
    await loading.promise(wait(900), {
      loading: t('example.loading.loading'),
      success: t('example.loading.success'),
      error: t('example.loading.error'),
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
    toast.success(t('example.captcha.verifiedToast'), { duration: 1200 });
  }, [t]);

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

    const guard = createRouterGuard({ router, lockMs: 700 });
    router.push('/components');
    router.push('/components');
    router.back();
    guard.destroy();

    setRouterGuardStatus(events.length === 2 ? t('example.router.blocked') : events.join(' -> '));
    toast.info(t('example.router.tested'), { duration: 1200 });
  }, [t]);

  return (
    <>
      <TabScreenShell withTopInset={false}>
        <ServicesSection
          serviceChoice={t(`example.area.${serviceChoice}`)}
          onCaptchaOpen={openCaptcha}
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
    </>
  );
});
