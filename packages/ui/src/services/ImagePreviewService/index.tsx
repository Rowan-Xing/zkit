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
  Platform,
  BackHandler,
  TouchableOpacity,
  useWindowDimensions,
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
import { Image, type ImageLoadEventData } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { wp } from 'y2kit-tools';
import { Text } from '../../ui/Text';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const PINCH_MIN_SCALE = 0.72;
const PINCH_MAX_SCALE = MAX_SCALE * 1.14;
const DOUBLE_TAP_SCALE = 2.5;
const SCALE_EPSILON = 0.02;
const VELOCITY_THRESHOLD = 520;
const DISMISS_VELOCITY_THRESHOLD = 900;
const MODE_LOCK_DISTANCE = wp(8);
const EDGE_RESISTANCE = 0.34;
const TAP_SUPPRESSION_RELEASE_DURATION = 320;

const SPRING_CONFIG = { damping: 28, stiffness: 280, mass: 0.62 };
const ENTER_DURATION = { duration: 260 };
const EXIT_DURATION = { duration: 200 };
const RESET_DURATION = { duration: 220 };

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

type Viewport = {
  width: number;
  height: number;
};

type ImageSize = {
  width: number;
  height: number;
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

function rubberClampV(v: number, min: number, max: number): number {
  'worklet';
  if (v < min) return min + (v - min) * EDGE_RESISTANCE;
  if (v > max) return max + (v - max) * EDGE_RESISTANCE;
  return v;
}

function resolveContainedSize(image: ImageSize | null, viewport: Viewport): ImageSize {
  if (!image?.width || !image.height || !viewport.width || !viewport.height) {
    return viewport;
  }

  const ratio = Math.min(viewport.width / image.width, viewport.height / image.height);
  return {
    width: image.width * ratio,
    height: image.height * ratio,
  };
}

function getPanBounds(
  nextScale: number,
  contentWidth: number,
  contentHeight: number,
  viewportWidth: number,
  viewportHeight: number
) {
  'worklet';
  return {
    maxX: Math.max(0, (contentWidth * nextScale - viewportWidth) / 2),
    maxY: Math.max(0, (contentHeight * nextScale - viewportHeight) / 2),
  };
}

function clampTranslation(
  x: number,
  y: number,
  nextScale: number,
  contentWidth: number,
  contentHeight: number,
  viewportWidth: number,
  viewportHeight: number
) {
  'worklet';
  const bounds = getPanBounds(
    nextScale,
    contentWidth,
    contentHeight,
    viewportWidth,
    viewportHeight
  );
  return {
    x: clampV(x, -bounds.maxX, bounds.maxX),
    y: clampV(y, -bounds.maxY, bounds.maxY),
  };
}

function scaleAroundFocal(
  startTranslate: number,
  startScale: number,
  nextScale: number,
  focal: number
): number {
  'worklet';
  if (startScale <= 0) return startTranslate;
  return startTranslate + (1 - nextScale / startScale) * (focal - startTranslate);
}

function normalizeIndex(index: number | undefined, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.max(index ?? 0, 0), total - 1);
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

type GestureMode = 'none' | 'drag' | 'swipe' | 'dismiss' | 'pinch' | 'undecided';

function ZoomableImage({
  uri,
  index,
  viewport,
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
  viewport: Viewport;
  currentIndexSV: SharedValue<number>;
  pageTranslateX: SharedValue<number>;
  backdropOpacity: SharedValue<number>;
  totalCount: number;
  onPageChange: (newIndex: number) => void;
  onDismiss: () => void;
  onTapClose: () => void;
  tapToClose: boolean;
}) {
  const [naturalSize, setNaturalSize] = React.useState<ImageSize | null>(null);
  const contentSize = React.useMemo(
    () => resolveContainedSize(naturalSize, viewport),
    [naturalSize, viewport]
  );
  const viewportStyle = React.useMemo(
    () => ({ width: viewport.width, height: viewport.height }),
    [viewport.height, viewport.width]
  );

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dismissY = useSharedValue(0);
  const mode = useSharedValue<GestureMode>('none');
  const tapSuppression = useSharedValue(0);

  const contentWidth = useSharedValue(contentSize.width);
  const contentHeight = useSharedValue(contentSize.height);
  const gestureScale = useSharedValue(1);
  const gestureTranslateX = useSharedValue(0);
  const gestureTranslateY = useSharedValue(0);
  const gestureFocalX = useSharedValue(0);
  const gestureFocalY = useSharedValue(0);
  const gestureBoundX = useSharedValue(0);
  const gestureBoundY = useSharedValue(0);
  const currentFocalX = useSharedValue(0);
  const currentFocalY = useSharedValue(0);

  React.useEffect(() => {
    contentWidth.value = contentSize.width;
    contentHeight.value = contentSize.height;

    if (mode.value !== 'none') return;

    const clamped = clampTranslation(
      translateX.value,
      translateY.value,
      scale.value,
      contentSize.width,
      contentSize.height,
      viewport.width,
      viewport.height
    );

    translateX.value = withSpring(clamped.x, SPRING_CONFIG);
    translateY.value = withSpring(clamped.y, SPRING_CONFIG);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentSize.height, contentSize.width, viewport.height, viewport.width]);

  const handleImageLoad = React.useCallback((event: ImageLoadEventData) => {
    const { height, width } = event.source;
    if (width > 0 && height > 0) {
      setNaturalSize((prev) =>
        prev?.width === width && prev.height === height ? prev : { width, height }
      );
    }
  }, []);

  const resetImageTransform = () => {
    'worklet';
    cancelAnimation(scale);
    cancelAnimation(translateX);
    cancelAnimation(translateY);
    scale.value = withTiming(MIN_SCALE, RESET_DURATION);
    translateX.value = withTiming(0, RESET_DURATION);
    translateY.value = withTiming(0, RESET_DURATION);
  };

  const blockTap = () => {
    'worklet';
    cancelAnimation(tapSuppression);
    tapSuppression.value = 1;
  };

  const releaseTap = () => {
    'worklet';
    tapSuppression.value = withTiming(0, { duration: TAP_SUPPRESSION_RELEASE_DURATION });
  };

  const settleImageTransform = () => {
    'worklet';
    cancelAnimation(scale);
    cancelAnimation(translateX);
    cancelAnimation(translateY);

    let targetScale = clampV(scale.value, MIN_SCALE, MAX_SCALE);
    if (targetScale <= MIN_SCALE + SCALE_EPSILON) {
      targetScale = MIN_SCALE;
      scale.value = withSpring(targetScale, SPRING_CONFIG);
      translateX.value = withSpring(0, SPRING_CONFIG);
      translateY.value = withSpring(0, SPRING_CONFIG);
      return;
    }

    let targetX = translateX.value;
    let targetY = translateY.value;

    if (targetScale !== scale.value) {
      targetX = scaleAroundFocal(
        translateX.value,
        scale.value,
        targetScale,
        currentFocalX.value
      );
      targetY = scaleAroundFocal(
        translateY.value,
        scale.value,
        targetScale,
        currentFocalY.value
      );
    }

    const bounds = getPanBounds(
      targetScale,
      contentWidth.value,
      contentHeight.value,
      viewport.width,
      viewport.height
    );
    const clamped = {
      x: clampV(targetX, -bounds.maxX, bounds.maxX),
      y: clampV(targetY, -bounds.maxY, bounds.maxY),
    };

    scale.value = withSpring(targetScale, SPRING_CONFIG);
    translateX.value = withSpring(clamped.x, SPRING_CONFIG);
    translateY.value = withSpring(clamped.y, SPRING_CONFIG);
  };

  useAnimatedReaction(
    () => currentIndexSV.value,
    (curr, prev) => {
      if (prev !== null && prev === index && curr !== index) {
        resetImageTransform();
        dismissY.value = 0;
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
      if (mode.value !== 'none') return;
      if (tapSuppression.value > 0.01) return;
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
      if (mode.value !== 'none') return;
      if (tapSuppression.value > 0.01) return;
      cancelAnimation(scale);
      cancelAnimation(translateX);
      cancelAnimation(translateY);

      if (scale.value > 1.05) {
        resetImageTransform();
      } else {
        const targetScale = Math.min(DOUBLE_TAP_SCALE, MAX_SCALE);
        const focalX = e.x - viewport.width / 2;
        const focalY = e.y - viewport.height / 2;
        const targetX = scaleAroundFocal(0, MIN_SCALE, targetScale, focalX);
        const targetY = scaleAroundFocal(0, MIN_SCALE, targetScale, focalY);
        const clamped = clampTranslation(
          targetX,
          targetY,
          targetScale,
          contentWidth.value,
          contentHeight.value,
          viewport.width,
          viewport.height
        );

        currentFocalX.value = focalX;
        currentFocalY.value = focalY;
        scale.value = withTiming(targetScale, RESET_DURATION);
        translateX.value = withTiming(clamped.x, RESET_DURATION);
        translateY.value = withTiming(clamped.y, RESET_DURATION);
      }
    });

  // ── Pinch: zoom with focal point ──
  const pinch = Gesture.Pinch()
    .onStart((e) => {
      'worklet';
      if (currentIndexSV.value !== index) return;
      blockTap();
      mode.value = 'pinch';
      cancelAnimation(scale);
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      cancelAnimation(pageTranslateX);
      cancelAnimation(dismissY);
      pageTranslateX.value = 0;
      dismissY.value = 0;
      backdropOpacity.value = withSpring(1, SPRING_CONFIG);

      gestureScale.value = scale.value;
      gestureTranslateX.value = translateX.value;
      gestureTranslateY.value = translateY.value;
      gestureFocalX.value = e.focalX - viewport.width / 2;
      gestureFocalY.value = e.focalY - viewport.height / 2;
      currentFocalX.value = gestureFocalX.value;
      currentFocalY.value = gestureFocalY.value;
    })
    .onUpdate((e) => {
      'worklet';
      if (currentIndexSV.value !== index) return;
      if (e.numberOfPointers < 2) return;
      const nextScale = clampV(gestureScale.value * e.scale, PINCH_MIN_SCALE, PINCH_MAX_SCALE);
      const focalX = e.focalX - viewport.width / 2;
      const focalY = e.focalY - viewport.height / 2;
      const ratio = nextScale / gestureScale.value;
      const nextX =
        gestureTranslateX.value +
        (focalX - gestureFocalX.value) +
        (1 - ratio) * (gestureFocalX.value - gestureTranslateX.value);
      const nextY =
        gestureTranslateY.value +
        (focalY - gestureFocalY.value) +
        (1 - ratio) * (gestureFocalY.value - gestureTranslateY.value);
      const bounds = getPanBounds(
        nextScale,
        contentWidth.value,
        contentHeight.value,
        viewport.width,
        viewport.height
      );

      currentFocalX.value = focalX;
      currentFocalY.value = focalY;
      scale.value = nextScale;
      translateX.value = rubberClampV(nextX, -bounds.maxX, bounds.maxX);
      translateY.value = rubberClampV(nextY, -bounds.maxY, bounds.maxY);
    })
    .onEnd(() => {
      'worklet';
      if (currentIndexSV.value !== index) return;
      settleImageTransform();
      mode.value = 'none';
      releaseTap();
    })
    .onFinalize(() => {
      'worklet';
      if (mode.value === 'pinch') {
        settleImageTransform();
        mode.value = 'none';
        releaseTap();
      }
    });

  // ── Pan: drag (zoomed) / page swipe / dismiss ──
  const pan = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .minDistance(1)
    .averageTouches(true)
    .onStart(() => {
      'worklet';
      if (currentIndexSV.value !== index) return;
      blockTap();

      cancelAnimation(translateX);
      cancelAnimation(translateY);
      cancelAnimation(pageTranslateX);
      cancelAnimation(dismissY);
      cancelAnimation(backdropOpacity);

      gestureTranslateX.value = translateX.value;
      gestureTranslateY.value = translateY.value;
      const bounds = getPanBounds(
        scale.value,
        contentWidth.value,
        contentHeight.value,
        viewport.width,
        viewport.height
      );
      gestureBoundX.value = bounds.maxX;
      gestureBoundY.value = bounds.maxY;
      pageTranslateX.value = 0;
      dismissY.value = 0;
      backdropOpacity.value = withSpring(1, SPRING_CONFIG);
      mode.value = scale.value > MIN_SCALE + SCALE_EPSILON ? 'drag' : 'undecided';
    })
    .onUpdate((e) => {
      'worklet';
      if (currentIndexSV.value !== index) return;
      const deltaX = e.translationX;
      const deltaY = e.translationY;

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
        const nextX = gestureTranslateX.value + deltaX;
        const nextY = gestureTranslateY.value + deltaY;
        translateX.value = rubberClampV(nextX, -gestureBoundX.value, gestureBoundX.value);
        translateY.value = rubberClampV(nextY, -gestureBoundY.value, gestureBoundY.value);
      } else if (mode.value === 'swipe') {
        let tx = deltaX;
        const canNext = currentIndexSV.value < totalCount - 1;
        const canPrev = currentIndexSV.value > 0;
        if ((!canPrev && tx > 0) || (!canNext && tx < 0)) {
          tx *= EDGE_RESISTANCE;
        }
        pageTranslateX.value = tx;
      } else if (mode.value === 'dismiss') {
        const dragY = Math.max(0, deltaY);
        dismissY.value = dragY;
        const progress = dragY / (viewport.height * 0.42);
        backdropOpacity.value = interpolate(
          progress,
          [0, 1],
          [1, 0.1],
          Extrapolation.CLAMP
        );
      }
    })
    .onEnd((e) => {
      'worklet';
      if (currentIndexSV.value !== index) return;

      if (mode.value === 'none') {
        mode.value = 'none';
        return;
      }

      const deltaX = e.translationX;
      const deltaY = e.translationY;

      if (mode.value === 'drag') {
        settleImageTransform();
        releaseTap();
      } else if (mode.value === 'swipe') {
        const canNext = currentIndexSV.value < totalCount - 1;
        const canPrev = currentIndexSV.value > 0;
        const swipeThreshold = viewport.width * 0.23;
        const goNext =
          canNext && (deltaX < -swipeThreshold || e.velocityX < -VELOCITY_THRESHOLD);
        const goPrev =
          canPrev && (deltaX > swipeThreshold || e.velocityX > VELOCITY_THRESHOLD);

        if (goNext) {
          const target = currentIndexSV.value + 1;
          pageTranslateX.value = withSpring(-viewport.width, SPRING_CONFIG, (fin) => {
            'worklet';
            if (fin) {
              currentIndexSV.value = target;
              pageTranslateX.value = 0;
              releaseTap();
              scheduleOnRN(onPageChange, target);
            }
          });
        } else if (goPrev) {
          const target = currentIndexSV.value - 1;
          pageTranslateX.value = withSpring(viewport.width, SPRING_CONFIG, (fin) => {
            'worklet';
            if (fin) {
              currentIndexSV.value = target;
              pageTranslateX.value = 0;
              releaseTap();
              scheduleOnRN(onPageChange, target);
            }
          });
        } else {
          pageTranslateX.value = withSpring(0, SPRING_CONFIG, (fin) => {
            'worklet';
            if (fin) releaseTap();
          });
        }
      } else if (mode.value === 'dismiss') {
        const dismissThreshold = viewport.height * 0.12;
        if (
          deltaY > dismissThreshold ||
          e.velocityY > DISMISS_VELOCITY_THRESHOLD
        ) {
          dismissY.value = withTiming(viewport.height, EXIT_DURATION);
          backdropOpacity.value = withTiming(0, EXIT_DURATION, () => {
            scheduleOnRN(onDismiss);
          });
        } else {
          dismissY.value = withSpring(0, SPRING_CONFIG);
          backdropOpacity.value = withSpring(1, SPRING_CONFIG);
          releaseTap();
        }
      }

      mode.value = 'none';
    })
    .onFinalize(() => {
      'worklet';
      if (mode.value === 'pinch') return;
      if (mode.value === 'none') return;
      if (mode.value === 'drag') {
        settleImageTransform();
      } else if (mode.value === 'swipe') {
        pageTranslateX.value = withSpring(0, SPRING_CONFIG);
      } else if (mode.value === 'dismiss') {
        dismissY.value = withSpring(0, SPRING_CONFIG);
        backdropOpacity.value = withSpring(1, SPRING_CONFIG);
      }
      mode.value = 'none';
      releaseTap();
    });

  const tapGestures = Gesture.Exclusive(doubleTap, singleTap);
  const composed = Gesture.Simultaneous(
    tapGestures,
    Gesture.Simultaneous(pinch, pan)
  );

  const pageStyle = useAnimatedStyle(() => {
    const pageX = (index - currentIndexSV.value) * viewport.width + pageTranslateX.value;
    return {
      opacity: backdropOpacity.value,
      transform: [
        { translateX: pageX },
        { translateY: dismissY.value },
      ],
    };
  });

  const imageTranslateStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const imageScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.imagePage, viewportStyle, pageStyle]}>
        <Animated.View style={[styles.imageTransformLayer, viewportStyle, imageTranslateStyle]}>
          <Animated.View style={[styles.imageTransformLayer, viewportStyle, imageScaleStyle]}>
            <Image
              source={{ uri }}
              style={viewportStyle}
              contentFit="contain"
              recyclingKey={uri}
              onLoad={handleImageLoad}
            />
          </Animated.View>
        </Animated.View>
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
  const window = useWindowDimensions();
  const [mounted, setMounted] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  const [renderIndex, setRenderIndex] = React.useState(0);
  const closingRef = React.useRef(false);

  const backdropOpacity = useSharedValue(0);
  const pageTranslateX = useSharedValue(0);
  const currentIndexSV = useSharedValue(0);

  const viewport = React.useMemo(
    () => ({ width: window.width, height: window.height }),
    [window.height, window.width]
  );

  const images = React.useMemo(
    () => (options?.images ?? []).map(toUri),
    [options?.images]
  );
  const total = images.length;

  React.useEffect(() => {
    if (visible && options && total > 0) {
      const idx = normalizeIndex(options.initialIndex, total);
      closingRef.current = false;
      setClosing(false);
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
  }, [options, total, visible]);

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
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
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
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    setMounted(false);
    onClose();
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
    <View style={styles.root} pointerEvents={mounted && !closing ? 'auto' : 'none'}>
      <Animated.View style={[styles.backdrop, backdropStyle]} />

      {renderRange.map((idx) => (
        <ZoomableImage
          key={idx}
          uri={images[idx]}
          index={idx}
          viewport={viewport}
          currentIndexSV={currentIndexSV}
          pageTranslateX={pageTranslateX}
          backdropOpacity={backdropOpacity}
          totalCount={total}
          onPageChange={handlePageChange}
          onDismiss={handleDismiss}
          onTapClose={handleClose}
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
    overflow: 'hidden',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  imagePage: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imageTransformLayer: {
    justifyContent: 'center',
    alignItems: 'center',
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
