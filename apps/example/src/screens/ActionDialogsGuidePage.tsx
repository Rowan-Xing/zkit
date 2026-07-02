import * as React from 'react';
import { View } from 'react-native';
import { useI18n, useTheme } from 'zkit-ui';
import { Text } from 'zkit-ui/text';
import {
  ActionDialog,
  actionDialog,
  type ActionDialogFooterLayout,
  type ActionDialogHandle,
  type ActionDialogRef,
  type ActionDialogResult,
  type ActionDialogSnapshot,
} from 'zkit-ui/action-dialog';
import { loading } from 'zkit-ui/loading';
import { toast } from 'zkit-ui/toast';
import { Button } from 'zkit-ui/button';
import { TextInput } from 'zkit-ui/text-input';
import { wp } from 'zkit-tools';

import { Section } from '../components/Section';
import { UsageGuide, type UsageGuideProps } from '../components/UsageGuide';
import { renderIcon, wait, type FeatherIconName } from '../demoUtils';
import { styles as sharedStyles } from '../styles';
import { TabScreenShell } from './TabScreenShell';

type DialogCaseCardProps = {
  iconName: FeatherIconName;
  title: string;
  subtitle: string;
  color: string;
  buttonLabel: string;
  onPress: () => void;
};

type DialogCaseGroupProps = {
  title: string;
  caption: string;
  children: React.ReactNode;
};

function formatResult(result: ActionDialogResult, zh: boolean) {
  if (result.type === 'action') {
    return zh
      ? `动作 ${result.action.key} / ${result.action.role}`
      : `action ${result.action.key} / ${result.action.role}`;
  }

  return zh ? `关闭来源 ${result.reason}` : `dismissed by ${result.reason}`;
}

function formatSnapshot(snapshot: ActionDialogSnapshot, zh: boolean) {
  return zh
    ? `open=${snapshot.open ? '是' : '否'}，active=${snapshot.activeId ?? '无'}，queue=${snapshot.queuedCount}`
    : `open=${snapshot.open ? 'yes' : 'no'}, active=${snapshot.activeId ?? 'none'}, queue=${snapshot.queuedCount}`;
}

function DialogCaseGroup({ title, caption, children }: DialogCaseGroupProps) {
  const theme = useTheme();

  return (
    <View style={sharedStyles.dialogCaseGroup}>
      <View style={sharedStyles.dialogCaseGroupHeader}>
        <Text style={[sharedStyles.dialogCaseGroupTitle, { color: theme.colors.onSurface }]}>
          {title}
        </Text>
        <Text style={[sharedStyles.dialogCaseGroupCaption, { color: theme.colors.muted }]}>
          {caption}
        </Text>
      </View>
      <View style={sharedStyles.dialogCaseGrid}>{children}</View>
    </View>
  );
}

const DialogCaseCard = React.memo(function DialogCaseCard({
  iconName,
  title,
  subtitle,
  color,
  buttonLabel,
  onPress,
}: DialogCaseCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        sharedStyles.dialogCaseCard,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <View style={[sharedStyles.dialogCaseIcon, { backgroundColor: `${color}1A` }]}>
        {renderIcon(iconName, color, wp(18))}
      </View>
      <View style={sharedStyles.dialogCaseCopy}>
        <Text style={[sharedStyles.dialogCaseTitle, { color: theme.colors.onSurface }]}>
          {title}
        </Text>
        <Text style={[sharedStyles.dialogCaseSubtitle, { color: theme.colors.muted }]}>
          {subtitle}
        </Text>
      </View>
      <Button size="sm" variant="outline" tone="neutral" onPress={onPress}>
        {buttonLabel}
      </Button>
    </View>
  );
});

function useActionDialogGuide(zh: boolean): UsageGuideProps {
  return React.useMemo(
    () =>
      zh
        ? {
            title: 'ActionDialog',
            description:
              '确认弹窗同时覆盖声明式组件和全局命令式服务。页面用例按源码契约展开：状态、动作、关闭来源、footer、键盘、动效、队列、scope 与更新句柄都能直接触发。',
            blocks: [
              {
                title: '状态与入口',
                items: [
                  'ActionDialog 使用 open / defaultOpen / onOpenChange；actionDialog.open / confirm / alert 走 Provider 宿主。',
                  '服务默认 inline 宿主，声明式默认 modal 宿主；两种路径都保留相同动作语义和关闭结果。',
                  'handle.result 返回 action 或 dismiss，dismiss reason 覆盖 api / back / overlay / replace / unmount。',
                ],
              },
              {
                title: '动作与布局',
                items: [
                  'actions 覆盖 confirm / cancel / neutral、tone、variant、外部 loading、disabled、closeOnPress 和同步 onPress。',
                  '业务异步确认后交给 loading.promise，LoadingService 会自动从 loading 切到 success / error 结果态。',
                  'footer.layout 覆盖 auto / row / stack / bar；footer.render 可完全接管底部但仍复用 pressAction。',
                  'layout、colors、labels、motion、keyboard、dismiss 与 layer 是稳定 escape hatch。',
                ],
              },
            ],
            api: [
              'ActionDialog',
              'actionDialog.open',
              'confirm',
              'alert',
              'footer.layout',
              'footer.render',
              'collisionStrategy',
              'scopeKey',
              'loading.promise',
              'handle.update',
              'ActionDialogRef',
            ],
            snippet: `const confirmed = await actionDialog.confirm({\n  title: '删除确认',\n  message: '此操作不可撤销。',\n  tone: 'danger',\n});\n\nif (confirmed) {\n  await loading.promise(remove(), {\n    loading: '删除中',\n    success: '已删除',\n    error: '删除失败',\n  });\n}`,
          }
        : {
            title: 'ActionDialog',
            description:
              'The dialog page covers both the declarative component and the command service. Cases map to the source contract: state, actions, dismiss reasons, footer, keyboard, motion, queueing, scope, and handle updates.',
            blocks: [
              {
                title: 'State and entry points',
                items: [
                  'ActionDialog supports open / defaultOpen / onOpenChange; actionDialog.open / confirm / alert run through the Provider host.',
                  'The service defaults to an inline host while the declarative component defaults to modal, sharing the same action result model.',
                  'handle.result resolves action or dismiss, with dismiss reasons covering api / back / overlay / replace / unmount.',
                ],
              },
              {
                title: 'Actions and layout',
                items: [
                  'actions cover confirm / cancel / neutral, tone, variant, external loading, disabled, closeOnPress, and synchronous onPress.',
                  'Business async work belongs after confirmation in loading.promise, which swaps loading into success / error result states.',
                  'footer.layout covers auto / row / stack / bar; footer.render can replace the footer while keeping pressAction.',
                  'layout, colors, labels, motion, keyboard, dismiss, and layer are stable escape hatches.',
                ],
              },
            ],
            api: [
              'ActionDialog',
              'actionDialog.open',
              'confirm',
              'alert',
              'footer.layout',
              'footer.render',
              'collisionStrategy',
              'scopeKey',
              'loading.promise',
              'handle.update',
              'ActionDialogRef',
            ],
            snippet: `const confirmed = await actionDialog.confirm({\n  title: 'Delete item',\n  message: 'This cannot be undone.',\n  tone: 'danger',\n});\n\nif (confirmed) {\n  await loading.promise(remove(), {\n    loading: 'Deleting',\n    success: 'Deleted',\n    error: 'Delete failed',\n  });\n}`,
          },
    [zh]
  );
}

export const ActionDialogsGuidePage = React.memo(function ActionDialogsGuidePage() {
  const { locale } = useI18n();
  const theme = useTheme();
  const zh = locale.toLowerCase().startsWith('zh');
  const guide = useActionDialogGuide(zh);
  const controlledDialogRef = React.useRef<ActionDialogRef>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [controlledOpen, setControlledOpen] = React.useState(false);
  const [uncontrolledKey, setUncontrolledKey] = React.useState(0);
  const [note, setNote] = React.useState('');

  const label = React.useCallback((zhText: string, enText: string) => (zh ? zhText : enText), [zh]);
  const readyStatus = label('准备触发一个确认弹窗用例。', 'Ready to run an ActionDialog case.');

  const setCaseStatus = React.useCallback(
    (next: string) => {
      setStatus(next);
      toast.info(next, { duration: 1500 });
    },
    []
  );

  const watchHandle = React.useCallback(
    (caseName: string, handle: ActionDialogHandle) => {
      void handle.result.then((result) => {
        setCaseStatus(`${caseName}: ${formatResult(result, zh)}`);
      });
    },
    [setCaseStatus, zh]
  );

  const syncSnapshotStatus = React.useCallback(() => {
    setStatus(formatSnapshot(actionDialog.getSnapshot(), zh));
  }, [zh]);

  const openBasicConfirm = React.useCallback(async () => {
    const confirmed = await actionDialog.confirm({
      title: label('执行操作', 'Run action'),
      message: label('确认按钮会返回 true，取消、遮罩、返回键或 API 关闭会返回 false。', 'Confirm resolves true; cancel, overlay, back, or API dismissal resolves false.'),
      confirmLabel: label('执行', 'Run'),
      cancelLabel: label('取消', 'Cancel'),
      footer: { layout: 'row' },
    });

    setCaseStatus(confirmed ? label('基础确认：已确认', 'Basic confirm: confirmed') : label('基础确认：未确认', 'Basic confirm: not confirmed'));
  }, [label, setCaseStatus]);

  const openDangerConfirm = React.useCallback(async () => {
    const confirmed = await actionDialog.confirm({
      title: label('删除配置', 'Delete configuration'),
      message: label('danger tone 会把确认动作解析为 danger 语义，适合不可逆操作。', 'The danger tone maps the confirm action to danger semantics for irreversible work.'),
      tone: 'danger',
      confirmLabel: label('删除', 'Delete'),
      cancelLabel: label('保留', 'Keep'),
      confirmAction: {
        accessibilityLabel: label('确认删除配置', 'Confirm deleting configuration'),
        testID: 'action-dialog-danger-confirm',
      },
      cancelAction: { variant: 'soft' },
      footer: { layout: 'row' },
    });

    setCaseStatus(confirmed ? label('危险确认：已删除', 'Danger confirm: deleted') : label('危险确认：已保留', 'Danger confirm: kept'));
  }, [label, setCaseStatus]);

  const openAlert = React.useCallback(async () => {
    await actionDialog.alert({
      title: label('提示信息', 'Notice'),
      message: label('alert 只有一个确认动作，关闭后 Promise resolve。', 'alert has one confirm action and resolves after dismissal.'),
      confirmLabel: label('知道了', 'Got it'),
      footer: { layout: 'bar' },
    });

    setCaseStatus(label('提示弹窗：已关闭', 'Alert: dismissed'));
  }, [label, setCaseStatus]);

  const openActionRoles = React.useCallback(() => {
    const handle = actionDialog.open({
      title: label('动作语义', 'Action semantics'),
      message: label('同一组 actions 覆盖 cancel、neutral、confirm，以及 tone / variant 的视觉组合。', 'One actions array covers cancel, neutral, confirm, plus tone / variant combinations.'),
      actions: [
        { key: 'cancel', role: 'cancel', label: label('取消', 'Cancel'), variant: 'soft' },
        { key: 'later', role: 'neutral', label: label('稍后', 'Later'), tone: 'neutral', variant: 'ghost' },
        { key: 'ship', role: 'confirm', label: label('发布', 'Ship'), tone: 'primary', variant: 'solid' },
      ],
    });

    watchHandle(label('动作语义', 'Action semantics'), handle);
  }, [label, watchHandle]);

  const openConfirmThenLoading = React.useCallback(async () => {
    const confirmed = await actionDialog.confirm({
      title: label('确认后同步', 'Confirm then sync'),
      message: label(
        '确认框只收集用户意图；确认后立即关闭，再由 loading.promise 展示异步进度和结果。',
        'The dialog only collects intent; after confirmation it closes and loading.promise presents progress and result.'
      ),
      confirmLabel: label('开始同步', 'Start sync'),
      cancelLabel: label('取消', 'Cancel'),
      footer: { layout: 'row' },
    });

    if (!confirmed) {
      setStatus(label('确认后同步：已取消', 'Confirm then sync: canceled'));
      return;
    }

    await loading.promise(wait(1100), {
      loading: label('同步中', 'Syncing'),
      success: label('同步完成', 'Synced'),
      error: label('同步失败', 'Sync failed'),
    });
  }, [label]);

  const openKeepOpenAction = React.useCallback(() => {
    let keepCount = 0;
    let handle: ActionDialogHandle | undefined;

    handle = actionDialog.open({
      title: label('手动关闭', 'Manual close'),
      message: label('返回 false 或 closeOnPress=false 时不会默认关闭；可以用 context.close / dismiss 接管结果。', 'Returning false or closeOnPress=false prevents default closing; context.close / dismiss can own the result.'),
      actions: [
        {
          key: 'stay',
          role: 'neutral',
          label: label('停留', 'Stay'),
          closeOnPress: false,
          onPress: () => {
            keepCount += 1;
            handle?.update({
              message: label(
                `已拦截默认关闭 ${keepCount} 次。再点其它动作结束。`,
                `Default close blocked ${keepCount} time(s). Pick another action to finish.`
              ),
            });
            return false;
          },
        },
        {
          key: 'context-close',
          role: 'confirm',
          label: 'close',
          onPress: ({ close }) => {
            close();
            return false;
          },
        },
        {
          key: 'api-dismiss',
          role: 'cancel',
          label: 'dismiss',
          onPress: ({ dismiss }) => {
            dismiss();
            return false;
          },
        },
      ],
    });

    watchHandle(label('手动关闭', 'Manual close'), handle);
  }, [label, watchHandle]);

  const openDisabledLoadingActions = React.useCallback(() => {
    const handle = actionDialog.open({
      title: label('动作状态', 'Action states'),
      message: label('disabled 与 loading 动作不会触发；底部仍保留可取消动作。', 'disabled and loading actions cannot be triggered; a cancel action remains available.'),
      actions: [
        { key: 'disabled', role: 'neutral', label: label('禁用', 'Off'), disabled: true },
        { key: 'loading', role: 'neutral', label: label('加载', 'Busy'), loading: true },
        { key: 'cancel', role: 'cancel', label: label('关闭', 'Close') },
      ],
    });

    watchHandle(label('动作状态', 'Action states'), handle);
  }, [label, watchHandle]);

  const openActionError = React.useCallback(() => {
    const handle = actionDialog.open({
      title: label('动作异常', 'Action error'),
      message: label('onActionError 捕获同步 action.onPress 抛出的异常，弹窗保持打开便于用户重试或取消。', 'onActionError catches synchronous action.onPress failures and keeps the dialog open for retry or cancel.'),
      onActionError: () => {
        setStatus(label('动作异常：已捕获 onActionError', 'Action error: onActionError captured it'));
        toast.error(label('动作失败，已捕获', 'Action failed and was captured'), { duration: 1400 });
      },
      actions: [
        { key: 'cancel', role: 'cancel', label: label('取消', 'Cancel'), variant: 'soft' },
        {
          key: 'throw',
          role: 'confirm',
          label: label('触发异常', 'Throw'),
          onPress: () => {
            throw new Error('ActionDialog demo error');
          },
        },
      ],
    });

    watchHandle(label('动作异常', 'Action error'), handle);
  }, [label, watchHandle]);

  const openFooterLayout = React.useCallback(
    (layout: ActionDialogFooterLayout) => {
      const actionCount = layout === 'auto' ? 3 : layout === 'stack' ? 3 : 2;
      const actions =
        actionCount > 2
          ? [
              { key: 'cancel', role: 'cancel' as const, label: label('取消', 'Cancel'), variant: 'soft' as const },
              { key: 'neutral', role: 'neutral' as const, label: label('更多', 'More'), variant: 'ghost' as const },
              { key: 'confirm', role: 'confirm' as const, label: label('确认', 'Confirm') },
            ]
          : [
              { key: 'cancel', role: 'cancel' as const, label: label('取消', 'Cancel'), variant: 'soft' as const },
              { key: 'confirm', role: 'confirm' as const, label: label('确认', 'Confirm') },
            ];

      const handle = actionDialog.open({
        title: label(`Footer ${layout}`, `Footer ${layout}`),
        message: label(
          layout === 'auto'
            ? 'auto 会让 1-2 个动作横排；3 个短动作也保持横排，长文案或更多动作自动使用 stack。'
            : `${layout} 显式锁定底部按钮布局。`,
          layout === 'auto'
            ? 'auto keeps 1-2 actions in a row; three short actions stay in a row, while long labels or more actions become stack.'
            : `${layout} explicitly locks the footer button layout.`
        ),
        actions,
        footer: { layout },
      });

      watchHandle(label(`Footer ${layout}`, `Footer ${layout}`), handle);
    },
    [label, watchHandle]
  );

  const openCustomFooter = React.useCallback(() => {
    const handle = actionDialog.open({
      title: label('自定义 Footer', 'Custom footer'),
      message: label('footer.render 接管底部渲染，同时保留 actions、layout、close 与 pressAction 上下文。', 'footer.render owns the footer while keeping actions, layout, close, and pressAction context.'),
      actions: [
        { key: 'cancel', role: 'cancel', label: label('取消', 'Cancel') },
        { key: 'save', role: 'confirm', label: label('保存', 'Save') },
      ],
      footer: {
        render: ({ pressAction, close, actions, layout }) => (
          <View style={[sharedStyles.dialogCustomFooter, { borderTopColor: theme.colors.border }]}>
            <Text style={[sharedStyles.dialogCustomFooterTitle, { color: theme.colors.onSurface }]}>
              {label(`自定义区域 · ${layout} · ${actions.length} actions`, `Custom area · ${layout} · ${actions.length} actions`)}
            </Text>
            <Text style={[sharedStyles.dialogCustomFooterText, { color: theme.colors.muted }]}>
              {label('这里可以放说明、二次确认或额外状态。', 'Use this area for detail, secondary confirmation, or extra state.')}
            </Text>
            <View style={sharedStyles.dialogCustomFooterButtons}>
              <View style={sharedStyles.dialogCustomFooterButtonCell}>
                <Button block size="md" variant="ghost" tone="neutral" onPress={close}>
                  {label('关闭', 'Close')}
                </Button>
              </View>
              <View style={sharedStyles.dialogCustomFooterButtonCell}>
                <Button block size="md" onPress={() => void pressAction('save')}>
                  {label('保存', 'Save')}
                </Button>
              </View>
            </View>
          </View>
        ),
      },
    });

    watchHandle(label('自定义 Footer', 'Custom footer'), handle);
  }, [label, theme.colors.border, theme.colors.muted, theme.colors.onSurface, watchHandle]);

  const openOverlayDismiss = React.useCallback(() => {
    const handle = actionDialog.open({
      title: label('遮罩关闭', 'Overlay dismiss'),
      message: label('dismiss.overlayPress=true 时，点击遮罩会以 overlay reason 关闭。', 'With dismiss.overlayPress=true, tapping the backdrop resolves with overlay.'),
      dismiss: { overlayPress: true, backPress: true },
      actions: [{ key: 'confirm', role: 'confirm', label: label('确认', 'Confirm') }],
    });

    watchHandle(label('遮罩关闭', 'Overlay dismiss'), handle);
  }, [label, watchHandle]);

  const openLockedDismiss = React.useCallback(() => {
    const handle = actionDialog.open({
      title: label('锁定关闭', 'Locked dismiss'),
      message: label('dismissible=false 会同时关闭遮罩与返回键关闭能力，业务必须提供明确动作。', 'dismissible=false disables overlay and back dismissal; the flow must provide an explicit action.'),
      dismissible: false,
      dismiss: { overlayPress: true, backPress: true },
      actions: [{ key: 'confirm', role: 'confirm', label: label('我知道', 'I understand') }],
    });

    watchHandle(label('锁定关闭', 'Locked dismiss'), handle);
  }, [label, watchHandle]);

  const openDisabledShell = React.useCallback(() => {
    actionDialog.open({
      title: label('整体禁用', 'Disabled shell'),
      message: label('disabled=true 会阻止动作与关闭手势；示例会自动用 API 关闭，避免困住用户。', 'disabled=true blocks actions and dismiss gestures; this demo closes by API to avoid trapping you.'),
      disabled: true,
      dismiss: { overlayPress: true, backPress: true },
      actions: [{ key: 'confirm', role: 'confirm', label: label('不可点击', 'Blocked') }],
    });

    setStatus(label('整体禁用：即将由 API 自动关闭', 'Disabled shell: closing by API soon'));
    setTimeout(() => {
      actionDialog.close();
      setCaseStatus(label('整体禁用：已通过 API 关闭', 'Disabled shell: closed through API'));
    }, 1700);
  }, [label, setCaseStatus]);

  const openKeyboardDialog = React.useCallback(() => {
    const handle = actionDialog.open({
      title: label('键盘避让', 'Keyboard avoidance'),
      message: label('keyboard.avoid、dismissOnOverlayPress 与 dismissOnClose 一起覆盖输入场景。', 'keyboard.avoid, dismissOnOverlayPress, and dismissOnClose cover input-heavy flows.'),
      dismiss: { overlayPress: true },
      keyboard: { avoid: true, dismissOnOverlayPress: true, dismissOnClose: true },
      children: (
        <View style={sharedStyles.dialogBodyPanel}>
          <TextInput
            label={label('备注', 'Note')}
            placeholder={label('点这里拉起键盘', 'Tap to open the keyboard')}
            defaultValue={label('键盘出现时弹窗上移', 'The dialog shifts above the keyboard')}
            clearable
          />
        </View>
      ),
      actions: [{ key: 'confirm', role: 'confirm', label: label('完成', 'Done') }],
    });

    watchHandle(label('键盘避让', 'Keyboard avoidance'), handle);
  }, [label, watchHandle]);

  const openNoKeyboardAvoid = React.useCallback(() => {
    const handle = actionDialog.open({
      title: label('键盘不避让', 'No keyboard avoidance'),
      message: label('keyboard.avoid=false / dismissOnOverlayPress=false / dismissOnClose=false 用于业务自己管理键盘的场景。', 'keyboard.avoid=false / dismissOnOverlayPress=false / dismissOnClose=false is for flows that manage keyboard behavior themselves.'),
      dismiss: { overlayPress: true },
      keyboard: { avoid: false, dismissOnOverlayPress: false, dismissOnClose: false },
      children: (
        <View style={sharedStyles.dialogBodyPanel}>
          <TextInput
            label={label('搜索', 'Search')}
            placeholder={label('键盘不会触发弹窗避让', 'Keyboard will not move the dialog')}
            defaultValue=""
          />
        </View>
      ),
      actions: [{ key: 'confirm', role: 'confirm', label: label('完成', 'Done') }],
    });

    watchHandle(label('键盘不避让', 'No keyboard avoidance'), handle);
  }, [label, watchHandle]);

  const openCustomChrome = React.useCallback(() => {
    const handle = actionDialog.open({
      title: label('视觉与布局', 'Visual and layout'),
      message: label('layout、colors、style、layer 和 labels 统一覆盖尺寸、颜色、层级与默认文案。', 'layout, colors, style, layer, and labels cover size, color, stacking, and default labels.'),
      layout: { width: 300, maxWidth: 360, contentPadding: 18, radius: 18 },
      layer: { zIndex: 5200 },
      colors: {
        backdrop: 'rgba(15, 23, 42, 0.58)',
        surface: '#0F172A',
        title: '#F8FAFC',
        message: '#CBD5E1',
        border: '#334155',
      },
      labels: {
        confirm: label('采用', 'Apply'),
        cancel: label('返回', 'Back'),
        close: label('关闭定制弹窗', 'Close custom dialog'),
      },
      motion: 'scale',
      style: { borderColor: '#334155', borderWidth: wp(1) },
      actions: [
        { key: 'cancel', role: 'cancel', variant: 'ghost' },
        { key: 'confirm', role: 'confirm' },
      ],
    });

    watchHandle(label('视觉与布局', 'Visual and layout'), handle);
  }, [label, watchHandle]);

  const openNoMotion = React.useCallback(() => {
    const handle = actionDialog.open({
      title: label('无动效', 'No motion'),
      message: label('motion=none 会跳过入场和离场动画，适合极端无障碍或测试路径。', 'motion=none skips enter and exit animation for strict accessibility or test paths.'),
      motion: 'none',
      actions: [{ key: 'confirm', role: 'confirm', label: label('完成', 'Done') }],
    });

    watchHandle(label('无动效', 'No motion'), handle);
  }, [label, watchHandle]);

  const openLongContent = React.useCallback(() => {
    const handle = actionDialog.open({
      title: label('长内容滚动', 'Scrollable content'),
      message: label('正文区域会限制最大高度，title / message / children 可以一起出现。', 'The body caps max height, and title / message / children can render together.'),
      children: (
        <View style={sharedStyles.dialogLongContent}>
          {Array.from({ length: 8 }).map((_, index) => (
            <Text key={index} style={[sharedStyles.dialogLongContentText, { color: theme.colors.muted }]}>
              {label(`第 ${index + 1} 条说明：内容过长时仅 body 滚动，footer 稳定停留。`, `Item ${index + 1}: long content scrolls in the body while the footer stays stable.`)}
            </Text>
          ))}
        </View>
      ),
      actions: [{ key: 'confirm', role: 'confirm', label: label('完成', 'Done') }],
    });

    watchHandle(label('长内容滚动', 'Scrollable content'), handle);
  }, [label, theme.colors.muted, watchHandle]);

  const openReplaceFlow = React.useCallback(() => {
    const first = actionDialog.open({
      title: label('即将被替换', 'Will be replaced'),
      message: label('默认 collisionStrategy 是 replace。新弹窗会结算旧弹窗为 replace。', 'The default collisionStrategy is replace. A new dialog settles the previous one as replace.'),
      actions: [{ key: 'confirm', role: 'confirm', label: label('等待', 'Wait') }],
    });

    void first.result.then((result) => {
      setStatus(`${label('替换流程旧弹窗', 'Replace flow previous dialog')}: ${formatResult(result, zh)}`);
    });

    setTimeout(() => {
      const second = actionDialog.open({
        title: label('替换后的弹窗', 'Replacement dialog'),
        message: label('这是第二个弹窗，已经替换掉第一个。', 'This is the second dialog, replacing the first.'),
        actions: [{ key: 'confirm', role: 'confirm', label: label('完成', 'Done') }],
      });
      watchHandle(label('替换流程新弹窗', 'Replace flow new dialog'), second);
    }, 520);
  }, [label, watchHandle, zh]);

  const openQueueFlow = React.useCallback(() => {
    const first = actionDialog.open({
      title: label('队列 1/2', 'Queue 1/2'),
      message: label('关闭这个弹窗后，第二个队列弹窗会自动出现。', 'Close this dialog and the second queued dialog appears.'),
      collisionStrategy: 'queue',
      actions: [{ key: 'confirm', role: 'confirm', label: label('下一个', 'Next') }],
    });
    const second = actionDialog.open({
      title: label('队列 2/2', 'Queue 2/2'),
      message: label('queuedCount 会随着队列消费减少。', 'queuedCount decreases as the queue is consumed.'),
      collisionStrategy: 'queue',
      actions: [{ key: 'confirm', role: 'confirm', label: label('完成', 'Done') }],
    });

    setStatus(formatSnapshot(actionDialog.getSnapshot(), zh));
    watchHandle(label('队列 1/2', 'Queue 1/2'), first);
    watchHandle(label('队列 2/2', 'Queue 2/2'), second);
  }, [label, watchHandle, zh]);

  const openUpdateFlow = React.useCallback(() => {
    const handle = actionDialog.open({
      title: label('句柄更新', 'Handle update'),
      message: label('1 秒后通过 handle.update 更新标题、正文、动作与 footer。', 'handle.update will change the title, message, actions, and footer in 1 second.'),
      scopeKey: 'demo-update',
      actions: [{ key: 'cancel', role: 'cancel', label: label('取消', 'Cancel') }],
    });

    watchHandle(label('句柄更新', 'Handle update'), handle);
    setTimeout(() => {
      handle.update({
        title: label('已更新', 'Updated'),
        message: label('这次更新使用 mergeOpenOptions 合并 colors / dismiss / footer 等对象配置。', 'This update uses mergeOpenOptions to merge colors / dismiss / footer object options.'),
        footer: { layout: 'row' },
        colors: { backdrop: 'rgba(2, 6, 23, 0.5)' },
        actions: [
          { key: 'cancel', role: 'cancel', label: label('取消', 'Cancel'), variant: 'soft' },
          { key: 'confirm', role: 'confirm', label: label('确认', 'Confirm') },
        ],
      });
    }, 1000);
  }, [label, watchHandle]);

  const openScopeCloseFlow = React.useCallback(() => {
    const scopeKey = 'dialog-demo-scope';
    const first = actionDialog.open({
      title: label('Scope 当前项', 'Scope active item'),
      message: label('这条和队列中的下一条共享 scopeKey，会被 closeByScope 一起关闭。', 'This dialog and the queued one share a scopeKey and will be closed by closeByScope.'),
      scopeKey,
      collisionStrategy: 'queue',
      actions: [{ key: 'confirm', role: 'confirm', label: label('确认', 'Confirm') }],
    });
    const second = actionDialog.open({
      title: label('Scope 队列项', 'Scope queued item'),
      message: label('如果没有被 closeByScope 清掉，它会在当前项后出现。', 'Without closeByScope, this would appear after the active item.'),
      scopeKey,
      collisionStrategy: 'queue',
      actions: [{ key: 'confirm', role: 'confirm', label: label('确认', 'Confirm') }],
    });

    watchHandle(label('Scope 当前项', 'Scope active item'), first);
    watchHandle(label('Scope 队列项', 'Scope queued item'), second);
    setStatus(formatSnapshot(actionDialog.getSnapshot(), zh));

    setTimeout(() => {
      actionDialog.closeByScope(scopeKey);
      setCaseStatus(label('closeByScope：当前项与队列项已关闭', 'closeByScope: active and queued items closed'));
    }, 1200);
  }, [label, setCaseStatus, watchHandle, zh]);

  const openCloseAllFlow = React.useCallback(() => {
    const first = actionDialog.open({
      title: label('closeAll 当前项', 'closeAll active item'),
      message: label('稍后会调用 closeAll，同时关闭当前项并清空队列。', 'closeAll will close the active item and clear the queue shortly.'),
      collisionStrategy: 'queue',
      actions: [{ key: 'confirm', role: 'confirm', label: label('确认', 'Confirm') }],
    });
    const second = actionDialog.open({
      title: label('closeAll 队列项', 'closeAll queued item'),
      message: label('这条应该不会展示，会直接以 api reason 结算。', 'This one should not render; it will settle with api reason.'),
      collisionStrategy: 'queue',
      actions: [{ key: 'confirm', role: 'confirm', label: label('确认', 'Confirm') }],
    });

    watchHandle(label('closeAll 当前项', 'closeAll active item'), first);
    watchHandle(label('closeAll 队列项', 'closeAll queued item'), second);
    setStatus(formatSnapshot(actionDialog.getSnapshot(), zh));

    setTimeout(() => {
      actionDialog.closeAll();
      setCaseStatus(label('closeAll：当前与队列都已关闭', 'closeAll: active and queued dialogs closed'));
    }, 1200);
  }, [label, setCaseStatus, watchHandle, zh]);

  const openControlledDialog = React.useCallback(() => {
    setControlledOpen(true);
  }, []);

  const openUncontrolledDialog = React.useCallback(() => {
    setUncontrolledKey((current) => current + 1);
  }, []);

  return (
    <>
      <TabScreenShell withTopInset={false}>
        <Section
          eyebrow={label('确认弹窗', 'ActionDialog')}
          title="ActionDialog"
          subtitle={label(
            '确认、提示、复杂动作、关闭来源、队列与声明式宿主',
            'Confirm, alert, complex actions, dismiss reasons, queueing, and declarative hosts'
          )}
        >
          <View
            style={[
              sharedStyles.dialogStatusPanel,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <View style={[sharedStyles.dialogStatusIcon, { backgroundColor: theme.colors.secondary }]}>
              {renderIcon('activity', theme.colors.primary, wp(18))}
            </View>
            <View style={sharedStyles.dialogStatusCopy}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[sharedStyles.dialogStatusTitle, { color: theme.colors.onSurface }]}
              >
                {label('当前结果', 'Current result')}
              </Text>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[sharedStyles.dialogStatusText, { color: theme.colors.muted }]}
              >
                {status ?? readyStatus}
              </Text>
            </View>
            <Button size="sm" variant="soft" tone="neutral" onPress={syncSnapshotStatus}>
              {label('快照', 'Snapshot')}
            </Button>
          </View>

          <DialogCaseGroup
            title={label('语义入口', 'Semantic entry points')}
            caption={label('confirm / alert / open 的业务结果模型', 'Business result model for confirm / alert / open')}
          >
            <DialogCaseCard
              iconName="check-circle"
              title={label('基础确认', 'Basic confirm')}
              subtitle="confirm · Promise<boolean> · row"
              color="#2563EB"
              buttonLabel={label('打开', 'Open')}
              onPress={() => void openBasicConfirm()}
            />
            <DialogCaseCard
              iconName="trash-2"
              title={label('危险确认', 'Danger confirm')}
              subtitle="tone=danger · semantic actions"
              color="#DC2626"
              buttonLabel={label('打开', 'Open')}
              onPress={() => void openDangerConfirm()}
            />
            <DialogCaseCard
              iconName="info"
              title={label('单按钮提示', 'Alert')}
              subtitle="alert · single confirm · bar"
              color="#0891B2"
              buttonLabel={label('显示', 'Show')}
              onPress={() => void openAlert()}
            />
          </DialogCaseGroup>

          <DialogCaseGroup
            title={label('动作分支', 'Action branches')}
            caption={label('role / tone / variant / false / error / disabled / 外部 loading', 'role / tone / variant / false / error / disabled / external loading')}
          >
            <DialogCaseCard
              iconName="sliders"
              title={label('动作语义', 'Action semantics')}
              subtitle="cancel · neutral · confirm"
              color="#7C3AED"
              buttonLabel={label('打开', 'Open')}
              onPress={openActionRoles}
            />
            <DialogCaseCard
              iconName="loader"
              title={label('确认后 Loading', 'Loading after confirm')}
              subtitle="confirm -> loading.promise"
              color="#0F9F6E"
              buttonLabel={label('运行', 'Run')}
              onPress={() => void openConfirmThenLoading()}
            />
            <DialogCaseCard
              iconName="pause-circle"
              title={label('阻止默认关闭', 'Prevent default close')}
              subtitle="closeOnPress=false · return false"
              color="#EB5A17"
              buttonLabel={label('打开', 'Open')}
              onPress={openKeepOpenAction}
            />
            <DialogCaseCard
              iconName="slash"
              title={label('禁用与加载动作', 'Disabled and loading')}
              subtitle="action.disabled · action.loading"
              color="#64748B"
              buttonLabel={label('打开', 'Open')}
              onPress={openDisabledLoadingActions}
            />
            <DialogCaseCard
              iconName="alert-triangle"
              title={label('动作异常', 'Action error')}
              subtitle="onActionError"
              color="#DB2777"
              buttonLabel={label('触发', 'Throw')}
              onPress={openActionError}
            />
          </DialogCaseGroup>

          <DialogCaseGroup
            title={label('Footer 布局', 'Footer layouts')}
            caption={label('auto / row / stack / bar 与完全自定义 footer', 'auto / row / stack / bar plus custom footer')}
          >
            <DialogCaseCard
              iconName="columns"
              title="row"
              subtitle="footer.layout=row"
              color="#2563EB"
              buttonLabel={label('打开', 'Open')}
              onPress={() => openFooterLayout('row')}
            />
            <DialogCaseCard
              iconName="align-justify"
              title="stack"
              subtitle="footer.layout=stack"
              color="#0F9F6E"
              buttonLabel={label('打开', 'Open')}
              onPress={() => openFooterLayout('stack')}
            />
            <DialogCaseCard
              iconName="sidebar"
              title="bar"
              subtitle="footer.layout=bar"
              color="#0891B2"
              buttonLabel={label('打开', 'Open')}
              onPress={() => openFooterLayout('bar')}
            />
            <DialogCaseCard
              iconName="shuffle"
              title="auto"
              subtitle="auto · 3 short actions => row"
              color="#7C3AED"
              buttonLabel={label('打开', 'Open')}
              onPress={() => openFooterLayout('auto')}
            />
            <DialogCaseCard
              iconName="layout"
              title={label('自定义 Footer', 'Custom footer')}
              subtitle="footer.render · pressAction"
              color="#EB5A17"
              buttonLabel={label('打开', 'Open')}
              onPress={openCustomFooter}
            />
          </DialogCaseGroup>

          <DialogCaseGroup
            title={label('关闭与键盘', 'Dismiss and keyboard')}
            caption={label('overlay、back、dismissible、disabled 与键盘策略', 'overlay, back, dismissible, disabled, and keyboard policies')}
          >
            <DialogCaseCard
              iconName="mouse-pointer"
              title={label('遮罩关闭', 'Overlay dismiss')}
              subtitle="dismiss.overlayPress=true"
              color="#2563EB"
              buttonLabel={label('打开', 'Open')}
              onPress={openOverlayDismiss}
            />
            <DialogCaseCard
              iconName="lock"
              title={label('锁定关闭', 'Locked dismiss')}
              subtitle="dismissible=false"
              color="#334155"
              buttonLabel={label('打开', 'Open')}
              onPress={openLockedDismiss}
            />
            <DialogCaseCard
              iconName="shield-off"
              title={label('整体禁用', 'Disabled shell')}
              subtitle="disabled=true · API close"
              color="#DC2626"
              buttonLabel={label('运行', 'Run')}
              onPress={openDisabledShell}
            />
            <DialogCaseCard
              iconName="type"
              title={label('键盘避让', 'Keyboard avoidance')}
              subtitle="avoid · dismiss keyboard"
              color="#0F9F6E"
              buttonLabel={label('打开', 'Open')}
              onPress={openKeyboardDialog}
            />
            <DialogCaseCard
              iconName="terminal"
              title={label('键盘不避让', 'No keyboard avoidance')}
              subtitle="avoid=false"
              color="#7C3AED"
              buttonLabel={label('打开', 'Open')}
              onPress={openNoKeyboardAvoid}
            />
          </DialogCaseGroup>

          <DialogCaseGroup
            title={label('视觉与内容', 'Visual and content')}
            caption={label('motion、layout、colors、labels、style、layer 与滚动正文', 'motion, layout, colors, labels, style, layer, and scrollable body')}
          >
            <DialogCaseCard
              iconName="aperture"
              title={label('定制外观', 'Custom chrome')}
              subtitle="scale · colors · layout · labels"
              color="#0F172A"
              buttonLabel={label('打开', 'Open')}
              onPress={openCustomChrome}
            />
            <DialogCaseCard
              iconName="skip-forward"
              title={label('无动效', 'No motion')}
              subtitle="motion=none"
              color="#64748B"
              buttonLabel={label('打开', 'Open')}
              onPress={openNoMotion}
            />
            <DialogCaseCard
              iconName="file-text"
              title={label('长内容滚动', 'Scrollable content')}
              subtitle="title · message · children"
              color="#EB5A17"
              buttonLabel={label('打开', 'Open')}
              onPress={openLongContent}
            />
          </DialogCaseGroup>

          <DialogCaseGroup
            title={label('服务生命周期', 'Service lifecycle')}
            caption={label('replace、queue、handle.update、scope、closeAll、snapshot', 'replace, queue, handle.update, scope, closeAll, snapshot')}
          >
            <DialogCaseCard
              iconName="repeat"
              title={label('替换策略', 'Replace strategy')}
              subtitle="collisionStrategy=replace"
              color="#2563EB"
              buttonLabel={label('运行', 'Run')}
              onPress={openReplaceFlow}
            />
            <DialogCaseCard
              iconName="list"
              title={label('队列策略', 'Queue strategy')}
              subtitle="collisionStrategy=queue"
              color="#0F9F6E"
              buttonLabel={label('运行', 'Run')}
              onPress={openQueueFlow}
            />
            <DialogCaseCard
              iconName="refresh-cw"
              title={label('句柄更新', 'Handle update')}
              subtitle="handle.update · merge"
              color="#7C3AED"
              buttonLabel={label('运行', 'Run')}
              onPress={openUpdateFlow}
            />
            <DialogCaseCard
              iconName="target"
              title="scopeKey"
              subtitle="closeByScope"
              color="#DB2777"
              buttonLabel={label('运行', 'Run')}
              onPress={openScopeCloseFlow}
            />
            <DialogCaseCard
              iconName="x-circle"
              title="closeAll"
              subtitle="active + queued"
              color="#DC2626"
              buttonLabel={label('运行', 'Run')}
              onPress={openCloseAllFlow}
            />
          </DialogCaseGroup>

          <DialogCaseGroup
            title={label('声明式组件', 'Declarative component')}
            caption={label('controlled、defaultOpen、ref、modalProps、onDismissComplete', 'controlled, defaultOpen, ref, modalProps, onDismissComplete')}
          >
            <DialogCaseCard
              iconName="toggle-right"
              title={label('受控 modal', 'Controlled modal')}
              subtitle="open · ref · modalProps"
              color="#2563EB"
              buttonLabel={label('打开', 'Open')}
              onPress={openControlledDialog}
            />
            <DialogCaseCard
              iconName="toggle-left"
              title={label('非受控 defaultOpen', 'Uncontrolled defaultOpen')}
              subtitle="defaultOpen · onDismissComplete"
              color="#0F9F6E"
              buttonLabel={label('打开', 'Open')}
              onPress={openUncontrolledDialog}
            />
          </DialogCaseGroup>
        </Section>

        <UsageGuide {...guide} />
      </TabScreenShell>

      <ActionDialog
        ref={controlledDialogRef}
        open={controlledOpen}
        onOpenChange={(next, meta) => {
          setControlledOpen(next);
          if (meta.result) setStatus(`${label('受控弹窗', 'Controlled dialog')}: ${formatResult(meta.result, zh)}`);
        }}
        onClose={(result) => {
          setStatus(`${label('onClose', 'onClose')}: ${formatResult(result, zh)}`);
        }}
        onDismissComplete={() => {
          toast.info(label('受控弹窗离场完成', 'Controlled dialog dismissed'), { duration: 1200 });
        }}
        title={label('受控 ActionDialog', 'Controlled ActionDialog')}
        message={label('这个弹窗使用声明式 open，并通过 ref 读取状态或触发动作。', 'This dialog uses declarative open state and a ref to read state or trigger actions.')}
        hostMode="modal"
        motion="scale"
        modalProps={{
          onShow: () => setStatus(label('modalProps.onShow 已触发', 'modalProps.onShow fired')),
        }}
        testID="example-action-dialog-controlled"
        accessibilityLabel={label('受控 ActionDialog 示例', 'Controlled ActionDialog example')}
        actions={[
          { key: 'cancel', role: 'cancel', label: label('取消', 'Cancel'), variant: 'soft' },
          {
            key: 'confirm',
            role: 'confirm',
            label: label('确认', 'Confirm'),
          },
        ]}
      >
        <View style={sharedStyles.dialogBodyPanel}>
          <TextInput
            label={label('备注', 'Note')}
            value={note}
            onChange={setNote}
            placeholder={label('输入任意内容', 'Type anything')}
            clearable
          />
          <View style={sharedStyles.dialogInlineButtonRow}>
            <View style={sharedStyles.dialogInlineButtonCell}>
              <Button
                block
                size="sm"
                variant="soft"
                tone="neutral"
                onPress={() => {
                  const open = controlledDialogRef.current?.getOpen() ?? false;
                  toast.info(label(`ref.getOpen() = ${open ? 'true' : 'false'}`, `ref.getOpen() = ${open ? 'true' : 'false'}`), {
                    duration: 1200,
                  });
                }}
              >
                getOpen
              </Button>
            </View>
            <View style={sharedStyles.dialogInlineButtonCell}>
              <Button
                block
                size="sm"
                variant="outline"
                tone="neutral"
                onPress={() => void controlledDialogRef.current?.pressAction('confirm')}
              >
                pressAction
              </Button>
            </View>
          </View>
        </View>
      </ActionDialog>

      {uncontrolledKey > 0 ? (
        <ActionDialog
          key={uncontrolledKey}
          defaultOpen
          title={label('非受控弹窗', 'Uncontrolled dialog')}
          message={label('通过重新挂载 defaultOpen=true 的组件打开；关闭完成后卸载。', 'Opened by remounting a defaultOpen=true component; it unmounts after dismiss completion.')}
          motion="fade"
          onOpenChange={(next, meta) => {
            if (!next && meta.result) {
              setStatus(`${label('非受控弹窗', 'Uncontrolled dialog')}: ${formatResult(meta.result, zh)}`);
            }
          }}
          onDismissComplete={() => {
            setUncontrolledKey(0);
            toast.info(label('非受控弹窗已卸载', 'Uncontrolled dialog unmounted'), { duration: 1200 });
          }}
          actions={[
            { key: 'cancel', role: 'cancel', label: label('取消', 'Cancel'), variant: 'soft' },
            { key: 'confirm', role: 'confirm', label: label('确认', 'Confirm') },
          ]}
        />
      ) : null}
    </>
  );
});
