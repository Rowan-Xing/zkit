import * as React from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sp, wp } from 'y2kit-tools';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useI18n } from '../../i18n/useI18n';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../Button';
import { Text } from '../Text';
import {
  WheelColumn,
  WHEEL_AREA_HEIGHT,
  WHEEL_AREA_VERTICAL_INSET,
  WHEEL_ITEM_HEIGHT,
  WHEEL_VISIBLE_ITEMS,
  type WheelColumnHandle,
  type WheelOption,
} from '../WheelColumn';

export type PickerHandle = {
  open: () => void;
  close: () => void;
};

const ITEM_HEIGHT = WHEEL_ITEM_HEIGHT;
const VISIBLE_ITEMS = WHEEL_VISIBLE_ITEMS;
const MAX_COLUMNS = 3;

type Primitive = string | number;

export type PickerTreeNode = {
  [key: string]: any;
  disabled?: boolean;
  children?: PickerTreeNode[];
};

export type PickerModelValue = Primitive | Primitive[];

/**
 * 点击“确认”后对外回传的最终结果。
 *
 * 字段说明：
 * 1. `value`
 *    - 按组件输出模式整理后的结果
 *    - 单列通常是单值，多列通常是数组
 * 2. `values`
 *    - 永远是数组形式，便于外部统一处理多列场景
 * 3. `label`
 *    - 用 `modelStrSeparator` 拼好的展示文本
 * 4. `labels`
 *    - 每一列单独的展示文本数组
 * 5. `items`
 *    - 每一列最终选中的原始节点
 */
type PickerConfirmPayload = {
  value: PickerModelValue;
  values: Primitive[];
  label: string;
  labels: string[];
  items: PickerTreeNode[];
};

type PickerChangePayload = PickerConfirmPayload;

/**
 * `Picker` 既支持“单列普通选择”，也支持最多 3 列的级联选择。
 *
 * 约定：
 * 1. `list` 是树形结构，当前节点的 `children` 代表下一列候选项
 * 2. `rangKey` 决定“提交值”从哪个字段取
 * 3. `rangText` 决定“展示文案”从哪个字段取
 * 4. 单列时默认回传单值，多列时默认回传数组
 */
export type PickerProps = {
  /**
   * 选择器的数据源。
   *
   * 使用方式：
   * 1. 单列场景：直接传一层数组
   * 2. 多列级联场景：当前节点的 `children` 作为下一列数据
   *
   * 注意：
   * 1. 当前实现最多只会消费 3 列
   * 2. 节点里实际取值字段由 `rangKey` 决定
   * 3. 节点里展示文本字段由 `rangText` 决定
   * 4. 节点带 `disabled: true` 时会被视为不可选
   */
  list: PickerTreeNode[];

  /**
   * 当前已确认的值，受控模式使用。
   *
   * 约定：
   * 1. 单列可以传 `string | number`
   * 2. 多列可以传数组，例如 `[provinceId, cityId]`
   *
   * 说明：
   * 组件每次打开时都会根据这个值重建草稿态，
   * 所以它代表的是“最终已提交值”，不是滚轮滚动中的临时值。
   */
  value?: PickerModelValue;

  /**
   * 非受控模式下的初始值。
   *
   * 只在组件首次挂载时生效，后续不会因为这个字段变化而自动同步。
   * 如果需要外部持续驱动当前值，请改用 `value` + `onValueChange`。
   */
  defaultValue?: PickerModelValue;

  /**
   * 最终值变化回调。
   *
   * 触发时机：
   * 1. 点击“确认”后
   * 2. 组件内部调用 `setModelValue` 时
   *
   * 注意：
   * 它对应的是“已确认值”，不是滚轮正在滚动时的草稿变化。
   * 草稿变化请看 `onChange`。
   */
  onValueChange?: (next: PickerModelValue) => void;

  /**
   * 当前是否打开，受控模式使用。
   *
   * 说明：
   * 1. `true` 表示业务层要求弹窗打开
   * 2. `false` 表示业务层要求弹窗关闭
   *
   * 注意：
   * 这只是业务态，不等于原生弹窗已经完成动画。
   * 原生层真正卸载还要等 `onDidDismiss`。
   */
  open?: boolean;

  /**
   * 非受控模式下的默认打开状态。
   *
   * 只在首次挂载时生效。
   * 一般业务里较少直接传这个字段，更多是通过触发器打开。
   */
  defaultOpen?: boolean;

  /**
   * 打开状态变化回调。
   *
   * 触发时机：
   * 1. 调用 `open()` / 点击触发器要求打开时，会回调 `true`
   * 2. 点击确认、取消、背景关闭，或内部调用 `close()` 时，会回调 `false`
   * 3. 原生层真正 dismiss 完成时，也会再同步一次 `false`
   *
   * 说明：
   * 组件内部会尽量把所有开关变化都收敛到这一个回调，方便外部统一接管。
   */
  onOpenChange?: (next: boolean) => void;

  /**
   * 原生弹层完全关闭并完成卸载后的回调。
   *
   * 说明：
   * 1. 它和 `onOpenChange(false)` 不同
   * 2. `onOpenChange(false)` 表示“业务上要求关闭”
   * 3. 这里表示“原生 sheet 已经真正 dismiss 完成”
   *
   * 主要给命令式 service 做串行调度使用，避免旧 sheet 还没回收时就复用同一个实例。
   */
  onDismissComplete?: () => void;

  /**
   * 当前展示文案，受控模式使用。
   *
   * 用途：
   * 允许业务层自己决定触发器上显示什么文字，
   * 而不是完全依赖组件根据 `value` 自动拼接。
   *
   * 常见场景：
   * 1. 需要显示自定义前缀 / 后缀
   * 2. 需要复用外部缓存过的展示文案
   */
  label?: string;

  /**
   * 非受控模式下的默认展示文案。
   *
   * 只在首次挂载时用于初始化内部 `innerLabel`。
   * 如果不传，组件会在确认后根据当前值自动生成文案。
   */
  defaultLabel?: string;

  /**
   * 展示文案变化回调。
   *
   * 触发时机：
   * 点击“确认”并成功生成最终 `label` 后触发。
   *
   * 说明：
   * 它和 `onValueChange` 类似，都是“最终提交”语义，
   * 区别在于这里回传的是拼接后的展示文本。
   */
  onLabelChange?: (next: string) => void;

  /**
   * 顶部标题文案。
   *
   * 不传时会回退到国际化文案 `picker.title`。
   */
  title?: string;

  /**
   * 从节点上取“提交值”的字段名。
   *
   * 默认是 `id`。
   * 例如业务节点是 `{ code: 'CN', name: '中国' }`，
   * 那么可以传 `rangKey="code"`。
   */
  rangKey?: string;

  /**
   * 从节点上取“展示文案”的字段名。
   *
   * 默认是 `title`。
   * 例如业务节点是 `{ id: 1, name: '男' }`，
   * 那么可以传 `rangText="name"`。
   */
  rangText?: string;

  /**
   * 多列文案拼接分隔符。
   *
   * 例如：
   * 1. 省市区可以传 `-`
   * 2. 年月日可以传空格或 `/`
   *
   * 这个分隔符会影响：
   * 1. `label`
   * 2. `onLabelChange`
   * 3. `onConfirm` / `onChange` 里的 `label`
   */
  modelStrSeparator?: string;

  /**
   * 自定义列头渲染。
   *
   * 适合多列场景，例如：
   * 1. 年 / 月 / 日
   * 2. 省 / 市 / 区
   *
   * 回调参数：
   * 1. `columnIndex`：当前列索引，从 0 开始
   * 2. `columnCount`：当前实际列数
   *
   * 注意：
   * 这个能力只影响展示，不影响滚轮数据结构和提交结果。
   */
  renderColumnHeader?: (columnIndex: number, columnCount: number) => React.ReactNode;

  /**
   * 是否懒加载滚轮内容。
   *
   * 默认 `true`。
   *
   * 含义：
   * 1. `true`：首次真正打开时再挂载滚轮内容
   * 2. `false`：组件初次渲染时就直接把内容挂好
   *
   * 取舍：
   * 1. `true` 更省初始性能
   * 2. `false` 首次打开可能少一次内容挂载成本
   */
  lazyContent?: boolean;

  /**
   * 抽屉高度。
   *
   * 支持：
   * 1. 数字
   * 2. 可解析成数字的字符串
   *
   * 组件内部会把它转换成 TrueSheet 需要的 detent 比例。
   * 不传时默认使用 `auto`，由内容高度决定。
   */
  drawerSize?: string | number;

  /**
   * 是否禁用交互。
   *
   * 禁用后：
   * 1. 触发器无法打开弹窗
   * 2. 确认 / 取消按钮不可点
   * 3. iOS 自绘背景点击关闭也会失效
   * 4. Android 原生 dismissible 也会被关掉
   */
  disabled?: boolean;

  /**
   * 取消回调。
   *
   * 触发时机：
   * 1. 点击取消按钮
   * 2. iOS 点击背景关闭
   *
   * 说明：
   * 它表示“放弃本次草稿修改”，不会提交新的 `value`。
   */
  onCancel?: () => void;

  /**
   * 确认回调。
   *
   * 触发时机：
   * 点击确认按钮并完成草稿结算后触发。
   *
   * 回调里的 `payload` 是完整最终结果，适合业务层直接消费。
   */
  onConfirm?: (payload: PickerConfirmPayload) => void;

  /**
   * 草稿变化回调。
   *
   * 触发时机：
   * 用户滚动任意一列，导致当前草稿态变化时触发。
   *
   * 与 `onConfirm` / `onValueChange` 的区别：
   * 1. `onChange` 是“正在选”
   * 2. `onConfirm` / `onValueChange` 是“已确认”
   *
   * 外部如果需要实时联动 UI，可以监听这里；
   * 如果只关心最终表单值，请监听 `onValueChange` 或 `onConfirm`。
   */
  onChange?: (payload: PickerChangePayload) => void;

  /**
   * 触发器内容。
   *
   * 支持两种写法：
   * 1. 直接传 React 节点
   * 2. 传 render function，拿到当前 `label` / `value` 自己渲染
   *
   * render function 场景适合：
   * 1. 触发器展示需要根据当前值动态变化
   * 2. 业务希望复用同一个 Picker 但自定义外层样式
   *
   * 组件内部会自动给这个节点注入 `onPress`，触发打开逻辑。
   */
  children?: React.ReactNode | ((ctx: { label: string; value: PickerModelValue }) => React.ReactNode);
};

// 把数值限制在指定区间内，避免索引、比例等计算越界。
function clampNumber(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// 统一把单列值 / 多列值转换成数组，后续级联逻辑都按数组处理。
function toArrayValue(v: PickerModelValue | undefined): Primitive[] {
  if (Array.isArray(v)) return v as Primitive[];
  if (typeof v === 'string' || typeof v === 'number') return [v];
  return [];
}

// 根据当前是否为多列模式，决定向外回传单值还是数组。
function toOutputValue(values: Primitive[], asArray: boolean) {
  return asArray ? values : (values[0] as Primitive);
}

// 从节点里取业务值，优先要求是 string / number，方便后续稳定比较。
function pickKey(node: PickerTreeNode, key: string): Primitive | undefined {
  const v = node?.[key];
  if (typeof v === 'string' || typeof v === 'number') return v;
  return undefined;
}

// 从节点里取展示文案，数字也转成字符串，避免渲染层再做兜底。
function pickText(node: PickerTreeNode, key: string): string {
  const v = node?.[key];
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return '';
}

// 如果当前项被禁用，则优先向后、再向前找到最近的可选项。
// 这样可以保证滚轮和最终确认值都落在可用节点上。
function findNearestEnabledIndex(list: PickerTreeNode[], startIndex: number) {
  if (!list.length) return 0;
  const idx = clampNumber(startIndex, 0, list.length - 1);
  if (!list[idx]?.disabled) return idx;
  for (let i = idx + 1; i < list.length; i += 1) {
    if (!list[i]?.disabled) return i;
  }
  for (let i = idx - 1; i >= 0; i -= 1) {
    if (!list[i]?.disabled) return i;
  }
  return idx;
}

// 根据传入值重新推导整套级联数据：
// 1. 每一列应该展示哪些选项
// 2. 每一列当前应该停在哪个索引
// 3. 最终回传的 values / labels / items
// 这是整个 Picker 的核心纯计算逻辑。
function resolveCascade(
  root: PickerTreeNode[],
  desiredValues: Primitive[],
  rangKey: string,
  rangText: string,
  maxColumns: number
) {
  const columns: PickerTreeNode[][] = [];
  const indices: number[] = [];
  const values: Primitive[] = [];
  const labels: string[] = [];
  const items: PickerTreeNode[] = [];

  let currentList = Array.isArray(root) ? root : [];
  for (let col = 0; col < maxColumns; col += 1) {
    if (!currentList.length) break;
    columns.push(currentList);

    const desired = desiredValues[col];
    let idx = 0;
    if (desired !== undefined) {
      const found = currentList.findIndex((it) => pickKey(it, rangKey) === desired);
      idx = found >= 0 ? found : 0;
    }
    idx = findNearestEnabledIndex(currentList, idx);
    indices.push(idx);

    const picked = currentList[idx];
    if (!picked) break;
    const keyVal = pickKey(picked, rangKey);
    values.push(keyVal ?? String(idx));
    labels.push(pickText(picked, rangText));
    items.push(picked);

    currentList = Array.isArray(picked.children) ? picked.children : [];
  }

  return { columns, indices, values, labels, items };
}

// 兼容两种触发器写法：
// 1. 直接传一个 React 节点
// 2. 传 render function，拿到当前 label / value 自行渲染
// 同时保留外部节点已有的 onPress，不覆盖原来的行为。
function composeTrigger(
  children: PickerProps['children'],
  onPress: () => void,
  disabled?: boolean,
  ctx?: { label: string; value: PickerModelValue }
) {
  if (typeof children === 'function') {
    const node = (children as any)(ctx);
    return composeTrigger(node, onPress, disabled, ctx);
  }
  if (React.isValidElement(children)) {
    const anyChild = children as any;
    const prevOnPress = anyChild?.props?.onPress;
    if (typeof prevOnPress === 'function') {
      return React.cloneElement(children as any, {
        onPress: (...args: any[]) => {
          prevOnPress(...args);
          onPress();
        },
        disabled: disabled || anyChild?.props?.disabled,
      });
    }
    return React.cloneElement(children as any, {
      onPress,
      disabled: disabled || anyChild?.props?.disabled,
    });
  }
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      {children}
    </Pressable>
  );
}

// 把业务数据映射成滚轮列组件需要的标准结构。
function toWheelOptions(nodes: PickerTreeNode[], rangKey: string, rangText: string): WheelOption[] {
  return nodes.map((node, index) => ({
    key: pickKey(node, rangKey) ?? pickKey(node, 'id') ?? pickKey(node, 'code') ?? pickKey(node, 'key') ?? index,
    label: pickText(node, rangText),
  }));
}

type MemoizedWheelColumnProps = {
  col: PickerTreeNode[];
  colIdx: number;
  rangKey: string;
  rangText: string;
  selectedIndex: number;
  onSelectedIndexChange: (colIdx: number, idx: number) => void;
  width: number;
  disabled: boolean;
  wheelsRef: React.MutableRefObject<Array<WheelColumnHandle | null>>;
};

// 单列滚轮做一层 memo，避免父组件里其它状态变化时整列重复渲染。
const MemoizedWheelColumn = React.memo(function MemoizedWheelColumn({
  col,
  colIdx,
  rangKey,
  rangText,
  selectedIndex,
  onSelectedIndexChange,
  width,
  disabled,
  wheelsRef,
}: MemoizedWheelColumnProps) {
  const data = React.useMemo(() => toWheelOptions(col, rangKey, rangText), [col, rangKey, rangText]);
  const handleChange = React.useCallback((idx: number) => onSelectedIndexChange(colIdx, idx), [colIdx, onSelectedIndexChange]);
  return (
    <WheelColumn
      ref={(el) => { wheelsRef.current[colIdx] = el; }}
      data={data}
      selectedIndex={selectedIndex}
      onSelectedIndexChange={handleChange}
      width={width}
      disabled={disabled}
    />
  );
});

/**
 * 组件整体设计说明：
 *
 * 一、数据层
 * 1. 对外同时支持 `value/open/label` 的受控和非受控模式
 * 2. 内部维护一套“草稿态（draft）”
 *    - 用户滚动滚轮时，先只更新草稿态
 *    - 点击确认时，才把草稿态提交成最终值
 * 3. 这样做的好处是：
 *    - 外部表单只在确认后收到最终值
 *    - 组件内部仍然可以实时联动级联列和 `onChange`
 *
 * 二、弹层层次
 * 1. 真正承载底部原生弹窗的是 `TrueSheet`
 * 2. iOS 额外包了一层透明 `Modal`
 *    - 目的不是替换 TrueSheet
 *    - 只是为了把“背景点击关闭”从 TrueSheet 原生 dismiss 流程里剥离出来
 *
 * 三、为什么 iOS 要单独处理背景点击关闭
 * 1. 之前直接打开 TrueSheet 的 `dismissible`
 * 2. iOS 上会概率性出现：
 *    - 点击确认后，业务值已经更新
 *    - 但原生弹窗偶发不关闭
 * 3. 所以现在的策略是：
 *    - TrueSheet 只负责原生 sheet 本体和动画
 *    - iOS 背景点击由外层 RN `Modal + Pressable` 自己处理
 *
 * 四、几个最关键的状态
 * 1. `visible`：业务层面“应该打开还是关闭”
 * 2. `sheetMounted`：TrueSheet 是否已经挂到 React 树上
 * 3. `contentMounted`：滚轮内容是否已经真正挂载
 * 4. `backdropMounted`：iOS 自绘背景遮罩是否还保留在树上做淡出动画
 *
 * 五、关闭链路
 * 1. 确认 / 取消 / 点背景，本质上最终都会走 `close()`
 * 2. `close()` 只负责：
 *    - 更新 open 状态
 *    - 主动调用原生 dismiss
 * 3. 真正把 `sheetMounted` 设回 false，要等 `onDidDismiss`
 *    - 这样能避免原生动画还没结束就把宿主节点卸掉
 *    - 这是这类原生弹层最容易出时序问题的地方
 *
 * 六、维护者须知
 * 1. 不要轻易把 iOS 的 `dismissible` 改成 `true`
 *    - 这条路历史上已经验证过会带回“确认后值更新但弹窗不关”的概率性回归
 * 2. 不要把 `visible` 和 `sheetMounted` 合并成一个状态
 *    - `visible` 是业务态
 *    - `sheetMounted` 是原生宿主生命周期
 *    - 两者职责不同，强行合并很容易破坏 present / dismiss 时序
 * 3. 不要在 `close()` 里直接把 `sheetMounted` 设为 `false`
 *    - 必须等 TrueSheet 的 `onDidDismiss`
 *    - 否则容易出现原生动画没跑完就被 React 卸载
 * 4. iOS 背景关闭如果要改，只改外层 `Modal + Pressable` 这层
 *    - 不要回头依赖 TrueSheet 自己的原生背景关闭
 * 5. 如果要调整蒙层动画：
 *    - 优先改 `backdropOpacity` 的时长和 easing
 *    - 不要让蒙层卸载时机重新依赖 `sheetMounted`
 *    - 否则体感会重新变成“背景退场比点击动作晚很多”
 * 6. 如果要改确认逻辑，保留 `syncDraftFromWheels()`
 *    - 这是为了解决滚轮惯性未停就点击确认的情况
 *    - 去掉它会重新引入“视觉停留项和最终提交值不一致”的问题
 */
export const Picker = React.forwardRef<PickerHandle, PickerProps>(function Picker({
  list,
  value: valueProp,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen,
  onOpenChange,
  onDismissComplete,
  label: labelProp,
  defaultLabel,
  onLabelChange,
  title,
  rangKey = 'id',
  rangText = 'title',
  modelStrSeparator = '-',
  renderColumnHeader,
  lazyContent = true,
  drawerSize,
  disabled = false,
  onCancel,
  onConfirm,
  onChange,
  children,
}, ref) {
  const { t } = useI18n();
  const theme = useTheme();
  const { height: screenH, width: screenW } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // 底部安全区兜底。
  // 某些机型 insets.bottom 很小，这里给一个最小 padding，避免底部按钮贴边。
  const safeBottom = insets.bottom >= 10 ? insets.bottom : wp(20);

  // value 支持受控 / 非受控。
  const isValueControlled = valueProp !== undefined;
  const [innerValue, setInnerValue] = React.useState<PickerModelValue | undefined>(defaultValue);
  const value = valueProp !== undefined ? valueProp : innerValue;

  // open 支持受控 / 非受控。
  //
  // 这里刻意把“是否显示”拆成两层：
  // 1. `visible`
  //    - 代表业务语义上的开关
  //    - 外部 open 或内部 innerShow 改变时，它立刻变化
  // 2. `sheetMounted`
  //    - 代表 TrueSheet 这个原生宿主是否仍然保留在树上
  //    - 关闭时不会立刻跟着 `visible=false` 一起消失
  //    - 必须等原生 dismiss 完成后再卸载
  //
  // 这么拆的原因是：
  // TrueSheet 属于“JS 驱动状态 + 原生执行动画”的混合模型。
  // 如果一看到 `visible=false` 就把组件卸载，原生层有概率来不及完成 dismiss，
  // 最终出现弹窗卡住、状态错乱、下一次无法正常 present 等问题。
  const [innerShow, setInnerShow] = React.useState(!!defaultOpen);
  const isShowControlled = openProp !== undefined;
  const visible = openProp !== undefined ? !!openProp : innerShow;
  const [sheetMounted, setSheetMounted] = React.useState(visible);

  // label 同样支持非受控兜底。
  const [innerLabel, setInnerLabel] = React.useState(defaultLabel ?? '');

  // `contentMounted` 只管“滚轮内容”本身，不管整个 sheet 宿主。
  // lazy 模式下，第一次真正打开后才挂载滚轮，目的是减少页面初始渲染成本。
  const [contentMounted, setContentMounted] = React.useState(!lazyContent);
  const sheetRef = React.useRef<TrueSheet>(null);

  // 记录原生 sheet 是否已经进入 presented 状态。
  // 这个值不用于渲染，只用于做时序保护：
  // - 避免还没 dismiss 完又重复 dismiss
  // - 避免已经 present 了又重复 present
  const isPresentedRef = React.useRef(false);

  // 记录最新 visible，专门给异步回调 / requestAnimationFrame / animation 回调读。
  // 否则这些回调非常容易拿到旧闭包里的 visible，造成判断失真。
  const visibleRef = React.useRef(visible);

  React.useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  // 统一封装 dismiss：
  // 1. 所有关闭路径都尽量收敛到这里
  // 2. 内部吞掉原生层偶发的“重复 dismiss”异常
  //
  // 之所以要吞，是因为 JS 和原生回调存在天然竞态：
  // 某些极端情况下，业务上已经要求关闭，但原生层自己也正在 dismiss，
  // 这时重复调一次 dismiss 只需要“静默忽略”，不值得把异常抛到业务层。
  const dismissSheet = React.useCallback(() => {
    const p = sheetRef.current?.dismiss();
    if (p && typeof (p as any).catch === 'function') {
      (p as any).catch(() => {});
    }
  }, []);

  // 当业务要求打开时，先把 TrueSheet 宿主挂上树。
  // 注意这里只做“挂载准备”，不直接 present：
  // 真正的 `present()` 由后面的 effect 在下一帧触发。
  // 这样做可以避免“组件还没挂好就调用原生 present”的竞态。
  React.useEffect(() => {
    if (visible && !sheetMounted) {
      setSheetMounted(true);
    }
  }, [sheetMounted, visible]);

  // 抽屉高度支持 auto 或数值。
  // 如果传的是具体高度，这里转换成 TrueSheet 需要的 detent 比例。
  const detents = React.useMemo<Array<'auto' | number>>(() => {
    if (drawerSize == null) return ['auto'];
    const n = typeof drawerSize === 'number' ? drawerSize : Number.parseFloat(drawerSize);
    if (!Number.isFinite(n) || n <= 0) return ['auto'];
    const fraction = clampNumber(n / screenH, 0.1, 0.92);
    return [fraction];
  }, [drawerSize, screenH]);

  // 更新最终值时，兼容受控 / 非受控模式。
  const setModelValue = React.useCallback(
    (next: PickerModelValue) => {
      onValueChange?.(next);
      if (!isValueControlled) setInnerValue(next);
    },
    [isValueControlled, onValueChange]
  );

  // 把当前最终值解析成滚轮能直接消费的草稿结构。
  // 这个回调是“值 -> 级联列状态”的统一入口，后面多个地方都会复用。
  const resolveFromValue = React.useCallback(
    (v: PickerModelValue | undefined) => {
      const desired = toArrayValue(v);
      return resolveCascade(list, desired, rangKey, rangText, MAX_COLUMNS);
    },
    [list, rangKey, rangText]
  );

  // 单列时默认回传单值，多列时默认回传数组。
  // 如果外部显式传入了数组 value，也强制按数组输出。
  const outputAsArray = React.useMemo(() => {
    if (Array.isArray(value)) return true;
    if (value !== undefined && !Array.isArray(value)) return false;
    const r = resolveFromValue(value);
    return r.columns.length > 1;
  }, [resolveFromValue, value]);

  // 草稿态（draft）是整个组件内部最核心的一组状态。
  //
  // 它完整描述了“当前滚轮界面长什么样”：
  // 1. `draftColumns`：每一列当前有哪些候选项
  // 2. `draftIndices`：每一列当前停在哪个索引
  // 3. `draftValues`：当前草稿态对应的值
  // 4. `draftLabels`：当前草稿态对应的文案
  // 5. `draftItems`：当前草稿态对应的原始节点
  //
  // 这套状态会在以下场景更新：
  // 1. 外部 value 改变
  // 2. 打开弹窗时按最终值重置
  // 3. 用户滚动某一列
  // 4. 点击确认 / 取消前，先把滚轮结算到最近项
  const [{ draftValues, draftLabels, draftItems, draftIndices, draftColumns }, setDraft] = React.useState(() => {
    const r = resolveFromValue(value);
    return {
      draftValues: r.values,
      draftLabels: r.labels,
      draftItems: r.items,
      draftIndices: r.indices,
      draftColumns: r.columns,
    };
  });

  // 外部 value 变化时，内部草稿态也要跟着重算。
  React.useEffect(() => {
    const r = resolveFromValue(value);
    setDraft({
      draftValues: r.values,
      draftLabels: r.labels,
      draftItems: r.items,
      draftIndices: r.indices,
      draftColumns: r.columns,
    });
  }, [resolveFromValue, value]);

  // 每次“进入打开态”时，都把草稿态重置到当前最终值。
  // 这样下一次打开时，用户看到的永远是“上次已确认的结果”，
  // 而不是“上次滚到一半但没有确认的临时状态”。
  React.useEffect(() => {
    if (visible) {
      const r = resolveFromValue(value);
      setDraft({
        draftValues: r.values,
        draftLabels: r.labels,
        draftItems: r.items,
        draftIndices: r.indices,
        draftColumns: r.columns,
      });
      if (lazyContent && !contentMounted) setContentMounted(true);
    }
    // 这里只希望在 visible 切换时重置草稿态和懒加载内容，
    // 不想因为 resolveFromValue 等回调引用变化而重复触发这段逻辑。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // 负责驱动 TrueSheet 的原生 present / dismiss。
  //
  // 打开流程：
  // 1. `visible=true`
  // 2. 前面的 effect 把 `sheetMounted` 置为 true
  // 3. 这里发现“业务要求打开且宿主已经挂载”，再在下一帧调用 `present()`
  //
  // 关闭流程：
  // 1. `visible=false`
  // 2. 如果当前原生 sheet 还处于 presented，就主动调 `dismiss()`
  // 3. 但 React 侧不会马上卸载，真正卸载要等 `onDidDismiss`
  //
  // `present()` 放在 requestAnimationFrame 里，是为了给 React 一帧时间把宿主节点挂好，
  // 否则原生方法有概率调用过早。
  React.useEffect(() => {
    if (visible && sheetMounted) {
      const rafId = requestAnimationFrame(() => {
        if (!visibleRef.current) return;
        if (isPresentedRef.current) return;
        const p = sheetRef.current?.present();
        if (p && typeof (p as any).catch === 'function') {
          (p as any).catch(() => {});
        }
      });
      return () => cancelAnimationFrame(rafId);
    }
    if (!visible && isPresentedRef.current) {
      dismissSheet();
    }
  }, [dismissSheet, sheetMounted, visible]);

  // 根据已提交 value 推导展示文案。
  const committedLabel = React.useMemo(() => {
    const r = resolveFromValue(value);
    return r.labels.filter(Boolean).join(modelStrSeparator);
  }, [modelStrSeparator, resolveFromValue, value]);

  // 外部传了 label 时优先用外部值，否则用内部缓存或根据 value 现算。
  const effectiveLabel = React.useMemo(() => {
    if (labelProp !== undefined) return labelProp;
    return innerLabel || committedLabel;
  }, [committedLabel, innerLabel, labelProp]);

  // 对外统一的关闭入口。
  //
  // 注意这里刻意不做“直接卸载”：
  // 1. 先把业务 open 状态改成 false
  // 2. 再主动通知原生 dismiss
  // 3. 真正的卸载放到 `onDidDismiss`
  //
  // 也就是说，`close()` 的职责是“发起关闭”，不是“完成关闭”。
  const close = React.useCallback(() => {
    onOpenChange?.(false);
    if (!isShowControlled) setInnerShow(false);
    dismissSheet();
  }, [dismissSheet, isShowControlled, onOpenChange]);

  // 对外统一的打开入口。
  //
  // 除了把业务 open 改成 true，这里还会立刻把草稿态同步到当前已提交值。
  // 这样做的目的是保证用户刚点开时，滚轮位置就已经是正确的，
  // 而不是等弹窗动画跑完之后再突然跳一下。
  const openPicker = React.useCallback(() => {
    if (disabled) return;
    if (!visible) {
      if (!isShowControlled) setInnerShow(true);
      onOpenChange?.(true);
    }

    const r = resolveFromValue(value);
    setDraft({
      draftValues: r.values,
      draftLabels: r.labels,
      draftItems: r.items,
      draftIndices: r.indices,
      draftColumns: r.columns,
    });
    if (lazyContent && !contentMounted) setContentMounted(true);
  }, [contentMounted, disabled, isShowControlled, lazyContent, onOpenChange, resolveFromValue, value, visible]);

  // 暴露给父组件的命令式 API，内部仍然复用同一套 open / close 主链路，
  // 避免声明式和命令式两套入口行为不一致。
  React.useImperativeHandle(ref, () => ({
    open: openPicker,
    close,
  }), [openPicker, close]);

  // 列数最多 3 列，列宽按当前屏宽平分。
  const columnsCount = React.useMemo(() => Math.max(1, Math.min(MAX_COLUMNS, draftColumns.length || 1)), [draftColumns.length]);
  const columnWidth = React.useMemo(() => (screenW - wp(32)) / Math.max(1, columnsCount), [columnsCount, screenW]);

  const wheelsRef = React.useRef<Array<WheelColumnHandle | null>>([]);

  // 列数变化时同步裁掉多余的滚轮 ref，避免旧列引用残留。
  React.useEffect(() => {
    wheelsRef.current.length = columnsCount;
  }, [columnsCount]);

  // `onChange` 只对应“草稿态变化”，不对应最终提交。
  // 设计上它更像一个“预览 / 联动”回调：
  // - 可以拿来做外部联动展示
  // - 但业务不应该把它当成最终已确认值
  const emitDraftChange = React.useCallback(
    (nextValues: Primitive[], nextLabels: string[], nextItems: PickerTreeNode[]) => {
      const outValue = toOutputValue(nextValues, outputAsArray);
      const outLabel = nextLabels.filter(Boolean).join(modelStrSeparator);
      const payload: PickerChangePayload = {
        value: outValue,
        values: nextValues,
        label: outLabel,
        labels: nextLabels,
        items: nextItems,
      };
      onChange?.(payload);
    },
    [modelStrSeparator, onChange, outputAsArray]
  );

  // 把所有滚轮“结算”到最近一项，然后重新计算出一套稳定的草稿态。
  //
  // 为什么需要这一步：
  // iOS / Android 上滚轮都可能存在惯性滚动。
  // 用户很容易在滚轮还没彻底停稳时，直接点“确认”或“取消”。
  // 如果不先 settle，最终提交值就可能和视觉上最后停住的项不一致。
  //
  // 这里做了三件事：
  // 1. 读取每一列当前最接近的稳定索引
  // 2. 重新跑一遍级联计算，得到一套完整、合法的新草稿态
  // 3. 再把滚轮补滚到最终索引，确保 UI 与状态完全一致
  const syncDraftFromWheels = React.useCallback(async () => {
    const settledIndices = await Promise.all(
      Array.from({ length: MAX_COLUMNS }, async (_, col) => {
        const wheel = wheelsRef.current[col];
        if (Platform.OS === 'ios') {
          return wheel?.syncCurrentSelection();
        }
        return wheel?.settleToNearest(false);
      })
    );

    const desiredValues: Primitive[] = [];
    let currentList = Array.isArray(list) ? list : [];

    for (let col = 0; col < MAX_COLUMNS; col += 1) {
      if (!currentList.length) break;

      const safeIdx = findNearestEnabledIndex(currentList, settledIndices[col] ?? draftIndices[col] ?? 0);
      const picked = currentList[safeIdx];
      if (!picked) break;

      const pickedKey = pickKey(picked, rangKey);
      desiredValues[col] = pickedKey ?? String(safeIdx);
      currentList = Array.isArray(picked.children) ? picked.children : [];
    }

    const r = resolveCascade(list, desiredValues, rangKey, rangText, MAX_COLUMNS);
    setDraft({
      draftValues: r.values,
      draftLabels: r.labels,
      draftItems: r.items,
      draftIndices: r.indices,
      draftColumns: r.columns,
    });

    requestAnimationFrame(() => {
      for (let i = 0; i < r.indices.length; i += 1) {
        wheelsRef.current[i]?.scrollToIndex(r.indices[i] ?? 0, false);
      }
    });

    return r;
  }, [draftIndices, list, rangKey, rangText]);

  // 任意一列变化后的级联处理逻辑。
  //
  // 例如：
  // - 第 0 列从“浙江”切到“江苏”
  // - 那么第 1 列城市列表、第 2 列区县列表都可能随之变化
  //
  // 所以这里必须做完整链路：
  // 1. 当前列先纠正到最近可用项
  // 2. 截断后续旧值，避免拿着旧城市去匹配新省份
  // 3. 基于新的 desiredValues 重新推导所有后续列
  // 4. 让后续滚轮滚到新的索引
  // 5. 把草稿变化通过 `onChange` 抛给外部
  const handleWheelIndexChange = React.useCallback(
    (columnIndex: number, nextIndex: number) => {
      const col = draftColumns[columnIndex] ?? [];
      if (!col.length) return;
      const safeIdx = findNearestEnabledIndex(col, nextIndex);
      if (safeIdx !== nextIndex) {
        wheelsRef.current[columnIndex]?.scrollToIndex(safeIdx, true);
      }
      const picked = col[safeIdx];
      if (!picked) return;

      const nextDesired = [...draftValues];
      const pickedKey = pickKey(picked, rangKey);
      if (pickedKey !== undefined) nextDesired[columnIndex] = pickedKey;
      nextDesired.length = columnIndex + 1;

      const r = resolveCascade(list, nextDesired, rangKey, rangText, MAX_COLUMNS);
      setDraft({
        draftValues: r.values,
        draftLabels: r.labels,
        draftItems: r.items,
        draftIndices: r.indices,
        draftColumns: r.columns,
      });

      requestAnimationFrame(() => {
        for (let i = columnIndex + 1; i < r.indices.length; i += 1) {
          wheelsRef.current[i]?.scrollToIndex(r.indices[i] ?? 0, false);
        }
      });

      emitDraftChange(r.values, r.labels, r.items);
    },
    [draftColumns, draftValues, emitDraftChange, list, rangKey, rangText]
  );

  // 取消的语义是“放弃本次修改”：
  // 1. 不提交 value
  // 2. 直接关闭，避免按钮点下后还要额外等待滚轮同步
  // 3. 下次重新打开时，会按已提交 value 重建草稿态
  const handleCancel = React.useCallback(() => {
    onCancel?.();
    close();
  }, [close, onCancel]);

  // 确认的语义是“提交当前草稿态”：
  // 1. 先结算滚轮，拿到稳定的最终草稿
  // 2. 再更新 value / label
  // 3. 通过 onConfirm 把最终 payload 抛出去
  // 4. 最后关闭弹窗
  const handleConfirm = React.useCallback(async () => {
    const synced = await syncDraftFromWheels();
    const outValue = toOutputValue(synced.values, outputAsArray);
    const outLabel = synced.labels.filter(Boolean).join(modelStrSeparator);
    const payload: PickerConfirmPayload = {
      value: outValue,
      values: synced.values,
      label: outLabel,
      labels: synced.labels,
      items: synced.items,
    };
    onLabelChange?.(outLabel);
    if (labelProp === undefined) setInnerLabel(outLabel);
    setModelValue(outValue);
    onConfirm?.(payload);
    close();
  }, [close, labelProp, modelStrSeparator, onConfirm, onLabelChange, outputAsArray, setModelValue, syncDraftFromWheels]);

  // TrueSheet 原生弹窗真正展示完成后的回调。
  //
  // 这里除了做 `isPresentedRef` 标记，还有一个很重要的兜底：
  // 如果在“挂载 -> present 动画”这段时间里，业务状态又变成了关闭，
  // 那么 onDidPresent 到来后要立刻补一次 dismiss，避免出现：
  // - JS 认为已经关闭
  // - 但原生弹窗此刻才刚展示出来
  const handleSheetDidPresent = React.useCallback(() => {
    isPresentedRef.current = true;
    if (!visibleRef.current) {
      dismissSheet();
    }
  }, [dismissSheet]);

  // TrueSheet 原生弹窗真正关闭完成后的回调。
  //
  // 这里是“关闭流程真正结束”的地方：
  // 1. 原生层确认已经 dismiss 完成
  // 2. 这时才能安全把 `sheetMounted` 置回 false
  // 3. 同时同步 open 的受控 / 非受控状态
  //
  // iOS 这里额外要求一定回收 `sheetMounted`，
  // 因为我们外层还有一层 Modal 壳子，需要跟着 TrueSheet 一起完整卸载。
  const handleSheetDidDismiss = React.useCallback(() => {
    isPresentedRef.current = false;
    onOpenChange?.(false);
    if (!isShowControlled) setInnerShow(false);
    if (Platform.OS === 'ios' || lazyContent) setSheetMounted(false);
    onDismissComplete?.();
  }, [isShowControlled, lazyContent, onDismissComplete, onOpenChange]);

  // iOS 背景点击关闭统一走这里。
  //
  // 注意这里按“取消”语义处理，而不是“确认”：
  // - 不提交当前草稿值
  // - 触发 onCancel
  // - 再走统一 close
  //
  // 这样和用户点击“取消”按钮的业务语义保持一致。
  const handleBackdropPress = React.useCallback(() => {
    if (disabled || !visible) return;
    onCancel?.();
    close();
  }, [close, disabled, onCancel, visible]);

  // 触发器节点统一在这里组装。
  // 不管外部给的是普通节点还是 render function，最后都收敛成同一套打开逻辑。
  const triggerNode = React.useMemo(
    () =>
      children != null
        ? composeTrigger(children, openPicker, disabled, {
            label: effectiveLabel,
            value: (value ?? (outputAsArray ? [] : '')) as PickerModelValue,
          })
        : null,
    [children, disabled, effectiveLabel, openPicker, outputAsArray, value]
  );

  // iOS 改为“自绘背景 + 原生 sheet”模式：
  // 1. 背景点击由 RN Modal 的 Pressable 捕获
  // 2. TrueSheet 仍然负责原生弹出层和动画
  // 3. 这样可以保留手感，同时绕开 iOS 原生 dismissible 的不稳定时序
  const useManualIOSBackdrop = Platform.OS === 'ios';
  // `backdropOpacity` 管“透明度动画值”，`backdropMounted` 管“这层遮罩是否还留在树上”。
  // 两者分开是因为：
  // 1. 如果只看 visible，关闭时会直接瞬间卸载，没法淡出
  // 2. 如果一直挂着等 sheet dismiss 完，蒙层又会退得太慢，手感拖沓
  //
  // 所以现在的策略是：
  // - 关闭时立刻把透明度往 0 动
  // - 动完后再真正卸载遮罩层
  const backdropOpacity = React.useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [backdropMounted, setBackdropMounted] = React.useState(useManualIOSBackdrop && visible);

  // iOS 自绘蒙层单独做一个很轻的淡入淡出：
  // 1. 打开时淡入，避免突然整片变黑
  // 2. 关闭时快速淡出，避免蒙层退场明显慢于交互动作
  // 3. 蒙层是否卸载与透明度动画分开，保证既有过渡又不拖慢关闭手感
  React.useEffect(() => {
    if (!useManualIOSBackdrop) return;

    backdropOpacity.stopAnimation();

    if (visible) {
      setBackdropMounted(true);
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(backdropOpacity, {
      toValue: 0,
      duration: 120,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visibleRef.current) {
        setBackdropMounted(false);
      }
    });
  }, [backdropOpacity, useManualIOSBackdrop, visible]);

  // 把 TrueSheet 本体抽成 `sheetNode`，是为了复用同一份结构：
  // - Android 直接渲染这个节点
  // - iOS 则额外包在外层 Modal 里面
  //
  // 这样可以保证两端的内容、按钮、滚轮逻辑完全一致，
  // 差异只收敛在“是否需要一层手动背景处理”。
  const sheetNode = (
    <TrueSheet
      ref={sheetRef}
      detents={detents}
      backgroundColor={theme.colors.surface}
      cornerRadius={undefined}
      grabber={false}
      draggable={false}
      // iOS 使用自绘背景时，这里必须关闭 TrueSheet 自己的 dim 背景。
      // 否则会出现两个问题：
      // 1. 视觉上变成双层遮罩，颜色不对
      // 2. 更重要的是，原生背景层可能会把点击事件拦走
      dimmed={!useManualIOSBackdrop}
      dimmedDetentIndex={0}
      insetAdjustment="never"
      // 千万不要为了省事，直接把 iOS 这里改成 true。
      //
      // 这个开关在 iOS 上曾经验证过，会重新引入一个非常隐蔽的历史问题：
      // - 用户点击“确认”
      // - 业务值已经更新
      // - 但弹窗偶发不关闭
      //
      // 当前稳定方案是：
      // 1. Android 继续使用原生 dismissible
      // 2. iOS 原生 dismissible 固定关闭
      // 3. iOS 的背景点击关闭只走外层 Modal + Pressable
      dismissible={Platform.OS === 'ios' ? false : !disabled}
      onDidPresent={handleSheetDidPresent}
      onDidDismiss={handleSheetDidDismiss}
    >
      <View
        style={[
          styles.sheetInner,
          {
            backgroundColor: theme.colors.surface,
            paddingBottom: safeBottom,
          },
        ]}
        pointerEvents={disabled ? 'none' : 'auto'}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {title ?? t('picker.title')}
          </Text>
        </View>

        {contentMounted ? (
          <View style={styles.pickerArea}>
            {/* 多列场景下可选渲染每一列的表头，例如“年 / 月 / 日”。
                它只负责视觉提示，不参与滚轮值计算。 */}
            {renderColumnHeader && (
              <View style={styles.columnLabelsRow}>
                {Array.from({ length: columnsCount }, (_, i) => (
                  <View key={`lbl-${i}`} style={[styles.columnLabelItem, { width: columnWidth }]}>
                    {renderColumnHeader(i, columnsCount)}
                  </View>
                ))}
              </View>
            )}
            <View style={styles.pickerWrapper}>
              {/* iOS 现在已经切到原生 `UIPickerView`，原生自带选中区视觉；
                  这里的高亮条只在 Android 自绘 wheel 上保留。 */}
              {Platform.OS !== 'ios' && (
                <View
                  style={[styles.highlightBar, { backgroundColor: '#F2F2F2' }]}
                  pointerEvents="none"
                />
              )}
              <View style={styles.columnsRow}>
                {draftColumns.slice(0, columnsCount).map((col, colIdx) => (
                  <MemoizedWheelColumn
                    key={`col-${colIdx}-${columnsCount}`}
                    col={col}
                    colIdx={colIdx}
                    rangKey={rangKey}
                    rangText={rangText}
                    selectedIndex={Math.max(0, draftIndices[colIdx] ?? 0)}
                    onSelectedIndexChange={handleWheelIndexChange}
                    width={columnWidth}
                    disabled={disabled}
                    wheelsRef={wheelsRef}
                  />
                ))}
              </View>

              {/* Android 通过渐变遮罩弱化非选中区域，
                  让中间高亮项更明显。
                  iOS 这里不额外加遮罩，尽量保留原生滚轮的清爽视觉。 */}
              {Platform.OS !== 'ios' && (
                <View style={styles.topMask} pointerEvents="none">
                  <LinearGradient
                    colors={['#FFFFFF', 'rgba(255,255,255,0)']}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
              )}
              {Platform.OS !== 'ios' && (
                <View style={styles.bottomMask} pointerEvents="none">
                  <LinearGradient
                    colors={['rgba(255,255,255,0)', '#FFFFFF']}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
              )}
            </View>
          </View>
        ) : (
          // 懒加载时先占位，避免第一次打开瞬间高度跳动。
          <View style={[styles.pickerArea, { height: WHEEL_AREA_HEIGHT + wp(18) }]} />
        )}

        <View style={styles.footer}>
          <View style={styles.footerBtnWrapper}>
            <Button
              skin="thin"
              onPress={handleCancel}
              disabled={disabled}
              block
              minHeight={wp(44)}
              round={wp(14)}
              fontSize={sp(16)}
            >
              {t('picker.cancel')}
            </Button>
                </View>
                <View style={styles.footerBtnWrapper}>
                  <Button
                    onPress={handleConfirm}
                    disabled={disabled}
                    block
              minHeight={wp(44)}
              round={wp(14)}
              fontSize={sp(16)}
            >
              {t('picker.confirm')}
            </Button>
          </View>
        </View>
      </View>
    </TrueSheet>
  );

  return (
    <>
      {triggerNode}
      {/* 只要原生 sheet 宿主还没完全回收，就继续保留渲染。
          这样即使 visible 已经变成 false，也能等到 TrueSheet 完整跑完 dismiss。 */}
      {sheetMounted ? (
        useManualIOSBackdrop ? (
          <Modal
            visible
            transparent
            animationType="none"
            statusBarTranslucent
            presentationStyle="overFullScreen"
            onRequestClose={handleBackdropPress}
          >
            {/* 这层 Modal 只是 iOS 的“背景点击捕获层”，不是用来实现底部弹窗动画的。 */}
            <View style={styles.modalRoot} pointerEvents="box-none">
              {/* Modal 需要等原生 sheet 真正 dismiss 完才能卸载，
                  但背景遮罩本身不需要跟着等动画结束。
                  这里只让遮罩跟 visible 走，这样一触发关闭就立刻消失，
                  避免出现“蒙层比弹窗晚几百毫秒才退场”的拖沓体感。 */}
              {backdropMounted ? (
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={handleBackdropPress}
                  disabled={disabled || !visible}
                >
                  <Animated.View style={[styles.iosBackdrop, { opacity: backdropOpacity }]} />
                </Pressable>
              ) : null}
              {sheetNode}
            </View>
          </Modal>
        ) : (
          sheetNode
        )
      ) : null}
    </>
  );
});

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  iosBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  sheetInner: {
    width: '100%',
    paddingHorizontal: wp(16),
    paddingTop: wp(12)
  },
  header: {
    height: wp(30),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: sp(16),
    fontWeight: '600',
  },
  pickerArea: {
    marginTop: wp(4),
    paddingVertical: WHEEL_AREA_VERTICAL_INSET,
  },
  columnLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: wp(6),
  },
  columnLabelItem: {
    alignItems: 'center',
  },
  columnLabelText: {
    fontSize: sp(14),
    fontWeight: '600',
    color: '#666666',
  },
  pickerWrapper: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    position: 'relative',
    width: '100%',
    overflow: 'visible',
  },
  highlightBar: {
    position: 'absolute',
    top: ITEM_HEIGHT * ((VISIBLE_ITEMS - 1) / 2),
    left: -wp(16),
    right: -wp(16),
    height: ITEM_HEIGHT,
    zIndex: 0,
  },
  topMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * ((VISIBLE_ITEMS - 1) / 2),
    zIndex: 2,
  },
  bottomMask: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * ((VISIBLE_ITEMS - 1) / 2),
    zIndex: 2,
  },
  columnsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: wp(14),
  },
  footerBtnWrapper: {
    flex: 1,
  },
});
