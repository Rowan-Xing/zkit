import * as React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useTheme } from '../../theme/useTheme';
import CheckSvg from '../../assets/icons/check.svg';
import { wp } from 'y2kit-tools';
import { Text } from '../Text';

// Checkbox / CheckboxGroup 面向业务高频场景做了“开箱即用”的设计：
// - 单个 Checkbox：同时支持受控 checked 与非受控 defaultChecked
// - 半选 indeterminate：用于“全选/部分选中”这类三态入口
// - CheckboxGroup：用 value/defaultValue/onValueChange 管理选中集合
// - 自定义内容：children 既支持 render-prop（slot）也支持普通 ReactNode
// - 动画全部走 react-native-reanimated（UI 线程），尽量避免 JS 抖动影响手感
export type CheckedState = boolean | 'indeterminate';
export type CheckboxValue = string | number;

export type CheckboxSlotProps = {
  // 当前是否明确选中（indeterminate 时为 false）
  checked: boolean;
  // 当前是否半选
  indeterminate: boolean;
  value?: CheckboxValue;
  disabled: boolean;
  // 手动触发切换（等价于点击 Checkbox）
  toggle: () => void;
};

type CheckboxContextValue = {
  // 激活态动画进度：0=未选中，1=选中/半选背景（UI 线程）
  checkedSv: SharedValue<number>;
  // 半选态动画进度：0=非半选，1=半选（UI 线程）
  indeterminateSv: SharedValue<number>;
  boxSize: number;
  // 已解析的图标节点（默认 CheckSvg）
  icon: React.ReactNode;
  onPrimary: string;
};

const CheckboxContext = React.createContext<CheckboxContextValue | null>(null);

type CheckboxGroupStoreListener = () => void;

const noopSubscribe = () => () => {};

class CheckboxGroupStore<T extends CheckboxValue> {
  private _values: Set<T>;
  private listeners = new Set<CheckboxGroupStoreListener>();

  constructor(initialValues: readonly T[]) {
    this._values = new Set(initialValues);
  }

  // 使用 useSyncExternalStore 订阅 store，避免 group 内任意更新导致整组重渲染
  subscribe = (listener: CheckboxGroupStoreListener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  has = (value: T) => this._values.has(value);

  getToggledValues = (value: T) => {
    const next = new Set(this._values);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return Array.from(next);
  };

  setValues = (values: readonly T[]) => {
    const next = new Set(values);
    if (next.size === this._values.size) {
      let same = true;
      for (const v of next) {
        if (!this._values.has(v)) {
          same = false;
          break;
        }
      }
      if (same) return false;
    }

    this._values = next;
    this.emit();
    return true;
  };

  private emit() {
    for (const l of this.listeners) l();
  }
}

type CheckboxGroupContextValue<T extends CheckboxValue> = {
  store: CheckboxGroupStore<T>;
  disabled: boolean;
  isControlled: boolean;
  toggleValue: (value: T) => void;
};

const CheckboxGroupContext = React.createContext<CheckboxGroupContextValue<CheckboxValue> | null>(null);

function useCheckboxContext() {
  const ctx = React.useContext(CheckboxContext);
  if (!ctx) {
    throw new Error('[y2kit-ui] CheckboxIndicator must be wrapped in <Checkbox />');
  }
  return ctx;
}

function isRenderProp(children: CheckboxProps['children']): children is (slot: CheckboxSlotProps) => React.ReactNode {
  return typeof children === 'function';
}

function toTimingConfig(duration: number) {
  // 所有过渡统一用同一条 easing 曲线，保证按压/勾选的体感一致
  return { duration, easing: Easing.out(Easing.cubic) } as const;
}

function parseNumberLike(input: number | string | undefined) {
  if (typeof input === 'number') return input;
  if (typeof input !== 'string') return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const n = trimmed.endsWith('px') ? parseFloat(trimmed.slice(0, -2)) : parseFloat(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

export type CheckboxProps = Omit<
  React.ComponentPropsWithoutRef<typeof Pressable>,
  'style' | 'children' | 'onPressIn' | 'onPressOut' | 'onChange'
> & {
  // 配合 CheckboxGroup 使用的唯一值（同组内不可重复）
  value?: CheckboxValue;
  checked?: CheckedState;
  defaultChecked?: CheckedState;
  onCheckedChange?: (checked: CheckedState) => void;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  // 快捷 label（不需要自定义内容时直接用）
  label?: string;
  // 自定义内容：
  // - ReactNode：纯展示
  // - (slot) => ReactNode：拿到 checked/indeterminate/toggle 等能力
  children?: React.ReactNode | ((slot: CheckboxSlotProps) => React.ReactNode);
  style?: StyleProp<ViewStyle>;
  // 仅作用于“方块”区域的样式（不影响外层布局）
  boxStyle?: StyleProp<ViewStyle>;

  // label 与方块之间的间距
  labelSpace?: number;
  // 隐藏方块（用于完全自定义外观，只复用交互/状态）
  hiddenCheckbox?: boolean;
  // 自定义选中图标（默认使用 CheckSvg）
  icon?: React.ReactNode | string;
  // 未选中时边框色（不传使用 theme.colors.border）
  unCheckColor?: string;
  // 强制半选态（用于“全选”入口）
  indeterminate?: boolean;
  // 动画时长（按下/选中/半选统一使用）
  duration?: number;

  size?: number;
  borderWidth?: number;
  radius?: number;
  // 选中态主色（背景/边框）
  color?: string;
  shape?: 'square' | 'circle';
  testID?: string;
};

function nextCheckedState(current: CheckedState): CheckedState {
  if (current === 'indeterminate') return true;
  return !current;
}

export function Checkbox({
  value,
  checked: checkedProp,
  defaultChecked = false,
  onCheckedChange,
  onChange,
  disabled = false,
  label,
  children,
  style,
  boxStyle,
  labelSpace,
  hiddenCheckbox = false,
  icon,
  unCheckColor,
  indeterminate,
  duration = 180,
  size,
  borderWidth,
  radius,
  color,
  shape = 'square',
  testID,
  onPress,
  ...pressableProps
}: CheckboxProps) {
  const theme = useTheme();
  const group = React.useContext(CheckboxGroupContext);
  const resolvedDisabled = disabled || Boolean(group?.disabled);

  const isControlled = checkedProp !== undefined;
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState<CheckedState>(() => defaultChecked);

  // group 模式下：Checkbox 不再维护自己的 checked，而是由 group 的 value 集合决定
  const isGroupItem = group != null && value !== undefined && !isControlled && indeterminate !== true;
  const groupChecked = React.useSyncExternalStore(
    group?.store.subscribe ?? noopSubscribe,
    () => (group && value !== undefined ? group.store.has(value) : false),
    () => (group && value !== undefined ? group.store.has(value) : false)
  );

  const checked: CheckedState = isGroupItem ? groupChecked : isControlled ? checkedProp! : uncontrolledChecked;
  const resolvedChecked: CheckedState = indeterminate ? 'indeterminate' : checked;
  const isIndeterminate = resolvedChecked === 'indeterminate';
  const isChecked = resolvedChecked === true;
  const isActive = resolvedChecked !== false;

  const resolvedSize = size ?? wp(20);
  const resolvedBorderWidth = borderWidth ?? wp(1.5);
  const resolvedRadius =
    radius !== undefined ? radius : shape === 'circle' ? resolvedSize / 2 : wp(4);
  const resolvedPrimary = color ?? theme.colors.primary;
  const resolvedUncheck = unCheckColor ?? theme.colors.border;
  const resolvedLabelSpace = labelSpace ?? wp(10);
  const timing = React.useMemo(() => toTimingConfig(duration), [duration]);

  // 动画全部基于 sharedValue，UI 线程执行：
  // - checkedSv：控制背景/边框激活态与 icon 的出现
  // - indeterminateSv：控制横杠出现，并抑制 icon
  // - pressSv：按压反馈（opacity）
  const checkedSv = useSharedValue(isActive ? 1 : 0);
  const indeterminateSv = useSharedValue(isIndeterminate ? 1 : 0);
  const pressSv = useSharedValue(0);

  // 同步“外部状态 -> UI 线程动画”
  React.useEffect(() => {
    checkedSv.value = withTiming(isActive ? 1 : 0, timing);
    indeterminateSv.value = withTiming(isIndeterminate ? 1 : 0, timing);
  }, [checkedSv, indeterminateSv, isActive, isIndeterminate, timing]);

  const rootAnimatedStyle = useAnimatedStyle(() => {
    const pressedOpacity = interpolate(pressSv.value, [0, 1], [1, 0.85]);
    return { opacity: resolvedDisabled ? 0.55 : pressedOpacity };
  }, [resolvedDisabled]);

  const boxAnimatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        checkedSv.value,
        [0, 1],
        [theme.colors.surface, resolvedPrimary]
      ),
      borderColor: interpolateColor(checkedSv.value, [0, 1], [resolvedUncheck, resolvedPrimary]),
    };
  }, [resolvedPrimary, resolvedUncheck, theme.colors.surface]);

  const emitCheckedChange = React.useCallback(
    (next: CheckedState) => {
      if (!isControlled) setUncontrolledChecked(next);
      onCheckedChange?.(next);
      if (next !== 'indeterminate') onChange?.(next);
    },
    [isControlled, onChange, onCheckedChange]
  );

  const toggle = React.useCallback(() => {
    if (resolvedDisabled) return;
    if (isGroupItem && group && value !== undefined) {
      // 非受控 group 可乐观更新；受控 group 必须等待 props，避免父级拒绝更新时 UI 漂移。
      if (!group.isControlled) {
        checkedSv.value = withTiming(groupChecked ? 0 : 1, timing);
        indeterminateSv.value = withTiming(0, timing);
      }
      group.toggleValue(value);
      return;
    }
    const next = nextCheckedState(resolvedChecked);
    // 单个模式：仅在非受控模式下做乐观 UI 更新，受控模式下完全依赖 props 驱动动画，
    // 避免父组件拦截更新（如校验失败）时 UI 状态与真实状态不一致
    if (!isControlled) {
      checkedSv.value = withTiming(next !== false ? 1 : 0, timing);
      indeterminateSv.value = withTiming(next === 'indeterminate' ? 1 : 0, timing);
    }
    emitCheckedChange(next);
  }, [
    checkedSv,
    emitCheckedChange,
    group,
    groupChecked,
    indeterminateSv,
    isGroupItem,
    resolvedChecked,
    resolvedDisabled,
    timing,
    value,
  ]);

  const renderedLabel = React.useMemo(() => {
    if (isRenderProp(children)) {
      return children({
        checked: isChecked,
        indeterminate: isIndeterminate,
        value,
        disabled: resolvedDisabled,
        toggle,
      });
    }
    if (children != null) return children;
    if (label) {
      return (
        <Text
          style={[
            styles.label,
            { color: theme.colors.onSurface },
            resolvedDisabled ? { color: theme.colors.disabled } : null,
          ]}
        >
          {label}
        </Text>
      );
    }
    return null;
  }, [
    children,
    isChecked,
    isIndeterminate,
    label,
    resolvedDisabled,
    theme.colors.disabled,
    theme.colors.onSurface,
    toggle,
    value,
  ]);

  const resolvedIcon = React.useMemo<React.ReactNode>(() => {
    if (icon != null && typeof icon !== 'string') return icon;
    const iconSize = Math.max(8, Math.round(resolvedSize * 0.62));
    return <CheckSvg width={iconSize} height={iconSize} color={theme.colors.onPrimary} />;
  }, [icon, resolvedSize, theme.colors.onPrimary]);

  const ctxValue = React.useMemo<CheckboxContextValue>(
    () => ({
      checkedSv,
      indeterminateSv,
      boxSize: resolvedSize,
      icon: resolvedIcon,
      onPrimary: theme.colors.onPrimary,
    }),
    [checkedSv, indeterminateSv, resolvedIcon, resolvedSize, theme.colors.onPrimary]
  );

  return (
    <Pressable
      {...pressableProps}
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{
        checked: isIndeterminate ? 'mixed' : isChecked,
        disabled: Boolean(resolvedDisabled),
      }}
      disabled={resolvedDisabled}
      onPress={(e) => {
        toggle();
        onPress?.(e);
      }}
      onPressIn={() => {
        if (resolvedDisabled) return;
        pressSv.value = withTiming(1, timing);
      }}
      onPressOut={() => {
        pressSv.value = withTiming(0, timing);
      }}
      style={[styles.row, style]}
    >
      <Animated.View style={[styles.content, rootAnimatedStyle]}>
        <CheckboxContext.Provider value={ctxValue}>
          {hiddenCheckbox ? null : (
            <Animated.View
              style={[
                styles.box,
                {
                  width: resolvedSize,
                  height: resolvedSize,
                  borderWidth: resolvedBorderWidth,
                  borderRadius: resolvedRadius,
                },
                boxAnimatedStyle,
                boxStyle,
              ]}
            >
              <CheckboxIndicator />
            </Animated.View>
          )}
        </CheckboxContext.Provider>
        {renderedLabel ? (
          <View style={[styles.labelWrap, hiddenCheckbox ? null : { marginLeft: resolvedLabelSpace }]}>
            {renderedLabel}
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

export type CheckboxIndicatorProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function CheckboxIndicator({ children, style }: CheckboxIndicatorProps) {
  const theme = useTheme();
  const ctx = useCheckboxContext();

  const iconAnimatedStyle = useAnimatedStyle(() => {
    const opacity = ctx.checkedSv.value * (1 - ctx.indeterminateSv.value);
    const scale = interpolate(ctx.checkedSv.value, [0, 1], [0.8, 1]);
    return { opacity, transform: [{ scale }] };
  });

  const barAnimatedStyle = useAnimatedStyle(() => {
    const opacity = ctx.indeterminateSv.value;
    const scale = interpolate(ctx.indeterminateSv.value, [0, 1], [0.85, 1]);
    return { opacity, transform: [{ scale }] };
  });

  const indeterminateWidth = Math.max(8, Math.round(ctx.boxSize * 0.55));
  const indeterminateHeight = Math.max(2, Math.round(ctx.boxSize * 0.12));

  return (
    <View pointerEvents="none" style={[styles.indicator, style]}>
      <Animated.View style={barAnimatedStyle}>
        <View
          style={{
            width: indeterminateWidth,
            height: indeterminateHeight,
            borderRadius: indeterminateHeight / 2,
            backgroundColor: ctx.onPrimary ?? theme.colors.onPrimary,
            opacity: 1,
          }}
        />
      </Animated.View>
      <Animated.View style={[styles.iconLayer, iconAnimatedStyle]}>{children ?? ctx.icon}</Animated.View>
    </View>
  );
}

export type CheckboxGroupProps<T extends CheckboxValue = CheckboxValue> = Omit<
  React.ComponentPropsWithoutRef<typeof View>,
  'children'
> & {
  value?: T[];
  defaultValue?: T[];
  onValueChange?: (value: T[]) => void;
  disabled?: boolean;
  direction?: 'row' | 'column';
  align?: 'left' | 'center' | 'right';
  gap?: number | string | [number | string, number | string];
  children: React.ReactNode;
};

export function CheckboxGroup<T extends CheckboxValue = CheckboxValue>({
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  direction = 'row',
  align = 'left',
  gap = 0,
  style,
  children,
  ...viewProps
}: CheckboxGroupProps<T>) {
  const isControlled = value !== undefined;
  const storeRef = React.useRef<CheckboxGroupStore<T> | null>(null);
  if (!storeRef.current) {
    storeRef.current = new CheckboxGroupStore<T>(value ?? defaultValue ?? []);
  }

  React.useLayoutEffect(() => {
    if (!isControlled) return;
    storeRef.current!.setValues(value as T[]);
  }, [isControlled, value]);

  const toggleValue = React.useCallback(
    (v: T) => {
      const next = storeRef.current!.getToggledValues(v);
      if (!isControlled) storeRef.current!.setValues(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange]
  );

  const ctx = React.useMemo<CheckboxGroupContextValue<T>>(
    () => ({
      store: storeRef.current!,
      disabled,
      isControlled,
      toggleValue,
    }),
    [disabled, isControlled, toggleValue]
  );

  const flexDirection = direction === 'column' ? 'column' : 'row';
  const alignKey = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';

  const gapStyle = React.useMemo(() => {
    const raw = gap;
    if (Array.isArray(raw)) {
      const col = parseNumberLike(raw[0]) ?? 0;
      const row = parseNumberLike(raw[1]) ?? 0;
      return { columnGap: col, rowGap: row } as ViewStyle;
    }
    const n = parseNumberLike(raw) ?? 0;
    return { columnGap: n, rowGap: n } as ViewStyle;
  }, [gap]);

  const layoutStyle: ViewStyle =
    flexDirection === 'row'
      ? { flexDirection, alignItems: 'center', justifyContent: alignKey }
      : { flexDirection, alignItems: alignKey, justifyContent: 'flex-start' };

  return (
    <CheckboxGroupContext.Provider value={ctx as any}>
      <View {...viewProps} style={[layoutStyle, gapStyle, style]}>
        {children}
      </View>
    </CheckboxGroupContext.Provider>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: wp(15),
  },
  labelWrap: {
    flexShrink: 1,
    minWidth: 0,
  },
});
