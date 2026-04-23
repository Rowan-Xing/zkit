/**
 * @file ImagePreviewService - 命令式全屏图片预览服务
 * @description 全屏图片预览，支持双指缩放、拖拽、左右滑动切换、双击放大、下滑关闭
 * @example
 * ```tsx
 * import { imagePreview } from 'y2kit-ui';
 *
 * // 预览单张图片
 * imagePreview.show({ images: ['https://example.com/photo.jpg'] });
 *
 * // 预览图片列表，从第二张开始
 * imagePreview.show({
 *   images: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
 *   initialIndex: 1,
 * });
 * ```
 */

import * as React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  BackHandler,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  cancelAnimation,
  interpolate,
  Extrapolation,
  useAnimatedReaction,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { wp } from 'y2kit-tools';
import { Text } from '../../ui/Text';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const SWIPE_THRESHOLD = SCREEN_W * 0.25;
const VELOCITY_THRESHOLD = 500;
const DISMISS_THRESHOLD = SCREEN_H * 0.12;
const MODE_LOCK_DISTANCE = 8;

const SPRING_CONFIG = { damping: 25, stiffness: 300, mass: 0.5 };
const ENTER_DURATION = { duration: 260 };
const EXIT_DURATION = { duration: 200 };

// ─── Types ───────────────────────────────────────────────────────────────────

export type ImagePreviewImage = string | { uri: string };

export type ImagePreviewOptions = {
  /** 图片列表 */
  images: ImagePreviewImage[];
  /** 初始展示的图片索引，默认 0 */
  initialIndex?: number;
  /** 切换图片时的回调 */
  onChange?: (index: number) => void;
  /** 关闭时的回调 */
  onClose?: () => void;
  /** 单击任意位置关闭预览，默认 true */
  tapToClose?: boolean;
};

type PreviewState = {
  visible: boolean;
  options: ImagePreviewOptions | null;
};

// ─── Service ─────────────────────────────────────────────────────────────────

class ImagePreviewServiceClass {
  private setState: React.Dispatch<React.SetStateAction<PreviewState>> | null = null;

  /** @internal 绑定状态更新器 */
  _bind(updater: React.Dispatch<React.SetStateAction<PreviewState>>) {
    this.setState = updater;
  }

  /** 展示图片预览 */
  show(options: ImagePreviewOptions) {
    if (!this.setState) {
      console.warn('[imagePreview] Provider not mounted');
      return;
    }
    if (!options.images?.length) return;
    this.setState({ visible: true, options });
  }

  /** 关闭图片预览 */
  hide() {
    this.setState?.((prev) => ({ ...prev, visible: false }));
  }
}

/** 图片预览服务实例 */
export const imagePreview = new ImagePreviewServiceClass();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toUri(img: ImagePreviewImage): string {
  return typeof img === 'string' ? img : img.uri;
}

function clampV(v: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(v, min), max);
}

// ─── CloseButton ─────────────────────────────────────────────────────────────

function CloseButton({ onPress, top }: { onPress: () => void; top: number }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.closeBtn, { top }]}
      hitSlop={{ top: wp(12), bottom: wp(12), left: wp(12), right: wp(12) }}
    >
      <View style={styles.closeBg}>
        <View style={[styles.closeLine, { transform: [{ rotate: '45deg' }] }]} />
        <View style={[styles.closeLine, { transform: [{ rotate: '-45deg' }] }]} />
      </View>
    </TouchableOpacity>
  );
}

// ─── ZoomableImage ───────────────────────────────────────────────────────────

type GestureMode = 'none' | 'drag' | 'swipe' | 'dismiss' | 'undecided';

function ZoomableImage({
  uri,
  index,
  currentIndexSV,
  pageTranslateX,
  backdropOpacity,
  totalCount,
  onPageChange,
  onDismiss,
  onTapClose,
  tapToClose,
}: {
  uri: string;
  index: number;
  currentIndexSV: SharedValue<number>;
  pageTranslateX: SharedValue<number>;
  backdropOpacity: SharedValue<number>;
  totalCount: number;
  onPageChange: (newIndex: number) => void;
  onDismiss: () => void;
  onTapClose: () => void;
  tapToClose: boolean;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const dismissY = useSharedValue(0);
  const mode = useSharedValue<GestureMode>('none');

  const isPinching = useSharedValue(false);
  const pinchFocalX = useSharedValue(0);
  const pinchFocalY = useSharedValue(0);
  const panOffsetX = useSharedValue(0);
  const panOffsetY = useSharedValue(0);

  useAnimatedReaction(
    () => currentIndexSV.value,
    (curr, prev) => {
      if (prev !== null && prev === index && curr !== index) {
        scale.value = withTiming(1, { duration: 200 });
        savedScale.value = 1;
        translateX.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        dismissY.value = 0;
        isPinching.value = false;
        mode.value = 'none';
      }
    }
  );

  // ── Single Tap: close preview (when tapToClose is enabled) ──
  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(200)
    .onEnd(() => {
      'worklet';
      if (currentIndexSV.value !== index) return;
      if (!tapToClose) return;
      if (scale.value > 1.05) return;
      scheduleOnRN(onTapClose);
    });

  // ── Double Tap: toggle zoom ──
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(300)
    .onEnd((e) => {
      'worklet';
      if (currentIndexSV.value !== index) return;

      if (scale.value > 1.05) {
        scale.value = withTiming(1, { duration: 280 });
        savedScale.value = 1;
        translateX.value = withTiming(0, { duration: 280 });
        translateY.value = withTiming(0, { duration: 280 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        const fX = e.x - SCREEN_W / 2;
        const fY = e.y - SCREEN_H / 2;
        const tx = -fX * (DOUBLE_TAP_SCALE - 1);
        const ty = -fY * (DOUBLE_TAP_SCALE - 1);
        scale.value = withTiming(DOUBLE_TAP_SCALE, { duration: 280 });
        savedScale.value = DOUBLE_TAP_SCALE;
        translateX.value = withTiming(tx, { duration: 280 });
        translateY.value = withTiming(ty, { duration: 280 });
        savedTranslateX.value = tx;
        savedTranslateY.value = ty;
      }
    });

  // ── Pinch: zoom with focal point ──
  const pinch = Gesture.Pinch()
    .onStart((e) => {
      'worklet';
      if (currentIndexSV.value !== index) return;
      isPinching.value = true;
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      pinchFocalX.value = e.focalX - SCREEN_W / 2;
      pinchFocalY.value = e.focalY - SCREEN_H / 2;
      cancelAnimation(scale);
      cancelAnimation(translateX);
      cancelAnimation(translateY);
    })
    .onUpdate((e) => {
      'worklet';
      if (currentIndexSV.value !== index) return;
      const newScale = clampV(savedScale.value * e.scale, 0.5, MAX_SCALE + 1);
      scale.value = newScale;
      translateX.value =
        savedTranslateX.value +
        (savedScale.value - newScale) * pinchFocalX.value;
      translateY.value =
        savedTranslateY.value +
        (savedScale.value - newScale) * pinchFocalY.value;
    })
    .onEnd(() => {
      'worklet';
      if (currentIndexSV.value !== index) return;
      isPinching.value = false;
      mode.value = 'none';

      let targetScale = scale.value;

      if (targetScale < MIN_SCALE) {
        scale.value = withSpring(MIN_SCALE, SPRING_CONFIG);
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
        savedScale.value = MIN_SCALE;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        return;
      }

      if (targetScale > MAX_SCALE) {
        targetScale = MAX_SCALE;
        scale.value = withSpring(MAX_SCALE, SPRING_CONFIG);
      }

      const targetTx =
        savedTranslateX.value +
        (savedScale.value - targetScale) * pinchFocalX.value;
      const targetTy =
        savedTranslateY.value +
        (savedScale.value - targetScale) * pinchFocalY.value;

      const maxTX = Math.max(0, (SCREEN_W * (targetScale - 1)) / 2);
      const maxTY = Math.max(0, (SCREEN_H * (targetScale - 1)) / 2);
      const cx = clampV(targetTx, -maxTX, maxTX);
      const cy = clampV(targetTy, -maxTY, maxTY);

      if (cx !== translateX.value || cy !== translateY.value) {
        translateX.value = withSpring(cx, SPRING_CONFIG);
        translateY.value = withSpring(cy, SPRING_CONFIG);
      }

      savedScale.value = targetScale;
      savedTranslateX.value = cx;
      savedTranslateY.value = cy;
    });

  // ── Pan: drag (zoomed) / page swipe / dismiss ──
  const pan = Gesture.Pan()
    .minPointers(1)
    .onStart((e) => {
      'worklet';
      if (currentIndexSV.value !== index) return;

      cancelAnimation(translateX);
      cancelAnimation(translateY);
      cancelAnimation(pageTranslateX);
      cancelAnimation(dismissY);

      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      panOffsetX.value = 0;
      panOffsetY.value = 0;

      if (e.numberOfPointers >= 2 || isPinching.value) {
        mode.value = 'none';
      } else if (scale.value > 1.05) {
        mode.value = 'drag';
      } else {
        mode.value = 'undecided';
      }
    })
    .onUpdate((e) => {
      'worklet';
      if (currentIndexSV.value !== index) return;

      if (isPinching.value) {
        panOffsetX.value = e.translationX;
        panOffsetY.value = e.translationY;
        return;
      }

      if (mode.value === 'none') {
        cancelAnimation(translateX);
        cancelAnimation(translateY);
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
        panOffsetX.value = e.translationX;
        panOffsetY.value = e.translationY;
        mode.value = scale.value > 1.05 ? 'drag' : 'undecided';
        return;
      }

      const deltaX = e.translationX - panOffsetX.value;
      const deltaY = e.translationY - panOffsetY.value;

      if (mode.value === 'undecided') {
        const aX = Math.abs(deltaX);
        const aY = Math.abs(deltaY);
        if (aX > MODE_LOCK_DISTANCE || aY > MODE_LOCK_DISTANCE) {
          mode.value = aX >= aY ? 'swipe' : 'dismiss';
        } else {
          return;
        }
      }

      if (mode.value === 'drag') {
        translateX.value = savedTranslateX.value + deltaX;
        translateY.value = savedTranslateY.value + deltaY;
      } else if (mode.value === 'swipe') {
        let tx = deltaX;
        const canNext = currentIndexSV.value < totalCount - 1;
        const canPrev = currentIndexSV.value > 0;
        if ((!canPrev && tx > 0) || (!canNext && tx < 0)) {
          tx *= 0.3;
        }
        pageTranslateX.value = tx;
      } else if (mode.value === 'dismiss') {
        dismissY.value = deltaY;
        const progress = Math.abs(deltaY) / (SCREEN_H * 0.4);
        backdropOpacity.value = interpolate(progress, [0, 1], [1, 0.1], Extrapolation.CLAMP);
      }
    })
    .onEnd((e) => {
      'worklet';
      if (currentIndexSV.value !== index) return;

      if (mode.value === 'none' || isPinching.value) {
        mode.value = 'none';
        return;
      }

      const deltaX = e.translationX - panOffsetX.value;
      const deltaY = e.translationY - panOffsetY.value;

      if (mode.value === 'drag') {
        const maxTX = Math.max(0, (SCREEN_W * (scale.value - 1)) / 2);
        const maxTY = Math.max(0, (SCREEN_H * (scale.value - 1)) / 2);
        const cx = clampV(translateX.value, -maxTX, maxTX);
        const cy = clampV(translateY.value, -maxTY, maxTY);
        if (cx !== translateX.value || cy !== translateY.value) {
          translateX.value = withSpring(cx, SPRING_CONFIG);
          translateY.value = withSpring(cy, SPRING_CONFIG);
        }
        savedTranslateX.value = cx;
        savedTranslateY.value = cy;
      } else if (mode.value === 'swipe') {
        const canNext = currentIndexSV.value < totalCount - 1;
        const canPrev = currentIndexSV.value > 0;
        const goNext =
          canNext && (deltaX < -SWIPE_THRESHOLD || e.velocityX < -VELOCITY_THRESHOLD);
        const goPrev =
          canPrev && (deltaX > SWIPE_THRESHOLD || e.velocityX > VELOCITY_THRESHOLD);

        if (goNext) {
          const target = currentIndexSV.value + 1;
          pageTranslateX.value = withSpring(-SCREEN_W, SPRING_CONFIG, (fin) => {
            'worklet';
            if (fin) {
              currentIndexSV.value = target;
              pageTranslateX.value = 0;
              scheduleOnRN(onPageChange, target);
            }
          });
        } else if (goPrev) {
          const target = currentIndexSV.value - 1;
          pageTranslateX.value = withSpring(SCREEN_W, SPRING_CONFIG, (fin) => {
            'worklet';
            if (fin) {
              currentIndexSV.value = target;
              pageTranslateX.value = 0;
              scheduleOnRN(onPageChange, target);
            }
          });
        } else {
          pageTranslateX.value = withSpring(0, SPRING_CONFIG);
        }
      } else if (mode.value === 'dismiss') {
        if (
          Math.abs(deltaY) > DISMISS_THRESHOLD ||
          Math.abs(e.velocityY) > 800
        ) {
          const dir = deltaY > 0 ? 1 : -1;
          dismissY.value = withTiming(dir * SCREEN_H, EXIT_DURATION);
          backdropOpacity.value = withTiming(0, EXIT_DURATION, () => {
            scheduleOnRN(onDismiss);
          });
        } else {
          dismissY.value = withSpring(0, SPRING_CONFIG);
          backdropOpacity.value = withSpring(1, SPRING_CONFIG);
        }
      }

      mode.value = 'none';
    });

  const tapGestures = Gesture.Exclusive(doubleTap, singleTap);
  const composed = Gesture.Simultaneous(
    tapGestures,
    Gesture.Simultaneous(pinch, pan)
  );

  const animStyle = useAnimatedStyle(() => {
    const pageX = (index - currentIndexSV.value) * SCREEN_W + pageTranslateX.value;
    return {
      opacity: backdropOpacity.value,
      transform: [
        { translateX: pageX + translateX.value },
        { translateY: translateY.value + dismissY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.imagePage, animStyle]}>
        <Image
          source={{ uri }}
          style={styles.fullImage}
          contentFit="contain"
          recyclingKey={uri}
        />
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Overlay ─────────────────────────────────────────────────────────────────

function ImagePreviewOverlay({
  visible,
  options,
  onClose,
}: {
  visible: boolean;
  options: ImagePreviewOptions | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = React.useState(false);
  const [renderIndex, setRenderIndex] = React.useState(0);

  const backdropOpacity = useSharedValue(0);
  const pageTranslateX = useSharedValue(0);
  const currentIndexSV = useSharedValue(0);

  const images = React.useMemo(
    () => (options?.images ?? []).map(toUri),
    [options?.images]
  );
  const total = images.length;

  React.useEffect(() => {
    if (visible && options) {
      const idx = options.initialIndex ?? 0;
      currentIndexSV.value = idx;
      setRenderIndex(idx);
      pageTranslateX.value = 0;
      setMounted(true);
      backdropOpacity.value = withTiming(1, ENTER_DURATION);
    } else if (!visible && mounted) {
      backdropOpacity.value = withTiming(0, EXIT_DURATION, (fin) => {
        if (fin) scheduleOnRN(setMounted, false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useAnimatedReaction(
    () => currentIndexSV.value,
    (val) => scheduleOnRN(setRenderIndex, val)
  );

  React.useEffect(() => {
    if (Platform.OS !== 'android' || !mounted) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const handleClose = React.useCallback(() => {
    backdropOpacity.value = withTiming(0, EXIT_DURATION, (fin) => {
      if (fin) {
        scheduleOnRN(setMounted, false);
        scheduleOnRN(onClose);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  const handlePageChange = React.useCallback(
    (idx: number) => {
      setRenderIndex(idx);
      options?.onChange?.(idx);
    },
    [options]
  );

  const handleDismiss = React.useCallback(() => {
    setMounted(false);
    onClose();
  }, [onClose]);

  const handleTapClose = React.useCallback(() => {
    backdropOpacity.value = withTiming(0, EXIT_DURATION, (fin) => {
      if (fin) {
        scheduleOnRN(setMounted, false);
        scheduleOnRN(onClose);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const uiOpacityStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!mounted) return null;

  const renderRange = [renderIndex - 1, renderIndex, renderIndex + 1].filter(
    (i) => i >= 0 && i < total
  );

  return (
    <View style={styles.root} pointerEvents={mounted ? 'auto' : 'none'}>
      <Animated.View style={[styles.backdrop, backdropStyle]} />

      {renderRange.map((idx) => (
        <ZoomableImage
          key={idx}
          uri={images[idx]}
          index={idx}
          currentIndexSV={currentIndexSV}
          pageTranslateX={pageTranslateX}
          backdropOpacity={backdropOpacity}
          totalCount={total}
          onPageChange={handlePageChange}
          onDismiss={handleDismiss}
          onTapClose={handleTapClose}
          tapToClose={options?.tapToClose ?? true}
        />
      ))}

      <Animated.View style={[styles.closeBtnWrap, { top: insets.top + wp(8) }, uiOpacityStyle]}>
        <CloseButton onPress={handleClose} top={0} />
      </Animated.View>

      {total > 1 && (
        <Animated.View
          style={[styles.indicator, { bottom: insets.bottom + wp(24) }, uiOpacityStyle]}
          pointerEvents="none"
        >
          <Text style={styles.indicatorText}>
            {renderIndex + 1} / {total}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Provider ────────────────────────────────────────────────────────────────

/**
 * 图片预览服务 Provider
 * @description 需要在应用根组件中包裹，已内置于 ComponentLibProvider
 */
export function ImagePreviewProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<PreviewState>({
    visible: false,
    options: null,
  });

  const optionsRef = React.useRef(state.options);
  optionsRef.current = state.options;

  React.useEffect(() => {
    imagePreview._bind(setState);
  }, []);

  const handleClose = React.useCallback(() => {
    setState((p) => ({ ...p, visible: false }));
    optionsRef.current?.onClose?.();
  }, []);

  return (
    <>
      {children}
      <ImagePreviewOverlay
        visible={state.visible}
        options={state.options}
        onClose={handleClose}
      />
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: Platform.OS === 'android' ? 99 : 0,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  imagePage: {
    position: 'absolute',
    width: SCREEN_W,
    height: SCREEN_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  closeBtnWrap: {
    position: 'absolute',
    left: 0,
    zIndex: 10,
  },
  closeBtn: {
    position: 'relative',
    left: wp(16),
    zIndex: 10,
  },
  closeBg: {
    width: wp(32),
    height: wp(32),
    borderRadius: wp(16),
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeLine: {
    position: 'absolute',
    width: wp(16),
    height: wp(2),
    backgroundColor: '#FFFFFF',
    borderRadius: wp(1),
  },
  indicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  indicatorText: {
    fontSize: wp(14),
    color: '#FFFFFF',
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: wp(1) },
    textShadowRadius: wp(3),
  },
});
