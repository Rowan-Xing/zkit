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
import { Feather } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';
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
  /** 显示时长（毫秒）。传 0 时不自动关闭，默认 1800 */
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

const DEFAULT_DURATION = 1800;
const DEFAULT_TOP_OFFSET = wp(30);
const TOAST_HOST_Z_INDEX = 5000;
const TOAST_OPTION_KEYS = new Set(['id', 'tone', 'type', 'title', 'message', 'duration']);

const TOAST_ENTER_OFFSET = wp(18);
const TOAST_EXIT_OFFSET = wp(10);
const TOAST_ENTER_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const TOAST_EXIT_EASING = Easing.bezier(0.4, 0, 1, 1);
const TOAST_ENTER_SPRING = {
  damping: 24,
  stiffness: 330,
  mass: 0.72,
};
const TOAST_SCALE_SPRING = {
  damping: 22,
  stiffness: 360,
  mass: 0.68,
};

type ToastToneConfig = {
  icon: React.ComponentProps<typeof Feather>['name'];
  iconColor: string;
  iconBackgroundColor: string;
  borderColor: string;
};

const TOAST_TONE_CONFIG: Record<ToastTone, ToastToneConfig> = {
  success: {
    icon: 'check-circle',
    iconColor: '#15803D',
    iconBackgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  error: {
    icon: 'x-circle',
    iconColor: '#DC2626',
    iconBackgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  warning: {
    icon: 'alert-triangle',
    iconColor: '#B45309',
    iconBackgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  info: {
    icon: 'info',
    iconColor: '#2563EB',
    iconBackgroundColor: '#DBEAFE',
    borderColor: '#BFDBFE',
  },
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
  toast: ToastItem;
};

const ToastCardBody = React.memo(function ToastCardBody({ toast }: ToastCardProps) {
  const theme = useTheme();
  const config = TOAST_TONE_CONFIG[toast.tone];
  const hasTitle = Boolean(toast.title);

  return (
    <View style={[styles.toastSurface, { borderColor: config.borderColor, backgroundColor: theme.colors.surface }]}>
      <View style={[styles.iconFrame, { backgroundColor: config.iconBackgroundColor }]}>
        <Feather name={config.icon} size={wp(18)} color={config.iconColor} />
      </View>
      <View style={styles.copy}>
        {hasTitle ? (
          <Text style={[styles.title, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {toast.title}
          </Text>
        ) : null}
        {toast.message ? (
          <Text
            style={[
              hasTitle ? styles.message : styles.messageStrong,
              { color: hasTitle ? theme.colors.muted : theme.colors.onSurface },
            ]}
            numberOfLines={hasTitle ? 2 : 3}
          >
            {toast.message}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

const ToastCard = React.memo(function ToastCard({ toast }: ToastCardProps) {
  const progress = useSharedValue(toast.open ? 1 : 0);
  const translateY = useSharedValue(toast.open ? 0 : -TOAST_EXIT_OFFSET);
  const scale = useSharedValue(toast.open ? 1 : 0.98);

  React.useEffect(() => {
    return () => {
      cancelAnimation(progress);
      cancelAnimation(translateY);
      cancelAnimation(scale);
    };
  }, [progress, scale, translateY]);

  React.useEffect(() => {
    cancelAnimation(progress);
    cancelAnimation(translateY);
    cancelAnimation(scale);

    if (toast.open) {
      progress.value = 0;
      translateY.value = -TOAST_ENTER_OFFSET;
      scale.value = 0.96;

      progress.value = withTiming(1, { duration: 180, easing: TOAST_ENTER_EASING });
      translateY.value = withSpring(0, TOAST_ENTER_SPRING);
      scale.value = withSpring(1, TOAST_SCALE_SPRING);
      return;
    }

    progress.value = withTiming(0, { duration: 150, easing: TOAST_EXIT_EASING });
    translateY.value = withTiming(-TOAST_EXIT_OFFSET, { duration: 160, easing: TOAST_EXIT_EASING });
    scale.value = withTiming(0.98, { duration: 160, easing: TOAST_EXIT_EASING });
  }, [progress, scale, toast.open, toast.updatedAt, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    shadowOpacity: interpolate(progress.value, [0, 1], [0, 0.14]),
    shadowRadius: interpolate(progress.value, [0, 1], [0, wp(18)]),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      accessible
      accessibilityRole="alert"
      accessibilityLabel={getAccessibilityLabel(toast)}
      accessibilityLiveRegion="polite"
      renderToHardwareTextureAndroid={Platform.OS === 'android'}
      shouldRasterizeIOS={Platform.OS === 'ios'}
      style={[styles.toast, animatedStyle]}
    >
      <ToastCardBody toast={toast} />
    </Animated.View>
  );
});

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
        {state.toast ? <ToastCard key={state.toast.id} toast={state.toast} /> : null}
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
    minWidth: wp(172),
    maxWidth: '90%',
    alignSelf: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: wp(0), height: wp(10) },
    shadowOpacity: 0.14,
    shadowRadius: wp(18),
    elevation: wp(8),
  },
  toastSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: wp(1),
    borderRadius: wp(16),
    paddingHorizontal: wp(14),
    paddingVertical: wp(12),
    columnGap: wp(10),
    overflow: 'hidden',
  },
  iconFrame: {
    width: wp(32),
    height: wp(32),
    borderRadius: wp(16),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    maxWidth: wp(236),
  },
  title: {
    fontSize: wp(14),
    lineHeight: wp(19),
    fontWeight: '600',
  },
  message: {
    marginTop: wp(2),
    fontSize: wp(13),
    lineHeight: wp(18),
  },
  messageStrong: {
    fontSize: wp(14),
    lineHeight: wp(19),
    fontWeight: '500',
  },
});
