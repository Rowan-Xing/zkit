/**
 * @file OTAUpdateService - Expo OTA 热更新服务
 * @description 提供 OTA 热更新的完整 UI + 逻辑，包括下载进度、安装动画、悬浮球、错误重试等
 *
 * 特性：
 * - 完整的更新流程 UI（下载进度 → 安装动画 → 就绪/错误）
 * - 可拖拽悬浮球（可缩小、贴边）
 * - 国际化支持（zh-CN / zh-TW / en-US）
 * - 主题色集成（通过 useTheme 获取 primary color）
 * - 可配置的 extra params（用于更新检查时传递自定义参数）
 * - 开发模式模拟（用于调试 UI）
 *
 * @example
 * ```tsx
 * import { OTAUpdateProvider } from 'y2kit-ui';
 *
 * function App() {
 *   return (
 *     <ComponentLibProvider>
 *       <OTAUpdateProvider extraParams={{ phone: '13800138000' }}>
 *         <RootLayout />
 *       </OTAUpdateProvider>
 *     </ComponentLibProvider>
 *   );
 * }
 * ```
 */

import * as React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  AppState,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSpring,
  withRepeat,
  cancelAnimation,
  interpolate,
  interpolateColor,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Updates from 'expo-updates';
import * as Network from 'expo-network';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { wp } from 'y2kit-tools';
import { Button } from '../../ui/Button/index';
import { Text } from '../../ui/Text/index';
import { useTheme } from '../../theme/useTheme';
import { useI18n } from '../../i18n/useI18n';

// 可动画化的 SVG Circle（用于悬浮球环形进度）
const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);
// 可动画化的 TextInput（用 animatedProps.text 在 UI 线程更新文本，避免每帧 setState 造成的重渲染）
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  类型定义
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** OTA 更新阶段 */
type OTAPhase = 'idle' | 'downloading' | 'installing' | 'ready' | 'error';
type OTARecoveryPhase = 'downloading' | 'installing' | 'ready' | 'error';
type BadgePosition = { x: number; y: number };
type TimerRef = { current: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval> | null };
type OTAUpdateCheckResult = Awaited<ReturnType<typeof Updates.checkForUpdateAsync>>;

type OTARecoverySnapshot = {
  version: 1;
  ownerLaunchId: string;
  sessionId: string;
  phase: OTARecoveryPhase;
  updatedAt: number;
  errorMessage?: string;
  updateId?: string | null;
};
type OTARecoveryStorage = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
};

/** 开发模拟配置 */
export type OTADevSimulationConfig = {
  /** 是否启用模拟（仅 __DEV__ 下生效） */
  enabled?: boolean;
  /** 启动后延迟多久开始模拟（ms），默认 3000 */
  delayMs?: number;
  /** 下载阶段持续时间（ms），默认 5000 */
  downloadDurationMs?: number;
  /** 安装阶段持续时间（ms），默认 4000 */
  installDurationMs?: number;
  /** 模拟结束状态，默认 'ready' */
  endState?: 'ready' | 'error';
};

/** OTAUpdateManager 属性 */
export type OTAUpdateManagerProps = {
  /**
   * 检查更新前设置的 extra params。
   * 当值变化时，会自动触发一次新的检查。
   * 例如：{ phone: '13800138000' }
   */
  extraParams?: Record<string, string>;
  /**
   * 开发模拟配置（仅 __DEV__ 下生效）。
   * 设为 `{ enabled: true }` 即可使用默认模拟参数。
   */
  devSimulation?: OTADevSimulationConfig;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  常量
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 默认模拟参数
const DEV_SIM_DEFAULTS = {
  delayMs: 3000,
  downloadDurationMs: 5000,
  installDurationMs: 4000,
  endState: 'ready' as const,
};

// UI 尺寸
const BADGE_SIZE = wp(56);
const BADGE_EDGE = wp(8);
const OVERLAY_CARD_WIDTH = wp(280);
const OVERLAY_CARD_HEIGHT = wp(280);
const OVERLAY_CARD_RADIUS = wp(20);
const OVERLAY_CARD_COMPACT = OVERLAY_CARD_HEIGHT <= wp(320);
const OVERLAY_CARD_PADDING_V = OVERLAY_CARD_COMPACT ? wp(22) : wp(32);

// 超时 & 阈值
const WARNING_HIGHLIGHT_DURATION_MS = 2000;   // 首次展示时警告条醒目脉动持续时长
const CHECK_THROTTLE_MS = 8000;               // 检查更新的节流间隔
const CHECK_TIMEOUT_MS = 12000;               // 单次检查更新的超时
const EXTRA_PARAM_TIMEOUT_MS = 800;           // 设置 extraParam 的超时
const DOWNLOAD_WATCHDOG_INTERVAL_MS = 5000;   // 下载看门狗的轮询间隔
const DOWNLOAD_WATCHDOG_TIMEOUT_MS = 30000;   // 下载无进度超时阈值
const INSTALLING_TIMEOUT_MS = 300000;         // 安装阶段的最大等待时长
const MAX_CHECK_RETRIES = 3;                  // 检查失败最大重试次数
const CHECK_RETRY_DELAYS = [2000, 5000, 10000]; // 指数退避的重试延迟
const OTA_RECOVERY_STORAGE_KEY = 'y2kit-ui:ota:recovery';
const OTA_RECOVERY_LAUNCH_ID = `launch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const OTA_KEEP_AWAKE_TAG = 'y2kit-ui:ota-install';
let otaRecoveryStorage: OTARecoveryStorage | null | undefined;

// ── 动画参数（集中配置，便于统一调整"丝滑度"）──
/** 悬浮球按下反馈的 spring 参数：按下偏紧、回弹偏柔 */
const BADGE_PRESS_IN_SPRING  = { damping: 18, stiffness: 420, mass: 0.6 };
const BADGE_PRESS_OUT_SPRING = { damping: 14, stiffness: 280, mass: 0.7 };
/** 悬浮球显隐的 spring（出场略慢更有存在感、收起快准狠） */
const BADGE_FADE_IN_SPRING   = { damping: 28, stiffness: 200, mass: 0.8 };
const BADGE_FADE_OUT_SPRING  = { damping: 28, stiffness: 350, mass: 0.8 };
/** 悬浮球拖拽回弹/边界收敛动画时长 */
const BADGE_DRAG_SNAP_MS = 160;
/** 悬浮球阶段变化时背景色交叉过渡时长（蓝→绿、蓝→红） */
const BADGE_COLOR_FADE_MS = 320;
/** 弹窗展开的 spring：近临界阻尼，轻微回弹（不超过 1%） */
const OVERLAY_OPEN_SPRING   = { damping: 24, stiffness: 200, mass: 1 };
/** 弹窗收起的 spring：过阻尼，干脆零回弹 */
const OVERLAY_CLOSE_SPRING  = { damping: 28, stiffness: 300, mass: 0.85 };
/** 进度条/环形进度的 withTiming 时长和缓动（详见 DownloadProgressContent 里的长注释） */
const PROGRESS_TIMING_MS = 600;
const PROGRESS_EASING    = Easing.out(Easing.cubic);

// 悬浮球根据阶段使用的主色（shared 用于 interpolateColor）
const BADGE_COLOR_BUSY  = '#2196F3'; // downloading / installing
const BADGE_COLOR_READY = '#4CAF50'; // ready
const BADGE_COLOR_ERROR = '#F44336'; // error / idle 兜底

// ── expo-keep-awake 动态解析 ──
// 不把 expo-keep-awake 列为硬性 peer dep——它已随 `expo` 自动打包，但并非所有消费方都显式 pin 了版本。
// 首次进入 downloading/installing 时懒加载；任何失败都静默吞掉，缺少该模块不应阻塞更新主流程。
type KeepAwakeModule = {
  activateKeepAwakeAsync?: (tag?: string) => Promise<void> | void;
  deactivateKeepAwake?: (tag?: string) => void;
};
let keepAwakeModule: KeepAwakeModule | null | undefined;
function resolveKeepAwakeModule(): KeepAwakeModule | null {
  if (keepAwakeModule !== undefined) return keepAwakeModule;
  try {
    keepAwakeModule = require('expo-keep-awake') as KeepAwakeModule;
  } catch {
    keepAwakeModule = null;
  }
  return keepAwakeModule;
}
async function activateOtaKeepAwake() {
  try {
    const mod = resolveKeepAwakeModule();
    if (typeof mod?.activateKeepAwakeAsync === 'function') {
      await mod.activateKeepAwakeAsync(OTA_KEEP_AWAKE_TAG);
    }
  } catch {
    // 亮屏只是锦上添花，失败不影响更新
  }
}
function deactivateOtaKeepAwake() {
  try {
    const mod = resolveKeepAwakeModule();
    if (typeof mod?.deactivateKeepAwake === 'function') {
      mod.deactivateKeepAwake(OTA_KEEP_AWAKE_TAG);
    }
  } catch {
    // 忽略
  }
}

// ── OTA 性能日志 ──
// 故意使用 console.log，让日志走 React Native 的 ReactNativeJS tag，在 Android 上
// 可通过 `adb logcat -s OTAPerf ReactNativeJS:I` 获取 native + JS 完整时间线。
// 注意：严禁改用 UpdatesLogger——它会在进度更新时输出完整 manifest，慢机型会卡死。
const OTA_PERF_SESSION_START = Date.now();
function otaPerf(event: string, data?: Record<string, unknown>) {
  try {
    const elapsedMs = Date.now() - OTA_PERF_SESSION_START;
    const payload = data ? ` ${JSON.stringify(data)}` : '';
    // eslint-disable-next-line no-console
    console.log(`[OTAPerf] t=${elapsedMs} ${event}${payload}`);
  } catch {
    // 日志失败绝不能影响主流程
  }
}

// 共享 hitSlop 对象（避免每次渲染创建新引用）
const HIT_SLOP_8 = { top: 8, bottom: 8, left: 8, right: 8 };

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  工具函数
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Promise 超时包装：超过 ms 仍未 resolve 则 reject('timeout') */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer!));
}

/** 百分比钳制到 0-100 的整数 */
function clampPercent(value: unknown): number {
  return Math.max(0, Math.min(100, Math.floor(Number(value) || 0)));
}

/**
 * 根据阶段获取悬浮球主色。
 *
 * 注意：`downloading` 与 `installing` 使用同一色。`installing` 在 UI 合并后仅作为
 * "下载 100% 的兜底兼容 phase"存在（几乎瞬间闪过），共用色避免不必要的闪烁。
 */
function getBadgeColor(phase: OTAPhase): string {
  switch (phase) {
    case 'downloading':
    case 'installing':  return BADGE_COLOR_BUSY;
    case 'ready':       return BADGE_COLOR_READY;
    default:            return BADGE_COLOR_ERROR;
  }
}

/** 安全清除定时器 ref（useInterval=true 时走 clearInterval） */
function clearTimerRef(ref: TimerRef, useInterval = false) {
  if (ref.current != null) {
    (useInterval ? clearInterval : clearTimeout)(ref.current);
    ref.current = null;
  }
}

function createOTARecoverySessionId() {
  return `ota-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getOTARecoveryStorage(): OTARecoveryStorage | null {
  if (otaRecoveryStorage !== undefined) {
    return otaRecoveryStorage;
  }

  try {
    const mmkvModule = require('react-native-mmkv') as {
      MMKV?: new (options?: { id?: string }) => OTARecoveryStorage;
    };
    otaRecoveryStorage = typeof mmkvModule?.MMKV === 'function'
      ? new mmkvModule.MMKV({ id: 'y2kit-ui-ota-recovery' })
      : null;
  } catch {
    otaRecoveryStorage = null;
  }

  return otaRecoveryStorage;
}

function readOTARecoverySnapshot(): OTARecoverySnapshot | null {
  try {
    const storage = getOTARecoveryStorage();
    if (!storage) return null;
    const raw = storage.getString(OTA_RECOVERY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OTARecoverySnapshot> | null;
    if (
      !parsed ||
      parsed.version !== 1 ||
      typeof parsed.ownerLaunchId !== 'string' ||
      typeof parsed.sessionId !== 'string' ||
      typeof parsed.phase !== 'string' ||
      typeof parsed.updatedAt !== 'number'
    ) {
      return null;
    }
    return parsed as OTARecoverySnapshot;
  } catch {
    return null;
  }
}

function writeOTARecoverySnapshot(snapshot: OTARecoverySnapshot | null) {
  try {
    const storage = getOTARecoveryStorage();
    if (!storage) return;
    if (!snapshot) {
      storage.delete(OTA_RECOVERY_STORAGE_KEY);
      return;
    }
    storage.set(OTA_RECOVERY_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // 持久化失败静默处理——恢复机制应始终 best-effort
  }
}

/**
 * 判断 native 是否留有"脏"的恢复状态（上次冷启动前的半拉子下载/安装）。
 *
 * 规则：一旦 native 报告 `isUpdatePending=true`，意味着下载后的安装/最终化已完成、
 * 更新已经处于"可立即重启"阶段，此时不算脏状态；只有部分下载/安装的残留才需要清理。
 */
function hasStaleNativeRecoveryState(
  context: {
    isUpdatePending?: boolean;
    isDownloading?: boolean;
    downloadProgress?: number;
    downloadedManifest?: unknown;
  } | null | undefined,
) {
  if (context?.isUpdatePending) return false;
  const progress = Number(context?.downloadProgress || 0);
  return !!(context?.isDownloading || context?.downloadedManifest || progress > 0);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  样式
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const s = StyleSheet.create({
  // ── 通用 ──
  fullAbsolute: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  centerColumn: {
    alignItems: 'center',
    width: '100%',
  },
  spacer6:  { height: wp(6) },
  spacer8:  { height: wp(8) },
  spacer12: { height: wp(12) },
  spacer14: { height: wp(14) },
  fullWidth: {
    width: '100%',
  },

  // ── ForegroundWarningBanner ──
  warningBanner: {
    width: '98%',
    backgroundColor: '#FFCC80',
    borderRadius: wp(10),
    paddingVertical: wp(10),
    paddingHorizontal: wp(12),
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E65100',
  },
  warningIcon: {
    marginRight: wp(8),
    flexShrink: 0,
  },
  warningText: {
    fontSize: wp(12),
    color: '#E65100',
    fontFamily: 'SemiBold',
    flex: 1,
  },

  // ── DownloadProgressContent ──
  downloadIcon: {
    width: wp(48),
    height: wp(48),
    borderRadius: wp(24),
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: wp(12),
  },
  titleText: {
    fontSize: wp(16),
    fontFamily: 'SemiBold',
    color: '#191919',
  },
  subtitleText: {
    fontSize: wp(13),
    color: '#666',
    textAlign: 'center',
  },
  progressTrack: {
    height: wp(8),
    borderRadius: wp(4),
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: wp(4),
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  progressLabel: {
    fontSize: wp(12),
    color: '#999',
  },
  progressElapsed: {
    fontSize: wp(12),
    color: '#999',
    marginLeft: wp(8),
  },
  progressPercent: {
    fontSize: wp(12),
    color: '#666',
    fontFamily: 'SemiBold',
  },

  // ── 等宽数字文本（防止数字变化时抖动） ──
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },

  // ── FloatingUpdateBadge ──
  badgeOuter: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
  badgeAbsoluteLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
  },
  badgeCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeRingWrap: {
    position: 'absolute',
  },
  badgePercent: {
    fontSize: wp(13),
    fontFamily: 'Bold',
    color: '#FFF',
  },
  /** 悬浮球百分比（AnimatedTextInput 专用）：居中、固定尺寸避免 99→100 的抖动 */
  badgePercentInput: {
    minWidth: wp(42),
    textAlign: 'center',
    height: wp(18),
    lineHeight: wp(18),
  },
  /** 下载进度百分比（AnimatedTextInput 专用）：右对齐、固定最小宽度 */
  progressPercentInput: {
    minWidth: wp(36),
    textAlign: 'right',
    height: wp(18),
    lineHeight: wp(18),
  },

  // ── OTAUpdateOverlay ──
  overlayRoot: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  overlayCard: {
    width: OVERLAY_CARD_WIDTH,
    height: OVERLAY_CARD_HEIGHT,
    paddingVertical: OVERLAY_CARD_PADDING_V,
    paddingHorizontal: wp(24),
    alignItems: 'center',
  },
  overlayContent: {
    flex: 1,
    width: '100%',
  },
  overlayScroll: {
    flex: 1,
    width: '100%',
  },
  overlayScrollContent: {
    flexGrow: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: wp(6),
  },
  minimizeWrap: {
    position: 'absolute',
    top: wp(12),
    right: wp(12),
    zIndex: 2,
  },
  minimizeBtn: {
    width: wp(28),
    height: wp(28),
    borderRadius: wp(14),
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Ready ──
  readyIcon: {
    width: wp(48),
    height: wp(48),
    borderRadius: wp(24),
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: wp(12),
  },
  readyHint: {
    fontSize: wp(12),
    textAlign: 'center',
    opacity: 0.8,
  },

  // ── Error ──
  errorIcon: {
    width: wp(48),
    height: wp(48),
    borderRadius: wp(24),
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: wp(16),
  },

  // ── Buttons ──
  btnGroup: {
    marginTop: wp(24),
    width: '100%',
  },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  UI 组件
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// TextInput 自带 padding/行高会破坏百分比文本的布局，统一重置为零
const percentInputStyle = {
  padding: 0,
  margin: 0,
  includeFontPadding: false,
  textAlignVertical: 'center' as const,
} as const;

/**
 * 可在 UI 线程平滑更新的百分比数字（XX%）。
 *
 * 实现原理：利用 `TextInput` 的 `text` 属性配合 `animatedProps` 直接在 UI 线程写入值，
 * 避免每帧 setState 触发 React 重渲染，视觉上和进度条/环形进度完全同步。
 * 外观通过传入 style 控制；内部屏蔽 TextInput 自带的 padding 和下划线。
 */
const AnimatedPercent = React.memo(({
  animatedValue,
  style,
}: {
  animatedValue: SharedValue<number>;
  style?: any;
}) => {
  const animatedProps = useAnimatedProps(() => {
    const v = Math.round(animatedValue.value);
    const clamped = v < 0 ? 0 : v > 100 ? 100 : v;
    const text = `${clamped}%`;
    // iOS 通过 `text`、Android 通过 `defaultValue`，两边都覆盖确保生效
    return { text, defaultValue: text } as any;
  });

  return (
    <AnimatedTextInput
      editable={false}
      underlineColorAndroid="transparent"
      pointerEvents="none"
      animatedProps={animatedProps}
      style={[percentInputStyle, style]}
    />
  );
});

/**
 * 前台运行警告条
 * 下载 & 安装阶段共用，醒目提示用户不要切后台。
 * highlight=true 时做呼吸式脉动（首次展示 2s），之后稳定显示。
 */
const ForegroundWarningBanner = React.memo(({ highlight = false }: { highlight?: boolean }) => {
  const { t } = useI18n();
  const pulseOpacity = useSharedValue(1);

  React.useEffect(() => {
    if (highlight) {
      pulseOpacity.value = withRepeat(
        withTiming(0.5, { duration: 420, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      pulseOpacity.value = withTiming(1, { duration: 200 });
    }
    return () => cancelAnimation(pulseOpacity);
  }, [highlight, pulseOpacity]);

  // 脉动时同步做极细微的 scale（0~2%），让"呼吸感"更立体
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: highlight ? pulseOpacity.value : 1,
    transform: [{ scale: highlight ? 1 + (1 - pulseOpacity.value) * 0.02 : 1 }],
  }));

  return (
    <Animated.View style={[s.warningBanner, animatedStyle]}>
      <MaterialIcons name="warning-amber" size={wp(18)} color="#E65100" style={s.warningIcon} />
      <Text style={s.warningText}>{t('ota.warning')}</Text>
    </Animated.View>
  );
});

/**
 * 下载 / 安装进度内容
 *
 * 单一 UI 组件覆盖 `downloading` 与 `installing` 两个 phase：
 * - `downloading`：进度条按真实下载字节推进
 * - `installing`：进度强制 100%，表示字节已经全部落盘、正在做最后的 DB 提交等
 *
 * 之所以合并是因为 native 的 `DownloadComplete` 事件会把 `isDownloading=false`、
 * `downloadedUpdate`、`isUpdatePending=true` 一次性翻转，React batched state update
 * 会把 installing → ready 两次 setPhase 合并成一次渲染，独立 installing UI 根本
 * 没机会被用户看到（参考 commit log / 交接文档）。
 *
 * @param flowStartTime - OTA 流程开始时间戳 (ms)；> 0 时底部展示"已耗时 Xs"
 */
const DownloadProgressContent = React.memo(({
  percent,
  primaryColor,
  highlightWarning,
  flowStartTime,
}: {
  percent: number;
  primaryColor: string;
  highlightWarning: boolean;
  flowStartTime: number;
}) => {
  const { t } = useI18n();
  const target = clampPercent(percent);

  // ── 进度条平滑动画 ──
  // 为什么是 600ms + easeOutCubic（而非最初的 200ms 线性）：
  //
  // Native 端进度会"成簇"地抵达：JS bundle 流式下载很平滑，但紧接着
  // 几十个小资产会在 1 秒内集中完成，每个都往分子上 +1。即便在 native 侧
  // 做了阻尼修正，下载阶段最后 20-30% 的进度事件仍会密集到达。200ms 的
  // 短动画会让这一簇在视觉上"嗖"地划过进度条——这正是用户体感投诉的"一闪而过"。
  //
  // 拉长时长让每一簇都能"流动"起来、在进度条上可见地推进。cubic-out 缓动
  // 把位移前置，即便只是 1-2pp 的小增量也让人感觉"始终在动"（线性在小增量
  // 下显得静态），后段柔和的收尾又能吸收任何末尾突发而不产生硬切。
  //
  // 中途重新定目标（新的 native tick 在上一次动画未结束时抵达）由 reanimated
  // 的 withTiming 在 native 侧内建处理——它会从当前动画值平滑接续到新目标，
  // 让连续更新自然组合成连贯运动，而不是一连串卡顿。
  const animatedPercent = useSharedValue(target);
  React.useEffect(() => {
    animatedPercent.value = withTiming(target, {
      duration: PROGRESS_TIMING_MS,
      easing: PROGRESS_EASING,
    });
  }, [target, animatedPercent]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${animatedPercent.value}%`,
  }));

  const fillStyle = React.useMemo(
    () => [s.progressFill, { backgroundColor: primaryColor }],
    [primaryColor],
  );

  // ── 已耗时实时计时（秒级）──
  // 仅在 flowStartTime > 0 时挂 setInterval；组件重挂载时立即刷一次避免残留旧值。
  const [elapsed, setElapsed] = React.useState(() =>
    flowStartTime > 0 ? Math.floor((Date.now() - flowStartTime) / 1000) : 0,
  );
  React.useEffect(() => {
    if (flowStartTime <= 0) {
      setElapsed(0);
      return;
    }
    setElapsed(Math.floor((Date.now() - flowStartTime) / 1000));
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - flowStartTime) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [flowStartTime]);

  const elapsedText = React.useMemo(() => {
    if (flowStartTime <= 0) return '';
    const min = Math.floor(elapsed / 60);
    const sec = elapsed % 60;
    const timeText = min > 0
      ? t('ota.time.minutesSeconds', { min, sec: String(sec).padStart(2, '0') })
      : t('ota.time.seconds', { sec });
    return t('ota.downloading.elapsed', { time: timeText });
  }, [elapsed, flowStartTime, t]);

  return (
    <View style={s.centerColumn}>
      <View style={s.downloadIcon}>
        <MaterialIcons name="cloud-download" size={wp(28)} color={BADGE_COLOR_BUSY} />
      </View>

      <Text style={s.titleText}>{t('ota.downloading.title')}</Text>
      <View style={s.spacer6} />
      <Text style={s.subtitleText}>{t('ota.downloading.subtitle')}</Text>

      <View style={s.spacer14} />

      {/* 进度条（fullWidth 避免 centerColumn 的 alignItems:'center' 压缩轨道宽度） */}
      <View style={s.fullWidth}>
        <View style={s.progressTrack}>
          <Animated.View style={[fillStyle, progressStyle]} />
        </View>
        <View style={s.spacer8} />
        <View style={s.progressRow}>
          <View style={s.progressRowLeft}>
            <Text style={s.progressLabel}>{t('ota.downloading.progressLabel')}</Text>
            {elapsedText ? (
              <Text style={[s.progressElapsed, s.tabularNums]}>{elapsedText}</Text>
            ) : null}
          </View>
          {/* 百分比数字与进度条同步做动画，不会再出现数字跳变、进度条平滑推进的割裂感 */}
          <AnimatedPercent
            animatedValue={animatedPercent}
            style={[s.progressPercent, s.tabularNums, s.progressPercentInput]}
          />
        </View>
      </View>

      <View style={s.spacer14} />
      <ForegroundWarningBanner highlight={highlightWarning} />
    </View>
  );
});

/**
 * 圆形进度条组件（用于悬浮球下载阶段）。
 *
 * 动画参数与主进度条保持一致（600ms + easeOutCubic），保证缩小状态与展开状态
 * 的推进感觉是同一套"流动节奏"。详见 `DownloadProgressContent` 的长注释。
 *
 * 可选传入外部 `sharedValue`：若提供，则由外部驱动、内部不再维护自己的动画——
 * 这让调用方能把同一份进度值复用到其它 UI 元素（比如百分比数字），保证完美同步。
 */
const CircularProgress = React.memo(({
  size,
  strokeWidth,
  progress,
  trackColor,
  progressColor,
  sharedValue: externalShared,
}: {
  size: number;
  strokeWidth: number;
  progress: number;
  trackColor: string;
  progressColor: string;
  sharedValue?: SharedValue<number>;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // 内部 fallback sharedValue（仅当外部未提供时使用）
  const internalShared = useSharedValue(clampPercent(progress));
  const animatedProgress = externalShared ?? internalShared;

  // 只有当使用内部 shared 时才在这里驱动动画；使用外部时完全由外部控制
  React.useEffect(() => {
    if (externalShared) return;
    internalShared.value = withTiming(clampPercent(progress), {
      duration: PROGRESS_TIMING_MS,
      easing: PROGRESS_EASING,
    });
  }, [progress, externalShared, internalShared]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value / 100),
  }));

  const svgStyle = React.useMemo(
    () => ({ transform: [{ rotate: '-90deg' as const }] }),
    [],
  );

  const center = size / 2;

  return (
    <Svg width={size} height={size} style={svgStyle}>
      <SvgCircle
        cx={center}
        cy={center}
        r={radius}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      <AnimatedCircle
        cx={center}
        cy={center}
        r={radius}
        stroke={progressColor}
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeLinecap="round"
        animatedProps={animatedProps}
      />
    </Svg>
  );
});

/**
 * 旋转加载图标组件（用于重试准备阶段）。
 * 1200ms 线性连续旋转，worklet 驱动不占 JS 线程。
 */
const SpinningIcon = React.memo(({ name, size, color }: { name: any; size: number; color: string }) => {
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1200, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(rotation);
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <MaterialIcons name={name} size={size} color={color} />
    </Animated.View>
  );
});

/**
 * 悬浮更新标。
 *
 * 特性：
 * - 可拖拽：仅做安全区钳制，松手保持当前位置（允许自由停留，不自动贴边）
 * - 按下反馈：onBegin 立即 scale→0.92，onFinalize 回弹（比 Tap 手势的反馈早）
 * - 阶段切换：背景色 / 阴影色用 withTiming 做颜色插值，避免硬切闪烁
 * - 百分比数字动画：与 CircularProgress 共用 shared value，达到"环动数字也动"的同步
 * - 隐藏时 `pointerEvents='none'` + opacity=0，避免误触
 */
const FloatingUpdateBadge = React.memo(({
  phase,
  progress,
  onPress,
  position,
  onPositionChange,
  badgeVisible,
}: {
  phase: OTAPhase;
  progress: number;
  onPress: () => void;
  position: BadgePosition;
  onPositionChange: (position: BadgePosition) => void;
  badgeVisible: boolean;
}) => {
  const { width: SW, height: SH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const posX = useSharedValue(position.x);
  const posY = useSharedValue(position.y);
  // 拖拽起点（只在 worklet 线程使用，不占 JS 线程）
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // 用稳定包装器供 scheduleOnRN 调用，避免在 worklet 中直接读取 ref.current
  const onPressRef = React.useRef(onPress);
  onPressRef.current = onPress;
  const stableOnPress = React.useCallback(() => onPressRef.current(), []);

  const onPositionChangeRef = React.useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;
  const stableOnPositionChange = React.useCallback(
    (pos: BadgePosition) => onPositionChangeRef.current(pos),
    [],
  );

  // ── 悬浮球渐显/渐隐（与弹窗卡片做交叉过渡）──
  const badgeOpacity = useSharedValue(badgeVisible ? 1 : 0);
  React.useEffect(() => {
    badgeOpacity.value = withSpring(
      badgeVisible ? 1 : 0,
      badgeVisible ? BADGE_FADE_IN_SPRING : BADGE_FADE_OUT_SPRING,
    );
    return () => cancelAnimation(badgeOpacity);
  }, [badgeVisible, badgeOpacity]);

  // ── 按下反馈：立即可见的 scale 压感 ──
  // 用 onBegin/onFinalize 而不是 Tap 的 onStart/onEnd：Pan 识别前用户就能看到反馈，
  // 即使后续触发了拖拽也只在"按下那一刻"压下去，拖拽过程中保持压下态更有沉浸感。
  const pressScale = useSharedValue(1);

  // ── 阶段色平滑过渡 ──
  // 不用 interpolateColor 多路径插值（会经过不相关的中间色），而是对当前色字符串
  // 用 withTiming 直接做插值——Reanimated v3 对 color 字符串会自动 RGB 插值。
  const bgColorShared = useSharedValue(getBadgeColor(phase));
  React.useEffect(() => {
    bgColorShared.value = withTiming(getBadgeColor(phase), { duration: BADGE_COLOR_FADE_MS });
  }, [phase, bgColorShared]);

  const badgeAnimStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
    backgroundColor: bgColorShared.value,
    shadowColor: bgColorShared.value,
    transform: [{ scale: pressScale.value }],
  }));

  React.useEffect(() => {
    posX.value = position.x;
    posY.value = position.y;
  }, [position.x, position.y, posX, posY]);

  // ── 安全区边界 ──
  const minX = BADGE_EDGE;
  const maxX = SW - BADGE_SIZE - BADGE_EDGE;
  const minY = insets.top + BADGE_EDGE;
  const maxY = SH - BADGE_SIZE - insets.bottom - BADGE_EDGE;

  React.useEffect(() => {
    const clampedX = Math.max(minX, Math.min(maxX, position.x));
    const clampedY = Math.max(minY, Math.min(maxY, position.y));
    posX.value = withTiming(clampedX, { duration: 120 });
    posY.value = withTiming(clampedY, { duration: 120 });
    if (clampedX !== position.x || clampedY !== position.y) {
      stableOnPositionChange({ x: clampedX, y: clampedY });
    }
  }, [maxX, maxY, minX, minY, posX, posY, position.x, position.y, stableOnPositionChange]);

  // ── 手势：按下立刻压缩、松手回弹；Pan 拖动、Tap 展开 ──
  const panGesture = React.useMemo(() =>
    Gesture.Pan()
      .minDistance(4)
      .onBegin(() => {
        // 触摸开始即反馈（不管最终是 Pan 还是 Tap）
        pressScale.value = withSpring(0.92, BADGE_PRESS_IN_SPRING);
      })
      .onStart(() => {
        startX.value = posX.value;
        startY.value = posY.value;
      })
      .onUpdate((e) => {
        posX.value = Math.max(minX, Math.min(maxX, startX.value + e.translationX));
        posY.value = Math.max(minY, Math.min(maxY, startY.value + e.translationY));
      })
      .onEnd(() => {
        const targetY = Math.max(minY, Math.min(maxY, posY.value));
        const targetX = Math.max(minX, Math.min(maxX, posX.value));
        // 松手保持当前位置（仅做安全区钳制），允许自由停留
        scheduleOnRN(stableOnPositionChange, { x: targetX, y: targetY });
        posY.value = withTiming(targetY, { duration: BADGE_DRAG_SNAP_MS });
        posX.value = withTiming(targetX, { duration: BADGE_DRAG_SNAP_MS });
      })
      .onFinalize(() => {
        // 无论成功、取消、失败——都确保 scale 回弹，防止卡在压下态
        pressScale.value = withSpring(1, BADGE_PRESS_OUT_SPRING);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [minX, maxX, minY, maxY],
  );

  const tapGesture = React.useMemo(() =>
    Gesture.Tap()
      .maxDuration(250)
      .onEnd(() => {
        // Race 保证：Tap 能走到 onEnd 说明 Pan 未激活，直接调用点击回调
        scheduleOnRN(stableOnPress);
      }),
    [],
  );

  // Pan 优先于 Tap，拖动时不触发点击
  const composedGesture = React.useMemo(
    () => Gesture.Race(panGesture, tapGesture),
    [panGesture, tapGesture],
  );

  const posStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: posX.value }, { translateY: posY.value }],
  }));

  const progressValue = clampPercent(progress);
  // 悬浮球内的百分比：installing 阶段强制显示 100%
  const displayProgress = phase === 'installing' ? 100 : progressValue;

  // 悬浮球自己管理一个 shared value，同时驱动环形进度和百分比数字——两者严格同步
  const ringProgress = useSharedValue(displayProgress);
  React.useEffect(() => {
    ringProgress.value = withTiming(displayProgress, {
      duration: PROGRESS_TIMING_MS,
      easing: PROGRESS_EASING,
    });
  }, [displayProgress, ringProgress]);

  const showProgressRing = phase === 'downloading' || phase === 'installing';

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[s.badgeAbsoluteLayer, posStyle]}
        pointerEvents={badgeVisible ? 'auto' : 'none'}
      >
        <Animated.View style={[s.badgeOuter, badgeAnimStyle]}>
          {showProgressRing && (
            <View style={s.badgeCenter}>
              <View style={s.badgeRingWrap}>
                <CircularProgress
                  size={BADGE_SIZE - wp(6)}
                  strokeWidth={wp(4)}
                  progress={displayProgress}
                  sharedValue={ringProgress}
                  trackColor="rgba(255,255,255,0.25)"
                  progressColor="#FFFFFF"
                />
              </View>
              <AnimatedPercent
                animatedValue={ringProgress}
                style={[s.badgePercent, s.badgePercentInput]}
              />
            </View>
          )}

          {phase === 'ready' && <MaterialIcons name="check" size={wp(28)} color="#FFF" />}
          {phase === 'error' && <MaterialIcons name="priority-high" size={wp(28)} color="#FFF" />}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
});

/**
 * OTA 更新弹窗
 */
const OTAUpdateOverlay = React.memo(({
  phase,
  progress,
  expanded,
  badgePosition,
  installStartTime,
  isRetrying,
  onRetry,
  onDismiss,
  onReload,
  onMinimize,
  onCollapseComplete,
  isFirstShow,
  onFirstShowComplete,
}: {
  phase: OTAPhase;
  progress: number;
  expanded: boolean;
  badgePosition: BadgePosition;
  /** OTA 流程开始的时间戳 (ms)，用于显示"已耗时 Xs"。名称为历史遗留。 */
  installStartTime: number;
  isRetrying: boolean;
  onRetry: () => void;
  onDismiss: () => void;
  onReload: () => void;
  onMinimize: () => void;
  onCollapseComplete: () => void;
  isFirstShow: boolean;
  onFirstShowComplete: () => void;
}) => {
  const { t } = useI18n();
  const { colors } = useTheme();
  const primaryColor = colors.primary;
  const { width: SW, height: SH } = useWindowDimensions();

  const isDownloading = phase === 'downloading';
  const isInstalling = phase === 'installing';
  const isReady = phase === 'ready';
  const isError = phase === 'error';
  const isRetryPreparing = isRetrying && !isDownloading && !isInstalling && !isReady && !isError;

  const [highlightWarning, setHighlightWarning] = React.useState(isFirstShow);
  const [showMinimizeBtn, setShowMinimizeBtn] = React.useState(!isFirstShow);
  const transitionProgress = useSharedValue(expanded ? 1 : 0);

  React.useEffect(() => {
    if (!isFirstShow) return;
    const timer = setTimeout(() => {
      setHighlightWarning(false);
      setShowMinimizeBtn(true);
      onFirstShowComplete?.();
    }, WARNING_HIGHLIGHT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [isFirstShow, onFirstShowComplete]);

  const handleBackdropPress = React.useCallback(() => {
    if (showMinimizeBtn && onMinimize) onMinimize();
  }, [showMinimizeBtn, onMinimize]);

  React.useEffect(() => {
    if (expanded) {
      // 展开：近临界阻尼，极轻微回弹后稳定（不超过 1%）
      transitionProgress.value = withSpring(1, OVERLAY_OPEN_SPRING);
    } else {
      // 收起：过阻尼弹簧，干脆零回弹
      transitionProgress.value = withSpring(0, OVERLAY_CLOSE_SPRING, (finished) => {
        if (finished) scheduleOnRN(onCollapseComplete);
      });
    }
  }, [expanded, onCollapseComplete, transitionProgress]);

  // 遮罩：前半段快速升起，后半段趋于稳定（避免线性感）
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(transitionProgress.value, [0, 0.5, 1], [0, 0.32, 0.4]),
  }));

  const badgeColor = getBadgeColor(phase);

  // ── 卡片动画：scale + 超大 borderRadius + 颜色过渡 ──
  const cardAnimatedStyle = useAnimatedStyle(() => {
    const p = transitionProgress.value;
    const sourceX = isFirstShow ? (SW - BADGE_SIZE) / 2 : badgePosition.x;
    const sourceY = isFirstShow ? (SH - BADGE_SIZE) / 2 : badgePosition.y;
    const badgeCenterX = sourceX + BADGE_SIZE / 2;
    const badgeCenterY = sourceY + BADGE_SIZE / 2;
    const toCenterX = badgeCenterX - SW / 2;
    const toCenterY = badgeCenterY - SH / 2;
    const startScale = BADGE_SIZE / OVERLAY_CARD_WIDTH;

    return {
      opacity: interpolate(p, [0, 0.1, 0.35, 1], [0, 0.75, 1, 1]),
      // p=0: borderRadius = cardWidth/2（短边完全圆角，长边近似圆形）
      // p=1: 正常卡片圆角
      borderRadius: interpolate(p, [0, 1], [OVERLAY_CARD_WIDTH / 2, OVERLAY_CARD_RADIUS]),
      backgroundColor: interpolateColor(p, [0, 0.45, 1], [badgeColor, '#FFFFFF', '#FFFFFF']),
      overflow: 'hidden' as const,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: interpolate(p, [0, 1], [0.35, 0.1]),
      shadowRadius: 20,
      elevation: 10,
      transform: [
        { translateX: toCenterX * (1 - p) },
        { translateY: toCenterY * (1 - p) },
        // 非线性缩放：前半段快速放大，后半段精细调整（更有弹性感）
        { scale: interpolate(p, [0, 0.45, 1], [startScale, 0.72, 1]) },
      ],
    };
  });

  // ── 内容淡出：展开时稍早显现，缩回时快速消失 ──
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(transitionProgress.value, [0, 0.45, 0.72, 1], [0, 0, 0.4, 1]),
  }));

  return (
    <View style={s.overlayRoot} pointerEvents={expanded ? 'auto' : 'none'}>
      <Animated.View style={[s.fullAbsolute, { backgroundColor: '#000' }, backdropStyle]} />
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleBackdropPress}
        style={s.fullAbsolute}
      />

      <Animated.View style={[s.overlayCard, cardAnimatedStyle]}>
        {/* 缩小按钮 —— 直接挂在卡片上，position:absolute 参照卡片边缘 */}
        {onMinimize && showMinimizeBtn && (
          <View style={s.minimizeWrap}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onMinimize}
              style={s.minimizeBtn}
              hitSlop={HIT_SLOP_8}
            >
              <MaterialIcons name="remove" size={wp(18)} color="#999" />
            </TouchableOpacity>
          </View>
        )}

        <Animated.View style={[s.overlayContent, contentAnimatedStyle]}>
          <ScrollView
            style={s.overlayScroll}
            contentContainerStyle={s.overlayScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
              {/* 下载中 / 安装中（共用同一 UI：installing 强制 100%） */}
              {(isDownloading || isInstalling) && (
                <DownloadProgressContent
                  percent={isInstalling ? 100 : progress}
                  primaryColor={primaryColor}
                  highlightWarning={highlightWarning}
                  flowStartTime={installStartTime}
                />
              )}

              {/* 手动重试准备中 */}
              {isRetryPreparing && (
                <View style={s.centerColumn}>
                  <View style={s.downloadIcon}>
                    <SpinningIcon name="sync" size={wp(28)} color={primaryColor} />
                  </View>
                  <Text style={s.titleText}>{t('ota.retryPreparing.title')}</Text>
                  <View style={s.spacer8} />
                  <Text style={s.subtitleText}>{t('ota.retryPreparing.subtitle')}</Text>
                </View>
              )}

              {/* 更新就绪 */}
              {isReady && (
                <View style={s.centerColumn}>
                  <View style={s.readyIcon}>
                    <MaterialIcons name="check-circle" size={wp(28)} color="#4CAF50" />
                  </View>
                  <Text style={s.titleText}>{t('ota.ready.title')}</Text>
                  <View style={s.spacer8} />
                  <Text style={s.subtitleText}>{t('ota.ready.subtitle')}</Text>
                  <View style={s.spacer12} />
                  <Text style={[s.readyHint, { color: primaryColor }]}>
                    {t('ota.ready.hint')}
                  </Text>
                </View>
              )}

              {/* 错误状态 */}
              {isError && (
                <View style={s.centerColumn}>
                  <View style={s.errorIcon}>
                    <MaterialIcons name="error-outline" size={wp(28)} color="#F44336" />
                  </View>
                  <Text style={s.titleText}>{t('ota.error.title')}</Text>
                  <View style={s.spacer8} />
                  <Text style={s.subtitleText}>{t('ota.error.subtitle')}</Text>
                </View>
              )}

              {/* 错误按钮 */}
              {isError && (
                <View style={s.btnGroup}>
                  <Button
                    block
                    loading={isRetrying}
                    onPress={onRetry}
                    icon={<MaterialIcons name="refresh" size={wp(18)} color="#FFFFFF" />}
                  >
                    {t('ota.button.retry')}
                  </Button>
                  <View style={s.spacer12} />
                  <Button
                    block
                    skin="text"
                    fontColor="#999"
                    disabled={isRetrying}
                    onPress={onDismiss}
                  >
                    {t('ota.button.dismiss')}
                  </Button>
                </View>
              )}

              {/* 就绪按钮 */}
              {isReady && (
                <View style={s.btnGroup}>
                  <Button
                    height={wp(48)}
                    block
                    onPress={onReload}
                    icon={<MaterialIcons name="refresh" size={wp(20)} color="#FFFFFF" />}
                  >
                    {t('ota.button.reload')}
                  </Button>
                </View>
              )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </View>
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Hook：OTA 更新逻辑
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * OTA 更新全流程 Hook
 *
 * 阶段流转：
 *   idle → downloading → installing → ready
 *                ↓            ↓
 *              error ←────────┘
 *                ↓
 *         retry → downloading
 *         dismiss → idle (hasCancelled)
 */
function useOTAUpdates(config: {
  extraParams?: Record<string, string>;
  devSimulation?: OTADevSimulationConfig;
}) {
  const { extraParams, devSimulation } = config;

  const {
    isUpdateAvailable,
    isUpdatePending,
    isDownloading: nativeIsDownloading,
    downloadProgress,
    downloadError,
    downloadedUpdate,
  } = Updates.useUpdates();

  // ── 可见状态与阶段 ──
  const [visible, setVisible] = React.useState(false);
  const [phase, setPhase] = React.useState<OTAPhase>('idle');
  const [progress, setProgress] = React.useState(0);
  const [hasCancelled, setHasCancelled] = React.useState(false);
  const [minimized, setMinimized] = React.useState(false);
  /**
   * OTA 流程开始的时间戳 (ms)。用于 `DownloadProgressContent` 显示"已耗时 Xs"。
   * 在 `startFetchUpdate` / dev 模拟进入 downloading 时设置，保证缩小 / 展开
   * 悬浮球 / 安装看门狗触发后 UI 重挂不重置计时。
   * 名称为历史遗留（原本仅 installing 阶段用），因业务上 installing UI 已合并到
   * downloading，语义扩大至整个 OTA 可见流程的起点。
   */
  const [installStartTime, setInstallStartTime] = React.useState(0);
  const [recoveryReady, setRecoveryReady] = React.useState(__DEV__);
  const [isRetrying, setIsRetrying] = React.useState(false);

  // ── Refs（稳定回调中读取最新状态） ──
  const mountedRef = React.useRef(true);

  const phaseRef = React.useRef(phase);
  phaseRef.current = phase;

  const hasCancelledRef = React.useRef(hasCancelled);
  hasCancelledRef.current = hasCancelled;

  const recoveryReadyRef = React.useRef(recoveryReady);
  recoveryReadyRef.current = recoveryReady;

  const extraParamsRef = React.useRef(extraParams);
  extraParamsRef.current = extraParams;

  const downloadErrorRef = React.useRef(downloadError);
  downloadErrorRef.current = downloadError;

  const checkInFlightRef = React.useRef(false);
  const lastCheckAtRef = React.useRef(0);
  const checkRetryCountRef = React.useRef(0);
  const checkRetryTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerCheckRef = React.useRef<((reason: string, options?: { force?: boolean }) => Promise<OTAUpdateCheckResult | null>) | null>(null);

  const prepareSeqRef = React.useRef(0);
  const preparePromiseRef = React.useRef<Promise<void> | null>(null);
  const lastAppliedParamsKeyRef = React.useRef<string | undefined>(undefined);
  const pendingCheckRef = React.useRef<{ reason: string; options?: { force?: boolean } } | null>(null);

  const downloadWatchdogTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const lastDownloadActivityAtRef = React.useRef(0);
  const installingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handledErrorRef = React.useRef<Error | undefined>(undefined);
  const retrySuppressedDownloadErrorRef = React.useRef<Error | undefined>(undefined);
  const fetchPromiseRef = React.useRef<Promise<unknown> | null>(null);
  const recoveryInFlightRef = React.useRef(false);
  const recoverySessionIdRef = React.useRef<string | null>(null);
  const nativeIsDownloadingRef = React.useRef(nativeIsDownloading);
  const hasSeenNativeDownloadRef = React.useRef(false);
  const suppressNativeStateRef = React.useRef(false);

  // ── Timer 清理 ──

  const clearCheckRetryTimer = React.useCallback(() => {
    clearTimerRef(checkRetryTimerRef);
  }, []);

  const clearDownloadWatchdog = React.useCallback(() => {
    clearTimerRef(downloadWatchdogTimerRef, true);
  }, []);

  const clearInstallingTimeout = React.useCallback(() => {
    clearTimerRef(installingTimeoutRef);
  }, []);

  const clearAllTimers = React.useCallback(() => {
    clearCheckRetryTimer();
    clearDownloadWatchdog();
    clearInstallingTimeout();
  }, [clearCheckRetryTimer, clearDownloadWatchdog, clearInstallingTimeout]);

  // ── 生命周期 ──

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearAllTimers();
      // 确保组件重挂载时 wake lock 不泄漏
      deactivateOtaKeepAwake();
    };
  }, [clearAllTimers]);

  // ── 下载和安装期间常亮屏幕 ──
  // 仅在 native 工作进行中（downloading / installing）激活。`ready` 状态允许系统休眠——
  // 更新已就绪后让用户自己决定什么时候点重启即可。所有失败都在 helper 内部吞掉。
  React.useEffect(() => {
    if (__DEV__) return;
    const needsKeepAwake = phase === 'downloading' || phase === 'installing';
    if (needsKeepAwake) {
      void activateOtaKeepAwake();
    } else {
      deactivateOtaKeepAwake();
    }
  }, [phase]);

  // ── OTA 性能打点 ──
  // JS 侧关心的时间线事件的唯一来源。每个 native 信号独立一个 effect，保证每次转换只打点一次。
  // 有意与下面所有业务逻辑 effect 解耦，避免日志 hook 误改行为。
  const perfLastPhaseRef = React.useRef<OTAPhase | null>(null);
  const perfLastNativeDownloadingRef = React.useRef<boolean | null>(null);
  const perfLastUpdatePendingRef = React.useRef<boolean | null>(null);
  const perfLastBucketRef = React.useRef<number>(-1);
  React.useEffect(() => {
    if (perfLastPhaseRef.current !== phase) {
      otaPerf('js.phase.change', { from: perfLastPhaseRef.current, to: phase });
      perfLastPhaseRef.current = phase;
    }
  }, [phase]);
  React.useEffect(() => {
    if (perfLastNativeDownloadingRef.current !== nativeIsDownloading) {
      perfLastNativeDownloadingRef.current = nativeIsDownloading;
      otaPerf('js.native.isDownloading', { value: nativeIsDownloading });
    }
  }, [nativeIsDownloading]);
  React.useEffect(() => {
    if (perfLastUpdatePendingRef.current !== isUpdatePending) {
      perfLastUpdatePendingRef.current = isUpdatePending;
      otaPerf('js.native.isUpdatePending', { value: isUpdatePending });
    }
  }, [isUpdatePending]);
  React.useEffect(() => {
    const raw = downloadProgress || 0;
    const pct = Math.round(raw * 100);
    const bucket = pct >= 100 ? 10 : Math.floor(pct / 10);
    if (bucket > perfLastBucketRef.current) {
      perfLastBucketRef.current = bucket;
      otaPerf('js.native.progress', { pct });
    }
  }, [downloadProgress]);
  React.useEffect(() => {
    if (downloadedUpdate?.updateId) {
      otaPerf('js.native.downloadedUpdate', { id: String(downloadedUpdate.updateId).slice(0, 8) });
    }
  }, [downloadedUpdate?.updateId]);
  React.useEffect(() => {
    if (downloadError) {
      otaPerf('js.native.downloadError', { msg: String(downloadError.message || downloadError).slice(0, 120) });
    }
  }, [downloadError]);

  const persistRecoverySnapshot = React.useCallback(
    (
      recoveryPhase: OTARecoveryPhase,
      options?: { newSession?: boolean; errorMessage?: string; updateId?: string | null },
    ) => {
      if (__DEV__) return;
      const sessionId = options?.newSession || !recoverySessionIdRef.current
        ? createOTARecoverySessionId()
        : recoverySessionIdRef.current;
      recoverySessionIdRef.current = sessionId;
      writeOTARecoverySnapshot({
        version: 1,
        ownerLaunchId: OTA_RECOVERY_LAUNCH_ID,
        sessionId,
        phase: recoveryPhase,
        updatedAt: Date.now(),
        errorMessage: options?.errorMessage,
        updateId: options?.updateId ?? downloadedUpdate?.updateId ?? null,
      });
    },
    [downloadedUpdate?.updateId],
  );

  const clearRecoverySnapshot = React.useCallback(() => {
    recoverySessionIdRef.current = null;
    writeOTARecoverySnapshot(null);
  }, []);

  const setErrorPhase = React.useCallback(
    (reason?: string) => {
      persistRecoverySnapshot('error', { errorMessage: reason });
      retrySuppressedDownloadErrorRef.current = undefined;
      phaseRef.current = 'error';
      setPhase('error');
      setVisible(true);
      setIsRetrying(false);
      clearDownloadWatchdog();
      clearInstallingTimeout();
    },
    [clearDownloadWatchdog, clearInstallingTimeout, persistRecoverySnapshot],
  );

  const performRecoveryCleanup = React.useCallback(async () => {
    if (__DEV__) return;

    recoveryInFlightRef.current = true;
    suppressNativeStateRef.current = true;
    clearAllTimers();
    pendingCheckRef.current = null;
    checkInFlightRef.current = false;
    checkRetryCountRef.current = 0;
    lastCheckAtRef.current = 0;
    handledErrorRef.current = undefined;
    retrySuppressedDownloadErrorRef.current = downloadErrorRef.current;
    fetchPromiseRef.current = null;
    hasSeenNativeDownloadRef.current = false;
    lastDownloadActivityAtRef.current = 0;
    nativeIsDownloadingRef.current = false;
    phaseRef.current = 'idle';

    if (mountedRef.current) {
      setPhase('idle');
      setProgress(0);
      setInstallStartTime(0);
      setMinimized(false);
    }

    let shouldClearSnapshot = true;
    try {
      const clearAllNonCurrentUpdatesAsync = (
        Updates as typeof Updates & {
          clearAllNonCurrentUpdatesAsync?: () => Promise<void>;
        }
      ).clearAllNonCurrentUpdatesAsync;
      if (typeof clearAllNonCurrentUpdatesAsync !== 'function') {
        shouldClearSnapshot = false;
      } else {
        await clearAllNonCurrentUpdatesAsync();
      }
    } catch {
      shouldClearSnapshot = false;
      // 仅 best-effort 清理
    } finally {
      if (shouldClearSnapshot) {
        clearRecoverySnapshot();
      }
      recoveryInFlightRef.current = false;
    }
  }, [clearAllTimers, clearRecoverySnapshot]);
  // 注：上面 `recovery` 路径是"上次进程残留的半拉子下载"清理——best-effort，
  // 任何失败都不 rethrow，但失败时保留 snapshot 供下次冷启动再试。

  const startFetchUpdate = React.useCallback(() => {
    if (__DEV__) return;
    if (!mountedRef.current) return;
    if (!recoveryReadyRef.current) return;
    if (recoveryInFlightRef.current) return;
    if (hasCancelledRef.current) return;
    if (fetchPromiseRef.current) return;
    if (phaseRef.current !== 'idle' && phaseRef.current !== 'error') return;

    persistRecoverySnapshot('downloading', { newSession: true, updateId: null });
    suppressNativeStateRef.current = false;
    handledErrorRef.current = undefined;
    hasSeenNativeDownloadRef.current = false;
    lastDownloadActivityAtRef.current = Date.now();

    setVisible(true);
    phaseRef.current = 'downloading';
    setPhase('downloading');
    setProgress(0);
    // 流程开始即记时：downloading 才是真实耗时大头（installing 几乎秒过）。
    // 注意 state 名叫 installStartTime 是历史遗留，语义扩大到"整个 OTA 流程开始时间"。
    setInstallStartTime(Date.now());
    setMinimized(false);
    setIsRetrying(false);
    clearDownloadWatchdog();
    clearInstallingTimeout();

    const fetchPromise = Updates.fetchUpdateAsync()
      .catch((error: any) => {
        if (!mountedRef.current) return;
        if (recoveryInFlightRef.current) return;
        if (phaseRef.current !== 'downloading') return;
        const message = error instanceof Error ? error.message : 'fetch_update_failed';
        setErrorPhase(message);
      })
      .finally(() => {
        if (fetchPromiseRef.current === fetchPromise) {
          fetchPromiseRef.current = null;
        }
      });

    fetchPromiseRef.current = fetchPromise;
  }, [clearDownloadWatchdog, clearInstallingTimeout, persistRecoverySnapshot]);

  React.useEffect(() => {
    if (__DEV__) {
      setRecoveryReady(true);
      return;
    }

    let cancelled = false;

    const bootstrapRecovery = async () => {
      const snapshot = readOTARecoverySnapshot();
      const hasStaleNativeState = hasStaleNativeRecoveryState(Updates.latestContext);
      const shouldForceCleanup =
        (snapshot != null && snapshot.ownerLaunchId !== OTA_RECOVERY_LAUNCH_ID && snapshot.phase !== 'ready') ||
        (snapshot == null && hasStaleNativeState);

      if (snapshot?.ownerLaunchId === OTA_RECOVERY_LAUNCH_ID) {
        recoverySessionIdRef.current = snapshot.sessionId;
      } else if (shouldForceCleanup) {
        await performRecoveryCleanup();
      }

      if (!cancelled && mountedRef.current) {
        setRecoveryReady(true);
      }
    };

    void bootstrapRecovery();

    return () => {
      cancelled = true;
    };
  }, [performRecoveryCleanup]);

  // ── 开发模拟 ──

  React.useEffect(() => {
    if (!__DEV__ || !devSimulation?.enabled) return;

    const sim = { ...DEV_SIM_DEFAULTS, ...devSimulation };
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const runSimulation = async () => {
      await new Promise<void>((r) => { timer = setTimeout(r, sim.delayMs); });
      if (cancelled) return;

      console.log('[OTA 模拟] 开始模拟更新流程...');
      setVisible(true);
      setPhase('downloading');
      setProgress(0);
      setInstallStartTime(Date.now());
      setMinimized(false);

      const steps = 20;
      const stepDuration = sim.downloadDurationMs / steps;
      for (let i = 1; i <= steps; i++) {
        await new Promise<void>((r) => { timer = setTimeout(r, stepDuration); });
        if (cancelled) return;
        setProgress(Math.min(100, Math.round((i / steps) * 100)));
      }

      console.log('[OTA 模拟] 下载完成，进入安装阶段...');
      setPhase('installing');

      await new Promise<void>((r) => { timer = setTimeout(r, sim.installDurationMs); });
      if (cancelled) return;

      console.log(`[OTA 模拟] 模拟结束，最终状态：${sim.endState}`);
      setPhase(sim.endState);
    };

    runSimulation();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Check 重试调度 ──

  const scheduleCheckRetry = React.useCallback((reason: string) => {
    if (__DEV__) return;
    if (!mountedRef.current) return;
    if (!recoveryReadyRef.current) return;
    if (hasCancelledRef.current) return;
    if (phaseRef.current !== 'idle') return;
    if (checkRetryTimerRef.current) return;
    if (checkRetryCountRef.current >= MAX_CHECK_RETRIES) return;

    const delay = CHECK_RETRY_DELAYS[
      Math.min(checkRetryCountRef.current, CHECK_RETRY_DELAYS.length - 1)
    ];
    checkRetryCountRef.current += 1;

    checkRetryTimerRef.current = setTimeout(() => {
      checkRetryTimerRef.current = null;
      const fn = triggerCheckRef.current;
      if (typeof fn === 'function') void fn(reason, { force: true });
    }, delay);
  }, []);

  // ── 核心：检查更新 ──

  const maybeCheckForUpdate = React.useCallback(
    async (reason: string, options?: { force?: boolean }): Promise<OTAUpdateCheckResult | null> => {
      if (__DEV__) return null;
      if (!mountedRef.current) return null;
      if (!recoveryReadyRef.current) return null;
      if (recoveryInFlightRef.current) return null;
      if (hasCancelledRef.current) return null;
      if (phaseRef.current !== 'idle') return null;
      if (checkInFlightRef.current) return null;

      const now = Date.now();
      if (!options?.force && now - lastCheckAtRef.current < CHECK_THROTTLE_MS) return null;
      lastCheckAtRef.current = now;

      checkInFlightRef.current = true;
      clearCheckRetryTimer();

      let result: OTAUpdateCheckResult | null = null;

      try {
        const state = await Network.getNetworkStateAsync();
        const online = state?.isInternetReachable ?? state?.isConnected ?? true;
        if (!online) {
          scheduleCheckRetry(`${reason}:offline`);
          return null;
        }

        result = await withTimeout(Updates.checkForUpdateAsync(), CHECK_TIMEOUT_MS);
        suppressNativeStateRef.current = false;
        checkRetryCountRef.current = 0;
        return result;
      } catch {
        scheduleCheckRetry(`${reason}:error`);
      } finally {
        checkInFlightRef.current = false;

        const pending = pendingCheckRef.current;
        if (pending) {
          pendingCheckRef.current = null;
          const fn = triggerCheckRef.current;
          if (typeof fn === 'function') void fn(pending.reason, pending.options);
        }
      }

      return null;
    },
    [clearCheckRetryTimer, scheduleCheckRetry],
  );

  // ── 设置 extra params 后检查 ──

  const prepareThenCheck = React.useCallback(
    async (reason: string, options?: { force?: boolean }): Promise<OTAUpdateCheckResult | null> => {
      if (__DEV__) return null;
      if (!mountedRef.current) return null;
      if (!recoveryReadyRef.current) return null;
      if (recoveryInFlightRef.current) return null;
      if (hasCancelledRef.current) return null;
      if (phaseRef.current !== 'idle') return null;
      if (checkInFlightRef.current) {
        pendingCheckRef.current = { reason, options };
        return null;
      }

      // 计算当前 params 的 key（用于变化检测）
      const params = extraParamsRef.current;
      const paramsKey = params ? JSON.stringify(params) : '';

      if (paramsKey && paramsKey !== lastAppliedParamsKeyRef.current) {
        // 等待可能正在进行的 prepare
        const inFlight = preparePromiseRef.current;
        if (inFlight) {
          try { await inFlight; } catch { /* ignore */ }
        }

        // 重新检查（params 可能在 await 期间变化）
        const freshParams = extraParamsRef.current;
        const freshKey = freshParams ? JSON.stringify(freshParams) : '';

        if (freshKey && freshKey !== lastAppliedParamsKeyRef.current) {
          const seq = (prepareSeqRef.current += 1);

          const preparePromise = (async () => {
            try {
              if (freshParams) {
                const setParamFn = (Updates as any).setExtraParamAsync;
                const setParamsFn = (Updates as any).setExtraParamsAsync;

                if (typeof setParamFn === 'function') {
                  for (const [key, value] of Object.entries(freshParams)) {
                    if (value) {
                      await withTimeout(setParamFn(key, value), EXTRA_PARAM_TIMEOUT_MS);
                    }
                  }
                } else if (typeof setParamsFn === 'function') {
                  await withTimeout(setParamsFn(freshParams), EXTRA_PARAM_TIMEOUT_MS);
                }
              }
              lastAppliedParamsKeyRef.current = freshKey;
            } catch { /* ignore */ }
          })();

          preparePromiseRef.current = preparePromise;
          try { await preparePromise; } finally {
            if (preparePromiseRef.current === preparePromise) {
              preparePromiseRef.current = null;
            }
          }

          if (seq !== prepareSeqRef.current) return null;
        }
      }

      return maybeCheckForUpdate(reason, options);
    },
    [maybeCheckForUpdate],
  );

  // ── Ref 同步 ──

  React.useEffect(() => {
    triggerCheckRef.current = prepareThenCheck;
    return () => { triggerCheckRef.current = null; };
  }, [prepareThenCheck]);

  // ── extraParams 变化时触发检查 ──

  const extraParamsStr = JSON.stringify(extraParams ?? {});

  React.useEffect(() => {
    if (__DEV__) return;
    if (!recoveryReady) return;
    if (!extraParams || Object.keys(extraParams).length === 0) return;
    // 至少有一个非空值时才触发
    const hasValue = Object.values(extraParams).some((v) => v && v.trim());
    if (!hasValue) return;
    const fn = triggerCheckRef.current;
    if (typeof fn === 'function') void fn('params_change', { force: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraParamsStr, recoveryReady]);

  // ── 初始化 + AppState 监听 ──

  React.useEffect(() => {
    if (!recoveryReady) return;

    const initFn = triggerCheckRef.current;
    if (typeof initFn === 'function') void initFn('init');

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const fn = triggerCheckRef.current;
        if (typeof fn === 'function') void fn('app_active');
      }
    });

    return () => {
      if (subscription?.remove) subscription.remove();
    };
  }, [recoveryReady]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  阶段流转 Effects
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // ① 发现可用更新 → 开始下载
  React.useEffect(() => {
    if (__DEV__) return;
    if (!recoveryReady) return;
    if (suppressNativeStateRef.current) return;
    if (hasCancelled) return;
    if (isUpdateAvailable && phase === 'idle') {
      startFetchUpdate();
    }
  }, [isUpdateAvailable, phase, hasCancelled, recoveryReady, startFetchUpdate]);

  // ② 下载进度跟踪 → 下载结束后切入 installing（native 后处理阶段）
  React.useEffect(() => {
    const wasNativeDownloading = nativeIsDownloadingRef.current;
    nativeIsDownloadingRef.current = nativeIsDownloading;

    if (__DEV__) return;
    if (!recoveryReady) return;
    if (suppressNativeStateRef.current) return;
    if (hasCancelled) return;
    if (phase !== 'downloading') return;

    if (!visible) setVisible(true);

    const rawProgress = downloadProgress || 0;
    const nextProgress = Math.round(rawProgress * 100);
    if (nextProgress > 0) {
      retrySuppressedDownloadErrorRef.current = undefined;
      hasSeenNativeDownloadRef.current = true;
      lastDownloadActivityAtRef.current = Date.now();
      setProgress((prev) => Math.max(prev, nextProgress));
    }

    // 为什么不再用 `nextProgress >= 100` 作为信号：
    // ─────────────────────────────────────────────
    // native 进度现在是按字节加权的（见 Loader.kt），100% 确实意味着所有字节已落盘。
    // 但：(a) 字节写完之后还有几十 ms 的 hash 校验 + DB finalize 尾巴；(b) 在 "APK 已
    // 内嵌同版本 OTA" 的路径下，旧的按资产数计权的进度会在最大的那个资产（JS bundle）
    // 还在传输时就虚报 100%。下载真正完成的唯一明确信号来自 native：
    //   - `downloadedUpdate` 被填充，或
    //   - `isDownloading` 翻回 false，或
    //   - `isUpdatePending` 变 true（由 effect ⑤ 处理）
    // 所以切 phase 只看这些信号。
    const downloadJustEnded =
      !nativeIsDownloading && (wasNativeDownloading || hasSeenNativeDownloadRef.current);

    // ── "fetch 跑空" 兜底 ──
    // 在 native 状态机修复之后（`.downloadComplete` 不再无条件把 `isUpdatePending=true`），
    // 一次 `fetchUpdateAsync()` 如果确实没有可装的更新（服务器 `noUpdateAvailable` 或选择
    // 策略否决了 manifest），会落在这里：`isDownloading` 翻 false、无 `downloadedUpdate`、
    // 无 `isUpdatePending`、无 `downloadError`。此时必须静默地把弹窗退回 `idle`，否则 UI
    // 会 (a) 卡在 `installing` 5 分钟到看门狗触发，或 (b) native 修复前会假装"更新就绪"
    // 并在重启后死循环。
    if (
      downloadJustEnded &&
      !downloadedUpdate &&
      !isUpdatePending &&
      !downloadError
    ) {
      otaPerf('js.fetch.noUpdateFallback');
      retrySuppressedDownloadErrorRef.current = undefined;
      hasSeenNativeDownloadRef.current = false;
      fetchPromiseRef.current = null;
      clearDownloadWatchdog();
      clearInstallingTimeout();
      clearRecoverySnapshot();
      phaseRef.current = 'idle';
      setPhase('idle');
      setProgress(0);
      setVisible(false);
      setMinimized(false);
      setInstallStartTime(0);
      return;
    }

    const shouldEnterInstalling =
      !!downloadedUpdate || downloadJustEnded;

    if (shouldEnterInstalling) {
      persistRecoverySnapshot('installing');
      setInstallStartTime((prev) => (prev || Date.now()));
      phaseRef.current = 'installing';
      setPhase('installing');
      clearDownloadWatchdog();
      return;
    }

    if (nativeIsDownloading) {
      retrySuppressedDownloadErrorRef.current = undefined;
      lastDownloadActivityAtRef.current = Date.now();
      return;
    }
  }, [
    nativeIsDownloading,
    downloadProgress,
    visible,
    phase,
    hasCancelled,
    clearDownloadWatchdog,
    clearInstallingTimeout,
    clearRecoverySnapshot,
    recoveryReady,
    persistRecoverySnapshot,
    downloadedUpdate,
    isUpdatePending,
    downloadError,
  ]);

  // ③ 下载看门狗：30s 无进度 → 超时错误
  React.useEffect(() => {
    if (__DEV__) return;
    if (!recoveryReady) return;
    clearDownloadWatchdog();
    if (!visible || phase !== 'downloading') return;

    lastDownloadActivityAtRef.current = Date.now();
    downloadWatchdogTimerRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      const idleMs = Date.now() - (lastDownloadActivityAtRef.current || 0);
      if (idleMs >= DOWNLOAD_WATCHDOG_TIMEOUT_MS) {
        setErrorPhase('download_watchdog_timeout');
      }
    }, DOWNLOAD_WATCHDOG_INTERVAL_MS);

    return clearDownloadWatchdog;
  }, [phase, visible, clearDownloadWatchdog, recoveryReady, setErrorPhase]);

  // ④ 安装看门狗：300s 超时 → 错误
  React.useEffect(() => {
    if (__DEV__) return;
    if (!recoveryReady) return;
    clearInstallingTimeout();
    if (phase !== 'installing') return;

    installingTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      if (phaseRef.current === 'installing') {
        setErrorPhase('install_timeout');
      }
    }, INSTALLING_TIMEOUT_MS);

    return clearInstallingTimeout;
  }, [phase, clearInstallingTimeout, recoveryReady, setErrorPhase]);

  // ⑤ 更新已就绪 → ready
  React.useEffect(() => {
    if (__DEV__) return;
    if (!recoveryReady) return;
    if (suppressNativeStateRef.current) return;
    if (hasCancelled) return;
    if (isUpdatePending) {
      if (phase === 'downloading') {
        persistRecoverySnapshot('installing');
        setInstallStartTime((prev) => (prev || Date.now()));
        phaseRef.current = 'installing';
        setPhase('installing');
        clearDownloadWatchdog();
        return;
      }

      persistRecoverySnapshot('ready');
      retrySuppressedDownloadErrorRef.current = undefined;
      fetchPromiseRef.current = null;
      hasSeenNativeDownloadRef.current = false;
      phaseRef.current = 'ready';
      setPhase('ready');
      setProgress(100);
      setVisible(true);
      setIsRetrying(false);
      clearDownloadWatchdog();
      clearInstallingTimeout();
    }
  }, [
    isUpdatePending,
    clearDownloadWatchdog,
    clearInstallingTimeout,
    hasCancelled,
    phase,
    persistRecoverySnapshot,
    recoveryReady,
  ]);

  // ⑥ 下载/安装错误（带去重逻辑）
  React.useEffect(() => {
    if (__DEV__) return;
    if (!recoveryReady) return;
    if (suppressNativeStateRef.current) return;
    if (!downloadError) {
      handledErrorRef.current = undefined;
      return;
    }
    if (hasCancelled) return;
    if (recoveryInFlightRef.current) return;
    if (phase === 'error' || phase === 'ready') return;
    if (downloadError === handledErrorRef.current) return;
    if (downloadError === retrySuppressedDownloadErrorRef.current) return;
    if (nativeIsDownloading) return;

    handledErrorRef.current = downloadError;
    setErrorPhase(downloadError.message);
  }, [downloadError, hasCancelled, phase, nativeIsDownloading, recoveryReady, setErrorPhase]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  用户操作回调
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleMinimize = React.useCallback(() => setMinimized(true), []);
  const handleExpand = React.useCallback(() => setMinimized(false), []);

  const handleReload = React.useCallback(async () => {
    clearRecoverySnapshot();
    try { await Updates.reloadAsync(); } catch { /* ignore */ }
  }, [clearRecoverySnapshot]);

  const handleRetry = React.useCallback(async () => {
    if (isRetrying) return;

    setIsRetrying(true);
    setVisible(true);
    setMinimized(false);

    await performRecoveryCleanup();

    if (!mountedRef.current) return;

    const result = await prepareThenCheck('manual_retry', { force: true });

    if (!mountedRef.current) return;

    if (!result) {
      setErrorPhase(downloadErrorRef.current?.message || 'retry_check_failed');
      return;
    }

    if (result.isAvailable) {
      startFetchUpdate();
      return;
    }

    retrySuppressedDownloadErrorRef.current = undefined;
    setIsRetrying(false);
    setVisible(false);
    setPhase('idle');
    setProgress(0);
    setInstallStartTime(0);
  }, [isRetrying, performRecoveryCleanup, prepareThenCheck, setErrorPhase, startFetchUpdate]);

  const handleDismiss = React.useCallback(() => {
    hasCancelledRef.current = true;
    phaseRef.current = 'idle';
    retrySuppressedDownloadErrorRef.current = undefined;
    setIsRetrying(false);
    setVisible(false);
    setHasCancelled(true);
    setMinimized(false);
    setPhase('idle');
    clearAllTimers();
  }, [clearAllTimers]);

  return {
    visible,
    minimized,
    phase,
    progress,
    installStartTime,
    isRetrying,
    handleReload,
    handleRetry,
    handleDismiss,
    handleMinimize,
    handleExpand,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  OTAUpdateProvider
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * OTA 更新管理器（叶子组件）
 *
 * 放在根布局中与其他组件并列即可，无需包裹 children。
 * 自动检查更新、展示下载/安装进度 UI、提供悬浮球和弹窗交互。
 *
 * 注意：需要在 ComponentLibProvider（提供 Theme + i18n）内部使用。
 *
 * @example
 * ```tsx
 * // 在根布局中并列放置
 * <ComponentLibProvider>
 *   <Stack>...</Stack>
 *   <OTAUpdateManager extraParams={{ phone: user?.TelNum }} />
 * </ComponentLibProvider>
 * ```
 */
export function OTAUpdateManager({
  extraParams,
  devSimulation,
}: OTAUpdateManagerProps) {
  const { width: SW, height: SH } = useWindowDimensions();
  const initialBadgePosition = React.useMemo(
    () => ({ x: SW - BADGE_SIZE - BADGE_EDGE, y: SH * 0.6 }),
    [SH, SW],
  );
  const {
    visible, minimized, phase, progress, installStartTime, isRetrying,
    handleReload, handleRetry, handleDismiss,
    handleMinimize, handleExpand,
  } = useOTAUpdates({ extraParams, devSimulation });

  // 首次展示逻辑
  const [isFirstShow, setIsFirstShow] = React.useState(true);

  const prevVisibleRef = React.useRef(false);
  React.useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      setIsFirstShow(true);
    }
    prevVisibleRef.current = visible;
  }, [visible]);

  const handleFirstShowComplete = React.useCallback(() => {
    setIsFirstShow(false);
  }, []);
  const [badgePosition, setBadgePosition] = React.useState<BadgePosition>(initialBadgePosition);
  const [overlayMounted, setOverlayMounted] = React.useState(false);
  const [overlayExpanded, setOverlayExpanded] = React.useState(false);

  React.useEffect(() => {
    let rafId: ReturnType<typeof requestAnimationFrame> | null = null;
    if (!visible) {
      setOverlayMounted(false);
      setOverlayExpanded(false);
      return;
    }

    if (!minimized) {
      setOverlayMounted(true);
      rafId = requestAnimationFrame(() => setOverlayExpanded(true));
      return;
    }

    if (overlayMounted) {
      setOverlayExpanded(false);
    }
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [visible, minimized, overlayMounted]);

  const handleOverlayCollapseComplete = React.useCallback(() => {
    if (minimized) {
      setOverlayMounted(false);
    }
  }, [minimized]);

  if (!visible) return null;

  return (
    <>
      <FloatingUpdateBadge
        phase={phase}
        progress={progress}
        onPress={handleExpand}
        position={badgePosition}
        onPositionChange={setBadgePosition}
        badgeVisible={minimized}
      />
      {overlayMounted && (
        <OTAUpdateOverlay
          phase={phase}
          progress={progress}
          expanded={overlayExpanded}
          badgePosition={badgePosition}
          installStartTime={installStartTime}
          isRetrying={isRetrying}
          onRetry={handleRetry}
          onDismiss={handleDismiss}
          onReload={handleReload}
          onMinimize={handleMinimize}
          onCollapseComplete={handleOverlayCollapseComplete}
          isFirstShow={isFirstShow}
          onFirstShowComplete={handleFirstShowComplete}
        />
      )}
    </>
  );
}
