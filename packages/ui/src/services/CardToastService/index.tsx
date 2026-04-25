/**
 * @file CardToastService - 命令式卡片 Toast 服务
 * @description 提供 success、error、warning、info 等语义化方法
 * @example
 * ```tsx
 * import { toast } from 'y2kit-ui';
 *
 * toast.success('操作成功');
 * toast.error('操作失败');
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

/** Toast 语义色 */
export type ToastTone = 'success' | 'error' | 'warning' | 'info';

/** @deprecated 请使用 ToastTone */
export type ToastType = ToastTone;

/** Toast 配置选项 */
export type ToastOptions = {
  /** Toast 唯一标识，不传则自动生成 */
  id?: string;
  /** Toast 语义色，默认 info */
  tone?: ToastTone;
  /** 标题，适合强调结果 */
  title?: unknown;
  /** 提示内容，支持字符串、数字、Error 对象 */
  message?: unknown;
  /** 显示时长（毫秒）。传 0 时不自动关闭，默认 1000 */
  duration?: number;
};

/** 消息入参后追加的配置选项 */
export type ToastMessageOptions = Omit<ToastOptions, 'message'>;

/** 语义快捷方法的配置选项 */
export type ToastShortcutOptions = Omit<ToastOptions, 'tone' | 'message'>;

type LegacyToastOptions = ToastOptions & {
  type?: ToastTone;
};

type ResolvedToastOptions = {
  id?: string;
  tone: ToastTone;
  title: string;
  message: string;
  duration: number;
};

type ToastItem = ResolvedToastOptions & {
  id: string;
  open: boolean;
  updatedAt: number;
};

type ToastState = {
  toast: ToastItem | null;
};

const DEFAULT_DURATION = 1000;
const DEFAULT_TOP_OFFSET = wp(35);
const TOAST_HOST_Z_INDEX = 5000;
const TOAST_OPTION_KEYS = new Set(['id', 'tone', 'type', 'title', 'message', 'duration']);

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

const initialState: ToastState = {
  toast: null,
};

function normalizeMessage(message: unknown) {
  if (message == null) return '';
  if (typeof message === 'string') return message.trim();
  if (typeof message === 'number' || typeof message === 'boolean') return String(message);
  if (message instanceof Error) return message.message?.trim?.() || String(message);
  try {
    return JSON.stringify(message);
  } catch {
    return String(message);
  }
}

function normalizeDuration(value: number | undefined) {
  if (value == null) return DEFAULT_DURATION;
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_DURATION;
  return Math.max(0, Math.round(value));
}

function pickToneConfig(tone: ToastTone) {
  if (tone === 'success') {
    return { bgColor: '#EEF7F2', borderColor: '#CFE1D9', iconSource: TOAST_ICON_SUCCESS };
  }
  if (tone === 'error') {
    return { bgColor: '#FBEEF0', borderColor: '#E7D1D8', iconSource: TOAST_ICON_ERROR };
  }
  return { bgColor: '#FDF7ED', borderColor: '#F7E0B3', iconSource: TOAST_ICON_WARNING };
}

function isOptionsObject(value: unknown): value is LegacyToastOptions {
  if (!value || typeof value !== 'object' || value instanceof Error || React.isValidElement(value)) {
    return false;
  }

  return Object.keys(value).some((key) => TOAST_OPTION_KEYS.has(key));
}

function resolveMessageOptions(
  options: ToastMessageOptions | ToastShortcutOptions | number | undefined
): Partial<ToastOptions> {
  if (typeof options === 'number') {
    return { duration: options } satisfies ToastMessageOptions;
  }
  return options ?? {};
}

function resolveToastOptions(
  input: unknown,
  options: ToastMessageOptions | ToastShortcutOptions | number | undefined,
  forcedTone?: ToastTone
): ResolvedToastOptions {
  const optionInput = isOptionsObject(input) ? input : undefined;
  const messageOptions = resolveMessageOptions(options);
  const toneOverride = 'tone' in messageOptions ? messageOptions.tone : undefined;
  const tone = forcedTone ?? toneOverride ?? optionInput?.tone ?? optionInput?.type ?? 'info';
  const title = normalizeMessage(messageOptions.title ?? optionInput?.title);
  const message = normalizeMessage(optionInput ? optionInput.message : input);

  return {
    id: messageOptions.id ?? optionInput?.id,
    tone,
    title,
    message,
    duration: normalizeDuration(messageOptions.duration ?? optionInput?.duration),
  };
}

function getAccessibilityLabel(toast: ToastItem) {
  if (toast.title && toast.message) return `${toast.title}，${toast.message}`;
  return toast.title || toast.message;
}

function getDisplayMessage(toast: ToastItem) {
  if (toast.title && toast.message) return `${toast.title} ${toast.message}`;
  return toast.title || toast.message;
}

/**
 * Toast 服务类
 * @internal
 */
class ToastServiceClass {
  private mounted = false;
  private activeId: string | null = null;
  private idSeed = 0;
  private setState: React.Dispatch<React.SetStateAction<ToastState>> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  /** @internal 设置挂载状态 */
  setMounted(mounted: boolean) {
    this.mounted = mounted;
    if (!mounted) {
      this.activeId = null;
    }
  }

  /** @internal 设置状态更新函数 */
  setStateUpdater(setState: React.Dispatch<React.SetStateAction<ToastState>> | null) {
    this.setState = setState;
  }

  /** 显示 Toast */
  show(options?: ToastOptions): string;
  show(message: unknown, options?: ToastMessageOptions | number): string;
  show(input: unknown = {}, options?: ToastMessageOptions | number) {
    return this.showResolved(resolveToastOptions(input, options));
  }

  /** 显示成功提示 */
  success(message: unknown, options?: ToastShortcutOptions | number) {
    return this.showResolved(resolveToastOptions(message, options, 'success'));
  }

  /** 显示错误提示 */
  error(message: unknown, options?: ToastShortcutOptions | number) {
    return this.showResolved(resolveToastOptions(message, options, 'error'));
  }

  /** 显示警告提示 */
  warning(message: unknown, options?: ToastShortcutOptions | number) {
    return this.showResolved(resolveToastOptions(message, options, 'warning'));
  }

  /** 显示信息提示 */
  info(message: unknown, options?: ToastShortcutOptions | number) {
    return this.showResolved(resolveToastOptions(message, options, 'info'));
  }

  /** @deprecated 请使用 success */
  showSuccess(message: unknown, options?: ToastShortcutOptions | number) {
    return this.success(message, options);
  }

  /** @deprecated 请使用 error */
  showError(message: unknown, options?: ToastShortcutOptions | number) {
    return this.error(message, options);
  }

  /** @deprecated 请使用 warning */
  showWarning(message: unknown, options?: ToastShortcutOptions | number) {
    return this.warning(message, options);
  }

  /** @deprecated 请使用 info */
  showInfo(message: unknown, options?: ToastShortcutOptions | number) {
    return this.info(message, options);
  }

  /** 关闭当前或指定 Toast */
  dismiss(id?: string) {
    if (id && id !== this.activeId) return;
    this.clearTimer();

    if (!this.mounted || !this.setState) {
      this.activeId = null;
      return;
    }

    this.setState((prev) => {
      if (!prev.toast) return prev;
      if (id && prev.toast.id !== id) return prev;
      if (!prev.toast.open) return prev;
      return {
        toast: {
          ...prev.toast,
          open: false,
          updatedAt: Date.now(),
        },
      };
    });

    this.activeId = null;
  }

  /** 关闭所有 Toast */
  dismissAll() {
    this.dismiss();
  }

  /** 关闭当前 Toast */
  hide() {
    this.dismiss();
  }

  /** @internal 清理所有定时器 */
  clearAllTimers() {
    this.clearTimer();
  }

  private showResolved(options: ResolvedToastOptions) {
    if (!options.title && !options.message) return '';

    if (!this.mounted) {
      console.warn('[toast] Provider not mounted');
      return '';
    }

    if (!this.setState) return '';

    const id = options.id ?? `toast_${Date.now()}_${(this.idSeed += 1)}`;
    const toast: ToastItem = {
      ...options,
      id,
      open: true,
      updatedAt: Date.now(),
    };

    this.activeId = id;
    this.clearTimer();
    this.setState({ toast });
    this.scheduleDismiss(id, options.duration);

    return id;
  }

  private scheduleDismiss(id: string, duration: number) {
    if (duration <= 0) return;
    this.hideTimer = setTimeout(() => {
      this.dismiss(id);
    }, duration);
  }

  private clearTimer() {
    if (!this.hideTimer) return;
    clearTimeout(this.hideTimer);
    this.hideTimer = null;
  }
}

/** Toast 服务实例 */
export const toast = new ToastServiceClass();

/** @deprecated 请使用 toast */
export const cardToast = toast;

type ToastCardProps = {
  tone: ToastTone;
  message: string;
  visible: boolean;
  accessibilityLabel: string;
};

function ToastCardBody({
  tone,
  message,
  style,
  children,
}: Pick<ToastCardProps, 'tone' | 'message'> & { style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const theme = useTheme();
  const { bgColor, borderColor, iconSource } = pickToneConfig(tone);

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

function IOSToastCard({ tone, message, visible, accessibilityLabel }: ToastCardProps) {
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
      accessible
      accessibilityRole="alert"
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion="polite"
      shouldRasterizeIOS
      style={[styles.toast, styles.toastIOS, animatedStyle]}
    >
      <Animated.View style={contentAnimatedStyle}>
        <ToastCardBody tone={tone} message={message} style={styles.toastContentIOS}>
          <Animated.View pointerEvents="none" style={[styles.toastSheen, sheenAnimatedStyle]} />
        </ToastCardBody>
      </Animated.View>
    </Animated.View>
  );
}

function DefaultToastCard({ tone, message, visible, accessibilityLabel }: ToastCardProps) {
  const anim = React.useRef(new RNAnimated.Value(0)).current;
  const lastVisibleRef = React.useRef<boolean>(false);

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
      accessible
      accessibilityRole="alert"
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion="polite"
      style={[styles.toast, animatedStyle]}
    >
      <ToastCardBody tone={tone} message={message} />
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
  const [state, setState] = React.useState<ToastState>(initialState);

  React.useEffect(() => {
    toast.setMounted(true);
    toast.setStateUpdater(setState);
    return () => {
      toast.clearAllTimers();
      toast.setStateUpdater(null);
      toast.setMounted(false);
    };
  }, []);

  return (
    <>
      {children}
      <View pointerEvents="box-none" style={[styles.host, { top: offset }]}>
        {state.toast ? (
          <ToastCard
            key={state.toast.id}
            tone={state.toast.tone}
            message={getDisplayMessage(state.toast)}
            visible={state.toast.open}
            accessibilityLabel={getAccessibilityLabel(state.toast)}
          />
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: wp(0),
    right: wp(0),
    alignItems: 'center',
    zIndex: TOAST_HOST_Z_INDEX,
    elevation: TOAST_HOST_Z_INDEX,
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
    shadowOffset: { width: wp(0), height: wp(10) },
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
