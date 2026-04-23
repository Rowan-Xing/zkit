/**
 * @file PermissionPurposeDialogService - 权限用途说明 TopSheet
 * @description 在系统权限申请框弹出的同时，在顶部展示一条白底黑字的说明条，
 *   告知用户该权限的使用目的。纯展示，不阻塞流程，无按钮。
 *   支持按权限类型自动填充默认文案，也支持完全自定义。
 * @example
 * ```tsx
 * import { permissionPurposeDialog } from 'y2kit-ui';
 *
 * // 展示说明
 * permissionPurposeDialog.show({ permissionType: 'location' });
 * // ... 发起系统权限请求 ...
 * // 请求完成后关闭
 * permissionPurposeDialog.hide();
 * ```
 */

import * as React from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { wp } from 'y2kit-tools';
import { Text } from '../../ui/Text';

/** 内置支持的权限类型 */
export type PermissionPurposeType = 'location' | 'camera' | 'microphone' | 'photos' | 'notification' | 'custom';

/** 弹窗配置 */
export type PermissionPurposeDialogOptions = {
  /** 作用域标识，用于按标识关闭 */
  scopeKey?: string;
  /** 权限类型，会自动填充默认标题 & 描述 */
  permissionType?: PermissionPurposeType;
  /** 自定义标题（优先于默认文案） */
  title?: string;
  /** 自定义描述（优先于默认文案） */
  message?: string;
};

type PermissionPurposeDialogState = {
  open: boolean;
  options: PermissionPurposeDialogOptions;
};

/** 各权限类型的默认文案 */
const DEFAULT_PURPOSE_TEXT: Record<
  Exclude<PermissionPurposeType, 'custom'>,
  { title: string; message: string }
> = {
  location: {
    title: '位置信息权限说明',
    message: '我们需要获取您的位置信息以提供定位相关功能，该权限仅用于当前业务场景，不会用于其他目的。',
  },
  camera: {
    title: '相机权限说明',
    message: '我们需要使用相机以提供拍照或扫描功能，该权限仅用于当前业务场景，不会用于其他目的。',
  },
  microphone: {
    title: '麦克风权限说明',
    message: '我们需要使用麦克风以提供语音录制或通话功能，该权限仅用于当前业务场景，不会用于其他目的。',
  },
  photos: {
    title: '相册权限说明',
    message: '我们需要访问相册以选择并上传图片，该权限仅用于当前业务场景，不会用于其他目的。',
  },
  notification: {
    title: '通知权限说明',
    message: '我们需要发送通知以便及时推送业务提醒，该权限仅用于当前业务场景，不会用于其他目的。',
  },
};

/**
 * 权限用途说明弹窗服务类
 * @internal
 */
class PermissionPurposeDialogServiceClass {
  private setState: React.Dispatch<React.SetStateAction<PermissionPurposeDialogState>> | null = null;

  /** @internal */
  setStateUpdater(updater: React.Dispatch<React.SetStateAction<PermissionPurposeDialogState>>) {
    this.setState = updater;
  }

  /** 展示权限用途说明 */
  show(options: PermissionPurposeDialogOptions = {}) {
    if (!this.setState) {
      console.warn('[permissionPurposeDialog] Provider not mounted');
      return;
    }
    this.setState({ open: true, options });
  }

  /** 关闭说明 */
  hide() {
    this.setState?.((prev) => ({ ...prev, open: false }));
  }

  /** 按 scopeKey 关闭 */
  hideByScope(scopeKey?: string) {
    if (!scopeKey) return;
    this.setState?.((prev) => {
      if (prev.open && prev.options.scopeKey === scopeKey) {
        return { ...prev, open: false };
      }
      return prev;
    });
  }
}

/** 权限用途说明弹窗服务实例 */
export const permissionPurposeDialog = new PermissionPurposeDialogServiceClass();

const initialState: PermissionPurposeDialogState = {
  open: false,
  options: {},
};

/** TopSheet 纯展示卡片 */
function PermissionPurposeCard({
  open,
  options,
}: {
  open: boolean;
  options: PermissionPurposeDialogOptions;
}) {
  const insets = useSafeAreaInsets();
  const anim = React.useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = React.useState(open);

  const type = options.permissionType ?? 'custom';
  const preset = type === 'custom' ? null : DEFAULT_PURPOSE_TEXT[type];
  const title = options.title ?? preset?.title ?? '权限申请说明';
  const message = options.message ?? preset?.message ?? '';

  React.useEffect(() => {
    anim.stopAnimation();
    if (open) {
      setVisible(true);
      // 入场：直接设为 1，不做动画。
      // 因为 Android 系统权限弹框弹出后会冻结 App 动画线程，
      // 如果用 Animated.timing 做入场动画，动画会卡在中间状态（低透明度）。
      anim.setValue(1);
      return;
    }
    if (!visible) return;
    // 退场：系统权限框关闭后 App 恢复正常，可以正常跑退出动画
    Animated.timing(anim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setVisible(false);
    });
  }, [anim, open, visible]);

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={[styles.host, { top: (insets.top || 0) + wp(8) }]}>
      <Animated.View
        style={[
          styles.sheet,
          { opacity: anim },
        ]}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
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
    permissionPurposeDialog.setStateUpdater(setState);
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
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: Platform.OS === 'android' ? 9999 : 0,
  },
  sheet: {
    width: wp(340),
    maxWidth: '94%',
    borderRadius: wp(12),
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: wp(4) },
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
