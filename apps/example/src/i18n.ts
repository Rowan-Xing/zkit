import { NativeModules } from 'react-native';
import type { I18nMessages } from 'zkit-ui';

export type ExampleLocale = 'zh-CN' | 'en-US';

type ExpoLocalizationModule = {
  getLocales?: () => Array<{
    languageTag?: string | null;
    languageCode?: string | null;
    regionCode?: string | null;
  }>;
};

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

const DEFAULT_EXAMPLE_LOCALE: ExampleLocale = 'zh-CN';

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

function matchExampleLocale(locale: unknown): ExampleLocale | undefined {
  const raw = getString(locale);
  if (!raw) return undefined;

  const normalized = raw.replace(/_/g, '-').toLowerCase();
  if (normalized === 'zh-cn' || normalized.startsWith('zh-')) return 'zh-CN';
  if (normalized === 'zh') return 'zh-CN';
  if (normalized === 'en-us' || normalized.startsWith('en-')) return 'en-US';
  if (normalized === 'en') return 'en-US';
  return undefined;
}

function getIntlLocaleCandidates() {
  try {
    return [
      Intl.DateTimeFormat().resolvedOptions().locale,
      Intl.NumberFormat().resolvedOptions().locale,
    ];
  } catch {
    return [];
  }
}

function getExpoLocalizationCandidates() {
  try {
    const localization = require('expo-localization') as ExpoLocalizationModule;
    const locales = localization.getLocales?.() ?? [];
    return locales.flatMap((locale) => [
      getString(locale.languageTag),
      locale.languageCode && locale.regionCode
        ? `${locale.languageCode}-${locale.regionCode}`
        : undefined,
      getString(locale.languageCode),
    ]);
  } catch {
    return [];
  }
}

function getSystemLocaleCandidates() {
  const nativeModules = (NativeModules ?? {}) as NativeModulesWithLocale;
  const settings = nativeModules.SettingsManager?.settings;
  const navigator = (globalThis as { navigator?: NavigatorLike }).navigator;

  return [
    ...getExpoLocalizationCandidates(),
    ...getIntlLocaleCandidates(),
    getString(settings?.AppleLocale),
    ...getStringArray(settings?.AppleLanguages),
    getString(nativeModules.I18nManager?.localeIdentifier),
    ...(navigator?.languages ?? []),
    getString(navigator?.language),
    getString(navigator?.userLanguage),
  ];
}

export function resolveExampleLocale(): ExampleLocale {
  for (const candidate of getSystemLocaleCandidates()) {
    const locale = matchExampleLocale(candidate);
    if (locale) return locale;
  }

  return DEFAULT_EXAMPLE_LOCALE;
}

const enUS = {
  'example.header.title': 'ZKit',
  'example.header.subtitle': 'An in-house mobile component and tools library distilled from production work across FieeLink, 墨册, Seyka, FieeChannel, and other internal apps, with a unified Android, iOS, and Web surface.',
  'example.header.previewLabel': 'Proven in apps',
  'example.header.previewValue': 'Android · iOS · Web',
  'example.workspace.menuA11y': 'Open component menu',
  'example.workspace.closeMenuA11y': 'Close component menu',
  'example.workspace.drawerTitle': 'ZKit Guide',
  'example.workspace.drawerSubtitle': 'Components and tools',
  'example.workspace.preferences': 'Preferences',
  'example.workspace.language': 'Language',
  'example.workspace.themeColor': 'Theme color',
  'example.theme.blue': 'Blue theme',
  'example.theme.emerald': 'Emerald theme',
  'example.theme.rose': 'Rose theme',
  'example.theme.violet': 'Violet theme',
  'example.page.overview.title': 'Overview',
  'example.page.overview.caption': 'Internal mobile library',
  'example.page.foundation.title': 'Foundation',
  'example.page.foundation.caption': 'Text / spinner',
  'example.page.button.title': 'Button',
  'example.page.button.caption': 'Variants / icons / loading',
  'example.page.forms.title': 'Form controls',
  'example.page.forms.caption': 'TextInput / Switch',
  'example.page.choice.title': 'Choice controls',
  'example.page.choice.caption': 'Checkbox / Radio',
  'example.page.surfaces.title': 'Surfaces',
  'example.page.surfaces.caption': 'Accordion / Sheet / Linked',
  'example.page.pickers.title': 'Pickers',
  'example.page.pickers.caption': 'Picker / date / address',
  'example.page.services.title': 'Services',
  'example.page.services.caption': 'Toast / dialog / captcha',
  'example.page.tools.title': 'Tools',
  'example.page.tools.caption': 'Scale / runtime / guard',
  'example.tabs.home': 'Basics',
  'example.tabs.forms': 'Forms',
  'example.tabs.showcase': 'Showcase',
  'example.tabs.tools': 'Tools',

  'example.nav.foundation.title': 'Foundation',
  'example.nav.foundation.caption': 'Text / spinner',
  'example.nav.actions.title': 'Actions',
  'example.nav.actions.caption': 'Buttons',
  'example.nav.forms.title': 'Forms',
  'example.nav.forms.caption': 'Input / switch',
  'example.nav.choice.title': 'Choice',
  'example.nav.choice.caption': 'Checkbox / radio',
  'example.nav.surfaces.title': 'Surfaces',
  'example.nav.surfaces.caption': 'Accordion / sheet / linked',
  'example.nav.pickers.title': 'Pickers',
  'example.nav.pickers.caption': 'Date / address / range',
  'example.nav.services.title': 'Services',
  'example.nav.services.caption': 'Toast / preview / captcha',
  'example.nav.tools.title': 'Tools',
  'example.nav.tools.caption': 'Screen / runtime / guard',

  'example.common.open': 'Open',
  'example.common.show': 'Show',
  'example.common.run': 'Run',
  'example.common.pick': 'Pick',
  'example.common.preview': 'Preview',
  'example.common.sheet': 'Sheet',
  'example.common.done': 'Done',
  'example.common.test': 'Test',
  'example.common.cancel': 'Cancel',
  'example.common.use': 'Use',
  'example.common.to': 'to',

  'example.defaultNote': 'Expo 54 playground',
  'example.language.en': 'English',
  'example.language.zh': 'Chinese',
  'example.language.ja': 'Japanese',
  'example.workflow.design': 'Design',
  'example.workflow.tokens': 'Tokens',
  'example.workflow.motion': 'Motion',
  'example.workflow.ship': 'Ship',
  'example.workflow.review': 'Review',
  'example.workflow.release': 'Release',
  'example.workflow.designTokens': 'Design / Tokens',
  'example.address.default': 'Beijing / Dongcheng',
  'example.range.select': 'Select range',
  'example.area.tokens': 'Tokens',
  'example.area.forms': 'Forms',
  'example.area.overlays': 'Overlays',

  'example.globalPicker.title': 'Component area',
  'example.toast.selected': 'Selected {label}',
  'example.dialog.title': 'Run action',
  'example.dialog.content': 'Confirm opens the same service API an app screen would use.',
  'example.dialog.confirm': 'Run',
  'example.dialog.confirmed': 'Action confirmed',
  'example.loading.loading': 'Syncing',
  'example.loading.success': 'Synced',
  'example.loading.error': 'Failed',
  'example.permission.title': 'Camera access',
  'example.permission.message': 'Used by image capture and crop flows in this app.',
  'example.captcha.slideFarther': 'Slide farther',
  'example.captcha.verifiedToast': 'Captcha verified',
  'example.captcha.title': 'Slide captcha',
  'example.captcha.failed': 'Try again',
  'example.captcha.success': 'Verified',
  'example.router.ready': 'Ready',
  'example.router.blocked': 'Duplicate push blocked',
  'example.router.tested': 'Router guard tested',

  'example.foundation.eyebrow': 'Foundation',
  'example.foundation.title': 'Design baseline',
  'example.foundation.subtitle': 'Type, color, scale, and loading primitives',
  'example.foundation.displayLabel': 'Display',
  'example.foundation.displayText': 'Calm speed, crisp control.',
  'example.foundation.displaySubtitle': 'Body copy stays legible while state changes remain immediate.',
  'example.foundation.textLabel': 'Text',
  'example.foundation.textValue': '7 variants',
  'example.foundation.spinnerLabel': 'Spinner',
  'example.foundation.spinnerValue': 'Native scale',
  'example.foundation.tokensLabel': 'Tokens',
  'example.foundation.tokensValue': 'Theme aware',
  'example.foundation.motionLabel': 'Motion',
  'example.foundation.motionValue': 'No layout jump',

  'example.actions.eyebrow': 'Actions',
  'example.actions.title': 'Button system',
  'example.actions.subtitle': 'Solid, soft, outline, ghost, icon-only, and loading modes',
  'example.actions.panelTitle': 'Primary action row',
  'example.actions.panelSubtitle': 'Buttons keep touch targets stable across loading and pressed states.',
  'example.actions.primary': 'Primary',
  'example.actions.warning': 'Warning',
  'example.actions.danger': 'Danger',
  'example.actions.ghost': 'Ghost',
  'example.actions.sync': 'Sync',
  'example.actions.centerLoad': 'Center load',
  'example.actions.toastPrimary': 'Primary action',
  'example.actions.toastWarning': 'Soft warning',
  'example.actions.toastDanger': 'Danger action',
  'example.actions.toastGhost': 'Ghost action',
  'example.actions.refreshA11y': 'Refresh',
  'example.actions.refreshed': 'Refreshed',

  'example.forms.eyebrow': 'Forms',
  'example.forms.title': 'Input controls',
  'example.forms.subtitle': 'TextInput, Switch, disabled state, and inline feedback',
  'example.forms.noteLabel': 'Note',
  'example.forms.noteDescription': 'A controlled input with clear action and character count.',
  'example.forms.placeholder': 'Type a note',
  'example.forms.notifications': 'Notifications',
  'example.forms.enabled': 'Enabled',
  'example.forms.disabled': 'Disabled',
  'example.forms.on': 'On',
  'example.forms.off': 'Off',
  'example.forms.deliveryLane': 'Delivery lane',
  'example.forms.deliveryTone': 'Large success tone',
  'example.forms.live': 'Live',
  'example.forms.hold': 'Hold',
  'example.forms.spinner': 'LoadingSpinner',

  'example.choice.eyebrow': 'Choice',
  'example.choice.title': 'Selection model',
  'example.choice.subtitle': 'Controlled CheckboxGroup and RadioGroup with consistent value naming',
  'example.choice.motionTokens': 'Motion tokens',
  'example.choice.formControls': 'Form controls',
  'example.choice.overlayServices': 'Overlay services',
  'example.choice.compact': 'Compact',
  'example.choice.comfortable': 'Comfortable',
  'example.choice.spacious': 'Spacious',

  'example.surfaces.eyebrow': 'Surfaces',
  'example.surfaces.title': 'Layered surfaces',
  'example.surfaces.subtitle': 'Accordion, BottomSheet, and linked scrolling patterns',
  'example.surfaces.accordionState': 'Controlled and uncontrolled state',
  'example.surfaces.accordionStateBody': 'Buttons, switches, checkbox groups, radios, and pickers are wired to local state in this app.',
  'example.surfaces.accordionServices': 'Provider-backed overlays',
  'example.surfaces.accordionServicesBody': 'Toast, dialog, loading, picker, permission purpose, image preview, and captcha share one root provider.',
  'example.surfaces.linkedTitle': 'Scroll-linked menu and content',
  'example.surfaces.linkedBody': 'FlashList panes stay isolated from the parent page.',
  'example.surfaces.sheetTitle': 'BottomSheet',
  'example.surfaces.sheetBody': 'Native sheet detents with compact content.',
  'example.surfaces.sheetSubtitle': 'Detents, native gestures, and stable content sizing.',
  'example.surfaces.detent': 'Detent',
  'example.surfaces.max': 'Max',

  'example.pickers.eyebrow': 'Pickers',
  'example.pickers.title': 'Picker flows',
  'example.pickers.subtitle': 'Single column, tree, date, address, and date range',
  'example.pickers.language': 'Language',
  'example.pickers.workflow': 'Workflow',

  'example.services.eyebrow': 'Services',
  'example.services.title': 'Provider-backed actions',
  'example.services.subtitle': 'Global overlays and command APIs mounted by ComponentLibProvider',
  'example.services.toastTitle': 'Toast',
  'example.services.toastSubtitle': 'success / warning / error / info',
  'example.services.toastSaved': 'Saved with toast',
  'example.services.dialogTitle': 'ActionDialog',
  'example.services.dialogSubtitle': 'confirm flow',
  'example.services.loadingTitle': 'Loading',
  'example.services.loadingSubtitle': 'promise-bound result',
  'example.services.pickerTitle': 'Picker service',
  'example.services.permissionTitle': 'Permission purpose',
  'example.services.permissionSubtitle': 'camera scope',
  'example.services.previewTitle': 'Image preview',
  'example.services.previewSubtitle': 'pinch, pan, swipe',
  'example.services.captchaTitle': 'Slider captcha',
  'example.services.captchaSubtitle': 'challenge verification',

  'example.tools.eyebrow': 'Tools',
  'example.tools.title': 'Runtime utilities',
  'example.tools.subtitle': 'Screen scale, font scale, device brand, env, and router guard',
  'example.tools.phoneBrand': 'Phone brand',
  'example.tools.fontCap': 'Font cap',
  'example.tools.runtimeEnv': 'Runtime env',
  'example.tools.config': 'Config',
  'example.tools.typedAccess': 'typed access',
  'example.tools.providerMissing': 'provider missing',

  'example.linked.backA11y': 'Back to playground',
  'example.linked.selected': 'Selected: {label}',
  'example.linked.section': 'Section {n}',
  'example.linked.summary.overview': 'Overview block with denser content and a taller viewport target.',
  'example.linked.summary.media': 'Media-like section with mixed copy, chips, and uneven height.',
  'example.linked.summary.metrics': 'Metric section with compact rows and predictable recycling type.',
  'example.linked.summary.fallback': 'Fallback section data for custom item sources.',
  'example.linked.batch': 'Batch {n}',
  'example.linked.items': '{n} items',
  'example.linked.kind.overview': 'overview',
  'example.linked.kind.media': 'media',
  'example.linked.kind.metrics': 'metrics',
  'example.linked.renderType': 'Render type',
  'example.linked.sectionHeight': 'Section height',
  'example.linked.source': 'Source',
} satisfies I18nMessages;

const zhCN = {
  'example.header.title': 'ZKit',
  'example.header.subtitle': 'ZKit 源自 FieeLink、墨册、Seyka、FieeChannel 等内部产品的真实开发实践，是持续演化并系统沉淀形成的自研移动端组件库与工具库，统一覆盖 Android、iOS 与 Web 三端体验。',
  'example.header.previewLabel': '真实项目沉淀',
  'example.header.previewValue': 'Android · iOS · Web',
  'example.workspace.menuA11y': '打开组件菜单',
  'example.workspace.closeMenuA11y': '关闭组件菜单',
  'example.workspace.drawerTitle': 'ZKit 指南',
  'example.workspace.drawerSubtitle': '组件与工具',
  'example.workspace.preferences': '偏好设置',
  'example.workspace.language': '语言',
  'example.workspace.themeColor': '主题色',
  'example.theme.blue': '蓝色主题',
  'example.theme.emerald': '绿色主题',
  'example.theme.rose': '玫红主题',
  'example.theme.violet': '紫色主题',
  'example.page.overview.title': '总览',
  'example.page.overview.caption': '内部移动端组件库',
  'example.page.foundation.title': '基础',
  'example.page.foundation.caption': 'Text / 加载',
  'example.page.button.title': 'Button',
  'example.page.button.caption': '变体 / 图标 / 加载',
  'example.page.forms.title': '表单控件',
  'example.page.forms.caption': 'TextInput / Switch',
  'example.page.choice.title': '选择控件',
  'example.page.choice.caption': 'Checkbox / Radio',
  'example.page.surfaces.title': '界面层',
  'example.page.surfaces.caption': 'Accordion / Sheet / Linked',
  'example.page.pickers.title': '选择器',
  'example.page.pickers.caption': 'Picker / 日期 / 地址',
  'example.page.services.title': '服务',
  'example.page.services.caption': 'Toast / 弹窗 / 验证',
  'example.page.tools.title': '工具',
  'example.page.tools.caption': '缩放 / 运行时 / 路由',
  'example.tabs.home': '基础',
  'example.tabs.forms': '表单',
  'example.tabs.showcase': '展示',
  'example.tabs.tools': '工具',

  'example.nav.foundation.title': '基础',
  'example.nav.foundation.caption': '文本 · 加载',
  'example.nav.actions.title': '操作',
  'example.nav.actions.caption': '按钮',
  'example.nav.forms.title': '表单',
  'example.nav.forms.caption': '输入 · 开关',
  'example.nav.choice.title': '选择',
  'example.nav.choice.caption': '复选 · 单选',
  'example.nav.surfaces.title': '界面层',
  'example.nav.surfaces.caption': '折叠 · 弹层 · 联动',
  'example.nav.pickers.title': '选择器',
  'example.nav.pickers.caption': '日期 · 地址 · 区间',
  'example.nav.services.title': '服务',
  'example.nav.services.caption': '提示 · 预览 · 验证',
  'example.nav.tools.title': '工具',
  'example.nav.tools.caption': '屏幕 · 运行时 · 路由',

  'example.common.open': '打开',
  'example.common.show': '显示',
  'example.common.run': '运行',
  'example.common.pick': '选择',
  'example.common.preview': '预览',
  'example.common.sheet': '弹层',
  'example.common.done': '完成',
  'example.common.test': '测试',
  'example.common.cancel': '取消',
  'example.common.use': '使用',
  'example.common.to': '至',

  'example.defaultNote': 'Expo 54 示例应用',
  'example.language.en': '英文',
  'example.language.zh': '中文',
  'example.language.ja': '日文',
  'example.workflow.design': '设计',
  'example.workflow.tokens': '令牌',
  'example.workflow.motion': '动效',
  'example.workflow.ship': '发布',
  'example.workflow.review': '评审',
  'example.workflow.release': '上线',
  'example.workflow.designTokens': '设计 / 令牌',
  'example.address.default': '北京 / 东城区',
  'example.range.select': '选择区间',
  'example.area.tokens': '令牌',
  'example.area.forms': '表单',
  'example.area.overlays': '浮层',

  'example.globalPicker.title': '组件领域',
  'example.toast.selected': '已选择 {label}',
  'example.dialog.title': '执行操作',
  'example.dialog.content': '确认按钮会调用和业务页面相同的服务 API。',
  'example.dialog.confirm': '执行',
  'example.dialog.confirmed': '操作已确认',
  'example.loading.loading': '同步中',
  'example.loading.success': '已同步',
  'example.loading.error': '同步失败',
  'example.permission.title': '相机权限',
  'example.permission.message': '用于当前应用中的图片拍摄和预览流程。',
  'example.captcha.slideFarther': '请再向右滑动',
  'example.captcha.verifiedToast': '验证已通过',
  'example.captcha.title': '滑块验证',
  'example.captcha.failed': '请重试',
  'example.captcha.success': '验证成功',
  'example.router.ready': '就绪',
  'example.router.blocked': '重复 push 已拦截',
  'example.router.tested': '路由防抖已测试',

  'example.foundation.eyebrow': '基础',
  'example.foundation.title': '设计基线',
  'example.foundation.subtitle': '排版、色彩、缩放与加载原语',
  'example.foundation.displayLabel': '标题',
  'example.foundation.displayText': '克制留白，精准掌控。',
  'example.foundation.displaySubtitle': '正文始终清晰可读，状态切换即时响应。',
  'example.foundation.textLabel': '文本',
  'example.foundation.textValue': '7 种变体',
  'example.foundation.spinnerLabel': '加载',
  'example.foundation.spinnerValue': '原生缩放',
  'example.foundation.tokensLabel': '令牌',
  'example.foundation.tokensValue': '主题感知',
  'example.foundation.motionLabel': '动效',
  'example.foundation.motionValue': '无布局跳动',

  'example.actions.eyebrow': '操作',
  'example.actions.title': '按钮系统',
  'example.actions.subtitle': '实心、柔和、描边、幽灵、图标与加载态',
  'example.actions.panelTitle': '主操作区',
  'example.actions.panelSubtitle': '无论加载还是按压，触控尺寸始终稳定。',
  'example.actions.primary': '主要',
  'example.actions.warning': '警告',
  'example.actions.danger': '危险',
  'example.actions.ghost': '幽灵',
  'example.actions.sync': '同步',
  'example.actions.centerLoad': '居中加载',
  'example.actions.toastPrimary': '主要操作',
  'example.actions.toastWarning': '柔和警告',
  'example.actions.toastDanger': '危险操作',
  'example.actions.toastGhost': '幽灵操作',
  'example.actions.refreshA11y': '刷新',
  'example.actions.refreshed': '已刷新',

  'example.forms.eyebrow': '表单',
  'example.forms.title': '输入控件',
  'example.forms.subtitle': '文本输入、开关、禁用态与行内反馈',
  'example.forms.noteLabel': '备注',
  'example.forms.noteDescription': '受控输入，支持清空操作和字数统计。',
  'example.forms.placeholder': '输入备注',
  'example.forms.notifications': '通知',
  'example.forms.enabled': '已启用',
  'example.forms.disabled': '已禁用',
  'example.forms.on': '开',
  'example.forms.off': '关',
  'example.forms.deliveryLane': '投放通道',
  'example.forms.deliveryTone': '大尺寸成功色',
  'example.forms.live': '在线',
  'example.forms.hold': '暂停',
  'example.forms.spinner': '加载指示器',

  'example.choice.eyebrow': '选择',
  'example.choice.title': '选择模型',
  'example.choice.subtitle': '受控复选组与单选组，统一值命名',
  'example.choice.motionTokens': '动效令牌',
  'example.choice.formControls': '表单控件',
  'example.choice.overlayServices': '浮层服务',
  'example.choice.compact': '紧凑',
  'example.choice.comfortable': '舒适',
  'example.choice.spacious': '宽松',

  'example.surfaces.eyebrow': '界面层',
  'example.surfaces.title': '分层界面',
  'example.surfaces.subtitle': '折叠面板、底部弹层与联动滚动',
  'example.surfaces.accordionState': '受控与非受控状态',
  'example.surfaces.accordionStateBody': '按钮、开关、复选、单选和选择器均接入本页状态管理。',
  'example.surfaces.accordionServices': 'Provider 驱动浮层',
  'example.surfaces.accordionServicesBody': 'Toast、Dialog、Loading、Picker、权限说明、图片预览与验证码共享一个根 Provider。',
  'example.surfaces.linkedTitle': '联动滚动',
  'example.surfaces.linkedBody': '菜单与内容双列同步，独立于父级页面滚动。',
  'example.surfaces.sheetTitle': '底部弹层',
  'example.surfaces.sheetBody': '原生手势驱动，支持多档位停靠。',
  'example.surfaces.sheetSubtitle': '档位吸附、原生手势与稳定内容尺寸。',
  'example.surfaces.detent': '档位',
  'example.surfaces.max': '最大',

  'example.pickers.eyebrow': '选择器',
  'example.pickers.title': '选择器流程',
  'example.pickers.subtitle': '单列、级联、日期、地址与日期区间',
  'example.pickers.language': '语言',
  'example.pickers.workflow': '工作流',

  'example.services.eyebrow': '服务',
  'example.services.title': 'Provider 服务',
  'example.services.subtitle': '全局浮层与命令式 API，由 ComponentLibProvider 统一挂载',
  'example.services.toastTitle': '轻提示',
  'example.services.toastSubtitle': '成功 · 警告 · 错误 · 信息',
  'example.services.toastSaved': '已保存',
  'example.services.dialogTitle': '操作弹窗',
  'example.services.dialogSubtitle': '确认流程',
  'example.services.loadingTitle': '加载状态',
  'example.services.loadingSubtitle': '绑定 Promise',
  'example.services.pickerTitle': '选择服务',
  'example.services.permissionTitle': '权限说明',
  'example.services.permissionSubtitle': '相机范围',
  'example.services.previewTitle': '图片预览',
  'example.services.previewSubtitle': '缩放 · 拖拽 · 滑动',
  'example.services.captchaTitle': '滑块验证',
  'example.services.captchaSubtitle': '人机校验',

  'example.tools.eyebrow': '工具',
  'example.tools.title': '运行时工具',
  'example.tools.subtitle': '屏幕缩放、字体上限、设备品牌、环境变量与路由防抖',
  'example.tools.phoneBrand': '手机品牌',
  'example.tools.fontCap': '字体上限',
  'example.tools.runtimeEnv': '运行环境',
  'example.tools.config': '配置',
  'example.tools.typedAccess': '类型化读取',
  'example.tools.providerMissing': 'Provider 缺失',

  'example.linked.backA11y': '返回示例首页',
  'example.linked.selected': '已选：{label}',
  'example.linked.section': '分区 {n}',
  'example.linked.summary.overview': '概览区块——内容密集，视口高度更大。',
  'example.linked.summary.media': '媒体区块——混合文案、标签与非等高布局。',
  'example.linked.summary.metrics': '指标区块——行布局紧凑，回收类型可预测。',
  'example.linked.summary.fallback': '自定义数据源的兜底分区数据。',
  'example.linked.batch': '批次 {n}',
  'example.linked.items': '{n} 项',
  'example.linked.kind.overview': '概览',
  'example.linked.kind.media': '媒体',
  'example.linked.kind.metrics': '指标',
  'example.linked.renderType': '渲染类型',
  'example.linked.sectionHeight': '分区高度',
  'example.linked.source': '来源',
} satisfies Record<keyof typeof enUS, string>;

export const exampleMessages: Record<ExampleLocale, I18nMessages> = {
  'en-US': enUS,
  'zh-CN': zhCN,
};
