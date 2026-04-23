import * as React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { EasingFunction } from 'react-native-reanimated';
import { wp } from 'y2kit-tools';
import { useTheme } from '../../theme/useTheme';
import { Text } from '../Text';

type AccordionType = 'single' | 'multiple';

type AccordionContextValue = {
  type: AccordionType;
  collapsible: boolean;
  isItemOpen: (value: string) => boolean;
  toggleItem: (value: string) => void;
  duration: number;
  easing: EasingFunction;
};

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

type AccordionItemContextValue = {
  value: string;
  expanded: boolean;
  disabled: boolean;
  toggle: () => void;
  duration: number;
  easing: EasingFunction;
};

const AccordionItemContext = React.createContext<AccordionItemContextValue | null>(null);

function useAccordionContext() {
  const ctx = React.useContext(AccordionContext);
  if (!ctx) {
    throw new Error('[y2kit-ui] Accordion components must be wrapped in <Accordion />');
  }
  return ctx;
}

function useAccordionItemContext() {
  const ctx = React.useContext(AccordionItemContext);
  if (!ctx) {
    throw new Error('[y2kit-ui] AccordionTrigger/Content must be wrapped in <AccordionItem />');
  }
  return ctx;
}

function arrayFromSingleOrArray(value: string | string[] | undefined) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function toValueShape(type: AccordionType, values: string[]) {
  if (type === 'multiple') return values;
  return values[0] ?? undefined;
}

export type AccordionProps =
  | {
      type?: 'single';
      collapsible?: boolean;
      value?: string;
      defaultValue?: string;
      onValueChange?: (value: string | undefined) => void;
      duration?: number;
      easing?: EasingFunction;
      style?: StyleProp<ViewStyle>;
      children: React.ReactNode;
      testID?: string;
    }
  | {
      type: 'multiple';
      collapsible?: true;
      value?: string[];
      defaultValue?: string[];
      onValueChange?: (value: string[]) => void;
      duration?: number;
      easing?: EasingFunction;
      style?: StyleProp<ViewStyle>;
      children: React.ReactNode;
      testID?: string;
    };

// Accordion 负责管理展开项的状态，并通过 Reanimated 的 Layout 动画让展开/收起更顺滑。
// - single：同一时间最多展开 1 项
// - multiple：同一时间可展开多项
export function Accordion(props: AccordionProps) {
  const {
    type = 'single',
    collapsible = false,
    duration = 240,
    easing = Easing.out(Easing.cubic),
    style,
    children,
    testID,
  } = props as AccordionProps & { type: AccordionType };

  const isControlled = 'value' in props && props.value !== undefined;
  const [uncontrolled, setUncontrolled] = React.useState<string[]>(() => arrayFromSingleOrArray((props as any).defaultValue));

  const values = React.useMemo(() => {
    if (!isControlled) return uncontrolled;
    return arrayFromSingleOrArray((props as any).value);
  }, [isControlled, props, uncontrolled]);

  const setValues = React.useCallback(
    (next: string[]) => {
      if (!isControlled) setUncontrolled(next);
      const shaped = toValueShape(type, next);
      (props as any).onValueChange?.(shaped);
    },
    [isControlled, props, type]
  );

  const isItemOpen = React.useCallback((v: string) => values.includes(v), [values]);

  const toggleItem = React.useCallback(
    (v: string) => {
      const opened = values.includes(v);
      if (type === 'single') {
        if (opened) {
          if (collapsible) setValues([]);
          return;
        }
        setValues([v]);
        return;
      }

      if (opened) {
        setValues(values.filter((x) => x !== v));
        return;
      }
      setValues([...values, v]);
    },
    [collapsible, setValues, type, values]
  );

  const ctx = React.useMemo<AccordionContextValue>(
    () => ({ type, collapsible: Boolean(collapsible), isItemOpen, toggleItem, duration, easing }),
    [collapsible, duration, easing, isItemOpen, toggleItem, type]
  );

  return (
    <AccordionContext.Provider value={ctx}>
      <View testID={testID} style={style}>
        {children}
      </View>
    </AccordionContext.Provider>
  );
}

export type AccordionItemProps = {
  value: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  testID?: string;
};

// AccordionItem 是一个独立的折叠单元。
// Layout 动画挂在 item 容器上：内容出现/消失时会触发高度变化，并由 UI 线程做过渡。
export function AccordionItem({ value, disabled = false, style, children, testID }: AccordionItemProps) {
  const accordion = useAccordionContext();
  const expanded = accordion.isItemOpen(value);

  const toggle = React.useCallback(() => {
    if (disabled) return;
    accordion.toggleItem(value);
  }, [accordion, disabled, value]);

  const itemCtx = React.useMemo<AccordionItemContextValue>(
    () => ({ value, expanded, disabled, toggle, duration: accordion.duration, easing: accordion.easing }),
    [accordion.duration, accordion.easing, disabled, expanded, toggle, value]
  );

  return (
    <AccordionItemContext.Provider value={itemCtx}>
      <Animated.View
        testID={testID}
        layout={LinearTransition.duration(accordion.duration).easing(accordion.easing)}
        style={[styles.item, style]}
      >
        {children}
      </Animated.View>
    </AccordionItemContext.Provider>
  );
}

export type AccordionTriggerRenderState = {
  expanded: boolean;
  disabled: boolean;
  value: string;
};

export type AccordionTriggerProps = Omit<React.ComponentPropsWithoutRef<typeof Pressable>, 'children'> & {
  children: React.ReactNode | ((state: AccordionTriggerRenderState) => React.ReactNode);
  style?: StyleProp<ViewStyle>;
  left?: React.ReactNode | ((state: AccordionTriggerRenderState) => React.ReactNode);
  right?: React.ReactNode | ((state: AccordionTriggerRenderState) => React.ReactNode);
  title?: string;
  asChild?: boolean;
};

// AccordionTrigger 是可点击区域：
// - 默认渲染一个“左侧内容 + 右侧指示器”的行
// - 支持 render prop 读取 expanded/disabled/value，方便做自定义 UI
export function AccordionTrigger({
  children,
  left,
  right,
  title,
  asChild = false,
  style,
  onPress,
  disabled: disabledProp,
  ...pressableProps
}: AccordionTriggerProps) {
  const theme = useTheme();
  const item = useAccordionItemContext();

  const state: AccordionTriggerRenderState = React.useMemo(
    () => ({ expanded: item.expanded, disabled: item.disabled || Boolean(disabledProp), value: item.value }),
    [disabledProp, item.disabled, item.expanded, item.value]
  );

  const resolvedLeft =
    typeof left === 'function'
      ? left(state)
      : left !== undefined
        ? left
        : title != null
          ? <Text style={styles.title}>{title}</Text>
          : null;

  const resolvedRight =
    typeof right === 'function' ? right(state) : right !== undefined ? right : <AccordionIndicator />;

  const resolvedCenter = React.useMemo(() => {
    if (typeof children === 'function') return children(state);
    if (children != null) return children;
    return null;
  }, [children, state]);

  return (
    <Pressable
      {...pressableProps}
      accessibilityRole="button"
      accessibilityState={{ expanded: Boolean(state.expanded), disabled: Boolean(state.disabled) }}
      disabled={state.disabled}
      onPress={(e) => {
        item.toggle();
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.trigger,
        { borderBottomColor: theme.colors.border },
        pressed && !state.disabled ? styles.pressed : null,
        style,
      ]}
    >
      {asChild ? (
        resolvedCenter
      ) : (
        <View style={styles.triggerRow}>
          <View style={styles.left}>{resolvedLeft}</View>
          <View style={styles.center}>{resolvedCenter}</View>
          <View style={styles.right}>{resolvedRight}</View>
        </View>
      )}
    </Pressable>
  );
}

export type AccordionContentProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

// AccordionContent 会在展开时挂载，并使用 entering/exiting + Layout 组合动画：
// - entering/exiting 提供更“跟手”的淡入淡出
// - Layout 负责高度变化的过渡（避免手动测量高度）
export function AccordionContent({ children, style, testID }: AccordionContentProps) {
  const item = useAccordionItemContext();
  if (!item.expanded) return null;

  return (
    <Animated.View
      testID={testID}
      entering={FadeIn.duration(Math.min(180, item.duration))}
      exiting={FadeOut.duration(Math.min(140, item.duration))}
      layout={LinearTransition.duration(item.duration).easing(item.easing)}
      style={[styles.content, style]}
    >
      {children}
    </Animated.View>
  );
}

export type AccordionIndicatorProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  fromDeg?: number;
  toDeg?: number;
};

// AccordionIndicator 是一个“展开指示器”，默认用一个轻量的 chevron（纯 View 绘制，避免引入额外图标依赖）。
// 它会随着 expanded 状态在 UI 线程旋转，保证动画顺滑。
export function AccordionIndicator({ children, style, fromDeg = 0, toDeg = 180 }: AccordionIndicatorProps) {
  const theme = useTheme();
  const item = useAccordionItemContext();
  const progress = useSharedValue(item.expanded ? 1 : 0);

  React.useEffect(() => {
    progress.value = withTiming(item.expanded ? 1 : 0, {
      duration: item.duration,
      easing: item.easing,
    });
  }, [item.duration, item.easing, item.expanded, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const deg = fromDeg + (toDeg - fromDeg) * progress.value;
    return { transform: [{ rotateZ: `${deg}deg` }] };
  }, [fromDeg, toDeg]);

  return (
    <Animated.View style={[styles.indicator, animatedStyle, style]}>
      {children ?? (
        <View
          style={[
            styles.chevron,
            { borderRightColor: theme.colors.muted, borderBottomColor: theme.colors.muted },
          ]}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  item: {
    borderRadius: wp(12),
    overflow: 'hidden',
  },
  trigger: {
    paddingHorizontal: wp(14),
    paddingVertical: wp(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  left: {
    flexShrink: 0,
  },
  center: {
    flex: 1,
    paddingHorizontal: wp(10),
  },
  right: {
    flexShrink: 0,
  },
  title: {
    fontSize: wp(16),
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
  content: {
    paddingHorizontal: wp(14),
    paddingBottom: wp(14),
    paddingTop: wp(2),
  },
  indicator: {
    width: wp(24),
    height: wp(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    width: wp(8),
    height: wp(8),
    borderRightWidth: wp(2),
    borderBottomWidth: wp(2),
    transform: [{ rotate: '-45deg' }],
  },
});
