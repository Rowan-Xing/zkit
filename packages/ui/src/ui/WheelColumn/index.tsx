import * as React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { getMaxFontScale, sp, wp } from 'y2kit-tools';
import {
  Y2KitWheelPicker,
  syncY2KitWheelPickerCurrentSelection,
  type Y2KitWheelPickerChangeEvent,
} from './Y2KitWheelPickerNativeComponent';

export const WHEEL_VISIBLE_ITEMS = 5;

// 点击“确认”时，如果 iOS 原生 wheel 还在减速，
// 这里给原生命令一个很短的回调窗口，把当前中心项同步回来。
// 原生补丁里的 `syncCurrentSelection` 本身就是“下一拍”语义，
// 所以超时时间不宜太长，否则按钮点下后会明显感觉到弹窗慢半拍才开始关闭。
// 两帧左右足够给 onChange 回流留出空间，回不来时就直接退回最近一次记录值。
const IOS_CONFIRM_SYNC_TIMEOUT_MS = 64;

// iOS 原生 `UIPickerView` 的尺寸相关参数需要拆开理解：
//
// 1. `IOS_NATIVE_PICKER_HEIGHT`
//    控制整列 picker 在页面里占据的总高度，也就是我们肉眼看到的
//    “整个滚轮窗口有多高”。
//
// 2. `IOS_NATIVE_PICKER_ROW_HEIGHT`
//    控制原生 picker 每一行真实的高度。
//    这个值会直接传给原生 `UIPickerView`，决定单个选项到底有多“厚”。
//
// 3. `IOS_NATIVE_PICKER_FONT_SIZE`
//    控制 iOS 原生行内文字字号。
//
// 4. `BASE_WHEEL_ITEM_HEIGHT`
//    这是 Android 自定义 wheel 的单项高度基准，只影响 Android 那条自绘路径。
//
// 特别注意：
// - `IOS_NATIVE_PICKER_HEIGHT` 是“整列高度”
// - `IOS_NATIVE_PICKER_ROW_HEIGHT` 是“原生单行高度”
//
// 这两个值不是同一个概念，不能简单认为其中一个变了，另一个就会自动跟着变。
// 之前 iOS 看起来“改了没什么变化”，核心原因就是只改了外层感知到的高度，
// 但原生内部真实 row height 并没有一起变。
const IOS_NATIVE_PICKER_HEIGHT = 260;
const IOS_NATIVE_PICKER_ROW_HEIGHT = 50;
const IOS_NATIVE_PICKER_FONT_SIZE = sp(22);
const BASE_WHEEL_ITEM_HEIGHT = wp(44);
const BASE_WHEEL_AREA_HEIGHT = BASE_WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ITEMS;

// `WHEEL_VIEWPORT_HEIGHT` 是当前平台滚轮可视窗口的高度：
// - iOS 直接使用原生 picker 的整体高度
// - Android 使用自绘 wheel 的 5 行总高度
export const WHEEL_VIEWPORT_HEIGHT = Platform.OS === 'ios' ? IOS_NATIVE_PICKER_HEIGHT : BASE_WHEEL_AREA_HEIGHT;

// `WHEEL_AREA_HEIGHT` 是给父层布局预留的安全高度。
// 目前 iOS/Android 都不会小于各自真实滚轮高度，避免外层把内容裁掉。
export const WHEEL_AREA_HEIGHT = Platform.OS === 'ios' ? Math.max(IOS_NATIVE_PICKER_HEIGHT, BASE_WHEEL_AREA_HEIGHT) : BASE_WHEEL_AREA_HEIGHT;

// `WHEEL_AREA_VERTICAL_INSET` 是父层额外需要补的上下留白。
// 当 `WHEEL_AREA_HEIGHT` 大于实际滚轮窗口时，用它把内容在视觉上垂直居中。
export const WHEEL_AREA_VERTICAL_INSET = Math.max(0, WHEEL_AREA_HEIGHT - WHEEL_VIEWPORT_HEIGHT) / 2;

// `WHEEL_ITEM_HEIGHT` 是跨平台统一布局时使用的“逻辑单项高度”：
// - Android：就是自绘 wheel 每项真实高度
// - iOS：主要服务于外层布局和 5 行窗口计算，不直接等于原生 row height
export const WHEEL_ITEM_HEIGHT = Platform.OS === 'ios' ? IOS_NATIVE_PICKER_HEIGHT / WHEEL_VISIBLE_ITEMS : BASE_WHEEL_ITEM_HEIGHT;

/**
 * 当前滚轮的核心设计目标：
 *
 * 1. iOS 优先使用系统原生 wheel。
 *    这里直接接 `UIPickerView`，但会在保留原生惯性 / 停靠 / 震感的前提下，
 *    额外把可视高度、字号和行高明确放大到更接近 Android 当前这版观感。
 *
 * 2. Android 继续保留当前这套高性能自绘 wheel。
 *    在当前 `TrueSheet / BottomSheetBehavior` 的组合下，Android 原生手势竞争更复杂；
 *    这套 responder + 单 transform 的方案已经验证过稳定、顺滑，并且首触拖动正常。
 *
 * 3. Android 上释放手指后的运动要“可预测”。
 *    用户最敏感的问题不是绝对物理真实性，而是：
 *    - 我快速上划时，列表应该明确继续往下走，而不是看起来又被拉回去
 *    - 我松手时看见中心停在 A，就应该稳定吸附到 A，而不是跳到上下邻项
 *
 * 最终结构因此分成两条路径：
 * - iOS：原生 `Picker`
 * - Android：自定义高性能 wheel
 */
const CENTER_OFFSET = WHEEL_ITEM_HEIGHT * Math.floor(WHEEL_VISIBLE_ITEMS / 2);
const IOS_SETTLE_DELAY_MS = 90;

// snap 时长不写死成一个常量，而是按“本次需要跨越多少项”动态调节：
// - 近距离吸附要利落，避免拖沓
// - 远距离 flick 后吸附要给足运动时间，避免突兀
const SNAP_DURATION_MIN = 140;
const SNAP_DURATION_MAX = 280;
const SNAP_DURATION_PER_ITEM = 24;

// 下面几组阈值控制“松手后该吸到哪一项”：
// - DEADZONE：速度太小就把它当作普通松手，直接就近吸附
// - LOCK_DISTANCE / LOCK_MAX_VELOCITY：
//   当用户已经把中心基本对准某一项，而且释放速度又不大时，
//   就不要再自作聪明地多滚一项，避免“明明停在 A 还跳走”
const RELEASE_VELOCITY_DEADZONE = 220;
const RELEASE_LOCK_DISTANCE_ITEMS = 0.1;
const RELEASE_LOCK_MAX_VELOCITY = 380;

// 快速 flick 最多允许跨越的项数上限。
// 这里刻意做了上限约束，避免极高速度时一口气飞太远，
// 导致用户很难建立“这次手势大概会滚到哪里”的心理预期。
const MAX_FLING_ITEMS = 7;

// Android 的 release velocity 不使用最后一个 move 事件的瞬时差值，
// 而是取最近一个短时间窗内的位移均值，抗抖动会更强。
const ANDROID_VELOCITY_WINDOW_MS = 90;

// 使用一条更偏“减速后柔和停住”的 easing，
// 让吸附既利落，又不会像线性停下那样生硬。
const SNAP_EASING = Easing.bezier(0.22, 1, 0.36, 1);

function clampNumber(n: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(max, n));
}

function indexToOffset(index: number) {
  'worklet';
  return index * WHEEL_ITEM_HEIGHT;
}

// 把“释放速度”映射成“还应该额外跨越多少项”。
//
// 这里没有直接模拟真实物理世界里的摩擦衰减，而是做了一层经验映射：
// - 速度越大，额外跨越项数越多
// - 但增长曲线是受控的，避免高速度下滚动距离失控
//
// 这样得到的结果虽然不是严格物理精确，
// 但会更符合选择器场景下用户对“可控 / 可预期”的要求。
function getReleaseDeltaItems(velocityY: number) {
  const speed = Math.abs(velocityY);
  if (speed < RELEASE_VELOCITY_DEADZONE) return 0;
  const projected = Math.pow(speed / 1400, 1.05) * 3.6;
  return clampNumber(projected, 0, MAX_FLING_ITEMS);
}

// 根据当前 offset 与释放速度，直接推导最终应该吸附到哪一个 index。
//
// 这是当前实现里最关键的一步：
// 以前如果先做 decay，再在动画结束后 round 到最近项，用户会看到：
// 1. 列表先惯性滑一段
// 2. 最后又被 snap 拉回一点
//
// 视觉上就很像“明明我想往下滚，结果又弹回去了”。
//
// 现在改成在 release 的瞬间就一次性算出目标项，后续只做一段定向动画：
// - flick 方向更清晰
// - 最终落点更稳定
// - 不会再有二段式运动带来的回弹错觉
function getTargetIndexFromRelease(offset: number, velocityY: number, maxIndex: number) {
  const currentIndexFloat = offset / WHEEL_ITEM_HEIGHT;
  const nearestIndex = Math.round(currentIndexFloat);
  const distanceToNearest = Math.abs(currentIndexFloat - nearestIndex);
  const speed = Math.abs(velocityY);

  if (speed < RELEASE_VELOCITY_DEADZONE) {
    return clampNumber(nearestIndex, 0, maxIndex);
  }

  if (distanceToNearest < RELEASE_LOCK_DISTANCE_ITEMS && speed < RELEASE_LOCK_MAX_VELOCITY) {
    return clampNumber(nearestIndex, 0, maxIndex);
  }

  const deltaItems = getReleaseDeltaItems(velocityY);
  if (deltaItems <= 0) {
    return clampNumber(nearestIndex, 0, maxIndex);
  }

  const direction = velocityY < 0 ? 1 : -1;
  let targetIndex = Math.round(currentIndexFloat + direction * deltaItems);

  if (targetIndex === nearestIndex) {
    targetIndex = nearestIndex + direction;
  }

  return clampNumber(targetIndex, 0, maxIndex);
}

// 根据实际位移距离决定本次吸附动画的时长。
// 目的不是追求绝对统一，而是让不同幅度的手势都保持自然的“速度感”。
function getSnapDuration(fromOffset: number, toOffset: number) {
  const distanceItems = Math.abs(toOffset - fromOffset) / WHEEL_ITEM_HEIGHT;
  return clampNumber(
    Math.round(SNAP_DURATION_MIN + distanceItems * SNAP_DURATION_PER_ITEM),
    SNAP_DURATION_MIN,
    SNAP_DURATION_MAX
  );
}

export type WheelOption = {
  key: string | number;
  label: string;
};

export type WheelColumnHandle = {
  scrollToIndex: (index: number, animated?: boolean) => void;
  settleToNearest: (animated?: boolean) => number;
  syncCurrentSelection: () => Promise<number>;
};

type WheelColumnProps = {
  data: WheelOption[];
  selectedIndex: number;
  onSelectedIndexChange: (nextIndex: number) => void;
  width: number;
  disabled?: boolean;
};

export const WheelColumn = React.memo(
  React.forwardRef<WheelColumnHandle, WheelColumnProps>(function WheelColumn(
    { data, selectedIndex, onSelectedIndexChange, width, disabled },
    ref
  ) {
    // 下面这组共享值主要服务于 Android 自绘 wheel，
    // 它们共同构成整列滚轮唯一的“真实滚动状态”。
    //
    // 注意这里刻意没有给每个 item 单独做 animated distance / opacity / scale 计算，
    // 而是让整列只维护一个 `offsetY`。
    // 这么做的原因很直接：多列同时滚时，单 shared value + 单 transform
    // 比“每项都做插值”更稳，也更不容易掉帧。
    const maxIndex = Math.max(0, data.length - 1);
    const maxOffset = indexToOffset(maxIndex);
    const clampedSelectedIndex = clampNumber(selectedIndex, 0, maxIndex);
    const offsetY = useSharedValue(indexToOffset(clampedSelectedIndex));
    const dragStartOffset = useSharedValue(indexToOffset(clampedSelectedIndex));
    const isUserInteracting = useSharedValue(false);
    const lastEmittedRef = React.useRef<number | null>(null);
    const iosPickerRef = React.useRef<unknown>(null);
    const iosSelectedIndexRef = React.useRef(clampedSelectedIndex);
    const iosSettleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const iosSyncTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const iosSyncResolverRef = React.useRef<((index: number) => void) | null>(null);
    const [iosSelectedIndex, setIosSelectedIndex] = React.useState(clampedSelectedIndex);

    // 对外只在“真正 settle 完成”后再发出选中项变化。
    //
    // Android 会在 release 动画结束后调用它；
    // iOS 原生 picker 则会在“最后一次 onValueChange 后的短暂静默窗口”结束时调用它。
    // 这样可以避免上层级联列在滚轮经过每一项时都立即重算。
    const emitSelectedIndex = React.useCallback(
      (nextIndex: number) => {
        if (lastEmittedRef.current === nextIndex) return;
        lastEmittedRef.current = nextIndex;
        onSelectedIndexChange(nextIndex);
      },
      [onSelectedIndexChange]
    );

    const clearIOSSettleTimer = React.useCallback(() => {
      if (iosSettleTimerRef.current != null) {
        clearTimeout(iosSettleTimerRef.current);
        iosSettleTimerRef.current = null;
      }
    }, []);

    const clearIOSSyncTimer = React.useCallback(() => {
      if (iosSyncTimerRef.current != null) {
        clearTimeout(iosSyncTimerRef.current);
        iosSyncTimerRef.current = null;
      }
    }, []);

    const resolveIOSSyncRequest = React.useCallback(
      (index: number) => {
        const resolver = iosSyncResolverRef.current;
        if (!resolver) return;
        iosSyncResolverRef.current = null;
        clearIOSSyncTimer();
        resolver(index);
      },
      [clearIOSSyncTimer]
    );

    const syncIOSSelectedIndex = React.useCallback(
      (index: number) => {
        const nextIndex = clampNumber(index, 0, maxIndex);
        iosSelectedIndexRef.current = nextIndex;
        setIosSelectedIndex((prev) => (prev === nextIndex ? prev : nextIndex));
        return nextIndex;
      },
      [maxIndex]
    );

    const scheduleIOSSettle = React.useCallback(
      (index: number) => {
        clearIOSSettleTimer();
        iosSettleTimerRef.current = setTimeout(() => {
          iosSettleTimerRef.current = null;
          emitSelectedIndex(index);
        }, IOS_SETTLE_DELAY_MS);
      },
      [clearIOSSettleTimer, emitSelectedIndex]
    );

    // 供外部命令式调用：
    // - 父组件同步受控值时会用到
    // - 级联列数据变化后需要强制校正当前列时也会用到
    //
    // iOS 这边等价于直接驱动原生 picker 的 `selectedValue`；
    // Android 则继续驱动我们自己的 offset 动画。
    const scrollToIndex = React.useCallback(
      (index: number, animated = false) => {
        const nextIndex = clampNumber(index, 0, maxIndex);
        if (Platform.OS === 'ios') {
          clearIOSSettleTimer();
          syncIOSSelectedIndex(nextIndex);
          return;
        }

        const nextOffset = indexToOffset(nextIndex);
        cancelAnimation(offsetY);
        isUserInteracting.value = false;
        if (animated) {
          offsetY.value = withTiming(nextOffset, {
            duration: getSnapDuration(offsetY.value, nextOffset),
            easing: SNAP_EASING,
          });
          return;
        }
        offsetY.value = nextOffset;
      },
      [clearIOSSettleTimer, isUserInteracting, maxIndex, offsetY, syncIOSSelectedIndex]
    );

    // 读取当前离哪个 index 最近，并可选立即校正过去。
    // 这个 API 给父层在“确认 / 关闭 / 数据联动”时做最后结算用。
    const settleToNearest = React.useCallback(
      (animated = false) => {
        if (Platform.OS === 'ios') {
          clearIOSSettleTimer();
          return iosSelectedIndexRef.current;
        }
        const nextIndex = clampNumber(Math.round(offsetY.value / WHEEL_ITEM_HEIGHT), 0, maxIndex);
        scrollToIndex(nextIndex, animated);
        return nextIndex;
      },
      [clearIOSSettleTimer, maxIndex, offsetY, scrollToIndex]
    );

    const syncCurrentSelection = React.useCallback(() => {
      if (Platform.OS !== 'ios') {
        return Promise.resolve(settleToNearest(false));
      }

      clearIOSSettleTimer();
      resolveIOSSyncRequest(iosSelectedIndexRef.current);

      return new Promise<number>((resolve) => {
        iosSyncResolverRef.current = resolve;

        if (iosPickerRef.current != null && syncY2KitWheelPickerCurrentSelection(iosPickerRef.current)) {
          iosSyncTimerRef.current = setTimeout(() => {
            resolveIOSSyncRequest(iosSelectedIndexRef.current);
          }, IOS_CONFIRM_SYNC_TIMEOUT_MS);
          return;
        }

        resolveIOSSyncRequest(iosSelectedIndexRef.current);
      });
    }, [clearIOSSettleTimer, resolveIOSSyncRequest, settleToNearest]);

    React.useImperativeHandle(
      ref,
      () => ({ scrollToIndex, settleToNearest, syncCurrentSelection }),
      [scrollToIndex, settleToNearest, syncCurrentSelection]
    );

    // 外部受控值变化时，直接把滚轮同步到对应位置。
    // 这里不做动画，目的是避免“上层改值 -> 当前列自己又滑一段”的割裂感。
    React.useEffect(() => {
      if (!data.length) {
        clearIOSSettleTimer();
        iosSelectedIndexRef.current = 0;
        setIosSelectedIndex(0);
        cancelAnimation(offsetY);
        offsetY.value = 0;
        return;
      }
      clearIOSSettleTimer();
      syncIOSSelectedIndex(clampedSelectedIndex);
      scrollToIndex(clampedSelectedIndex, false);
    }, [clampedSelectedIndex, clearIOSSettleTimer, data.length, offsetY, scrollToIndex, syncIOSSelectedIndex]);

    React.useEffect(
      () => () => {
        clearIOSSettleTimer();
        resolveIOSSyncRequest(iosSelectedIndexRef.current);
      },
      [clearIOSSettleTimer, resolveIOSSyncRequest]
    );

    // iOS 原生 picker 在滚轮经过每一项时都会触发 `onValueChange`。
    // 这里先把原生当前值同步到本地，再延迟一个极短的 settle 窗口后通知上层。
    // 这样既能保留原生滚轮手感，也不会让级联列在滚动过程中频繁重算。
    const handleIOSChange = React.useCallback(
      (event: { nativeEvent: Y2KitWheelPickerChangeEvent }) => {
        const nextIndex = syncIOSSelectedIndex(event.nativeEvent.newIndex);
        resolveIOSSyncRequest(nextIndex);
        scheduleIOSSettle(nextIndex);
      },
      [resolveIOSSyncRequest, scheduleIOSSettle, syncIOSSelectedIndex]
    );

    // Android 这里保留一套与 iOS 同语义的“开始 / 更新 / 结束”交互函数，
    // 但接入手段刻意换成 responder。
    //
    // 原因：
    // `TrueSheet` 在 Android 底层基于 `BottomSheetBehavior`，会参与 touch interception。
    // 之前如果直接让 wheel 区域继续走常规手势识别，容易出现：
    // - 第一下点上去拖不动
    // - 必须第二下才能真正命中滚轮
    //
    // 所以 Android 最终改为在 wheel 表面覆盖一个透明触摸层，
    // 直接抢 responder，自行维护位移和速度。
    const startInteraction = React.useCallback(() => {
      cancelAnimation(offsetY);
      isUserInteracting.value = true;
      dragStartOffset.value = offsetY.value;
    }, [dragStartOffset, isUserInteracting, offsetY]);

    const updateInteraction = React.useCallback(
      (translationY: number) => {
        offsetY.value = clampNumber(dragStartOffset.value - translationY, 0, maxOffset);
      },
      [dragStartOffset, maxOffset, offsetY]
    );

    // Android / responder 路径的结束逻辑与 iOS 完全对齐：
    // 一样是“直接计算目标 index，再单段吸附过去”。
    const finishInteraction = React.useCallback(
      (velocityY: number) => {
        const currentOffset = clampNumber(offsetY.value, 0, maxOffset);
        const nextIndex = getTargetIndexFromRelease(currentOffset, velocityY, maxIndex);
        const nextOffset = indexToOffset(nextIndex);
        offsetY.value = withTiming(
          nextOffset,
          {
            duration: getSnapDuration(currentOffset, nextOffset),
            easing: SNAP_EASING,
          },
          (finished) => {
            if (!finished) return;
            isUserInteracting.value = false;
            runOnJS(emitSelectedIndex)(nextIndex);
          }
        );
      },
      [emitSelectedIndex, isUserInteracting, maxIndex, maxOffset, offsetY]
    );

    // Android 用短时间窗采样来估算 release velocity。
    //
    // 为什么不直接用最后一个 move 事件？
    // 因为 RN responder 在 Android 上最后一两个 move 事件有时非常稀疏，
    // 甚至可能出现“最后一下采样方向和整体手势不一致”的情况，
    // 于是就会表现成：
    // - 明明快速上划，结果列表没继续往下走多少
    // - 或者目标项判断偶尔发飘
    //
    // 取最近 90ms 左右的位移均值会更稳定，也更接近用户真实手势意图。
    const androidTouchStateRef = React.useRef({
      startPageY: 0,
      samples: [] as Array<{ pageY: number; timestamp: number }>,
    });

    const beginAndroidTouch = React.useCallback(
      (pageY: number, timestamp?: number) => {
        const ts = typeof timestamp === 'number' ? timestamp : Date.now();
        androidTouchStateRef.current = {
          startPageY: pageY,
          samples: [{ pageY, timestamp: ts }],
        };
        startInteraction();
      },
      [startInteraction]
    );

    const recordAndroidTouchSample = React.useCallback((pageY: number, timestamp?: number) => {
      const ts = typeof timestamp === 'number' ? timestamp : Date.now();
      const { samples } = androidTouchStateRef.current;
      samples.push({ pageY, timestamp: ts });

      while (samples.length > 6) {
        samples.shift();
      }

      const minTs = ts - ANDROID_VELOCITY_WINDOW_MS;
      while (samples.length > 2 && samples[0]?.timestamp < minTs) {
        samples.shift();
      }
    }, []);

    const moveAndroidTouch = React.useCallback(
      (pageY: number, timestamp?: number) => {
        updateInteraction(pageY - androidTouchStateRef.current.startPageY);
        recordAndroidTouchSample(pageY, timestamp);
      },
      [recordAndroidTouchSample, updateInteraction]
    );

    const endAndroidTouch = React.useCallback(
      (pageY: number, timestamp?: number) => {
        recordAndroidTouchSample(pageY, timestamp);
        const { samples } = androidTouchStateRef.current;
        const firstSample = samples[0];
        const lastSample = samples[samples.length - 1];
        const deltaY = (lastSample?.pageY ?? pageY) - (firstSample?.pageY ?? pageY);
        const deltaT = Math.max(1, (lastSample?.timestamp ?? Date.now()) - (firstSample?.timestamp ?? Date.now()));
        const velocityY = (deltaY / deltaT) * 1000;
        finishInteraction(velocityY);
      },
      [finishInteraction, recordAndroidTouchSample]
    );

    // 真正参与动画的是整列内容本身，而不是每个 item 各自移动。
    // 这是整个性能优化里最关键的点之一。
    const contentStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: CENTER_OFFSET - offsetY.value }],
    }));

    // Android 文本层保持普通 React 渲染，只在“当前已选 index”变化时更新一次样式。
    // 也就是说，滚动过程不会持续触发每个 item 的动画插值。
    const items = React.useMemo(
      () =>
        data.map((item, index) => (
          <View key={`${String(item.key)}-${index}`} style={styles.itemContainer}>
            <Animated.Text
              maxFontSizeMultiplier={getMaxFontScale()}
              numberOfLines={1}
              style={[
                styles.itemText,
                index === clampedSelectedIndex ? styles.itemTextSelected : styles.itemTextUnselected,
              ]}
            >
              {item.label}
            </Animated.Text>
          </View>
        )),
      [clampedSelectedIndex, data]
    );

    // iOS 分支直接交给原生 `UIPickerView`。
    // 这里不再额外盖自绘文本和手势层，目的是尽量完整保留系统 wheel 的惯性与停靠反馈。
    if (Platform.OS === 'ios') {
      return (
        <View style={[styles.column, { width }]} pointerEvents={disabled || data.length <= 1 ? 'none' : 'auto'}>
          <Y2KitWheelPicker
            ref={iosPickerRef as React.Ref<any>}
            items={data.map((item, index) => ({
              label: item.label,
              value: item.key,
              testID: `wheel-item-${String(item.key)}-${index}`,
            }))}
            selectedIndex={iosSelectedIndex}
            onChange={handleIOSChange}
            numberOfLines={1}
            rowHeight={IOS_NATIVE_PICKER_ROW_HEIGHT}
            style={styles.iosPicker}
            fontSize={IOS_NATIVE_PICKER_FONT_SIZE}
            fontWeight="500"
            color="#1A1A1A"
          />
        </View>
      );
    }

    // Android 分支：
    // - 上层 `Animated.View` 负责整列位移
    // - 下层透明 touch surface 专门负责抢 responder
    //
    // 注意 `pointerEvents="box-only"` 不要随便改，
    // 它的目的就是让这一层只吃自己的触摸，不把事件继续交给内部文本节点。
    if (Platform.OS === 'android') {
      return (
        <View style={[styles.column, { width }]} collapsable={false}>
          <Animated.View
            style={[styles.content, contentStyle]}
            pointerEvents="none"
            renderToHardwareTextureAndroid
            shouldRasterizeIOS
          >
            {items}
          </Animated.View>
          <View
            style={styles.androidTouchSurface}
            collapsable={false}
            pointerEvents="box-only"
            onStartShouldSetResponder={() => !disabled && data.length > 1}
            onStartShouldSetResponderCapture={() => !disabled && data.length > 1}
            onMoveShouldSetResponder={() => !disabled && data.length > 1}
            onMoveShouldSetResponderCapture={() => !disabled && data.length > 1}
            onResponderTerminationRequest={() => false}
            onResponderGrant={(event) => {
              beginAndroidTouch(event.nativeEvent.pageY, event.nativeEvent.timestamp);
            }}
            onResponderMove={(event) => {
              moveAndroidTouch(event.nativeEvent.pageY, event.nativeEvent.timestamp);
            }}
            onResponderRelease={(event) => {
              endAndroidTouch(event.nativeEvent.pageY, event.nativeEvent.timestamp);
            }}
            onResponderTerminate={(event) => {
              endAndroidTouch(event.nativeEvent.pageY, event.nativeEvent.timestamp);
            }}
          />
        </View>
      );
    }
    return null;
  })
);

const styles = StyleSheet.create({
  column: {
    height: WHEEL_VIEWPORT_HEIGHT,
    overflow: 'hidden',
  },
  iosPicker: {
    width: '100%',
    height: IOS_NATIVE_PICKER_HEIGHT,
  },
  content: {
    width: '100%',
  },
  androidTouchSurface: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 5,
  },
  itemContainer: {
    height: WHEEL_ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(8),
  },
  itemText: {
    fontSize: sp(18),
    textAlign: 'center',
    fontWeight: '500',
  },
  itemTextSelected: {
    color: '#1A1A1A',
    opacity: 1,
  },
  itemTextUnselected: {
    color: '#666666',
    opacity: 0.9,
  },
});
