/**
 * @file CardToastService - 命令式卡片 Toast 服务
 * @description 提供 showSuccess、showError、showWarning、showInfo 等方法
 * @example
 * ```tsx
 * import { cardToast } from 'y2kit-ui';
 *
 * cardToast.showSuccess('操作成功');
 * cardToast.showError('操作失败');
 * ```
 */

import * as React from 'react';
import { Image } from 'expo-image';
import { Animated as RNAnimated, Easing as RNEasing, Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { wp } from 'y2kit-tools';
import { useTheme } from '../../theme/useTheme';
import { Text } from '../../ui/Text';

/** Toast 类型 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/** Toast 配置选项 */
export type ToastOptions = {
  /** Toast 唯一标识，不传则自动生成 */
  id?: string;
  /** 提示类型 */
  type?: ToastType;
  /** 提示内容，支持字符串、数字、Error 对象 */
  message?: unknown;
  /** 显示时长（毫秒），默认 1000 */
  duration?: number;
};

/** 默认显示时长 */
const DEFAULT_DURATION = 1000;
/** 最大同时显示数量 */
const MAX_VISIBLE_TOASTS = 1;
/** 默认顶部偏移 */
const DEFAULT_TOP_OFFSET = wp(35);
/** Toast 宿主层级：高于 ActionDialog，低于 Loading / ImagePreview 等强覆盖层。 */
const TOAST_HOST_Z_INDEX = 5000;

const TOAST_ICON_SUCCESS = require('../../assets/icons/toast/success.webp');
const TOAST_ICON_ERROR = require('../../assets/icons/toast/error.webp');
const TOAST_ICON_WARNING = require('../../assets/icons/toast/warning.webp');

const IOS_TOAST_ENTER_OFFSET = wp(22);
const IOS_TOAST_EXIT_OFFSET = wp(14);
const IOS_TOAST_CONTENT_OFFSET = wp(6);
const IOS_TOAST_SHADOW_RADIUS = wp(18);
const IOS_TOAST_ENTER_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const IOS_TOAST_EXIT_EASING = Easing.bezier(0.4, 0, 1, 1);
const IOS_TOAST_ENTER_SPRING = {
  damping: 18,
  stiffness: 260,
  mass: 0.78,
};
const IOS_TOAST_SCALE_SPRING = {
  damping: 16,
  stiffness: 280,
  mass: 0.72,
};
const IOS_TOAST_SQUASH_SPRING = {
  damping: 15,
  stiffness: 240,
  mass: 0.68,
};

type ToastSlot = {
  id: string;
  type: ToastType;
  message: string;
  visible: boolean;
  updatedAt: number;
};

type ToastState = {
  slots: ToastSlot[];
};

/** 标准化消息内容 */
function normalizeMessage(message: unknown) {
  if (message == null) return '';
  if (typeof message === 'string') return message.trim();
  if (typeof message === 'number') return String(message);
  if (message instanceof Error) return message.message?.trim?.() || String(message);
  try {
    return JSON.stringify(message);
  } catch {
    return String(message);
  }
}

/** 根据类型获取样式配置 */
function pickTypeConfig(type: ToastType) {
  if (type === 'success') {
    return { bgColor: '#EEF7F2', borderColor: '#CFE1D9', iconSource: TOAST_ICON_SUCCESS };
  }
  if (type === 'error') {
    return { bgColor: '#FBEEF0', borderColor: '#E7D1D8', iconSource: TOAST_ICON_ERROR };
  }
  return { bgColor: '#FDF7ED', borderColor: '#F7E0B3', iconSource: TOAST_ICON_WARNING };
}

/**
 * Toast 服务类
 * @internal
 */
class ToastServiceClass {
  private mounted = false;
  private idSeed = 0;
  private setState: React.Dispatch<React.SetStateAction<ToastState>> | null = null;
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  /** @internal 设置挂载状态 */
  setMounted(mounted: boolean) {
    this.mounted = mounted;
  }

  /** @internal 设置状态更新函数 */
  setStateUpdater(setState: React.Dispatch<React.SetStateAction<ToastState>> | null) {
    this.setState = setState;
  }

  /** 显示 Toast */
  show(options: ToastOptions = {}) {
    const normalizedMessage = normalizeMessage(options.message);
    if (!normalizedMessage) return '';

    if (!this.mounted) {
      console.warn('[CardToast] Provider not mounted');
      return '';
    }

    const id = options.id ?? `toast_${Date.now()}_${(this.idSeed += 1)}`;
    const duration = options.duration ?? DEFAULT_DURATION;
    const type = options.type ?? 'info';
    const now = Date.now();

    if (!this.setState) return '';
    this.setState((prev) => {
      const slots = prev.slots;
      let targetIndex = slots.findIndex((s) => !s.visible);
      if (targetIndex < 0) {
        targetIndex = 0;
        for (let i = 1; i < slots.length; i += 1) {
          if (slots[i].updatedAt < slots[targetIndex].updatedAt) targetIndex = i;
        }
      }

      const prevId = slots[targetIndex]?.id;
      if (prevId) this.clearTimer(prevId);

      const nextSlots = slots.slice();
      nextSlots[targetIndex] = {
        id,
        type,
        message: normalizedMessage,
        visible: true,
        updatedAt: now,
      };

      return { slots: nextSlots };
    });

    this.clearTimer(id);
    this.timers.set(
      id,
      setTimeout(() => {
        this.dismiss(id);
      }, duration)
    );
    return id;
  }

  /** 显示成功提示 */
  showSuccess(message: unknown, duration?: number) {
    return this.show({ type: 'success', message, duration });
  }

  /** 显示错误提示 */
  showError(message: unknown, duration?: number) {
    return this.show({ type: 'error', message, duration });
  }

  /** 显示警告提示 */
  showWarning(message: unknown, duration?: number) {
    return this.show({ type: 'warning', message, duration });
  }

  /** 显示信息提示 */
  showInfo(message: unknown, duration?: number) {
    return this.show({ type: 'info', message, duration });
  }

  /** 关闭指定 Toast */
  dismiss(id: string) {
    if (!id) return;
    this.clearTimer(id);
    if (!this.mounted || !this.setState) return;
    this.setState((prev) => {
      const idx = prev.slots.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const slot = prev.slots[idx];
      if (!slot.visible) return prev;
      const nextSlots = prev.slots.slice();
      nextSlots[idx] = { ...slot, visible: false, updatedAt: Date.now() };
      return { slots: nextSlots };
    });
  }

  /** 关闭所有 Toast */
  dismissAll() {
    for (const key of this.timers.keys()) this.clearTimer(key);
    if (!this.mounted || !this.setState) return;
    this.setState((prev) => {
      const nextSlots = prev.slots.map((s) => (s.visible ? { ...s, visible: false, updatedAt: Date.now() } : s));
      return { slots: nextSlots };
    });
  }

  /** @internal 清理所有定时器 */
  clearAllTimers() {
    for (const key of this.timers.keys()) {
      this.clearTimer(key);
    }
  }

  private clearTimer(id: string) {
    const t = this.timers.get(id);
    if (t) clearTimeout(t);
    this.timers.delete(id);
  }
}

/** Toast 服务实例 */
export const cardToast = new ToastServiceClass();

type ToastCardProps = {
  type: ToastType;
  message: string;
  visible: boolean;
};

function ToastCardBody({
  type,
  message,
  style,
  children,
}: Pick<ToastCardProps, 'type' | 'message'> & { style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const theme = useTheme();
  const { bgColor, borderColor, iconSource } = pickTypeConfig(type);

  return (
    <View style={[styles.toastContent, style, { backgroundColor: bgColor, borderColor }]}>
      {children}
      <View style={styles.row}>
        <Image source={iconSource} style={styles.iconImage} contentFit="contain" />
        <View style={styles.content}>
          <Text style={[styles.message, { color: theme.colors.onSurface }]} numberOfLines={3}>
            {message}
          </Text>
        </View>
      </View>
    </View>
  );
}

function IOSToastCard({ type, message, visible }: ToastCardProps) {
  const opacity = useSharedValue(visible ? 1 : 0);
  const translateY = useSharedValue(visible ? 0 : -IOS_TOAST_EXIT_OFFSET);
  const scale = useSharedValue(visible ? 1 : 0.975);
  const squash = useSharedValue(0);
  const contentProgress = useSharedValue(visible ? 1 : 0);
  const sheenOpacity = useSharedValue(visible ? 0.08 : 0);

  React.useEffect(() => {
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
      cancelAnimation(scale);
      cancelAnimation(squash);
      cancelAnimation(contentProgress);
      cancelAnimation(sheenOpacity);
    };
  }, [contentProgress, opacity, scale, sheenOpacity, squash, translateY]);

  React.useEffect(() => {
    cancelAnimation(opacity);
    cancelAnimation(translateY);
    cancelAnimation(scale);
    cancelAnimation(squash);
    cancelAnimation(contentProgress);
    cancelAnimation(sheenOpacity);

    if (visible) {
      opacity.value = 0;
      translateY.value = -IOS_TOAST_ENTER_OFFSET;
      scale.value = 0.955;
      squash.value = 1;
      contentProgress.value = 0;
      sheenOpacity.value = 0.14;

      opacity.value = withTiming(1, { duration: 220, easing: IOS_TOAST_ENTER_EASING });
      translateY.value = withSpring(0, IOS_TOAST_ENTER_SPRING);
      scale.value = withSpring(1, IOS_TOAST_SCALE_SPRING);
      squash.value = withSpring(0, IOS_TOAST_SQUASH_SPRING);
      contentProgress.value = withTiming(1, { duration: 260, easing: IOS_TOAST_ENTER_EASING });
      sheenOpacity.value = withTiming(0.06, { duration: 340, easing: IOS_TOAST_ENTER_EASING });
      return;
    }

    opacity.value = withTiming(0, { duration: 160, easing: IOS_TOAST_EXIT_EASING });
    translateY.value = withTiming(-IOS_TOAST_EXIT_OFFSET, { duration: 180, easing: IOS_TOAST_EXIT_EASING });
    scale.value = withTiming(0.975, { duration: 180, easing: IOS_TOAST_EXIT_EASING });
    squash.value = withTiming(0.32, { duration: 120, easing: IOS_TOAST_EXIT_EASING });
    contentProgress.value = withTiming(0, { duration: 120, easing: IOS_TOAST_EXIT_EASING });
    sheenOpacity.value = withTiming(0, { duration: 110, easing: IOS_TOAST_EXIT_EASING });
  }, [contentProgress, opacity, scale, sheenOpacity, squash, translateY, visible]);

  const animatedStyle = useAnimatedStyle(() => {
    const scaleX = scale.value * interpolate(squash.value, [0, 1], [1, 1.028]);
    const scaleY = scale.value * interpolate(squash.value, [0, 1], [1, 0.942]);
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }, { scaleX }, { scaleY }],
      shadowOpacity: interpolate(opacity.value, [0, 1], [0, 0.16]),
      shadowRadius: interpolate(opacity.value, [0, 1], [0, IOS_TOAST_SHADOW_RADIUS]),
    };
  });

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(contentProgress.value, [0, 1], [0.7, 1]),
    transform: [
      { translateY: interpolate(contentProgress.value, [0, 1], [IOS_TOAST_CONTENT_OFFSET, 0]) },
      { scale: interpolate(contentProgress.value, [0, 1], [0.985, 1]) },
    ],
  }));

  const sheenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sheenOpacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      shouldRasterizeIOS
      style={[styles.toast, styles.toastIOS, animatedStyle]}
    >
      <Animated.View style={contentAnimatedStyle}>
        <ToastCardBody type={type} message={message} style={styles.toastContentIOS}>
          <Animated.View pointerEvents="none" style={[styles.toastSheen, sheenAnimatedStyle]} />
        </ToastCardBody>
      </Animated.View>
    </Animated.View>
  );
}

function DefaultToastCard({ type, message, visible }: ToastCardProps) {
  const anim = React.useRef(new RNAnimated.Value(0)).current;
  const lastVisibleRef = React.useRef<boolean>(false);

  // 组件卸载时停止动画，防止内存泄漏
  React.useEffect(() => {
    return () => {
      anim.stopAnimation();
    };
  }, [anim]);

  React.useEffect(() => {
    if (visible && !lastVisibleRef.current) {
      anim.stopAnimation();
      anim.setValue(0);
      RNAnimated.timing(anim, {
        toValue: 1,
        duration: 160,
        easing: RNEasing.out(RNEasing.cubic),
        useNativeDriver: true,
      }).start();
      lastVisibleRef.current = true;
      return;
    }

    if (!visible && lastVisibleRef.current) {
      anim.stopAnimation();
      RNAnimated.timing(anim, {
        toValue: 0,
        duration: 140,
        easing: RNEasing.out(RNEasing.cubic),
        useNativeDriver: true,
      }).start(() => {
        lastVisibleRef.current = false;
      });
    }
  }, [anim, visible]);

  const animatedStyle = React.useMemo(
    () => ({
      opacity: anim,
      transform: [
        {
          translateY: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [-wp(6), 0],
          }),
        },
      ],
    }),
    [anim]
  );

  return (
    <RNAnimated.View
      renderToHardwareTextureAndroid={Platform.OS === 'android'}
      shouldRasterizeIOS={Platform.OS === 'ios'}
      pointerEvents="none"
      style={[styles.toast, animatedStyle]}
    >
      <ToastCardBody type={type} message={message} />
    </RNAnimated.View>
  );
}

function ToastCard(props: ToastCardProps) {
  if (Platform.OS === 'ios') return <IOSToastCard {...props} />;
  return <DefaultToastCard {...props} />;
}

/**
 * Toast 服务 Provider
 * @description 需要在应用根组件中包裹，已内置于 ComponentLibProvider
 */
export function CardToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const offset = React.useMemo(() => (insets.top || 0) + DEFAULT_TOP_OFFSET, [insets.top]);
  const [state, setState] = React.useState<ToastState>(() => ({
    slots: Array.from({ length: MAX_VISIBLE_TOASTS }, (_, i) => ({
      id: `__empty_${i}`,
      type: 'info' as const,
      message: '',
      visible: false,
      updatedAt: 0,
    })),
  }));

  React.useEffect(() => {
    cardToast.setMounted(true);
    cardToast.setStateUpdater(setState);
    return () => {
      // 先清理所有定时器，防止卸载后触发 setState
      cardToast.clearAllTimers();
      cardToast.setStateUpdater(null);
      cardToast.setMounted(false);
    };
  }, []);

  return (
    <>
      {children}
      <View pointerEvents="box-none" style={[styles.host, { top: offset }]}>
        <View pointerEvents="box-none" style={styles.stack}>
          {state.slots.map((slot) => (
            <View key={slot.id} pointerEvents="box-none" style={styles.slot}>
              <ToastCard type={slot.type} message={slot.message} visible={slot.visible} />
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: TOAST_HOST_Z_INDEX,
    elevation: TOAST_HOST_Z_INDEX,
  },
  stack: {
    width: '100%',
    alignItems: 'center',
    rowGap: wp(10),
  },
  slot: {
    width: '100%',
    alignItems: 'center',
  },
  toast: {
    width: wp(320),
    maxWidth: '92%',
    alignSelf: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: wp(0), height: wp(2) },
    shadowOpacity: 0.1,
    shadowRadius: wp(8),
    elevation: wp(3),
  },
  toastIOS: {
    borderRadius: wp(10),
    shadowOffset: { width: 0, height: wp(10) },
    shadowOpacity: 0.16,
    shadowRadius: wp(20),
  },
  toastContent: {
    borderRadius: wp(10),
    padding: wp(12),
    borderWidth: wp(1),
  },
  toastContentIOS: {
    borderRadius: wp(10),
    overflow: 'hidden',
  },
  toastSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    borderRadius: wp(10),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: wp(10),
  },
  iconImage: {
    width: wp(24),
    height: wp(24),
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: wp(13),
    lineHeight: wp(18),
  },
});
