/**
 * @file PermissionPurposeDialogService - 权限用途说明 TopSheet
 * @description 在系统权限申请框弹出前后，于屏幕顶部展示一条白底黑字的非阻塞说明条，
 *   告知用户该权限的使用目的。纯展示、不拦截交互、无按钮。
 *   支持按权限自动填充默认文案，也支持完全自定义。
 * @example
 * ```tsx
 * import { permissionPurposeDialog } from 'y2kit-ui';
 *
 * // 展示说明
 * const purpose = permissionPurposeDialog.show({ permission: 'location' });
 * // ... 发起系统权限请求 ...
 * // 请求完成后关闭
 * purpose.hide();
 * ```
 */

import * as React from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { wp } from 'y2kit-tools';
import { Text } from '../../ui/Text';

/** 内置支持的权限用途类型 */
export type PermissionPurpose =
  | 'location'
  | 'camera'
  | 'microphone'
  | 'photos'
  | 'notification'
  | 'contacts'
  | 'calendar'
  | 'bluetooth'
  | 'motion'
  | 'custom';

/** 历史命名别名，语义等同于 `PermissionPurpose`。 */
export type PermissionPurposeType = PermissionPurpose;

/** 弹窗配置 */
export type PermissionPurposeDialogOptions = {
  /** 作用域标识，用于按标识关闭 */
  scopeKey?: string;
  /** 权限用途，会自动填充默认标题与描述 */
  permission?: PermissionPurpose;
  /** @deprecated 请使用 `permission` */
  permissionType?: PermissionPurposeType;
  /** 自定义标题（优先于默认文案） */
  title?: string;
  /** 自定义描述（优先于默认文案） */
  message?: string;
  /** 自动关闭时长（毫秒）。不传则保持显示，直到显式关闭 */
  duration?: number;
  /** 顶部安全区下方额外偏移。默认 `wp(8)` */
  topOffset?: number;
};

/** `show()` 返回的句柄，用于精确关闭或更新本次说明。 */
export type PermissionPurposeDialogHandle = {
  /** 本次说明的唯一标识。 */
  id: string;
  /** 只关闭当前 id 对应的说明，避免旧异步流程误关新说明。 */
  hide: () => void;
  /** 只更新当前 id 对应的说明配置。 */
  update: (patch: Partial<PermissionPurposeDialogOptions>) => void;
};

type PermissionPurposePreset = Exclude<PermissionPurpose, 'custom'>;

type PermissionPurposeCopy = {
  title: string;
  message: string;
};

type ResolvedPermissionPurposeDialogOptions = {
  id: string;
  scopeKey?: string;
  permission: PermissionPurpose;
  title: string;
  message: string;
  topOffset: number;
};

type PermissionPurposeDialogState = {
  open: boolean;
  options: ResolvedPermissionPurposeDialogOptions;
};

/** 各权限类型的默认文案 */
const DEFAULT_PURPOSE_TEXT: Record<
  PermissionPurposePreset,
  PermissionPurposeCopy
> = {
  location: {
    title: '需要使用位置',
    message: '用于定位、附近内容或位置相关服务。授权只会在相关功能中使用。',
  },
  camera: {
    title: '需要使用相机',
    message: '用于拍照、扫码或上传现场图片。授权只会在相关功能中使用。',
  },
  microphone: {
    title: '需要使用麦克风',
    message: '用于录音、语音输入或通话相关功能。授权只会在相关功能中使用。',
  },
  photos: {
    title: '需要访问相册',
    message: '用于选择图片或视频，并完成上传、预览等操作。',
  },
  notification: {
    title: '需要发送通知',
    message: '用于接收重要提醒和状态更新，你可以随时在系统设置中调整。',
  },
  contacts: {
    title: '需要访问通讯录',
    message: '用于联系人选择、邀请或信息补全。授权只会在相关功能中使用。',
  },
  calendar: {
    title: '需要访问日历',
    message: '用于创建、读取或同步日程提醒。授权只会在相关功能中使用。',
  },
  bluetooth: {
    title: '需要使用蓝牙',
    message: '用于发现、连接或管理附近设备。授权只会在相关功能中使用。',
  },
  motion: {
    title: '需要访问运动数据',
    message: '用于识别运动状态或完成健康相关功能。授权只会在相关功能中使用。',
  },
};

const DEFAULT_TITLE = '权限申请说明';
const DEFAULT_PERMISSION: PermissionPurpose = 'custom';
const DEFAULT_TOP_OFFSET = wp(8);
const EXIT_DURATION_MS = 200;
const PERMISSION_HOST_Z_INDEX = 9999;

function isPresetPermission(permission: string): permission is PermissionPurposePreset {
  return Object.prototype.hasOwnProperty.call(DEFAULT_PURPOSE_TEXT, permission);
}

function normalizeText(value: string | undefined) {
  if (typeof value !== 'string') return undefined;
  return value.trim();
}

function normalizeDuration(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined;
  return value;
}

function normalizeTopOffset(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_TOP_OFFSET;
  return Math.max(0, value);
}

function resolveOptions(
  options: PermissionPurposeDialogOptions,
  id: string
): ResolvedPermissionPurposeDialogOptions {
  const rawPermission = options.permission ?? options.permissionType ?? DEFAULT_PERMISSION;
  const permission: PermissionPurpose =
    rawPermission === 'custom' || isPresetPermission(rawPermission) ? rawPermission : DEFAULT_PERMISSION;
  const preset = isPresetPermission(permission) ? DEFAULT_PURPOSE_TEXT[permission] : null;
  const title = normalizeText(options.title) || preset?.title || DEFAULT_TITLE;
  const message = normalizeText(options.message) ?? preset?.message ?? '';

  return {
    id,
    scopeKey: options.scopeKey,
    permission,
    title,
    message,
    topOffset: normalizeTopOffset(options.topOffset),
  };
}

/**
 * 权限用途说明弹窗服务类
 * @internal
 */
class PermissionPurposeDialogServiceClass {
  private mounted = false;
  private idSeed = 0;
  private activeId: string | null = null;
  private activeOptions: PermissionPurposeDialogOptions | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private setState: React.Dispatch<React.SetStateAction<PermissionPurposeDialogState>> | null = null;

  /** @internal */
  setMounted(mounted: boolean) {
    this.mounted = mounted;
    if (!mounted) {
      this.activeId = null;
      this.activeOptions = null;
      this.clearHideTimer();
    }
  }

  /** @internal */
  setStateUpdater(updater: React.Dispatch<React.SetStateAction<PermissionPurposeDialogState>> | null) {
    this.setState = updater;
  }

  /** 展示权限用途说明 */
  show(options: PermissionPurposeDialogOptions = {}): PermissionPurposeDialogHandle {
    const id = this.createId();

    if (!this.mounted || !this.setState) {
      console.warn('[permissionPurposeDialog] Provider not mounted');
      return this.createHandle(id);
    }

    this.openWithOptions(id, options);
    return this.createHandle(id);
  }

  /** 关闭说明 */
  hide() {
    this.hideInternal();
  }

  /** 按 scopeKey 关闭 */
  hideByScope(scopeKey?: string) {
    if (!scopeKey) return;
    if (this.activeOptions?.scopeKey !== scopeKey) return;
    this.hideById(this.activeId);
  }

  /** @internal 清理所有定时器 */
  clearAllTimers() {
    this.clearHideTimer();
  }

  private openWithOptions(id: string, options: PermissionPurposeDialogOptions) {
    this.clearHideTimer();
    this.activeId = id;
    this.activeOptions = options;

    const resolvedOptions = resolveOptions(options, id);
    this.setState?.({ open: true, options: resolvedOptions });

    const duration = normalizeDuration(options.duration);
    if (duration != null) {
      this.hideTimer = setTimeout(() => {
        this.hideById(id);
      }, duration);
    }
  }

  private hideInternal(id?: string) {
    if (id && id !== this.activeId) return;

    const closingId = this.activeId;
    this.activeId = null;
    this.activeOptions = null;
    this.clearHideTimer();

    if (!this.mounted || !this.setState) return;

    this.setState((prev) => {
      if (closingId && prev.options.id !== closingId) return prev;
      if (!prev.open) return prev;
      return { ...prev, open: false };
    });
  }

  /** 只关闭指定 id 的说明，避免旧流程误关新说明。 */
  private hideById(id?: string | null) {
    if (!id || id !== this.activeId) return;
    this.hideInternal(id);
  }

  /** 只更新指定 id 的说明。 */
  private updateById(id: string, patch: Partial<PermissionPurposeDialogOptions>) {
    if (!id || id !== this.activeId || !this.activeOptions || !this.mounted || !this.setState) {
      return;
    }

    this.openWithOptions(id, { ...this.activeOptions, ...patch });
  }

  private createId() {
    this.idSeed += 1;
    return `permission_purpose_${Date.now()}_${this.idSeed}`;
  }

  private createHandle(id: string): PermissionPurposeDialogHandle {
    return {
      id,
      hide: () => this.hideById(id),
      update: (patch) => this.updateById(id, patch),
    };
  }

  private clearHideTimer() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}

/** 权限用途说明弹窗服务实例 */
export const permissionPurposeDialog = new PermissionPurposeDialogServiceClass();

const initialState: PermissionPurposeDialogState = {
  open: false,
  options: resolveOptions({}, '__initial__'),
};

/** TopSheet 纯展示卡片 */
function PermissionPurposeCard({
  open,
  options,
}: {
  open: boolean;
  options: ResolvedPermissionPurposeDialogOptions;
}) {
  const insets = useSafeAreaInsets();
  const progress = React.useRef(new Animated.Value(open ? 1 : 0)).current;
  const [visible, setVisible] = React.useState(open);

  const accessibilityLabel = React.useMemo(() => {
    if (!options.message) return options.title;
    return `${options.title}，${options.message}`;
  }, [options.message, options.title]);

  React.useEffect(() => {
    return () => {
      progress.stopAnimation();
    };
  }, [progress]);

  React.useEffect(() => {
    progress.stopAnimation();

    if (open) {
      setVisible(true);
      // 入场直接显示，不做过渡。
      // 因为 Android 系统权限弹框弹出后会冻结 App 动画线程，
      // 若此处做动画，权限说明可能停在半透明状态，反而损害稳定性。
      progress.setValue(1);
      return;
    }

    if (!visible) return;

    // 退场：系统权限框关闭后 App 恢复正常，可以正常跑退出动画
    Animated.timing(progress, {
      toValue: 0,
      duration: EXIT_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setVisible(false);
    });
  }, [open, options.id, progress, visible]);

  const animatedStyle = React.useMemo(
    () => ({
      opacity: progress,
    }),
    [progress]
  );

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={[styles.host, { top: (insets.top || 0) + options.topOffset }]}>
      <Animated.View
        accessible={open}
        accessibilityLabel={accessibilityLabel}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        importantForAccessibility={open ? 'yes' : 'no-hide-descendants'}
        renderToHardwareTextureAndroid={Platform.OS === 'android'}
        shouldRasterizeIOS={Platform.OS === 'ios'}
        style={[
          styles.sheet,
          animatedStyle,
        ]}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{options.title}</Text>
          {options.message ? <Text style={styles.message}>{options.message}</Text> : null}
        </View>
      </Animated.View>
    </View>
  );
}

/**
 * 权限用途说明 Provider
 * @description 需要在应用根组件中包裹，已内置于 ComponentLibProvider
 */
export function PermissionPurposeDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<PermissionPurposeDialogState>(initialState);

  React.useEffect(() => {
    permissionPurposeDialog.setMounted(true);
    permissionPurposeDialog.setStateUpdater(setState);
    return () => {
      permissionPurposeDialog.clearAllTimers();
      permissionPurposeDialog.setStateUpdater(null);
      permissionPurposeDialog.setMounted(false);
    };
  }, []);

  return (
    <>
      {children}
      <PermissionPurposeCard open={state.open} options={state.options} />
    </>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: wp(0),
    right: wp(0),
    alignItems: 'center',
    zIndex: PERMISSION_HOST_Z_INDEX,
    elevation: Platform.OS === 'android' ? PERMISSION_HOST_Z_INDEX : 0,
  },
  sheet: {
    width: wp(340),
    maxWidth: '94%',
    borderRadius: wp(12),
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: wp(0), height: wp(4) },
    shadowRadius: wp(12),
    elevation: 8,
  },
  content: {
    paddingHorizontal: wp(16),
    paddingVertical: wp(14),
  },
  title: {
    fontSize: wp(15),
    lineHeight: wp(20),
    fontWeight: '600',
    color: '#111111',
  },
  message: {
    marginTop: wp(6),
    fontSize: wp(13),
    lineHeight: wp(18),
    color: '#333333',
  },
});
