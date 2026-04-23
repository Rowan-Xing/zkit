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
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { wp } from 'y2kit-tools';
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

// ============================================================================
// Icons (使用 Unicode 符号作为简单图标)
// ============================================================================

function SuccessIcon({ size, color }: { size: number; color: string }) {
  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      <Text allowFontScaling={false} style={[styles.iconText, { fontSize: size * 0.7, color }]}>
        ✓
      </Text>
    </View>
  );
}

function ErrorIcon({ size, color }: { size: number; color: string }) {
  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      <Text allowFontScaling={false} style={[styles.iconText, { fontSize: size * 0.7, color }]}>
        ✕
      </Text>
    </View>
  );
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

  /** @internal 设置挂载状态 */
  setMounted(mounted: boolean) {
    this.mounted = mounted;
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
    let text = DEFAULT_TEXT;
    let blocking = true;

    if (typeof textOrOptions === 'string') {
      text = textOrOptions;
    } else if (textOrOptions && typeof textOrOptions === 'object') {
      text = textOrOptions.text ?? DEFAULT_TEXT;
      blocking = textOrOptions.blocking ?? true;
    }

    this.clearHideTimer();

    if (!this.mounted || !this.setState) {
      console.warn('[LoadingService] Provider not mounted');
      return;
    }

    this.setState((prev) => ({
      ...prev,
      visible: true,
      text,
      blocking,
      status: 'loading',
    }));
  }

  /** 隐藏 Loading */
  hide() {
    this.clearHideTimer();

    if (!this.mounted || !this.setState) return;

    this.setState((prev) => ({
      ...prev,
      visible: false,
    }));
  }

  /** @internal 清理所有定时器 */
  clearAllTimers() {
    this.clearHideTimer();
  }

  /**
   * 显示成功态
   * @param textOrOptions - 文案字符串或选项对象
   */
  success(textOrOptions: string | LoadingResultOptions = DEFAULT_SUCCESS_TEXT) {
    let text = DEFAULT_SUCCESS_TEXT;
    let autoHide = true;
    let hideDelay = DEFAULT_SUCCESS_DELAY;
    let blocking = false;

    if (typeof textOrOptions === 'string') {
      text = textOrOptions;
    } else if (textOrOptions && typeof textOrOptions === 'object') {
      text = textOrOptions.text ?? DEFAULT_SUCCESS_TEXT;
      autoHide = textOrOptions.autoHide ?? true;
      hideDelay = textOrOptions.hideDelay ?? DEFAULT_SUCCESS_DELAY;
      blocking = textOrOptions.blocking ?? false;
    }

    this.clearHideTimer();

    if (!this.mounted || !this.setState) {
      console.warn('[LoadingService] Provider not mounted');
      return;
    }

    this.setState((prev) => ({
      ...prev,
      visible: true,
      text,
      blocking,
      status: 'success',
    }));

    if (autoHide) {
      this.hideTimer = setTimeout(() => {
        this.hide();
      }, hideDelay);
    }
  }

  /**
   * 显示失败态
   * @param textOrOptions - 文案字符串或选项对象
   */
  error(textOrOptions: string | LoadingResultOptions = DEFAULT_ERROR_TEXT) {
    let text = DEFAULT_ERROR_TEXT;
    let autoHide = true;
    let hideDelay = DEFAULT_ERROR_DELAY;
    let blocking = false;

    if (typeof textOrOptions === 'string') {
      text = textOrOptions;
    } else if (textOrOptions && typeof textOrOptions === 'object') {
      text = textOrOptions.text ?? DEFAULT_ERROR_TEXT;
      autoHide = textOrOptions.autoHide ?? true;
      hideDelay = textOrOptions.hideDelay ?? DEFAULT_ERROR_DELAY;
      blocking = textOrOptions.blocking ?? false;
    }

    this.clearHideTimer();

    if (!this.mounted || !this.setState) {
      console.warn('[LoadingService] Provider not mounted');
      return;
    }

    this.setState((prev) => ({
      ...prev,
      visible: true,
      text,
      blocking,
      status: 'error',
    }));

    if (autoHide) {
      this.hideTimer = setTimeout(() => {
        this.hide();
      }, hideDelay);
    }
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

    this.show({ text: loadingText, blocking: blockingDuringLoading });

    try {
      const result = await promise;

      let ok = true;
      if (typeof isSuccess === 'function') {
        try {
          ok = Boolean(isSuccess(result));
        } catch {
          ok = false;
        }
      }

      if (ok) {
        const finalSuccessText =
          typeof successTextResolver === 'function' ? successTextResolver(result) ?? successText : successText;
        this.success({ text: finalSuccessText, autoHide, hideDelay, blocking: blockingOnResult });
        return result;
      }

      const finalErrorText =
        typeof errorTextResolver === 'function' ? errorTextResolver(result) ?? errorText : errorText;
      this.error({ text: finalErrorText, autoHide, hideDelay, blocking: blockingOnResult });

      const bizError = new Error(typeof finalErrorText === 'string' ? finalErrorText : '业务失败') as Error & {
        response?: T;
      };
      bizError.response = result;
      throw bizError;
    } catch (e) {
      const finalErrorText =
        typeof errorTextResolver === 'function' ? errorTextResolver(undefined, e) ?? errorText : errorText;
      this.error({ text: finalErrorText, autoHide, hideDelay, blocking: blockingOnResult });
      throw e;
    }
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
      duration: visible ? 180 : 160,
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
            outputRange: [0.98, 1],
          }),
        },
      ],
    }),
    [progress]
  );

  const iconSize = wp(33);

  return (
    <Animated.View pointerEvents={overlayPointerEvents} style={overlayStyle} collapsable={false}>
      <View style={styles.shadowWrap} pointerEvents={overlayPointerEvents}>
        <View style={styles.contentWrap} pointerEvents={overlayPointerEvents} collapsable={false}>
          <Animated.View style={[styles.box, boxAnimStyle]} pointerEvents={overlayPointerEvents}>
            <View style={styles.iconWrap}>
              {/* Loading 状态 */}
              <View style={[styles.iconLayer, { opacity: status === 'loading' ? 1 : 0 }]}>
                <LoadingSpinner size={iconSize} color="#FFFFFF" speed={1.2} animating={visible && status === 'loading'} />
              </View>
              {/* 成功状态 */}
              <View style={[styles.iconLayer, { opacity: status === 'success' ? 1 : 0 }]}>
                <SuccessIcon size={wp(40)} color="#FFFFFF" />
              </View>
              {/* 失败状态 */}
              <View style={[styles.iconLayer, { opacity: status === 'error' ? 1 : 0 }]}>
                <ErrorIcon size={wp(40)} color="#FFFFFF" />
              </View>
            </View>
            {Boolean(text) && (
              <Text allowFontScaling={false} style={styles.text}>
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
    borderRadius: wp(12),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: wp(10),
        shadowOffset: { width: 0, height: wp(4) },
        backgroundColor: 'transparent',
      },
      android: {
        backgroundColor: 'transparent',
      },
    }),
  },
  contentWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    height: wp(120),
    width: wp(120),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: wp(12),
    backgroundColor: 'rgba(0,0,0,0.5)',
    overflow: 'hidden',
  },
  iconWrap: {
    width: wp(44),
    height: wp(44),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontWeight: 'bold',
  },
  text: {
    marginTop: wp(10),
    color: '#FFFFFF',
    fontSize: wp(14),
  },
});
