/**
 * @file LoadingService - 命令式全局 Loading 服务
 * @description 提供 show、hide、success、error、withPromise 等方法，支持阻塞/非阻塞模式
 * @example
 * ```tsx
 * import { loading } from 'y2kit-ui';
 *
 * // 基础用法
 * loading.show('正在加载');
 * loading.hide();
 *
 * // 成功/失败态
 * loading.success('操作成功');
 * loading.error('操作失败');
 *
 * // 绑定 Promise
 * await loading.withPromise(fetchData(), {
 *   loadingText: '加载中',
 *   successText: '加载成功',
 *   errorText: '加载失败',
 * });
 * ```
 */

import * as React from 'react';
import { Feather } from '@expo/vector-icons';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { wp } from 'y2kit-tools';
import { useTheme } from '../../theme/useTheme';
import { Text } from '../../ui/Text';
import { LoadingSpinner } from '../../ui/LoadingSpinner';

// ============================================================================
// Types
// ============================================================================

/** Loading 状态类型 */
export type LoadingStatus = 'loading' | 'success' | 'error';

/** show 方法的选项 */
export type LoadingShowOptions = {
  /** 提示文案 */
  text?: string;
  /** 是否阻塞用户交互，默认 true */
  blocking?: boolean;
};

/** success/error 方法的选项 */
export type LoadingResultOptions = {
  /** 提示文案 */
  text?: string;
  /** 是否自动关闭，默认 true */
  autoHide?: boolean;
  /** 自动关闭延迟（毫秒） */
  hideDelay?: number;
  /** 是否阻塞用户交互，默认 false */
  blocking?: boolean;
};

/** withPromise 方法的选项 */
export type LoadingWithPromiseOptions<T = unknown> = {
  /** 加载中文案 */
  loadingText?: string;
  /** 成功文案 */
  successText?: string;
  /** 失败文案 */
  errorText?: string;
  /** 是否自动关闭 */
  autoHide?: boolean;
  /** 自动关闭延迟 */
  hideDelay?: number;
  /** 加载时是否阻塞 */
  blockingDuringLoading?: boolean;
  /** 结果展示时是否阻塞 */
  blockingOnResult?: boolean;
  /** 自定义成功判断函数 */
  isSuccess?: (result: T) => boolean;
  /** 自定义成功文案解析函数 */
  successTextResolver?: (result: T) => string | undefined;
  /** 自定义错误文案解析函数 */
  errorTextResolver?: (result: T | undefined, error?: unknown) => string | undefined;
};

/** Loading 内部状态 */
type LoadingState = {
  visible: boolean;
  text: string;
  blocking: boolean;
  status: LoadingStatus;
};

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_TEXT = '正在加载';
const DEFAULT_SUCCESS_TEXT = '操作成功';
const DEFAULT_ERROR_TEXT = '操作失败';
const DEFAULT_SUCCESS_DELAY = 1200;
const DEFAULT_ERROR_DELAY = 1400;
const WATCHDOG_TIMEOUT = 15000;
const ENTER_DURATION_MS = 180;
const EXIT_DURATION_MS = 160;
const CARD_MIN_WIDTH = wp(120);
const CARD_MAX_WIDTH = wp(220);
const CARD_MIN_HEIGHT = wp(112);
const CARD_PADDING_HORIZONTAL = wp(18);
const CARD_PADDING_VERTICAL = wp(18);
const CARD_RADIUS = wp(18);
const ICON_FRAME_SIZE = wp(44);
const LOADING_ICON_SIZE = wp(33);
const RESULT_ICON_SIZE = wp(40);
const TEXT_MARGIN_TOP = wp(10);
const TEXT_MAX_WIDTH = wp(184);
const TEXT_FONT_SIZE = wp(14);
const TEXT_LINE_HEIGHT = wp(19);
const SHADOW_RADIUS = wp(18);
const SHADOW_OFFSET_Y = wp(8);
const ANDROID_ELEVATION = wp(8);

type ResolvedShowOptions = {
  text: string;
  blocking: boolean;
};

type ResolvedResultOptions = {
  text: string;
  autoHide: boolean;
  hideDelay: number;
  blocking: boolean;
};

function normalizeDelayMs(value: number | undefined, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, value);
}

function resolveShowOptions(textOrOptions: string | LoadingShowOptions): ResolvedShowOptions {
  if (typeof textOrOptions === 'string') {
    return { text: textOrOptions, blocking: true };
  }

  return {
    text: textOrOptions.text ?? DEFAULT_TEXT,
    blocking: textOrOptions.blocking ?? true,
  };
}

function resolveResultOptions(
  textOrOptions: string | LoadingResultOptions,
  defaultText: string,
  defaultDelay: number
): ResolvedResultOptions {
  if (typeof textOrOptions === 'string') {
    return {
      text: textOrOptions,
      autoHide: true,
      hideDelay: defaultDelay,
      blocking: false,
    };
  }

  return {
    text: textOrOptions.text ?? defaultText,
    autoHide: textOrOptions.autoHide ?? true,
    hideDelay: normalizeDelayMs(textOrOptions.hideDelay, defaultDelay),
    blocking: textOrOptions.blocking ?? false,
  };
}

function resolveSuccessText<T>(
  resolver: LoadingWithPromiseOptions<T>['successTextResolver'],
  result: T,
  fallback: string
) {
  if (typeof resolver !== 'function') return fallback;

  try {
    return resolver(result) ?? fallback;
  } catch {
    return fallback;
  }
}

function resolveErrorText<T>(
  resolver: LoadingWithPromiseOptions<T>['errorTextResolver'],
  result: T | undefined,
  error: unknown,
  fallback: string
) {
  if (typeof resolver !== 'function') return fallback;

  try {
    return resolver(result, error) ?? fallback;
  } catch {
    return fallback;
  }
}

function createBusinessError<T>(message: string, response: T) {
  const error = new Error(message || DEFAULT_ERROR_TEXT) as Error & { response?: T };
  error.response = response;
  return error;
}

function getAccessibilityLabel(status: LoadingStatus, text: string) {
  const statusText = status === 'loading' ? DEFAULT_TEXT : status === 'success' ? DEFAULT_SUCCESS_TEXT : DEFAULT_ERROR_TEXT;
  if (!text || text === statusText) return statusText;
  return `${statusText}，${text}`;
}

// ============================================================================
// LoadingService Class
// ============================================================================

/**
 * Loading 服务类
 * @internal
 */
class LoadingServiceClass {
  private mounted = false;
  private setState: React.Dispatch<React.SetStateAction<LoadingState>> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private requestId = 0;

  /** @internal 设置挂载状态 */
  setMounted(mounted: boolean) {
    this.mounted = mounted;
    if (!mounted) {
      this.requestId += 1;
    }
  }

  /** @internal 设置状态更新函数 */
  setStateUpdater(setState: React.Dispatch<React.SetStateAction<LoadingState>> | null) {
    this.setState = setState;
  }

  /**
   * 显示 Loading
   * @param textOrOptions - 文案字符串或选项对象
   */
  show(textOrOptions: string | LoadingShowOptions = DEFAULT_TEXT) {
    this.showInternal(resolveShowOptions(textOrOptions));
  }

  /** 隐藏 Loading */
  hide() {
    this.hideInternal();
  }

  /** @internal 清理所有定时器 */
  clearAllTimers() {
    this.clearHideTimer();
    this.requestId += 1;
  }

  /**
   * 显示成功态
   * @param textOrOptions - 文案字符串或选项对象
   */
  success(textOrOptions: string | LoadingResultOptions = DEFAULT_SUCCESS_TEXT) {
    this.showResult('success', resolveResultOptions(textOrOptions, DEFAULT_SUCCESS_TEXT, DEFAULT_SUCCESS_DELAY));
  }

  /**
   * 显示失败态
   * @param textOrOptions - 文案字符串或选项对象
   */
  error(textOrOptions: string | LoadingResultOptions = DEFAULT_ERROR_TEXT) {
    this.showResult('error', resolveResultOptions(textOrOptions, DEFAULT_ERROR_TEXT, DEFAULT_ERROR_DELAY));
  }

  /**
   * 绑定 Promise 生命周期
   * @param promise - 要绑定的 Promise
   * @param options - 配置选项
   * @returns Promise 的结果
   */
  async withPromise<T>(promise: Promise<T>, options: LoadingWithPromiseOptions<T> = {}): Promise<T> {
    const {
      loadingText = DEFAULT_TEXT,
      successText = DEFAULT_SUCCESS_TEXT,
      errorText = DEFAULT_ERROR_TEXT,
      autoHide = true,
      hideDelay = DEFAULT_SUCCESS_DELAY,
      blockingDuringLoading = true,
      blockingOnResult = false,
      isSuccess,
      successTextResolver,
      errorTextResolver,
    } = options;

    const requestId = this.showInternal({ text: loadingText, blocking: blockingDuringLoading });
    const resultHideDelay = normalizeDelayMs(hideDelay, DEFAULT_SUCCESS_DELAY);

    let result: T;
    try {
      result = await promise;
    } catch (error) {
      if (requestId !== null) {
        const finalErrorText = resolveErrorText(errorTextResolver, undefined, error, errorText);
        this.showResult(
          'error',
          { text: finalErrorText, autoHide, hideDelay: resultHideDelay, blocking: blockingOnResult },
          requestId
        );
      }
      throw error;
    }

    let ok = true;
    let successCheckError: unknown;

    if (typeof isSuccess === 'function') {
      try {
        ok = Boolean(isSuccess(result));
      } catch (error) {
        ok = false;
        successCheckError = error;
      }
    }

    if (ok) {
      if (requestId !== null) {
        const finalSuccessText = resolveSuccessText(successTextResolver, result, successText);
        this.showResult(
          'success',
          { text: finalSuccessText, autoHide, hideDelay: resultHideDelay, blocking: blockingOnResult },
          requestId
        );
      }
      return result;
    }

    const finalErrorText = resolveErrorText(errorTextResolver, result, successCheckError, errorText);
    if (requestId !== null) {
      this.showResult(
        'error',
        { text: finalErrorText, autoHide, hideDelay: resultHideDelay, blocking: blockingOnResult },
        requestId
      );
    }
    throw createBusinessError(finalErrorText, result);
  }

  private showInternal(options: ResolvedShowOptions) {
    const nextRequestId = this.nextRequestId();

    this.clearHideTimer();

    if (!this.mounted || !this.setState) {
      console.warn('[LoadingService] Provider not mounted');
      return null;
    }

    this.setState((prev) => ({
      ...prev,
      visible: true,
      text: options.text,
      blocking: options.blocking,
      status: 'loading',
    }));

    return nextRequestId;
  }

  private showResult(status: Exclude<LoadingStatus, 'loading'>, options: ResolvedResultOptions, requestId?: number) {
    if (requestId !== undefined && requestId !== this.requestId) {
      return false;
    }

    const resultRequestId = requestId ?? this.nextRequestId();

    this.clearHideTimer();

    if (!this.mounted || !this.setState) {
      console.warn('[LoadingService] Provider not mounted');
      return false;
    }

    this.setState((prev) => ({
      ...prev,
      visible: true,
      text: options.text,
      blocking: options.blocking,
      status,
    }));

    if (options.autoHide) {
      this.hideTimer = setTimeout(() => {
        this.hideInternal(resultRequestId);
      }, options.hideDelay);
    }

    return true;
  }

  private hideInternal(requestId?: number) {
    if (requestId !== undefined && requestId !== this.requestId) {
      return false;
    }

    if (requestId === undefined) {
      this.nextRequestId();
    }

    this.clearHideTimer();

    if (!this.mounted || !this.setState) return false;

    this.setState((prev) => {
      if (!prev.visible) return prev;
      return {
        ...prev,
        visible: false,
      };
    });

    return true;
  }

  private nextRequestId() {
    this.requestId += 1;
    return this.requestId;
  }

  private clearHideTimer() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}

/** Loading 服务实例 */
export const loading = new LoadingServiceClass();

// ============================================================================
// LoadingOverlay Component
// ============================================================================

function LoadingOverlay({ state }: { state: LoadingState }) {
  const { visible, text, blocking, status } = state;
  const theme = useTheme();

  const progress = React.useRef(new Animated.Value(visible ? 1 : 0)).current;
  const lastVisibleRef = React.useRef(Boolean(visible));

  // 组件卸载时停止动画，防止内存泄漏
  React.useEffect(() => {
    return () => {
      progress.stopAnimation();
    };
  }, [progress]);

  React.useEffect(() => {
    if (visible === lastVisibleRef.current) return;
    lastVisibleRef.current = Boolean(visible);

    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? ENTER_DURATION_MS : EXIT_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, visible]);

  const overlayPointerEvents = visible ? (blocking ? 'auto' : 'none') : 'none';

  const overlayStyle = React.useMemo(
    () => [
      styles.overlay,
      {
        opacity: progress,
      },
    ],
    [progress]
  );

  const boxAnimStyle = React.useMemo(
    () => ({
      transform: [
        {
          scale: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.96, 1],
          }),
        },
      ],
    }),
    [progress]
  );

  const foregroundColor = theme.colors.surface;
  const cardBackgroundColor = theme.colors.onSurface;
  const accessibilityLabel = React.useMemo(() => getAccessibilityLabel(status, text), [status, text]);

  return (
    <Animated.View
      pointerEvents={overlayPointerEvents}
      style={overlayStyle}
      collapsable={false}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'yes' : 'no-hide-descendants'}
    >
      <View style={styles.shadowWrap} pointerEvents={overlayPointerEvents}>
        <View style={styles.contentWrap} pointerEvents={overlayPointerEvents} collapsable={false}>
          <Animated.View
            accessible={visible}
            accessibilityLabel={accessibilityLabel}
            accessibilityLiveRegion="polite"
            style={[styles.box, boxAnimStyle, { backgroundColor: cardBackgroundColor }]}
            pointerEvents={overlayPointerEvents}
          >
            <View style={styles.iconWrap}>
              <View style={[styles.iconLayer, { opacity: status === 'loading' ? 1 : 0 }]}>
                <LoadingSpinner
                  size={LOADING_ICON_SIZE}
                  color={foregroundColor}
                  speed={1.2}
                  animating={visible && status === 'loading'}
                />
              </View>
              <View style={[styles.iconLayer, { opacity: status === 'success' ? 1 : 0 }]}>
                <Feather name="check" size={RESULT_ICON_SIZE} color={foregroundColor} />
              </View>
              <View style={[styles.iconLayer, { opacity: status === 'error' ? 1 : 0 }]}>
                <Feather name="x" size={RESULT_ICON_SIZE} color={foregroundColor} />
              </View>
            </View>
            {Boolean(text) && (
              <Text
                allowFontScaling={false}
                ellipsizeMode="tail"
                numberOfLines={2}
                style={[styles.text, { color: foregroundColor }]}
              >
                {text}
              </Text>
            )}
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

// ============================================================================
// LoadingProvider Component
// ============================================================================

/**
 * Loading 服务 Provider
 * @description 需要在应用根组件中包裹，已内置于 ComponentLibProvider
 */
export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<LoadingState>({
    visible: false,
    text: DEFAULT_TEXT,
    blocking: true,
    status: 'loading',
  });

  const watchdogRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // 挂载/卸载时注册服务
  React.useEffect(() => {
    loading.setMounted(true);
    loading.setStateUpdater(setState);
    return () => {
      // 先清理所有定时器，防止卸载后触发 setState
      loading.clearAllTimers();
      loading.setStateUpdater(null);
      loading.setMounted(false);
    };
  }, []);

  // Loading 状态看门狗：防止 loading 状态卡死
  React.useEffect(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }

    if (state.visible && state.status === 'loading') {
      watchdogRef.current = setTimeout(() => {
        try {
          loading.hide();
        } catch {
          // ignore
        }
      }, WATCHDOG_TIMEOUT);
    }

    return () => {
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
  }, [state.status, state.visible]);

  return (
    <>
      {children}
      <LoadingOverlay state={state} />
    </>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    zIndex: 9999,
  },
  shadowWrap: {
    alignSelf: 'center',
    maxWidth: CARD_MAX_WIDTH,
    borderRadius: CARD_RADIUS,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: SHADOW_RADIUS,
        shadowOffset: { width: wp(0), height: SHADOW_OFFSET_Y },
        backgroundColor: 'transparent',
      },
      android: {
        backgroundColor: 'transparent',
        elevation: ANDROID_ELEVATION,
      },
    }),
  },
  contentWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    minWidth: CARD_MIN_WIDTH,
    maxWidth: CARD_MAX_WIDTH,
    minHeight: CARD_MIN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: CARD_PADDING_HORIZONTAL,
    paddingVertical: CARD_PADDING_VERTICAL,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
  },
  iconWrap: {
    width: ICON_FRAME_SIZE,
    height: ICON_FRAME_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    maxWidth: TEXT_MAX_WIDTH,
    marginTop: TEXT_MARGIN_TOP,
    fontSize: TEXT_FONT_SIZE,
    lineHeight: TEXT_LINE_HEIGHT,
    fontWeight: '500',
    textAlign: 'center',
  },
});
