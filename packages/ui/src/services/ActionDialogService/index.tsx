/**
 * @file ActionDialogService - 命令式对话框服务
 * @description
 * `ActionDialogService` 是 `y2kit-ui` 内统一的命令式弹窗入口。
 *
 * 设计约定：
 * 1. `open` 是唯一底层入口，负责承载所有自定义弹窗能力
 * 2. `confirm` / `alert` 是语义化快捷方法，本质上会转换为 `open`
 * 3. `y2kit-ui` 只保留新的 actions 模型，不兼容 legacy `buttons / onConfirm` 等旧参数
 *
 * 结果约定：
 * 1. `open()` 返回 `ActionDialogHandle`
 * 2. `handle.result` 会拿到更完整的结果对象，而不是简单的 boolean
 * 3. `confirm()` / `alert()` 会把结果进一步收敛成 `Promise<boolean>`
 */

import * as React from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  type KeyboardEvent,
} from 'react-native';
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { wp } from 'y2kit-tools';
import { useTheme } from '../../theme/useTheme';
import { Text } from '../../ui/Text';

/**
 * 键盘位移动画配置。
 *
 * 这里只负责“弹窗整体上移”的过渡，不负责键盘本身的开关。
 */
const KEYBOARD_TIMING_CONFIG = {
  duration: 280,
  easing: Easing.out(Easing.cubic),
};
/** 弹窗与键盘之间保留一点安全间距，避免视觉上“贴边”。 */
const KEYBOARD_CLEARANCE = wp(12);

/**
 * 键盘弹出时弹窗上移使用的弹簧动画。
 *
 * 第三方输入法弹出时会连续触发多次 keyboardWillChangeFrame（基础键盘 → 工具栏 → 联想栏），
 * 每次目标高度略有不同。withTiming 在目标变化时会重置缓动曲线，产生明显抖动；
 * withSpring 保持当前速度平滑过渡到新目标，天然消除连续重定向带来的卡顿。
 *
 * stiffness 300 + damping 30 + mass 0.9 ≈ 230ms 到位，接近 iOS 原生键盘节奏。
 * overshootClamping 防止弹窗滑过键盘顶部后弹回。
 */
const KEYBOARD_SPRING_CONFIG = {
  stiffness: 220,
  damping: 28,
  mass: 1,
  overshootClamping: true,
};

/** 对话框默认宽度。 */
const DEFAULT_WIDTH = 320;
/** 内容区默认内边距。 */
const DEFAULT_CONTENT_PADDING = 16;
/** 默认底部布局。 */
const DEFAULT_FOOTER_LAYOUT = 'row';
/** 默认浮层层级：高于 toast，一般低于 loading / image preview 这类强覆盖层。 */
const DEFAULT_Z_INDEX = 2000;
/** 危险态按钮的临时语义色，后续更理想的是收敛到 theme token。 */
const DANGER_COLOR = '#CF3050';

/**
 * 动作语义角色。
 *
 * 说明：
 * 1. `role` 用来表达“这次点击在业务上的语义”
 * 2. `role` 不直接决定视觉样式，视觉由 `variant` 决定
 * 3. `confirm()` / `alert()` 会基于这个字段把结果收敛成 boolean
 */
export type ActionDialogActionRole = 'confirm' | 'cancel' | 'neutral';

/**
 * 动作视觉样式。
 *
 * 说明：
 * 1. `default`：中性样式
 * 2. `primary`：主按钮样式
 * 3. `destructive`：危险操作样式
 */
export type ActionDialogActionVariant = 'default' | 'primary' | 'destructive';

/**
 * 默认 footer 布局模式。
 *
 * 说明：
 * 1. `bar`：贴底横条按钮区，视觉上更接近系统 alert
 * 2. `row`：面板式横向按钮
 * 3. `stacked`：面板式纵向按钮
 */
export type ActionDialogFooterLayout = 'bar' | 'row' | 'stacked';

/**
 * 弹窗关闭原因。
 *
 * 说明：
 * 1. `overlay`：点击蒙层关闭
 * 2. `back`：Android 返回键关闭
 * 3. `api`：显式调用 `close/hide` 等 API 关闭
 * 4. `replace`：当前弹窗被新的弹窗替换掉
 */
export type ActionDialogDismissReason = 'overlay' | 'back' | 'api' | 'replace';

/**
 * `open()` 最终返回的结果。
 *
 * 说明：
 * 1. 点击 action 时，返回 `{ type: 'action' }`
 * 2. 非 action 方式关闭时，返回 `{ type: 'dismiss' }`
 */
export type ActionDialogResult =
  /**
   * 用户点击了某个 action。
   *
   * 字段说明：
   * 1. `key`：命中的 action 标识
   * 2. `role`：命中的业务语义角色
   */
  | { type: 'action'; key: string; role: ActionDialogActionRole }
  /**
   * 弹窗被关闭，但不是通过 action 产生的业务结果。
   */
  | { type: 'dismiss'; reason: ActionDialogDismissReason };

/**
 * action 点击处理函数上下文。
 *
 * 这个上下文只在 `action.onPress` 内可用，用来精细控制关闭与更新行为。
 */
export type ActionDialogActionHandlerContext = {
  /** 直接关闭弹窗，并返回 `{ type: 'dismiss', reason: 'api' }`。 */
  close: () => void;
  /** 按当前 action 的结果语义关闭弹窗。 */
  closeWithAction: () => void;
  /** 局部更新当前弹窗配置。 */
  update: (patch: Partial<ActionDialogOpenOptions>) => void;
};

/**
 * 单个底部动作配置。
 *
 * `ActionDialog` 的核心模型就是一组 `actions`。
 * 每个 action 同时描述：
 * 1. 它的业务语义是什么
 * 2. 它长什么样
 * 3. 点击后是否自动关闭
 * 4. 点击时是否需要异步处理或手动控制关闭
 */
export type ActionDialogAction = {
  /**
   * 动作唯一标识。
   *
   * 不传时会基于 `role + index` 自动生成。
   * 如果你需要在 `footer.render` 里通过 `pressAction(key)` 精确触发某个动作，建议显式传入。
   */
  key?: string;

  /**
   * 动作语义角色。
   *
   * 不传时默认是 `neutral`。
   */
  role?: ActionDialogActionRole;

  /** 按钮文案或自定义节点。 */
  label: React.ReactNode;

  /**
   * 点击回调。
   *
   * 返回值约定：
   * 1. 返回 `false`：阻止默认关闭
   * 2. 返回 `void/true`：按 `closeOnPress` 决定是否关闭
   * 3. 也可以在回调里直接调用 `ctx.close()` / `ctx.closeWithAction()` 自己接管关闭
   */
  onPress?: (ctx: ActionDialogActionHandlerContext) => void | boolean | Promise<void | boolean>;

  /**
   * 动作视觉样式。
   *
   * 不传时会根据 `role` 推导默认值：
   * 1. `confirm` -> `primary`
   * 2. 其他 -> `default`
   */
  variant?: ActionDialogActionVariant;

  /**
   * 点击后是否自动关闭。
   *
   * 默认 `true`。
   * 如果希望先异步校验、再手动关闭，可以设为 `false`，或在 `onPress` 中返回 `false`。
   */
  closeOnPress?: boolean;

  /** 是否禁用当前动作。 */
  disabled?: boolean;
};

/**
 * 传给 `footer.render` 的精简 action 信息。
 *
 * 注意：
 * 这里不会暴露完整 `onPress`，避免自定义 footer 直接依赖内部实现细节。
 * 自定义 footer 统一通过 `pressAction(key)` 触发点击逻辑。
 */
export type ActionDialogFooterRenderAction = {
  /** 动作唯一标识。 */
  key: string;
  /** 动作语义角色。 */
  role: ActionDialogActionRole;
  /** 展示文案或节点。 */
  label: React.ReactNode;
  /** 视觉样式。 */
  variant: ActionDialogActionVariant;
  /** 是否禁用。 */
  disabled: boolean;
};

/**
 * 自定义 footer 渲染上下文。
 *
 * 适用场景：
 * 1. 默认 `bar/row/stacked` 布局不满足需求
 * 2. 需要完全接管底部区域视觉
 * 3. 仍然希望复用 actions 的语义和关闭逻辑
 */
export type ActionDialogFooterRenderContext = {
  /** 当前弹窗的动作列表（精简版）。 */
  actions: ActionDialogFooterRenderAction[];

  /**
   * 按 action key 触发对应动作。
   *
   * 它会复用内部完整点击流程，包括：
   * 1. `action.onPress`
   * 2. `closeOnPress`
   * 3. 结果结算
   */
  pressAction: (key: string) => void | Promise<void>;

  /** 直接关闭当前弹窗。 */
  close: () => void;

  /** 局部更新当前弹窗配置。 */
  update: (patch: Partial<ActionDialogOpenOptions>) => void;
};

/**
 * 关闭行为配置。
 */
export type ActionDialogDismissOptions = {
  /** 点击蒙层时是否关闭弹窗，默认 `false`。 */
  overlayPress?: boolean;
  /** Android 返回键是否关闭弹窗，默认 `true`。 */
  backPress?: boolean;
};

/**
 * 键盘行为配置。
 */
export type ActionDialogKeyboardOptions = {
  /** 点击蒙层时是否优先收起键盘，默认 `true`。 */
  dismissOnOverlayPress?: boolean;
  /** 弹窗关闭时是否收起键盘，默认 `true`。 */
  dismissOnClose?: boolean;
};

/**
 * 布局配置。
 */
export type ActionDialogLayoutOptions = {
  /** 弹窗宽度。 */
  width?: number;
  /** 内容区内边距。 */
  contentPadding?: number;
};

/**
 * 浮层层级配置。
 */
export type ActionDialogLayerOptions = {
  /**
   * 弹窗宿主层级。
   *
   * 默认 `2000`。
   * 当页面内存在业务自定义悬浮层、额外 Portal 宿主或特殊原生覆盖层时，可以显式调整它。
   */
  zIndex?: number;
};

/**
 * footer 配置。
 */
export type ActionDialogFooterOptions = {
  /** 使用内置 footer 时的布局模式。 */
  layout?: ActionDialogFooterLayout;

  /**
   * 完全自定义 footer 渲染。
   *
   * 说明：
   * 1. 传入后会覆盖默认 footer UI
   * 2. 但仍然建议保留 `actions`，让语义、结果和业务关闭逻辑继续统一
   */
  render?: (ctx: ActionDialogFooterRenderContext) => React.ReactNode;
};

/**
 * `open()` 的完整配置。
 *
 * 这是 `ActionDialog` 的底层标准模型。
 */
export type ActionDialogOpenOptions = {
  /**
   * 作用域标识。
   *
   * 可配合 `hideByScope(scopeKey)` 关闭某一类弹窗。
   */
  scopeKey?: string;

  /** 标题区域内容。 */
  title?: React.ReactNode;

  /** 主内容区域。字符串会走默认文本样式，ReactNode 会原样渲染。 */
  content?: string | React.ReactNode;

  /** 底部动作列表。 */
  actions?: ActionDialogAction[];

  /** footer 相关配置。 */
  footer?: ActionDialogFooterOptions;

  /** 关闭行为配置。 */
  dismiss?: ActionDialogDismissOptions;

  /** 键盘行为配置。 */
  keyboard?: ActionDialogKeyboardOptions;

  /** 弹窗布局配置。 */
  layout?: ActionDialogLayoutOptions;

  /** 浮层层级配置。 */
  layer?: ActionDialogLayerOptions;
};

/** 历史命名兼容别名，语义等同于 `ActionDialogOpenOptions`。 */
export type ActionDialogOptions = ActionDialogOpenOptions;

/**
 * `confirmAction` / `cancelAction` 的输入类型。
 *
 * 说明：
 * 1. 这里不允许外部改 `role`
 * 2. 因为 `confirm()` / `alert()` 的角色语义由方法本身决定
 */
type ActionDialogActionInput = Omit<Partial<ActionDialogAction>, 'role'> & { label?: React.ReactNode };

/** 语义化弹窗只暴露 footer 的布局能力，不允许外部覆盖整个 render。 */
type ActionDialogSemanticFooter = Pick<ActionDialogFooterOptions, 'layout'>;

/**
 * `confirm()` 配置。
 *
 * 说明：
 * 1. 它继承 `open()` 的大部分展示与关闭能力
 * 2. 但不允许直接传 `actions`，因为这会破坏 “确认 / 取消” 语义
 */
export type ActionDialogConfirmOptions = Omit<ActionDialogOpenOptions, 'actions' | 'footer'> & {
  /** 确认按钮文案，默认 `'确定'`。 */
  confirmText?: string;
  /** 取消按钮文案，默认 `'取消'`。 */
  cancelText?: string;
  /** 对确认按钮做局部覆盖。 */
  confirmAction?: ActionDialogActionInput;
  /** 对取消按钮做局部覆盖。 */
  cancelAction?: ActionDialogActionInput;
  /** 快速切换确认按钮语义，`danger` 会默认映射到危险样式。 */
  intent?: 'default' | 'danger';
  /** 语义化弹窗只允许切换 footer 布局。 */
  footer?: ActionDialogSemanticFooter;
};

/**
 * `alert()` 配置。
 *
 * 与 `confirm()` 的区别：
 * 1. 只有一个确认动作
 * 2. 最终没有“取消按钮”这层语义
 */
export type ActionDialogAlertOptions = Omit<ActionDialogOpenOptions, 'actions' | 'footer'> & {
  /** 确认按钮文案，默认 `'确定'`。 */
  confirmText?: string;
  /** 对确认按钮做局部覆盖。 */
  confirmAction?: ActionDialogActionInput;
  /** 快速切换确认按钮语义。 */
  intent?: 'default' | 'danger';
  /** 语义化弹窗只允许切换 footer 布局。 */
  footer?: ActionDialogSemanticFooter;
};

/**
 * `open()` 返回的弹窗句柄。
 */
export type ActionDialogHandle = {
  /** 当前弹窗实例 id。 */
  id: string;

  /**
   * 当前弹窗关闭后的最终结果。
   *
   * 只有在弹窗真正结束时才会 resolve。
   */
  result: Promise<ActionDialogResult>;

  /** 关闭当前这一个句柄对应的弹窗实例。 */
  close: () => void;

  /** 局部更新当前弹窗配置。 */
  update: (patch: Partial<ActionDialogOpenOptions>) => void;
};

/**
 * 命令式对话框公开服务接口。
 *
 * 只暴露业务接入真正需要的能力，Provider 绑定、内部结算等生命周期细节不进入公共 API。
 */
export type ActionDialogService = {
  /** 打开一个自定义弹窗。 */
  open: (options?: ActionDialogOpenOptions) => ActionDialogHandle;
  /** 打开语义化确认框。 */
  confirm: (options?: ActionDialogConfirmOptions) => Promise<boolean>;
  /** 打开语义化提示框。 */
  alert: (options?: ActionDialogAlertOptions) => Promise<boolean>;
  /** 关闭当前正在显示的弹窗。 */
  hide: () => void;
  /** 按作用域关闭当前弹窗。 */
  hideByScope: (scopeKey?: string) => void;
};

/**
 * 归一化后的 action。
 *
 * 组件内部渲染和交互只消费这个结构，避免在渲染过程中反复处理默认值。
 */
type NormalizedActionDialogAction = {
  /** 归一化后的唯一标识，内部事件分发统一依赖它。 */
  key: string;
  /** 归一化后的语义角色。 */
  role: ActionDialogActionRole;
  /** 归一化后的展示文案或节点。 */
  label: React.ReactNode;
  /** 归一化后的视觉样式。 */
  variant: ActionDialogActionVariant;
  /** 点击后默认是否关闭。 */
  closeOnPress: boolean;
  /** 是否禁用。 */
  disabled: boolean;
  /** 点击处理函数。 */
  onPress?: ActionDialogAction['onPress'];
};

/**
 * 归一化后的完整 options。
 *
 * 内部状态始终持有这个结构，确保每个字段都具备稳定默认值。
 */
type NormalizedActionDialogOptions = {
  /** 当前弹窗所属作用域。 */
  scopeKey?: string;
  /** 标题区域。 */
  title?: React.ReactNode;
  /** 内容区域。 */
  content?: string | React.ReactNode;
  /** 已归一化的动作列表。 */
  actions: NormalizedActionDialogAction[];
  footer: {
    /** 当前使用的内置 footer 布局。 */
    layout: ActionDialogFooterLayout;
    /** 自定义 footer 渲染函数。 */
    render?: ActionDialogFooterOptions['render'];
  };
  dismiss: {
    /** 点击蒙层是否关闭。 */
    overlayPress: boolean;
    /** Android 返回键是否关闭。 */
    backPress: boolean;
  };
  keyboard: {
    /** 点击蒙层时是否先收起键盘。 */
    dismissOnOverlayPress: boolean;
    /** 关闭弹窗时是否收起键盘。 */
    dismissOnClose: boolean;
  };
  layout: {
    /** 实际用于渲染的宽度。 */
    width: number;
    /** 实际用于渲染的内容区内边距。 */
    contentPadding: number;
  };
  layer: {
    /** 实际用于渲染宿主的层级。 */
    zIndex: number;
  };
};

/**
 * Provider 内部状态。
 */
type ActionDialogState = {
  /** 当前弹窗实例 id，没有弹窗时为 `null`。 */
  id: string | null;
  /** 当前是否处于打开态。 */
  open: boolean;
  /** 未归一化前的原始参数，供后续 `update()` 合并使用。 */
  rawOptions: ActionDialogOpenOptions;
  /** 当前用于渲染的归一化配置。 */
  options: NormalizedActionDialogOptions;
};

/**
 * 当前命令式弹窗的运行期记录。
 *
 * Promise 结算不放进 React state，避免 state updater 里出现副作用。
 */
type ActiveActionDialog = {
  id: string;
  rawOptions: ActionDialogOpenOptions;
  settle: (result: ActionDialogResult) => void;
};

/** Provider 尚未打开任何弹窗时使用的空配置。 */
const EMPTY_NORMALIZED_OPTIONS: NormalizedActionDialogOptions = {
  actions: [],
  footer: { layout: DEFAULT_FOOTER_LAYOUT },
  dismiss: { overlayPress: false, backPress: true },
  keyboard: { dismissOnOverlayPress: true, dismissOnClose: true },
  layout: { width: DEFAULT_WIDTH, contentPadding: DEFAULT_CONTENT_PADDING },
  layer: { zIndex: DEFAULT_Z_INDEX },
};

/** Provider 初始化状态。 */
const initialState: ActionDialogState = {
  id: null,
  open: false,
  rawOptions: {},
  options: EMPTY_NORMALIZED_OPTIONS,
};

/**
 * 合并 `open()` 原始参数与运行期 `update()` patch。
 *
 * 注意：
 * 这里只会对对象型子配置做浅合并，避免一次 `update()` 把整个 `footer/dismiss/layout/layer` 覆盖掉。
 */
function mergeOpenOptions(base: ActionDialogOpenOptions, patch: Partial<ActionDialogOpenOptions>): ActionDialogOpenOptions {
  return {
    ...base,
    ...patch,
    footer: { ...base.footer, ...patch.footer },
    dismiss: { ...base.dismiss, ...patch.dismiss },
    keyboard: { ...base.keyboard, ...patch.keyboard },
    layout: { ...base.layout, ...patch.layout },
    layer: { ...base.layer, ...patch.layer },
  };
}

/**
 * 根据动作语义推导默认视觉样式。
 */
function getDefaultVariantForRole(role: ActionDialogActionRole): ActionDialogActionVariant {
  if (role === 'confirm') return 'primary';
  return 'default';
}

/**
 * 把外部传入的 actions 归一化成内部稳定结构。
 */
function normalizeActions(actions: ActionDialogAction[] | undefined): NormalizedActionDialogAction[] {
  if (!actions || actions.length === 0) return [];

  return actions.map((action, index) => {
    const role = action.role ?? 'neutral';
    return {
      key: action.key ?? `${role}-${index}`,
      role,
      label: action.label,
      variant: action.variant ?? getDefaultVariantForRole(role),
      closeOnPress: action.closeOnPress ?? true,
      disabled: Boolean(action.disabled),
      onPress: action.onPress,
    };
  });
}

/**
 * 把 `open()` 参数归一化为内部渲染配置。
 *
 * 这里会补齐所有默认值，保证渲染层不必关心“是否传入”。
 */
function normalizeOpenOptions(options: ActionDialogOpenOptions = {}): NormalizedActionDialogOptions {
  return {
    scopeKey: options.scopeKey,
    title: options.title,
    content: options.content,
    actions: normalizeActions(options.actions),
    footer: {
      layout: options.footer?.layout ?? DEFAULT_FOOTER_LAYOUT,
      render: options.footer?.render,
    },
    dismiss: {
      overlayPress: options.dismiss?.overlayPress ?? false,
      backPress: options.dismiss?.backPress ?? true,
    },
    keyboard: {
      dismissOnOverlayPress: options.keyboard?.dismissOnOverlayPress ?? true,
      dismissOnClose: options.keyboard?.dismissOnClose ?? true,
    },
    layout: {
      width: options.layout?.width ?? DEFAULT_WIDTH,
      contentPadding: options.layout?.contentPadding ?? DEFAULT_CONTENT_PADDING,
    },
    layer: {
      zIndex: options.layer?.zIndex ?? DEFAULT_Z_INDEX,
    },
  };
}

/**
 * 生成语义化 action。
 *
 * `confirm()` / `alert()` 不直接暴露完整 `actions`，
 * 它们会通过这个函数把“文案 + intent + 局部覆盖配置”转换成标准 action。
 */
function createSemanticAction(
  input: ActionDialogActionInput | undefined,
  label: React.ReactNode,
  variant: ActionDialogActionVariant,
  closeOnPress: boolean,
  key: string,
  role: ActionDialogActionRole
): ActionDialogAction {
  return {
    key: input?.key ?? key,
    role,
    label: input?.label ?? label,
    variant: input?.variant ?? variant,
    closeOnPress: input?.closeOnPress ?? closeOnPress,
    disabled: input?.disabled,
    onPress: input?.onPress,
  };
}

/**
 * 命令式服务主体。
 *
 * 它本身不负责渲染，只负责：
 * 1. 生成句柄
 * 2. 推送状态到 Provider
 * 3. 关闭/更新当前弹窗
 */
class ActionDialogServiceClass {
  /** Provider 挂载后注入的状态更新器。 */
  private setState: React.Dispatch<React.SetStateAction<ActionDialogState>> | null = null;

  /** Provider 当前是否已经挂载。 */
  private mounted = false;

  /** 用于生成递增 id，避免同一毫秒内多次打开时发生冲突。 */
  private sequence = 0;

  /** 当前弹窗的命令式生命周期记录。 */
  private active: ActiveActionDialog | null = null;

  /**
   * 由 `ActionDialogProvider` 在挂载时注入状态更新器。
   *
   * 外部业务不需要手动调用。
   */
  setStateUpdater(updater: React.Dispatch<React.SetStateAction<ActionDialogState>>) {
    this.setState = updater;
    this.mounted = true;
  }

  /**
   * Provider 卸载时清理状态更新器。
   *
   * 如果卸载时仍有弹窗未结算，主动以 `api` 原因结束，避免调用方的 Promise 永久悬挂。
   */
  clearStateUpdater(updater: React.Dispatch<React.SetStateAction<ActionDialogState>>) {
    if (this.setState !== updater) return;
    this.settleActive({ type: 'dismiss', reason: 'api' }, false);
    this.setState = null;
    this.mounted = false;
  }

  /**
   * 打开一个自定义弹窗。
   *
   * 行为说明：
   * 1. 这是唯一底层入口
   * 2. 如果当前已经有弹窗，会先把前一个弹窗以 `replace` 原因结算掉
   * 3. 返回值是一个可继续操作当前弹窗的句柄
   */
  open(options: ActionDialogOpenOptions = {}): ActionDialogHandle {
    const id = `action-dialog-${Date.now()}-${++this.sequence}`;

    let settleResult: (result: ActionDialogResult) => void = () => {};
    const result = new Promise<ActionDialogResult>((resolve) => {
      settleResult = resolve;
    });

    if (!this.mounted || !this.setState) {
      console.warn('[actionDialog] Provider not mounted');
      settleResult({ type: 'dismiss', reason: 'api' });
      return {
        id,
        result,
        close: () => {},
        update: () => {},
      };
    }

    const rawOptions = { ...options };
    const normalizedOptions = normalizeOpenOptions(rawOptions);

    this.settleActive({ type: 'dismiss', reason: 'replace' }, false);
    this.active = {
      id,
      rawOptions,
      settle: settleResult,
    };

    this.setState({
      id,
      open: true,
      rawOptions,
      options: normalizedOptions,
    });

    return {
      id,
      result,
      close: () => this.closeById(id, 'api'),
      update: (patch) => this.updateById(id, patch),
    };
  }

  /**
   * 打开语义化确认框。
   *
   * 返回值说明：
   * 1. 点击确认动作时返回 `true`
   * 2. 点击取消、蒙层关闭、返回键关闭、被替换等情况都返回 `false`
   */
  confirm({
    confirmText = '确定',
    cancelText = '取消',
    confirmAction,
    cancelAction,
    intent = 'default',
    footer,
    ...restOptions
  }: ActionDialogConfirmOptions = {}): Promise<boolean> {
    const handle = this.open({
      ...restOptions,
      footer: {
        layout: footer?.layout ?? DEFAULT_FOOTER_LAYOUT,
      },
      actions: [
        createSemanticAction(cancelAction, cancelText, 'default', true, 'cancel', 'cancel'),
        createSemanticAction(confirmAction, confirmText, intent === 'danger' ? 'destructive' : 'primary', true, 'confirm', 'confirm'),
      ],
    });

    return handle.result.then((result) => result.type === 'action' && result.role === 'confirm');
  }

  /**
   * 打开语义化提示框。
   *
   * 返回值说明：
   * 1. 点击唯一确认动作时返回 `true`
   * 2. 其余关闭路径统一返回 `false`
   */
  alert({
    confirmText = '确定',
    confirmAction,
    intent = 'default',
    footer,
    ...restOptions
  }: ActionDialogAlertOptions = {}): Promise<boolean> {
    const handle = this.open({
      ...restOptions,
      footer: {
        layout: footer?.layout ?? DEFAULT_FOOTER_LAYOUT,
      },
      actions: [createSemanticAction(confirmAction, confirmText, intent === 'danger' ? 'destructive' : 'primary', true, 'confirm', 'confirm')],
    });

    return handle.result.then((result) => result.type === 'action' && result.role === 'confirm');
  }

  /** 关闭当前正在显示的弹窗。 */
  hide() {
    this.settleActive({ type: 'dismiss', reason: 'api' });
  }

  /**
   * 按作用域关闭弹窗。
   *
   * 适合“同一业务域只保留一个弹窗”的场景。
   */
  hideByScope(scopeKey?: string) {
    if (!scopeKey) return;
    if (this.active?.rawOptions.scopeKey !== scopeKey) return;
    this.closeById(this.active.id, 'api');
  }

  /** 只关闭指定 id 的弹窗，避免旧句柄误关掉新弹窗。 */
  closeById(id: string, reason: ActionDialogDismissReason) {
    this.settleById(id, { type: 'dismiss', reason });
  }

  /** 按完整结果结算指定 id 的弹窗。 */
  settleById(id: string, result: ActionDialogResult) {
    if (this.active?.id !== id) return;

    const active = this.active;
    this.active = null;
    active.settle(result);

    this.setState?.((prev) => {
      if (prev.id !== id) return prev;
      return { ...prev, open: false };
    });
  }

  /**
   * 更新指定 id 对应的弹窗配置。
   *
   * 注意：
   * 1. 只有当前仍然存活的同 id 弹窗才会被更新
   * 2. 更新后会重新走一次 options 归一化
   */
  updateById(id: string, patch: Partial<ActionDialogOpenOptions>) {
    if (this.active?.id !== id || !this.setState) return;

    const nextRawOptions = mergeOpenOptions(this.active.rawOptions, patch);
    const nextOptions = normalizeOpenOptions(nextRawOptions);
    this.active = {
      ...this.active,
      rawOptions: nextRawOptions,
    };

    this.setState?.((prev) => {
      if (prev.id !== id) return prev;
      return {
        ...prev,
        rawOptions: nextRawOptions,
        options: nextOptions,
      };
    });
  }

  /** 结算当前弹窗。`closeState=false` 用于替换和 Provider 卸载场景。 */
  private settleActive(result: ActionDialogResult, closeState = true) {
    if (!this.active) return;
    const activeId = this.active.id;

    if (!closeState) {
      const active = this.active;
      this.active = null;
      active.settle(result);
      return;
    }

    this.settleById(activeId, result);
  }
}

/** `ActionDialogService` 的内部全局单例。 */
const actionDialogService = new ActionDialogServiceClass();

/** `ActionDialogService` 的公开全局单例。 */
export const actionDialog: ActionDialogService = {
  open: (options) => actionDialogService.open(options),
  confirm: (options) => actionDialogService.confirm(options),
  alert: (options) => actionDialogService.alert(options),
  hide: () => actionDialogService.hide(),
  hideByScope: (scopeKey) => actionDialogService.hideByScope(scopeKey),
};

/**
 * `ActionDialogCard` 的内部 props。
 *
 * 这是纯渲染层组件，不直接感知 service。
 * 它只接收已经归一化好的 options 和一组事件回调。
 */
type ActionDialogCardProps = {
  /** 当前弹窗是否应该处于打开态。 */
  open: boolean;
  /** 已经补齐默认值的内部配置。 */
  options: NormalizedActionDialogOptions;
  /** 处理蒙层点击、返回键等非 action 关闭。 */
  onDismiss: (reason: ActionDialogDismissReason) => void;
  /** 直接关闭当前弹窗。 */
  onClose: () => void;
  /** 运行期局部更新弹窗配置。 */
  onUpdate: (patch: Partial<ActionDialogOpenOptions>) => void;
  /** 按 key 触发对应 action。 */
  onActionPress: (key: string) => void | Promise<void>;
};

/**
 * 对话框视图层。
 *
 * 职责：
 * 1. 负责遮罩、卡片、按钮和动画渲染
 * 2. 负责键盘抬升和 Android 返回键监听
 * 3. 不直接持有业务语义，只通过回调把事件抛给 Provider
 */
function ActionDialogCard({
  open,
  options,
  onDismiss,
  onClose,
  onUpdate,
  onActionPress,
}: ActionDialogCardProps) {
  const theme = useTheme();
  /** 当前处于按压态的按钮 key，只用于提供按下反馈。 */
  const [pressedButton, setPressedButton] = React.useState<string | null>(null);
  /** 控制蒙层透明度和卡片缩放的基础动画值。 */
  const anim = React.useRef(new Animated.Value(open ? 1 : 0)).current;
  /** 控制组件是否真正挂载到视图树。 */
  const [visible, setVisible] = React.useState(open);
  /** 对话框自身高度，来自布局回调，不受 transform 影响。 */
  const dialogHeightRef = React.useRef(0);
  /** 最近一次键盘可见时的几何信息，用于布局变化后二次校准。 */
  const keyboardMetricsRef = React.useRef<{
    top: number;
    duration?: number;
    easing?: string;
  } | null>(null);

  /** 合并第三方输入法的突发事件：初始动画是否已启动。 */
  const keyboardAnimStartedRef = React.useRef(false);
  /** 合并计时器句柄。 */
  const keyboardCoalesceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 最近一次计算出的目标偏移量，供合并结束后读取。 */
  const latestKeyboardOverlapRef = React.useRef(0);

  /** 键盘出现时的整体上移偏移量。 */
  const keyboardOffset = useSharedValue(0);
  /** 把键盘偏移量映射成卡片容器的 transform。 */
  const keyboardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboardOffset.value }],
  }));

  /**
   * 把系统键盘 easing 名称映射到 Reanimated easing。
   *
   * iOS 会随事件下发 easing 名称；Android 多数情况下没有这个字段，
   * 因此仍然回退到组件库默认曲线。
   */
  const resolveKeyboardEasing = React.useCallback((easing?: string) => {
    switch (easing) {
      case 'easeIn':
        return Easing.in(Easing.cubic);
      case 'easeOut':
        return Easing.out(Easing.cubic);
      case 'easeInEaseOut':
        return Easing.inOut(Easing.cubic);
      case 'linear':
        return Easing.linear;
      default:
        return KEYBOARD_TIMING_CONFIG.easing;
    }
  }, []);

  /** 用键盘事件自带的时长/曲线，尽量跟系统动画同步。 */
  const getKeyboardAnimationConfig = React.useCallback(
    (event?: { duration?: number; easing?: string } | null) => ({
      duration:
        typeof event?.duration === 'number' && event.duration > 0
          ? event.duration
          : KEYBOARD_TIMING_CONFIG.duration,
      easing: resolveKeyboardEasing(event?.easing),
    }),
    [resolveKeyboardEasing]
  );

  /**
   * 统一把键盘事件转换成“窗口坐标系中的键盘顶部”。
   *
   * 这里显式做 `screen -> window` 的坐标换算，避免系统状态栏/导航栏
   * 导致键盘顶部和 `measureInWindow` 的坐标系不一致。
   */
  const getKeyboardTopInWindow = React.useCallback((event: KeyboardEvent) => {
    const windowHeight = Dimensions.get('window').height;
    const screenHeight = Dimensions.get('screen').height;
    const screenY = event?.endCoordinates?.screenY;

    if (typeof screenY === 'number' && Number.isFinite(screenY)) {
      const windowOffset = Math.max(0, screenHeight - windowHeight);
      return Math.min(windowHeight, Math.max(0, screenY - windowOffset));
    }

    const keyboardHeight = event?.endCoordinates?.height;
    if (typeof keyboardHeight === 'number' && Number.isFinite(keyboardHeight)) {
      return Math.max(0, windowHeight - keyboardHeight);
    }

    return windowHeight;
  }, []);

  /**
   * 根据未变换的基准布局和键盘顶部，计算真正需要的避让位移。
   *
   * 推荐思路：
   * 1. 系统已经因为键盘把窗口/布局顶上去时，重叠量会是 0，不再额外平移
   * 2. 系统没处理时，只补齐“被遮住”的那一段，避免固定比例上移带来的抖动
   *
   * 重要：
   * 这里不能再量“已经被 translateY 过的弹窗位置”，否则会形成反馈回路，
   * 导致每次校正都基于一个正在移动的目标，看起来就像轻重不一地抖。
   */
  const updateKeyboardOffsetFromMetrics = React.useCallback(
    (metrics?: { top: number; duration?: number; easing?: string } | null) => {
      const nextMetrics = metrics ?? keyboardMetricsRef.current;
      if (!nextMetrics) {
        if (keyboardCoalesceTimerRef.current) {
          clearTimeout(keyboardCoalesceTimerRef.current);
          keyboardCoalesceTimerRef.current = null;
        }
        keyboardAnimStartedRef.current = false;
        latestKeyboardOverlapRef.current = 0;
        keyboardOffset.value = withTiming(0, getKeyboardAnimationConfig(null));
        return;
      }

      const dialogHeight = dialogHeightRef.current;
      if (dialogHeight <= 0) return;

      const windowHeight = Dimensions.get('window').height;
      const dialogBottom = (windowHeight + dialogHeight) / 2;
      const overlap = Math.max(0, dialogBottom + KEYBOARD_CLEARANCE - nextMetrics.top);
      latestKeyboardOverlapRef.current = overlap;

      if (keyboardAnimStartedRef.current) {
        keyboardOffset.value = withSpring(overlap, KEYBOARD_SPRING_CONFIG);
        return;
      }

      if (keyboardCoalesceTimerRef.current) {
        clearTimeout(keyboardCoalesceTimerRef.current);
      }
      keyboardCoalesceTimerRef.current = setTimeout(() => {
        keyboardCoalesceTimerRef.current = null;
        keyboardAnimStartedRef.current = true;
        keyboardOffset.value = withSpring(latestKeyboardOverlapRef.current, KEYBOARD_SPRING_CONFIG);
      }, 30);
    },
    [getKeyboardAnimationConfig, keyboardOffset]
  );

  /**
   * 监听键盘显示/隐藏，让弹窗在输入场景下适度上移。
   *
   * 关键改动：
   * 1. 不再按键盘高度固定比例上移
   * 2. 改成测量“弹窗底部和键盘顶部”的真实重叠量
   * 3. iOS 监听 `keyboardWillChangeFrame`，尽量跟系统键盘动画同步
   */
  React.useEffect(() => {
    if (!visible) return;

    const handleKeyboardChange = (event: KeyboardEvent) => {
      const nextMetrics = {
        top: getKeyboardTopInWindow(event),
        duration: event.duration,
        easing: event.easing,
      };
      keyboardMetricsRef.current = nextMetrics;
      updateKeyboardOffsetFromMetrics(nextMetrics);
    };

    const handleKeyboardHide = (event?: KeyboardEvent) => {
      keyboardMetricsRef.current = null;
      keyboardAnimStartedRef.current = false;
      latestKeyboardOverlapRef.current = 0;
      if (keyboardCoalesceTimerRef.current) {
        clearTimeout(keyboardCoalesceTimerRef.current);
        keyboardCoalesceTimerRef.current = null;
      }
      keyboardOffset.value = withTiming(0, getKeyboardAnimationConfig(event ?? null));
    };

    const subscriptions =
      Platform.OS === 'ios'
        ? [
            Keyboard.addListener('keyboardWillChangeFrame', handleKeyboardChange),
            Keyboard.addListener('keyboardWillHide', handleKeyboardHide),
          ]
        : [
            Keyboard.addListener('keyboardDidShow', handleKeyboardChange),
            Keyboard.addListener('keyboardDidHide', handleKeyboardHide),
          ];

    return () => {
      subscriptions.forEach((sub) => sub.remove());
      if (keyboardCoalesceTimerRef.current) {
        clearTimeout(keyboardCoalesceTimerRef.current);
        keyboardCoalesceTimerRef.current = null;
      }
    };
  }, [getKeyboardAnimationConfig, getKeyboardTopInWindow, keyboardOffset, updateKeyboardOffsetFromMetrics, visible]);

  /**
   * 弹窗关闭时重置键盘偏移，并根据配置决定是否收起键盘。
   */
  React.useEffect(() => {
    if (!open) {
      keyboardMetricsRef.current = null;
      keyboardAnimStartedRef.current = false;
      latestKeyboardOverlapRef.current = 0;
      if (keyboardCoalesceTimerRef.current) {
        clearTimeout(keyboardCoalesceTimerRef.current);
        keyboardCoalesceTimerRef.current = null;
      }
      keyboardOffset.value = withTiming(0, { duration: 150 });
      if (options.keyboard.dismissOnClose) {
        try {
          Keyboard.dismiss();
        } catch {}
      }
    }
  }, [keyboardOffset, open, options.keyboard.dismissOnClose]);

  /** 打开/关闭过程中卡片的缩放动画。 */
  const scale = React.useMemo(
    () =>
      anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.9, 1],
      }),
    [anim]
  );

  /**
   * 统一处理弹窗显隐动画。
   *
   * 注意：
   * 1. `open = false` 时不会立刻卸载
   * 2. 要等淡出动画完成后，才真正把 `visible` 设为 `false`
   */
  React.useEffect(() => {
    anim.stopAnimation();

    if (open) {
      setVisible(true);
      Animated.timing(anim, { toValue: 1, duration: 70, useNativeDriver: true }).start();
      return;
    }

    if (!visible) return;
    Animated.timing(anim, { toValue: 0, duration: 70, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setVisible(false);
    });
  }, [anim, open, visible]);

  /**
   * Android 返回键监听。
   *
   * 返回键是否真正关闭弹窗，由 `options.dismiss.backPress` 决定。
   */
  React.useEffect(() => {
    if (Platform.OS !== 'android' || !visible || !open) return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (options.dismiss.backPress) onDismiss('back');
      return true;
    });

    return () => sub.remove();
  }, [onDismiss, open, options.dismiss.backPress, visible]);

  /**
   * 蒙层点击处理。
   *
   * 行为分两步：
   * 1. 根据配置决定是否先收起键盘
   * 2. 根据配置决定是否真正关闭弹窗
   */
  const handleOverlayPress = React.useCallback(() => {
    if (options.keyboard.dismissOnOverlayPress) {
      try {
        Keyboard.dismiss();
      } catch {}
    }

    if (options.dismiss.overlayPress) onDismiss('overlay');
  }, [onDismiss, options.dismiss.overlayPress, options.keyboard.dismissOnOverlayPress]);

  /** 规范化标题渲染：字符串走默认标题样式，自定义节点原样渲染。 */
  const renderTitle = React.useMemo(() => {
    if (options.title == null) return null;
    if (typeof options.title === 'string') {
      return <Text style={[styles.titleText, { color: theme.colors.onSurface }]}>{options.title}</Text>;
    }
    return options.title;
  }, [options.title, theme.colors.onSurface]);

  /** 规范化内容渲染：字符串走默认正文样式，自定义节点原样渲染。 */
  const renderContent = React.useMemo(() => {
    if (options.content == null) return null;

    if (typeof options.content === 'string') {
      return (
        <View style={options.title == null ? styles.bodyString : null}>
          <Text style={[styles.bodyText, { color: theme.colors.onSurface }]}>{options.content}</Text>
        </View>
      );
    }

    return options.content;
  }, [options.content, options.title, theme.colors.onSurface]);

  /**
   * 默认按钮文案渲染。
   *
   * 说明：
   * 1. 字符串/数字会使用统一按钮文字样式
   * 2. ReactNode 会原样包一层容器后渲染
   */
  const renderActionLabel = React.useCallback(
    (action: NormalizedActionDialogAction, color: string, pressed: boolean) => {
      if (typeof action.label === 'string' || typeof action.label === 'number') {
        return (
          <Text style={[styles.buttonText, { color }, pressed ? styles.textPressed : null]}>
            {action.label}
          </Text>
        );
      }

      return <View style={styles.buttonLabelNode}>{action.label}</View>;
    },
    []
  );

  /**
   * 根据按钮变体计算面板式按钮的颜色。
   */
  const getPanelColors = React.useCallback(
    (variant: ActionDialogActionVariant) => {
      if (variant === 'destructive') {
        return {
          backgroundColor: DANGER_COLOR,
          textColor: '#FFFFFF',
          borderColor: DANGER_COLOR,
          filled: true,
        };
      }

      if (variant === 'primary') {
        return {
          backgroundColor: theme.colors.primary,
          textColor: theme.colors.onPrimary,
          borderColor: theme.colors.primary,
          filled: true,
        };
      }

      return {
        backgroundColor: theme.colors.surface,
        textColor: theme.colors.onSurface,
        borderColor: theme.colors.border,
        filled: false,
      };
    },
    [theme.colors.border, theme.colors.onPrimary, theme.colors.onSurface, theme.colors.primary, theme.colors.surface]
  );

  /**
   * 给 `footer.render` 暴露的精简 action 数据。
   */
  const footerRenderActions = React.useMemo<ActionDialogFooterRenderAction[]>(
    () =>
      options.actions.map((action) => ({
        key: action.key,
        role: action.role,
        label: action.label,
        variant: action.variant,
        disabled: action.disabled,
      })),
    [options.actions]
  );

  /**
   * 渲染内置 footer 中的单个 action。
   *
   * 这里同时兼容：
   * 1. `bar`
   * 2. `row`
   * 3. `stacked`
   */
  const renderDefaultAction = React.useCallback(
    (action: NormalizedActionDialogAction, index: number) => {
      const isPressed = pressedButton === action.key;

      if (options.footer.layout === 'bar') {
        const textColor =
          action.variant === 'destructive'
            ? DANGER_COLOR
            : action.variant === 'primary'
              ? theme.colors.primary
              : theme.colors.onSurface;

        return (
          <View
            key={action.key}
            style={[
              styles.barCell,
              index > 0 ? [styles.barDivider, { borderLeftColor: theme.colors.border }] : null,
            ]}
          >
            <TouchableOpacity
              disabled={action.disabled}
              style={[styles.barButton, isPressed ? styles.barButtonPressed : null]}
              activeOpacity={1}
              onPressIn={() => setPressedButton(action.key)}
              onPressOut={() => setPressedButton(null)}
              onPress={() => void onActionPress(action.key)}
            >
              {renderActionLabel(action, action.disabled ? theme.colors.disabled : textColor, isPressed)}
            </TouchableOpacity>
          </View>
        );
      }

      const colors = getPanelColors(action.variant);

      return (
        <View key={action.key} style={options.footer.layout === 'row' ? styles.rowCell : null}>
          <TouchableOpacity
            disabled={action.disabled}
            style={[
              styles.panelButton,
              options.footer.layout === 'stacked' ? styles.panelButtonStacked : null,
              {
                backgroundColor: colors.backgroundColor,
                borderColor: colors.borderColor,
                borderWidth: colors.filled ? 0 : StyleSheet.hairlineWidth,
                opacity: action.disabled ? 0.45 : colors.filled && isPressed ? 0.86 : 1,
              },
              !colors.filled && isPressed ? styles.panelButtonPressed : null,
            ]}
            activeOpacity={1}
            onPressIn={() => setPressedButton(action.key)}
            onPressOut={() => setPressedButton(null)}
            onPress={() => void onActionPress(action.key)}
          >
            {renderActionLabel(action, colors.textColor, isPressed)}
          </TouchableOpacity>
        </View>
      );
    },
    [
      getPanelColors,
      onActionPress,
      options.footer.layout,
      pressedButton,
      renderActionLabel,
      theme.colors.border,
      theme.colors.disabled,
      theme.colors.onSurface,
      theme.colors.primary,
    ]
  );

  /**
   * 生成最终 footer 节点。
   *
   * 优先级：
   * 1. `footer.render`
   * 2. 内置 `bar/row/stacked`
   * 3. 没有 actions 时不渲染 footer
   */
  const footer = React.useMemo(() => {
    if (options.footer.render) {
      return options.footer.render({
        actions: footerRenderActions,
        pressAction: onActionPress,
        close: onClose,
        update: onUpdate,
      });
    }

    if (options.actions.length === 0) return null;

    if (options.footer.layout === 'bar') {
      return (
        <View style={[styles.barFooter, { borderTopColor: theme.colors.border }]}>
          {options.actions.map((action, index) => renderDefaultAction(action, index))}
        </View>
      );
    }

    return (
      <View
        style={[
          styles.panelFooter,
          options.footer.layout === 'stacked' ? styles.panelFooterStacked : styles.panelFooterRow,
        ]}
      >
        {options.actions.map((action, index) => renderDefaultAction(action, index))}
      </View>
    );
  }, [footerRenderActions, onActionPress, onClose, onUpdate, options.actions, options.footer, renderDefaultAction, theme.colors.border]);

  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.modalRoot,
          {
            zIndex: options.layer.zIndex,
            elevation: Platform.OS === 'android' ? options.layer.zIndex : 0,
          },
        ]}
      >
        <Animated.View style={[styles.overlayBackground, { opacity: anim }]} />
        <Pressable style={styles.overlayPressable} onPress={handleOverlayPress}>
          <View
            style={styles.center}
            onLayout={() => {
              if (keyboardMetricsRef.current) {
                updateKeyboardOffsetFromMetrics();
              }
            }}
          >
            <Reanimated.View style={[styles.contentPressable, keyboardAnimatedStyle]}>
              <Pressable onPress={() => {}}>
                <View
                  onLayout={(event) => {
                    dialogHeightRef.current = event.nativeEvent.layout.height || 0;
                    if (keyboardMetricsRef.current) {
                      updateKeyboardOffsetFromMetrics();
                    }
                  }}
                >
                  <Animated.View
                    style={[
                      styles.dialogShadow,
                      {
                        width: wp(options.layout.width),
                        maxWidth: wp(360),
                        borderRadius: wp(16),
                        opacity: anim,
                        transform: [{ scale }],
                      },
                    ]}
                  >
                    <View style={[styles.dialogInner, { backgroundColor: theme.colors.surface }]}>
                      <View style={[styles.bodyContainer, { padding: wp(options.layout.contentPadding) }]}>
                        {renderTitle}
                        {renderContent}
                      </View>
                      {footer}
                    </View>
                  </Animated.View>
                </View>
              </Pressable>
            </Reanimated.View>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * `ActionDialog` 的渲染宿主 Provider。
 *
 * 使用方式：
 * 1. 由 `ComponentLibProvider` 在应用根部统一挂载
 * 2. service 通过 `setStateUpdater()` 把命令式调用转成这里的状态变化
 * 3. Provider 再把状态映射成真正的弹窗 UI
 */
export function ActionDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ActionDialogState>(initialState);
  const inFlightActionRef = React.useRef<{ id: string; key: string } | null>(null);

  /** Provider 挂载后，把状态更新器注入到 service。 */
  React.useEffect(() => {
    actionDialogService.setStateUpdater(setState);
    return () => {
      actionDialogService.clearStateUpdater(setState);
    };
  }, []);

  /** 新弹窗打开时清掉上一轮 action 防重入记录。 */
  React.useEffect(() => {
    inFlightActionRef.current = null;
  }, [state.id]);

  /**
   * 用统一方式关闭指定弹窗并结算结果。
   *
   * 这是所有关闭路径最终都会收敛到的地方。
   */
  const closeWithResult = React.useCallback((id: string, result: ActionDialogResult) => {
    actionDialogService.settleById(id, result);
  }, []);

  /**
   * 更新当前弹窗配置。
   *
   * 这会保留原始 options，再重新归一化，保证 `update()` 和初次 `open()` 的行为一致。
   */
  const updateCurrent = React.useCallback((patch: Partial<ActionDialogOpenOptions>) => {
    if (!state.id) return;
    actionDialogService.updateById(state.id, patch);
  }, [state.id]);

  /** 处理蒙层点击、返回键等 dismiss 类关闭。 */
  const dismissByReason = React.useCallback(
    (reason: ActionDialogDismissReason) => {
      if (!state.id) return;
      closeWithResult(state.id, { type: 'dismiss', reason });
    },
    [closeWithResult, state.id]
  );

  /** 直接按 API 关闭当前弹窗。 */
  const closeCurrent = React.useCallback(() => {
    if (!state.id) return;
    closeWithResult(state.id, { type: 'dismiss', reason: 'api' });
  }, [closeWithResult, state.id]);

  /**
   * 统一处理 action 点击逻辑。
   *
   * 执行顺序：
   * 1. 找到目标 action
   * 2. 构造 action 结果对象
   * 3. 执行 `action.onPress(ctx)`
   * 4. 如果业务没有手动接管关闭，再根据 `return false / closeOnPress` 决定是否结算
   */
  const handleActionPress = React.useCallback(
    async (key: string) => {
      if (!state.id) return;
      if (inFlightActionRef.current?.id === state.id) return;

      const action = state.options.actions.find((item) => item.key === key);
      if (!action || action.disabled) return;

      const dialogId = state.id;
      const actionResult: ActionDialogResult = {
        type: 'action',
        key: action.key,
        role: action.role,
      };

      let handledByContext = false;
      inFlightActionRef.current = { id: dialogId, key };

      /**
       * 提供给业务 action 的上下文。
       *
       * `handledByContext` 用来保证：
       * 1. 手动关闭后不会再走一遍默认关闭
       * 2. 一个 action 点击只会结算一次结果
       */
      const ctx: ActionDialogActionHandlerContext = {
        close: () => {
          if (handledByContext) return;
          handledByContext = true;
          closeWithResult(dialogId, { type: 'dismiss', reason: 'api' });
        },
        closeWithAction: () => {
          if (handledByContext) return;
          handledByContext = true;
          closeWithResult(dialogId, actionResult);
        },
        update: (patch) => {
          actionDialogService.updateById(dialogId, patch);
        },
      };

      try {
        const handlerResult = await action.onPress?.(ctx);
        if (handledByContext) return;

        /** `false` 明确表示阻止默认关闭，其他返回值交给 `closeOnPress` 决定。 */
        const shouldClose = handlerResult === false ? false : action.closeOnPress;
        if (shouldClose) closeWithResult(dialogId, actionResult);
      } catch (error) {
        if (!handledByContext) {
          console.warn('[actionDialog] action onPress failed', error);
        }
      } finally {
        if (inFlightActionRef.current?.id === dialogId && inFlightActionRef.current.key === key) {
          inFlightActionRef.current = null;
        }
      }
    },
    [closeWithResult, state.id, state.options.actions]
  );

  return (
    <>
      {children}
      <ActionDialogCard
        open={state.open}
        options={state.options}
        onDismiss={dismissByReason}
        onClose={closeCurrent}
        onUpdate={updateCurrent}
        onActionPress={handleActionPress}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(16),
  },
  contentPressable: {
    width: '100%',
    alignItems: 'center',
  },
  dialogShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: wp(20),
    shadowOffset: { width: 0, height: wp(8) },
    elevation: Platform.OS === 'android' ? 10 : 0,
  },
  dialogInner: {
    overflow: 'hidden',
    borderRadius: wp(16),
  },
  bodyContainer: {
    alignItems: 'center',
    gap: wp(12),
  },
  titleText: {
    fontSize: wp(17),
    lineHeight: wp(24),
    textAlign: 'center',
    fontWeight: '600',
  },
  bodyString: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: wp(92),
  },
  bodyText: {
    fontSize: wp(16),
    lineHeight: wp(22),
    textAlign: 'center',
  },
  barFooter: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  barCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  barButton: {
    width: '100%',
    paddingVertical: wp(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  barButtonPressed: {
    backgroundColor: '#F0F0F4',
  },
  panelFooter: {
    width: '100%',
    paddingHorizontal: wp(16),
    paddingBottom: wp(16),
    paddingTop: wp(8),
    gap: wp(12),
  },
  panelFooterRow: {
    flexDirection: 'row',
  },
  panelFooterStacked: {
    flexDirection: 'column',
  },
  rowCell: {
    flex: 1,
  },
  panelButton: {
    minHeight: wp(44),
    borderRadius: wp(12),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(16),
  },
  panelButtonStacked: {
    width: '100%',
  },
  panelButtonPressed: {
    backgroundColor: '#F5F5F7',
  },
  buttonText: {
    fontSize: wp(15),
    lineHeight: wp(21),
  },
  buttonLabelNode: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textPressed: {
    opacity: 0.72,
  },
});
