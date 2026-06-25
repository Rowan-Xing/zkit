/**
 * @file ImagePreviewService
 *
 * A full-screen image preview primitive plus a global imperative service.
 * The declarative component owns the controlled/uncontrolled state model;
 * the service only schedules one preview instance through ImagePreviewProvider.
 */

import * as React from 'react';
import { Feather } from '@expo/vector-icons';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  ReduceMotion,
  cancelAnimation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Image,
  type ImageErrorEventData,
  type ImageLoadEventData,
  type ImageProps,
  type ImageSource,
  type ImageStyle,
} from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { wp } from 'y2kit-tools';
import { useI18n } from '../../i18n/useI18n';
import { useTheme } from '../../theme/useTheme';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { Text } from '../../ui/Text';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const SCALE_EPSILON = 0.02;
const TRANSLATE_EPSILON = wp(0.5);
const VELOCITY_THRESHOLD = 520;
const DISMISS_VELOCITY_THRESHOLD = 900;
const MODE_LOCK_DISTANCE = wp(8);
const EDGE_RESISTANCE = 0.34;
const TAP_SUPPRESSION_RELEASE_DURATION = 320;
const DEFAULT_RENDER_AHEAD = 1;
const MAX_RENDER_AHEAD = 2;
const DEFAULT_Z_INDEX = 9999;

const CLOSE_BUTTON_SIDE = wp(40);
const CLOSE_BUTTON_LEFT = wp(14);
const CLOSE_BUTTON_TOP = wp(8);
const CLOSE_ICON_SIZE = wp(22);
const CONTROL_HIT_SLOP = wp(12);
const CONTROL_RADIUS = wp(20);
const BOTTOM_CHROME_OFFSET = wp(24);
const BOTTOM_CHROME_GAP = wp(10);
const COUNTER_MIN_HEIGHT = wp(28);
const COUNTER_PADDING_HORIZONTAL = wp(12);
const COUNTER_RADIUS = wp(14);
const COUNTER_FONT_SIZE = 13;
const COUNTER_LINE_HEIGHT = 18;
const ERROR_CARD_MAX_WIDTH = wp(260);
const ERROR_CARD_PADDING_HORIZONTAL = wp(16);
const ERROR_CARD_PADDING_VERTICAL = wp(14);
const ERROR_CARD_RADIUS = wp(14);
const ERROR_ICON_SIZE = wp(24);
const ERROR_ICON_MARGIN_BOTTOM = wp(8);
const ERROR_TEXT_SIZE = 13;
const ERROR_TEXT_LINE_HEIGHT = 18;
const LOADING_SPINNER_SIZE = wp(42);

const SPRING_CONFIG = { damping: 28, stiffness: 280, mass: 0.62 };
const ENTER_TIMING = {
  duration: 220,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};
const EXIT_TIMING = {
  duration: 180,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};
const RESET_TIMING = {
  duration: 220,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};
const CHROME_TIMING = {
  duration: 160,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};
const ANDROID_REMOTE_ACCEPT_HEADER = 'image/jpeg,image/png,image/webp,*/*';

export type ImagePreviewSource = NonNullable<ImageProps['source']>;

export type ImagePreviewImageDescriptor = ImageSource & {
  id?: string;
  source?: ImagePreviewSource;
  alt?: string;
  accessibilityLabel?: string;
};

export type ImagePreviewImage = ImagePreviewSource | ImagePreviewImageDescriptor;

export type ImagePreviewTapBehavior = 'toggleChrome' | 'close' | 'none';

export type ImagePreviewCloseReason =
  | 'api'
  | 'back'
  | 'closeButton'
  | 'empty'
  | 'replace'
  | 'swipeDown'
  | 'tap'
  | 'unmount';

export type ImagePreviewChangeReason = 'api' | 'controlled' | 'swipe';

export type ImagePreviewOpenChangeReason = 'api' | ImagePreviewCloseReason;

export type ImagePreviewResolvedImage = {
  key: string;
  source: ImagePreviewSource;
  uri?: string;
  width?: number;
  height?: number;
  alt?: string;
  accessibilityLabel?: string;
  raw: ImagePreviewImage;
};

export type ImagePreviewOpenChangeMeta = {
  reason: ImagePreviewOpenChangeReason;
  value: number;
  image: ImagePreviewResolvedImage | null;
  total: number;
};

export type ImagePreviewChangeMeta = {
  reason: ImagePreviewChangeReason;
  previousValue: number;
  value: number;
  image: ImagePreviewResolvedImage | null;
  total: number;
};

export type ImagePreviewResult = {
  reason: ImagePreviewCloseReason;
  value: number;
  image: ImagePreviewResolvedImage | null;
  total: number;
};

export type ImagePreviewPrefetchCachePolicy = 'disk' | 'memory' | 'memory-disk';

export type ImagePreviewInteractions = {
  tapBehavior?: ImagePreviewTapBehavior;
  pinchToZoom?: boolean;
  doubleTapToZoom?: boolean;
  swipeToChange?: boolean;
  swipeDownToClose?: boolean;
  backToClose?: boolean;
};

export type ImagePreviewColors = {
  backdrop?: string;
  controlBackground?: string;
  controlForeground?: string;
  counterBackground?: string;
  counterText?: string;
  errorBackground?: string;
  errorText?: string;
  loading?: string;
};

export type ImagePreviewLabels = {
  preview: string;
  close: string;
  loadFailed: string;
  counter: (current: number, total: number) => string;
  image: (current: number, total: number) => string;
};

export type ImagePreviewImageProps = Omit<
  ImageProps,
  | 'accessibilityLabel'
  | 'alt'
  | 'children'
  | 'contentFit'
  | 'onError'
  | 'onLoad'
  | 'onLoadStart'
  | 'recyclingKey'
  | 'source'
  | 'style'
>;

export type ImagePreviewRenderContext = {
  open: boolean;
  value: number;
  image: ImagePreviewResolvedImage | null;
  total: number;
  close: (reason?: ImagePreviewCloseReason) => void;
  setValue: (value: number) => void;
};

export type ImagePreviewRef = {
  close: (reason?: ImagePreviewCloseReason) => void;
  setValue: (value: number) => void;
  getValue: () => number;
};

export type ImagePreviewProps = {
  images: readonly ImagePreviewImage[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, meta: ImagePreviewOpenChangeMeta) => void;

  value?: number;
  defaultValue?: number;
  onChange?: (value: number, meta: ImagePreviewChangeMeta) => void;
  onClose?: (result: ImagePreviewResult) => void;

  disabled?: boolean;
  dismissible?: boolean;
  interactions?: ImagePreviewInteractions;
  closeButton?: boolean;
  counter?: boolean;
  renderAhead?: number;
  prefetch?: boolean | 'adjacent' | 'all';
  prefetchCachePolicy?: ImagePreviewPrefetchCachePolicy;

  contentFit?: NonNullable<ImageProps['contentFit']>;
  imageProps?: ImagePreviewImageProps;
  imageStyle?: StyleProp<ImageStyle>;
  rootStyle?: StyleProp<ViewStyle>;
  colors?: ImagePreviewColors;
  labels?: Partial<ImagePreviewLabels>;
  modalProps?: Omit<React.ComponentProps<typeof Modal>, 'children' | 'onRequestClose' | 'transparent' | 'visible'>;

  renderHeader?: (context: ImagePreviewRenderContext) => React.ReactNode;
  renderFooter?: (context: ImagePreviewRenderContext) => React.ReactNode;
  renderOverlay?: (context: ImagePreviewRenderContext) => React.ReactNode;

  onImageLoad?: (
    event: ImageLoadEventData,
    meta: { value: number; image: ImagePreviewResolvedImage }
  ) => void;
  onImageError?: (
    event: ImageErrorEventData,
    meta: { value: number; image: ImagePreviewResolvedImage }
  ) => void;

  testID?: ViewProps['testID'];
  accessibilityLabel?: ViewProps['accessibilityLabel'];
};

export type ImagePreviewOpenOptions = Omit<
  ImagePreviewProps,
  'defaultOpen' | 'defaultValue' | 'onClose' | 'open' | 'value'
> & {
  index?: number;
  onClose?: (result: ImagePreviewResult) => void;
};

export type ImagePreviewServiceHandle = {
  id: number;
  result: Promise<ImagePreviewResult>;
  close: (reason?: ImagePreviewCloseReason) => void;
  setValue: (value: number) => void;
  getSnapshot: () => ImagePreviewServiceSnapshot;
};

export type ImagePreviewServiceSnapshot = {
  open: boolean;
  value: number;
  image: ImagePreviewResolvedImage | null;
  total: number;
};

type ImageSize = {
  width: number;
  height: number;
};

type Viewport = {
  width: number;
  height: number;
};

type GestureMode = 'drag' | 'dismiss' | 'none' | 'pinch' | 'swipe' | 'undecided';

type ResolvedInteractions = Required<ImagePreviewInteractions>;

type ResolvedColors = Required<ImagePreviewColors>;

type ImagePreviewServiceRequest = ImagePreviewOpenOptions & {
  id: number;
  index: number;
  result: Promise<ImagePreviewResult>;
  resolve: (result: ImagePreviewResult) => void;
  settled: boolean;
};

type ImagePreviewServiceController = {
  open: (request: ImagePreviewServiceRequest) => void;
  close: (reason: ImagePreviewCloseReason) => void;
  setValue: (value: number) => void;
  getSnapshot: () => ImagePreviewServiceSnapshot;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeIndex(index: number | undefined, total: number): number {
  if (total <= 0) return 0;
  if (!isFiniteNumber(index)) return 0;
  return clampNumber(Math.round(index), 0, total - 1);
}

function clampRenderAhead(value: number | undefined) {
  if (!isFiniteNumber(value)) return DEFAULT_RENDER_AHEAD;
  return clampNumber(Math.round(value), 0, MAX_RENDER_AHEAD);
}

function clampV(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

function rubberClampV(value: number, min: number, max: number): number {
  'worklet';
  if (value < min) return min + (value - min) * EDGE_RESISTANCE;
  if (value > max) return max + (value - max) * EDGE_RESISTANCE;
  return value;
}

function rubberClampAxis(value: number, max: number): number {
  'worklet';
  if (max <= TRANSLATE_EPSILON) return 0;
  return rubberClampV(value, -max, max);
}

function getViewportPanBounds(nextScale: number, viewportWidth: number, viewportHeight: number) {
  'worklet';
  const delta = Math.max(0, nextScale - MIN_SCALE);
  return {
    maxX: (viewportWidth * delta) / 2,
    maxY: (viewportHeight * delta) / 2,
  };
}

function hasOwnKey<T extends string>(value: object, key: T): value is Record<T, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isSharedRefLike(value: object) {
  return hasOwnKey(value, 'nativeRefType');
}

function isImageDescriptor(image: ImagePreviewImage): image is ImagePreviewImageDescriptor {
  if (typeof image !== 'object' || image === null || Array.isArray(image)) return false;
  if (isSharedRefLike(image)) return false;

  return (
    hasOwnKey(image, 'accessibilityLabel') ||
    hasOwnKey(image, 'alt') ||
    hasOwnKey(image, 'blurhash') ||
    hasOwnKey(image, 'cacheKey') ||
    hasOwnKey(image, 'headers') ||
    hasOwnKey(image, 'height') ||
    hasOwnKey(image, 'id') ||
    hasOwnKey(image, 'source') ||
    hasOwnKey(image, 'thumbhash') ||
    hasOwnKey(image, 'uri') ||
    hasOwnKey(image, 'width')
  );
}

function getSourceUri(source: ImagePreviewSource | undefined): string | undefined {
  if (typeof source === 'string') return source;
  if (typeof source === 'number' || source == null) return undefined;
  if (Array.isArray(source)) {
    for (const item of source) {
      const uri = getSourceUri(item as ImagePreviewSource);
      if (uri) return uri;
    }
    return undefined;
  }
  return (source as ImageSource).uri;
}

function isRemoteUri(uri: string | undefined) {
  return !!uri && /^https?:\/\//i.test(uri);
}

function normalizeImageSourceObject(source: ImageSource): ImageSource {
  if (Platform.OS !== 'android' || !isRemoteUri(source.uri)) return source;

  const headers = source.headers;
  if (headers?.Accept || headers?.accept) return source;

  return {
    ...source,
    headers: {
      ...headers,
      Accept: ANDROID_REMOTE_ACCEPT_HEADER,
    },
  };
}

function normalizeRenderableSource(source: ImagePreviewSource): ImagePreviewSource {
  if (typeof source === 'string') {
    return normalizeImageSourceObject({ uri: source });
  }

  if (Array.isArray(source)) {
    return source.map((item) =>
      typeof item === 'string'
        ? normalizeImageSourceObject({ uri: item })
        : normalizeImageSourceObject(item)
    ) as ImagePreviewSource;
  }

  if (typeof source === 'object' && source !== null && !isSharedRefLike(source)) {
    return normalizeImageSourceObject(source as ImageSource);
  }

  return source;
}

function getSourceSize(source: ImagePreviewSource | undefined): ImageSize | null {
  if (!source || typeof source === 'string' || typeof source === 'number') return null;

  if (Array.isArray(source)) {
    for (const item of source) {
      const size = getSourceSize(item as ImagePreviewSource);
      if (size) return size;
    }
    return null;
  }

  const sourceObject = source as ImageSource;
  const width = sourceObject.width;
  const height = sourceObject.height;
  if (isFiniteNumber(width) && isFiniteNumber(height) && width > 0 && height > 0) {
    return { width, height };
  }
  return null;
}

function isRenderableSource(source: ImagePreviewSource | undefined): source is ImagePreviewSource {
  if (source == null) return false;
  if (typeof source === 'string') return source.trim().length > 0;
  if (Array.isArray(source)) return source.length > 0;
  return true;
}

function createSourceFromDescriptor(image: ImagePreviewImageDescriptor): ImagePreviewSource | undefined {
  if (image.source !== undefined) return image.source;
  const { accessibilityLabel, alt, id, source: _source, ...source } = image;
  return source;
}

function getImageKey(source: ImagePreviewSource, image: ImagePreviewImage, index: number): string {
  if (isImageDescriptor(image) && image.id) return image.id;

  if (typeof source === 'string' || typeof source === 'number') return String(source);

  if (Array.isArray(source)) {
    const firstKey = source
      .map((item) => getSourceUri(item as ImagePreviewSource))
      .find((uri): uri is string => !!uri);
    return firstKey ?? `image-${index}`;
  }

  const sourceObject = source as ImageSource;
  return (
    sourceObject.cacheKey ??
    sourceObject.uri ??
    sourceObject.blurhash ??
    sourceObject.thumbhash ??
    `image-${index}`
  );
}

function normalizeImage(image: ImagePreviewImage, index: number): ImagePreviewResolvedImage | null {
  const rawSource = isImageDescriptor(image) ? createSourceFromDescriptor(image) : image;
  if (!isRenderableSource(rawSource)) return null;

  const source = normalizeRenderableSource(rawSource);
  const size = getSourceSize(source);
  const descriptor = isImageDescriptor(image) ? image : null;

  return {
    key: getImageKey(rawSource, image, index),
    source,
    uri: getSourceUri(rawSource),
    width: size?.width,
    height: size?.height,
    alt: descriptor?.alt,
    accessibilityLabel: descriptor?.accessibilityLabel,
    raw: image,
  };
}

function normalizeImages(images: readonly ImagePreviewImage[]): ImagePreviewResolvedImage[] {
  return images
    .map((image, index) => normalizeImage(image, index))
    .filter((image): image is ImagePreviewResolvedImage => image != null);
}

function resolveInteractions(interactions: ImagePreviewInteractions | undefined): ResolvedInteractions {
  return {
    tapBehavior: interactions?.tapBehavior ?? 'none',
    pinchToZoom: interactions?.pinchToZoom ?? true,
    doubleTapToZoom: interactions?.doubleTapToZoom ?? true,
    swipeToChange: interactions?.swipeToChange ?? true,
    swipeDownToClose: interactions?.swipeDownToClose ?? true,
    backToClose: interactions?.backToClose ?? true,
  };
}

function createOpenMeta(
  reason: ImagePreviewOpenChangeReason,
  value: number,
  images: readonly ImagePreviewResolvedImage[]
): ImagePreviewOpenChangeMeta {
  return {
    reason,
    value,
    image: images[value] ?? null,
    total: images.length,
  };
}

function createChangeMeta(
  reason: ImagePreviewChangeReason,
  previousValue: number,
  value: number,
  images: readonly ImagePreviewResolvedImage[]
): ImagePreviewChangeMeta {
  return {
    reason,
    previousValue,
    value,
    image: images[value] ?? null,
    total: images.length,
  };
}

function createResult(
  reason: ImagePreviewCloseReason,
  value: number,
  images: readonly ImagePreviewResolvedImage[]
): ImagePreviewResult {
  const normalizedValue = normalizeIndex(value, images.length);
  return {
    reason,
    value: normalizedValue,
    image: images[normalizedValue] ?? null,
    total: images.length,
  };
}

function getPrefetchUris(
  images: readonly ImagePreviewResolvedImage[],
  value: number,
  mode: ImagePreviewProps['prefetch']
) {
  if (mode === false || images.length <= 1) return [];

  const indexes =
    mode === 'all'
      ? images.map((_, index) => index)
      : [value - 1, value + 1].filter((index) => index >= 0 && index < images.length);

  const seen = new Set<string>();
  const uris: string[] = [];
  for (const index of indexes) {
    const uri = images[index]?.uri;
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    uris.push(uri);
  }
  return uris;
}

class ImagePreviewServiceClass {
  private controller: ImagePreviewServiceController | null = null;
  private currentRequest: ImagePreviewServiceRequest | null = null;
  private requestId = 0;

  _bind(controller: ImagePreviewServiceController | null) {
    this.controller = controller;
  }

  open(options: ImagePreviewOpenOptions): ImagePreviewServiceHandle {
    const images = normalizeImages(options.images);
    const id = ++this.requestId;
    let resolveResult: (result: ImagePreviewResult) => void = () => {};
    const result = new Promise<ImagePreviewResult>((resolve) => {
      resolveResult = resolve;
    });
    const request: ImagePreviewServiceRequest = {
      ...options,
      id,
      index: normalizeIndex(options.index, images.length),
      result,
      resolve: resolveResult,
      settled: false,
    };

    const handle: ImagePreviewServiceHandle = {
      id,
      result,
      close: (reason = 'api') => {
        if (this.currentRequest?.id === id) {
          this.close(reason);
        }
      },
      setValue: (value) => {
        if (this.currentRequest?.id === id) {
          this.setValue(value);
        }
      },
      getSnapshot: () => this.getSnapshot(),
    };

    if (this.currentRequest && !this.currentRequest.settled) {
      this.finishRequest(this.currentRequest, 'replace');
    }

    this.currentRequest = request;

    if (!images.length) {
      this.finishRequest(request, 'empty');
      return handle;
    }

    if (!this.controller) {
      console.warn('[imagePreview] ImagePreviewProvider is not mounted.');
      this.finishRequest(request, 'unmount');
      return handle;
    }

    this.controller.open(request);
    return handle;
  }

  close(reason: ImagePreviewCloseReason = 'api') {
    if (!this.currentRequest || this.currentRequest.settled) return;
    if (!this.controller) {
      this.finishRequest(this.currentRequest, reason);
      return;
    }
    this.controller.close(reason);
  }

  setValue(value: number) {
    this.controller?.setValue(value);
  }

  getSnapshot(): ImagePreviewServiceSnapshot {
    return (
      this.controller?.getSnapshot() ?? {
        open: false,
        value: 0,
        image: null,
        total: 0,
      }
    );
  }

  _complete(id: number, result: ImagePreviewResult) {
    if (this.currentRequest?.id !== id) return;
    this.finishRequest(this.currentRequest, result.reason, result);
  }

  _dispose(id: number) {
    if (this.currentRequest?.id !== id || this.currentRequest.settled) return;
    this.finishRequest(this.currentRequest, 'unmount');
  }

  private finishRequest(
    request: ImagePreviewServiceRequest,
    reason: ImagePreviewCloseReason,
    result?: ImagePreviewResult
  ) {
    if (request.settled) return;
    request.settled = true;
    const finalResult = result ?? createResult(reason, request.index, normalizeImages(request.images));
    request.onClose?.(finalResult);
    request.resolve(finalResult);
    if (this.currentRequest?.id === request.id) {
      this.currentRequest = null;
    }
  }
}

export const imagePreview = new ImagePreviewServiceClass();

function CloseButton({
  color,
  backgroundColor,
  label,
  onPress,
}: {
  color: string;
  backgroundColor: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={CONTROL_HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => [
        styles.closeButton,
        { backgroundColor, opacity: pressed ? 0.72 : 1 },
      ]}
    >
      <Feather color={color} name="x" size={CLOSE_ICON_SIZE} />
    </Pressable>
  );
}

function ZoomableImage({
  active,
  contentFit,
  currentIndexSV,
  dismissible,
  image,
  imageAccessibilityLabel,
  imageProps,
  imageStyle,
  index,
  interactions,
  labels,
  onImageError,
  onImageLoad,
  onPageChange,
  onRequestClose,
  onSingleTap,
  pageTranslateX,
  totalCount,
  viewport,
  backdropOpacity,
  colors,
}: {
  active: boolean;
  contentFit: NonNullable<ImageProps['contentFit']>;
  currentIndexSV: SharedValue<number>;
  dismissible: boolean;
  image: ImagePreviewResolvedImage;
  imageAccessibilityLabel: string;
  imageProps?: ImagePreviewImageProps;
  imageStyle?: StyleProp<ImageStyle>;
  index: number;
  interactions: ResolvedInteractions;
  labels: ImagePreviewLabels;
  onImageError?: (
    event: ImageErrorEventData,
    meta: { value: number; image: ImagePreviewResolvedImage }
  ) => void;
  onImageLoad?: (
    event: ImageLoadEventData,
    meta: { value: number; image: ImagePreviewResolvedImage }
  ) => void;
  onPageChange: (newIndex: number) => void;
  onRequestClose: (reason: ImagePreviewCloseReason) => void;
  onSingleTap: () => void;
  pageTranslateX: SharedValue<number>;
  totalCount: number;
  viewport: Viewport;
  backdropOpacity: SharedValue<number>;
  colors: ResolvedColors;
}) {
  const [failed, setFailed] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const imageCachePolicy = imageProps?.cachePolicy ?? 'memory-disk';
  const imagePriority = imageProps?.priority ?? (active ? 'high' : 'low');
  const viewportStyle = React.useMemo(
    () => ({ width: viewport.width, height: viewport.height }),
    [viewport.height, viewport.width]
  );

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const dismissY = useSharedValue(0);
  const mode = useSharedValue<GestureMode>('none');
  const tapSuppression = useSharedValue(0);
  const pinchActive = useSharedValue(0);
  const gestureFocalX = useSharedValue(0);
  const gestureFocalY = useSharedValue(0);
  const panOffsetX = useSharedValue(0);
  const panOffsetY = useSharedValue(0);
  const gestureBoundX = useSharedValue(0);
  const gestureBoundY = useSharedValue(0);

  React.useEffect(() => {
    setFailed(false);
    setLoading(true);
  }, [image.key]);

  React.useEffect(() => {
    if (mode.value !== 'none') return;

    const bounds = getViewportPanBounds(scale.value, viewport.width, viewport.height);
    const clamped = {
      x: clampV(translateX.value, -bounds.maxX, bounds.maxX),
      y: clampV(translateY.value, -bounds.maxY, bounds.maxY),
    };

    translateX.value = withSpring(clamped.x, SPRING_CONFIG);
    translateY.value = withSpring(clamped.y, SPRING_CONFIG);
    savedTranslateX.value = clamped.x;
    savedTranslateY.value = clamped.y;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport.height, viewport.width]);

  const handleImageLoadStart = React.useCallback(() => {
    setFailed(false);
    setLoading(true);
  }, []);

  const handleImageLoad = React.useCallback(
    (event: ImageLoadEventData) => {
      setLoading(false);
      onImageLoad?.(event, { value: index, image });
    },
    [image, index, onImageLoad]
  );

  const handleImageError = React.useCallback(
    (event: ImageErrorEventData) => {
      setFailed(true);
      setLoading(false);
      onImageError?.(event, { value: index, image });
    },
    [image, index, onImageError]
  );

  const resetImageTransform = () => {
    'worklet';
    cancelAnimation(scale);
    cancelAnimation(translateX);
    cancelAnimation(translateY);
    scale.value = withTiming(MIN_SCALE, RESET_TIMING);
    savedScale.value = MIN_SCALE;
    translateX.value = withTiming(0, RESET_TIMING);
    translateY.value = withTiming(0, RESET_TIMING);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
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

    const currentScale = scale.value;
    let targetScale = clampV(currentScale, MIN_SCALE, MAX_SCALE);
    if (targetScale <= MIN_SCALE + SCALE_EPSILON) {
      targetScale = MIN_SCALE;
      if (Math.abs(currentScale - targetScale) > SCALE_EPSILON) {
        scale.value = withSpring(targetScale, SPRING_CONFIG);
      } else {
        scale.value = targetScale;
      }
      if (Math.abs(translateX.value) > TRANSLATE_EPSILON) {
        translateX.value = withSpring(0, SPRING_CONFIG);
      } else {
        translateX.value = 0;
      }
      if (Math.abs(translateY.value) > TRANSLATE_EPSILON) {
        translateY.value = withSpring(0, SPRING_CONFIG);
      } else {
        translateY.value = 0;
      }
      savedScale.value = targetScale;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      return;
    }

    const bounds = getViewportPanBounds(targetScale, viewport.width, viewport.height);
    const clamped = {
      x: clampV(translateX.value, -bounds.maxX, bounds.maxX),
      y: clampV(translateY.value, -bounds.maxY, bounds.maxY),
    };

    if (Math.abs(currentScale - targetScale) > SCALE_EPSILON) {
      scale.value = withSpring(targetScale, SPRING_CONFIG);
    } else {
      scale.value = targetScale;
    }
    if (Math.abs(translateX.value - clamped.x) > TRANSLATE_EPSILON) {
      translateX.value = withSpring(clamped.x, SPRING_CONFIG);
    } else {
      translateX.value = clamped.x;
    }
    if (Math.abs(translateY.value - clamped.y) > TRANSLATE_EPSILON) {
      translateY.value = withSpring(clamped.y, SPRING_CONFIG);
    } else {
      translateY.value = clamped.y;
    }
    savedScale.value = targetScale;
    savedTranslateX.value = clamped.x;
    savedTranslateY.value = clamped.y;
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

  const singleTap = Gesture.Tap()
    .enabled(active && interactions.tapBehavior !== 'none')
    .numberOfTaps(1)
    .maxDuration(220)
    .onEnd(() => {
      'worklet';
      if (currentIndexSV.value !== index) return;
      if (mode.value !== 'none') return;
      if (tapSuppression.value > 0.01) return;
      if (scale.value > 1.05) return;
      if (interactions.tapBehavior === 'close') {
        if (dismissible) scheduleOnRN(onRequestClose, 'tap');
        return;
      }
      scheduleOnRN(onSingleTap);
    });

  const doubleTap = Gesture.Tap()
    .enabled(active && interactions.doubleTapToZoom)
    .numberOfTaps(2)
    .maxDuration(300)
    .onEnd((event) => {
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
        const focalX = event.x - viewport.width / 2;
        const focalY = event.y - viewport.height / 2;
        const bounds = getViewportPanBounds(targetScale, viewport.width, viewport.height);
        const targetX = clampV(-focalX * (targetScale - MIN_SCALE), -bounds.maxX, bounds.maxX);
        const targetY = clampV(-focalY * (targetScale - MIN_SCALE), -bounds.maxY, bounds.maxY);

        scale.value = withTiming(targetScale, RESET_TIMING);
        savedScale.value = targetScale;
        translateX.value = withTiming(targetX, RESET_TIMING);
        translateY.value = withTiming(targetY, RESET_TIMING);
        savedTranslateX.value = targetX;
        savedTranslateY.value = targetY;
      }
    });

  const pinch = Gesture.Pinch()
    .enabled(active && interactions.pinchToZoom)
    .onStart((event) => {
      'worklet';
      if (currentIndexSV.value !== index) return;
      pinchActive.value = 1;
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

      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      gestureFocalX.value = event.focalX - viewport.width / 2;
      gestureFocalY.value = event.focalY - viewport.height / 2;
    })
    .onUpdate((event) => {
      'worklet';
      if (currentIndexSV.value !== index) return;
      if (event.numberOfPointers < 2) return;
      const nextScale = clampV(
        savedScale.value * event.scale,
        MIN_SCALE * 0.5,
        MAX_SCALE + MIN_SCALE
      );

      scale.value = nextScale;
      translateX.value =
        savedTranslateX.value + (savedScale.value - nextScale) * gestureFocalX.value;
      translateY.value =
        savedTranslateY.value + (savedScale.value - nextScale) * gestureFocalY.value;
    })
    .onEnd(() => {
      'worklet';
      if (currentIndexSV.value !== index) {
        pinchActive.value = 0;
        return;
      }
      settleImageTransform();
      mode.value = 'none';
      pinchActive.value = 0;
      releaseTap();
    })
    .onFinalize(() => {
      'worklet';
      if (pinchActive.value > 0 || mode.value === 'pinch') {
        settleImageTransform();
        mode.value = 'none';
      }
      pinchActive.value = 0;
      releaseTap();
    });

  const pan = Gesture.Pan()
    .enabled(
      active &&
        (interactions.pinchToZoom ||
          interactions.doubleTapToZoom ||
          interactions.swipeToChange ||
          interactions.swipeDownToClose)
    )
    .minPointers(1)
    .minDistance(1)
    .averageTouches(true)
    .onStart((event) => {
      'worklet';
      if (currentIndexSV.value !== index) return;
      blockTap();

      cancelAnimation(translateX);
      cancelAnimation(translateY);
      cancelAnimation(pageTranslateX);
      cancelAnimation(dismissY);
      cancelAnimation(backdropOpacity);

      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      panOffsetX.value = 0;
      panOffsetY.value = 0;
      const bounds = getViewportPanBounds(scale.value, viewport.width, viewport.height);
      gestureBoundX.value = bounds.maxX;
      gestureBoundY.value = bounds.maxY;
      pageTranslateX.value = 0;
      dismissY.value = 0;
      backdropOpacity.value = withSpring(1, SPRING_CONFIG);
      if (event.numberOfPointers >= 2 || pinchActive.value > 0 || mode.value === 'pinch') {
        mode.value = 'none';
      } else {
        mode.value = scale.value > MIN_SCALE + SCALE_EPSILON ? 'drag' : 'undecided';
      }
    })
    .onUpdate((event) => {
      'worklet';
      if (currentIndexSV.value !== index) return;
      if (pinchActive.value > 0) {
        panOffsetX.value = event.translationX;
        panOffsetY.value = event.translationY;
        return;
      }

      if (mode.value === 'none') {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
        panOffsetX.value = event.translationX;
        panOffsetY.value = event.translationY;
        const bounds = getViewportPanBounds(scale.value, viewport.width, viewport.height);
        gestureBoundX.value = bounds.maxX;
        gestureBoundY.value = bounds.maxY;
        mode.value = scale.value > MIN_SCALE + SCALE_EPSILON ? 'drag' : 'undecided';
        return;
      }

      const deltaX = event.translationX - panOffsetX.value;
      const deltaY = event.translationY - panOffsetY.value;

      if (mode.value === 'undecided') {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        if (absX <= MODE_LOCK_DISTANCE && absY <= MODE_LOCK_DISTANCE) return;

        if (absX >= absY) {
          if (!interactions.swipeToChange) return;
          mode.value = 'swipe';
        } else {
          if (!dismissible || !interactions.swipeDownToClose) return;
          mode.value = 'dismiss';
        }
      }

      if (mode.value === 'drag') {
        const nextX = savedTranslateX.value + deltaX;
        const nextY = savedTranslateY.value + deltaY;
        translateX.value = rubberClampAxis(nextX, gestureBoundX.value);
        translateY.value = rubberClampAxis(nextY, gestureBoundY.value);
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
    .onEnd((event) => {
      'worklet';
      if (currentIndexSV.value !== index) return;
      if (pinchActive.value > 0 || mode.value === 'pinch') {
        mode.value = 'none';
        return;
      }

      const deltaX = event.translationX - panOffsetX.value;
      const deltaY = event.translationY - panOffsetY.value;

      if (mode.value === 'drag') {
        settleImageTransform();
        releaseTap();
      } else if (mode.value === 'swipe') {
        const canNext = currentIndexSV.value < totalCount - 1;
        const canPrev = currentIndexSV.value > 0;
        const swipeThreshold = viewport.width * 0.23;
        const goNext =
          canNext && (deltaX < -swipeThreshold || event.velocityX < -VELOCITY_THRESHOLD);
        const goPrev =
          canPrev && (deltaX > swipeThreshold || event.velocityX > VELOCITY_THRESHOLD);

        if (goNext) {
          const target = currentIndexSV.value + 1;
          pageTranslateX.value = withSpring(-viewport.width, SPRING_CONFIG, (finished) => {
            'worklet';
            if (finished) {
              currentIndexSV.value = target;
              pageTranslateX.value = 0;
              releaseTap();
              scheduleOnRN(onPageChange, target);
            }
          });
        } else if (goPrev) {
          const target = currentIndexSV.value - 1;
          pageTranslateX.value = withSpring(viewport.width, SPRING_CONFIG, (finished) => {
            'worklet';
            if (finished) {
              currentIndexSV.value = target;
              pageTranslateX.value = 0;
              releaseTap();
              scheduleOnRN(onPageChange, target);
            }
          });
        } else {
          pageTranslateX.value = withSpring(0, SPRING_CONFIG, (finished) => {
            'worklet';
            if (finished) releaseTap();
          });
        }
      } else if (mode.value === 'dismiss') {
        const dismissThreshold = viewport.height * 0.12;
        if (deltaY > dismissThreshold || event.velocityY > DISMISS_VELOCITY_THRESHOLD) {
          dismissY.value = withTiming(viewport.height, EXIT_TIMING);
          backdropOpacity.value = withTiming(0, EXIT_TIMING, () => {
            scheduleOnRN(onRequestClose, 'swipeDown');
          });
        } else {
          dismissY.value = withSpring(0, SPRING_CONFIG);
          backdropOpacity.value = withSpring(1, SPRING_CONFIG);
          releaseTap();
        }
      } else {
        releaseTap();
      }

      mode.value = 'none';
    })
    .onFinalize(() => {
      'worklet';
      if (pinchActive.value > 0 || mode.value === 'pinch') return;
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
  const composed = Gesture.Simultaneous(tapGestures, Gesture.Simultaneous(pinch, pan));

  const pageStyle = useAnimatedStyle(() => {
    const pageX = (index - currentIndexSV.value) * viewport.width + pageTranslateX.value;
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
      <Animated.View
        pointerEvents={active ? 'auto' : 'none'}
        style={[styles.imagePage, viewportStyle, pageStyle]}
      >
        <Image
          {...imageProps}
          accessibilityLabel={imageAccessibilityLabel}
          alt={imageAccessibilityLabel}
          cachePolicy={imageCachePolicy}
          contentFit={contentFit}
          onError={handleImageError}
          onLoad={handleImageLoad}
          onLoadStart={handleImageLoadStart}
          priority={imagePriority}
          recyclingKey={image.key}
          source={image.source}
          style={[viewportStyle, imageStyle]}
        />

        {loading && !failed && (
          <View pointerEvents="none" style={styles.loadingState}>
            <LoadingSpinner
              color={colors.loading}
              size={LOADING_SPINNER_SIZE}
              speed={1.8}
            />
          </View>
        )}

        {failed && (
          <View pointerEvents="none" style={styles.errorState}>
            <View style={[styles.errorCard, { backgroundColor: colors.errorBackground }]}>
              <Feather
                color={colors.errorText}
                name="image"
                size={ERROR_ICON_SIZE}
                style={styles.errorIcon}
              />
              <Text
                align="center"
                color={colors.errorText}
                lineHeight={ERROR_TEXT_LINE_HEIGHT}
                size={ERROR_TEXT_SIZE}
                weight="medium"
              >
                {labels.loadFailed}
              </Text>
            </View>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

type ImagePreviewOverlayProps = {
  accessibilityLabel?: ViewProps['accessibilityLabel'];
  closeButton: boolean;
  colors: ResolvedColors;
  contentFit: NonNullable<ImageProps['contentFit']>;
  counter: boolean;
  disabled: boolean;
  dismissible: boolean;
  imageProps?: ImagePreviewImageProps;
  imageStyle?: StyleProp<ImageStyle>;
  images: readonly ImagePreviewResolvedImage[];
  interactions: ResolvedInteractions;
  labels: ImagePreviewLabels;
  modalProps?: ImagePreviewProps['modalProps'];
  onChange: (value: number, reason: ImagePreviewChangeReason) => void;
  onCloseComplete: (result: ImagePreviewResult) => void;
  onImageError?: ImagePreviewProps['onImageError'];
  onImageLoad?: ImagePreviewProps['onImageLoad'];
  onOpenChange: (open: boolean, meta: ImagePreviewOpenChangeMeta) => void;
  open: boolean;
  prefetch: ImagePreviewProps['prefetch'];
  prefetchCachePolicy: ImagePreviewPrefetchCachePolicy;
  renderAhead: number;
  renderFooter?: ImagePreviewProps['renderFooter'];
  renderHeader?: ImagePreviewProps['renderHeader'];
  renderOverlay?: ImagePreviewProps['renderOverlay'];
  rootStyle?: StyleProp<ViewStyle>;
  testID?: ViewProps['testID'];
  value: number;
};

function ImagePreviewOverlay({
  accessibilityLabel,
  closeButton,
  colors,
  contentFit,
  counter,
  disabled,
  dismissible,
  imageProps,
  imageStyle,
  images,
  interactions,
  labels,
  modalProps,
  onChange,
  onCloseComplete,
  onImageError,
  onImageLoad,
  onOpenChange,
  open,
  prefetch,
  prefetchCachePolicy,
  renderAhead,
  renderFooter,
  renderHeader,
  renderOverlay,
  rootStyle,
  testID,
  value,
}: ImagePreviewOverlayProps) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [mounted, setMounted] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  const [renderIndex, setRenderIndex] = React.useState(() => normalizeIndex(value, images.length));
  const [chromeVisible, setChromeVisible] = React.useState(true);
  const closeReasonRef = React.useRef<ImagePreviewCloseReason>('api');
  const closingRef = React.useRef(false);
  const imagesRef = React.useRef(images);
  const onCloseCompleteRef = React.useRef(onCloseComplete);
  const renderIndexRef = React.useRef(renderIndex);
  imagesRef.current = images;
  onCloseCompleteRef.current = onCloseComplete;
  renderIndexRef.current = renderIndex;

  const backdropOpacity = useSharedValue(0);
  const chromeOpacity = useSharedValue(1);
  const pageTranslateX = useSharedValue(0);
  const currentIndexSV = useSharedValue(normalizeIndex(value, images.length));

  const viewport = React.useMemo(
    () => ({ width: window.width, height: window.height }),
    [window.height, window.width]
  );
  const total = images.length;
  const normalizedValue = normalizeIndex(value, total);
  const currentImage = images[renderIndex] ?? images[normalizedValue] ?? null;

  const setChromeVisibleAnimated = React.useCallback(
    (nextVisible: boolean) => {
      setChromeVisible(nextVisible);
      chromeOpacity.value = withTiming(nextVisible ? 1 : 0, CHROME_TIMING);
    },
    [chromeOpacity]
  );

  const requestClose = React.useCallback(
    (reason: ImagePreviewCloseReason) => {
      if (disabled) return;
      if (
        !dismissible &&
        reason !== 'api' &&
        reason !== 'empty' &&
        reason !== 'replace' &&
        reason !== 'unmount'
      ) {
        return;
      }
      if (closingRef.current) return;
      closeReasonRef.current = reason;
      onOpenChange(false, createOpenMeta(reason, renderIndexRef.current, images));
    },
    [disabled, dismissible, images, onOpenChange]
  );

  const finishClose = React.useCallback(() => {
    const result = createResult(
      closeReasonRef.current,
      renderIndexRef.current,
      imagesRef.current
    );
    setMounted(false);
    setClosing(false);
    onCloseCompleteRef.current(result);
  }, []);

  const jumpToValue = React.useCallback(
    (nextValue: number, reason: ImagePreviewChangeReason) => {
      const target = normalizeIndex(nextValue, total);
      const previousValue = renderIndexRef.current;
      if (target === previousValue) return;
      currentIndexSV.value = target;
      pageTranslateX.value = 0;
      setRenderIndex(target);
      onChange(target, reason);
    },
    [currentIndexSV, onChange, pageTranslateX, total]
  );

  const renderContext = React.useMemo<ImagePreviewRenderContext>(
    () => ({
      open,
      value: renderIndex,
      image: currentImage,
      total,
      close: (reason = 'api') => requestClose(reason),
      setValue: (nextValue) => jumpToValue(nextValue, 'api'),
    }),
    [currentImage, jumpToValue, open, renderIndex, requestClose, total]
  );

  React.useEffect(() => {
    if (open && total > 0) {
      const nextValue = normalizeIndex(value, total);
      closingRef.current = false;
      closeReasonRef.current = 'api';
      setClosing(false);
      setChromeVisible(true);
      chromeOpacity.value = 1;
      currentIndexSV.value = nextValue;
      pageTranslateX.value = 0;
      setRenderIndex(nextValue);
      setMounted(true);
      backdropOpacity.value = withTiming(1, ENTER_TIMING);
    } else if (mounted) {
      closingRef.current = true;
      setClosing(true);
      backdropOpacity.value = withTiming(0, EXIT_TIMING, (finished) => {
        if (finished) {
          scheduleOnRN(finishClose);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, total]);

  React.useEffect(() => {
    if (!open || total <= 0) return;
    const nextValue = normalizeIndex(value, total);
    currentIndexSV.value = nextValue;
    pageTranslateX.value = 0;
    setRenderIndex(nextValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, total]);

  React.useEffect(() => {
    if (!mounted || prefetch === false) return;
    const uris = getPrefetchUris(images, renderIndex, prefetch ?? 'adjacent');
    if (!uris.length) return;
    Image.prefetch(uris, prefetchCachePolicy).catch(() => {});
  }, [images, mounted, prefetch, prefetchCachePolicy, renderIndex]);

  useAnimatedReaction(
    () => currentIndexSV.value,
    (nextValue) => {
      scheduleOnRN(setRenderIndex, nextValue);
    }
  );

  const handlePageChange = React.useCallback(
    (nextValue: number) => {
      setRenderIndex(nextValue);
      onChange(nextValue, 'swipe');
    },
    [onChange]
  );

  const handleImageLoad = React.useCallback(
    (event: ImageLoadEventData, meta: { value: number; image: ImagePreviewResolvedImage }) => {
      onImageLoad?.(event, meta);
    },
    [onImageLoad]
  );

  const handleImageError = React.useCallback(
    (event: ImageErrorEventData, meta: { value: number; image: ImagePreviewResolvedImage }) => {
      if (meta.value === renderIndexRef.current && typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[imagePreview] Failed to load image', {
          error: event.error,
          uri: meta.image.uri,
        });
      }
      onImageError?.(event, meta);
    },
    [onImageError]
  );

  const handleSingleTap = React.useCallback(() => {
    if (interactions.tapBehavior !== 'toggleChrome') return;
    setChromeVisibleAnimated(!chromeVisible);
  }, [chromeVisible, interactions.tapBehavior, setChromeVisibleAnimated]);

  const handleModalRequestClose = React.useCallback(() => {
    if (!interactions.backToClose) return;
    requestClose('back');
  }, [interactions.backToClose, requestClose]);

  const handleAccessibilityEscape = React.useCallback(() => {
    requestClose('back');
  }, [requestClose]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const chromeStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * chromeOpacity.value,
  }));

  if (!mounted) return null;

  const lower = Math.max(0, renderIndex - renderAhead);
  const upper = Math.min(total - 1, renderIndex + renderAhead);
  const renderRange: number[] = [];
  for (let index = lower; index <= upper; index += 1) {
    renderRange.push(index);
  }

  const topOffset = insets.top + CLOSE_BUTTON_TOP;
  const bottomOffset = insets.bottom + BOTTOM_CHROME_OFFSET;
  const showCloseButton = closeButton && dismissible && !disabled;
  const showCounter = counter && total > 1;
  const chromePointerEvents = chromeVisible && !closing ? 'box-none' : 'none';

  return (
    <Modal
      animationType="none"
      hardwareAccelerated
      onRequestClose={handleModalRequestClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      supportedOrientations={[
        'portrait',
        'portrait-upside-down',
        'landscape',
        'landscape-left',
        'landscape-right',
      ]}
      transparent
      visible={mounted}
      {...modalProps}
    >
      <GestureHandlerRootView style={styles.modalRoot}>
        <View
          accessibilityLabel={accessibilityLabel ?? labels.preview}
          accessibilityViewIsModal
          onAccessibilityEscape={handleAccessibilityEscape}
          pointerEvents={closing ? 'none' : 'auto'}
          style={[styles.root, { zIndex: DEFAULT_Z_INDEX }, rootStyle]}
          testID={testID}
        >
          <Animated.View
            pointerEvents="none"
            style={[styles.backdrop, { backgroundColor: colors.backdrop }, backdropStyle]}
          />

          {renderRange.map((index) => {
            const image = images[index];
            if (!image) return null;
            const imageAccessibilityLabel =
              image.accessibilityLabel ?? image.alt ?? labels.image(index + 1, total);
            return (
              <ZoomableImage
                key={image.key}
                active={index === renderIndex}
                backdropOpacity={backdropOpacity}
                colors={colors}
                contentFit={contentFit}
                currentIndexSV={currentIndexSV}
                dismissible={dismissible && !disabled}
                image={image}
                imageAccessibilityLabel={imageAccessibilityLabel}
                imageProps={imageProps}
                imageStyle={imageStyle}
                index={index}
                interactions={interactions}
                labels={labels}
                onImageError={handleImageError}
                onImageLoad={handleImageLoad}
                onPageChange={handlePageChange}
                onRequestClose={requestClose}
                onSingleTap={handleSingleTap}
                pageTranslateX={pageTranslateX}
                totalCount={total}
                viewport={viewport}
              />
            );
          })}

          {renderOverlay && (
            <View pointerEvents="box-none" style={styles.overlaySlot}>
              {renderOverlay(renderContext)}
            </View>
          )}

          {renderHeader && (
            <Animated.View
              pointerEvents={chromePointerEvents}
              style={[styles.headerSlot, { top: topOffset }, chromeStyle]}
            >
              {renderHeader(renderContext)}
            </Animated.View>
          )}

          {showCloseButton && (
            <Animated.View
              pointerEvents={chromeVisible && !closing ? 'auto' : 'none'}
              style={[styles.closeButtonWrap, { top: topOffset }, chromeStyle]}
            >
              <CloseButton
                backgroundColor={colors.controlBackground}
                color={colors.controlForeground}
                label={labels.close}
                onPress={() => requestClose('closeButton')}
              />
            </Animated.View>
          )}

          {(renderFooter || showCounter) && (
            <Animated.View
              pointerEvents={chromePointerEvents}
              style={[styles.bottomChrome, { bottom: bottomOffset }, chromeStyle]}
            >
              {renderFooter && <View style={styles.footerSlot}>{renderFooter(renderContext)}</View>}
              {showCounter && (
                <View
                  accessibilityLabel={labels.counter(renderIndex + 1, total)}
                  pointerEvents="none"
                  style={[
                    styles.counterPill,
                    { backgroundColor: colors.counterBackground },
                  ]}
                >
                  <Text
                    color={colors.counterText}
                    lineHeight={COUNTER_LINE_HEIGHT}
                    size={COUNTER_FONT_SIZE}
                    tabularNumbers
                    weight="semibold"
                  >
                    {renderIndex + 1} / {total}
                  </Text>
                </View>
              )}
            </Animated.View>
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const ImagePreviewRoot = React.forwardRef<ImagePreviewRef, ImagePreviewProps>(function ImagePreview(
  {
    accessibilityLabel,
    closeButton = true,
    colors,
    contentFit = 'contain',
    counter = true,
    defaultOpen = false,
    defaultValue = 0,
    disabled = false,
    dismissible = true,
    imageProps,
    imageStyle,
    images,
    interactions,
    labels,
    modalProps,
    onChange,
    onClose,
    onImageError,
    onImageLoad,
    onOpenChange,
    open,
    prefetch = false,
    prefetchCachePolicy = 'memory-disk',
    renderAhead,
    renderFooter,
    renderHeader,
    renderOverlay,
    rootStyle,
    testID,
    value,
  },
  ref
) {
  const theme = useTheme();
  const { t } = useI18n();
  const normalizedImages = React.useMemo(() => normalizeImages(images), [images]);
  const total = normalizedImages.length;
  const isOpenControlled = open !== undefined;
  const isValueControlled = value !== undefined;
  const [innerOpen, setInnerOpen] = React.useState(defaultOpen);
  const [innerValue, setInnerValue] = React.useState(() => normalizeIndex(defaultValue, total));
  const actualOpen = isOpenControlled ? !!open : innerOpen;
  const actualValue = normalizeIndex(isValueControlled ? value : innerValue, total);
  const closeReasonRef = React.useRef<ImagePreviewCloseReason>('api');
  const closeRequestedRef = React.useRef(false);
  const previousOpenRef = React.useRef(actualOpen);
  const valueRef = React.useRef(actualValue);
  valueRef.current = actualValue;

  const resolvedInteractions = React.useMemo(
    () => resolveInteractions(interactions),
    [interactions]
  );

  const resolvedColors = React.useMemo<ResolvedColors>(
    () => ({
      backdrop: colors?.backdrop ?? '#000000',
      controlBackground: colors?.controlBackground ?? 'rgba(17, 24, 39, 0.62)',
      controlForeground: colors?.controlForeground ?? theme.colors.onPrimary,
      counterBackground: colors?.counterBackground ?? 'rgba(17, 24, 39, 0.58)',
      counterText: colors?.counterText ?? theme.colors.onPrimary,
      errorBackground: colors?.errorBackground ?? 'rgba(17, 24, 39, 0.72)',
      errorText: colors?.errorText ?? theme.colors.onPrimary,
      loading: colors?.loading ?? theme.colors.onPrimary,
    }),
    [
      colors?.backdrop,
      colors?.controlBackground,
      colors?.controlForeground,
      colors?.counterBackground,
      colors?.counterText,
      colors?.errorBackground,
      colors?.errorText,
      colors?.loading,
      theme.colors.onPrimary,
    ]
  );

  const resolvedLabels = React.useMemo<ImagePreviewLabels>(
    () => ({
      preview: labels?.preview ?? t('imagePreview.preview'),
      close: labels?.close ?? t('imagePreview.close'),
      loadFailed: labels?.loadFailed ?? t('imagePreview.loadFailed'),
      counter:
        labels?.counter ??
        ((current, imageTotal) =>
          t('imagePreview.counter', { current, total: imageTotal })),
      image:
        labels?.image ??
        ((current, imageTotal) => t('imagePreview.image', { current, total: imageTotal })),
    }),
    [labels, t]
  );

  const notifyOpenChange = React.useCallback(
    (nextOpen: boolean, meta: ImagePreviewOpenChangeMeta) => {
      if (!nextOpen) {
        closeReasonRef.current = meta.reason as ImagePreviewCloseReason;
        closeRequestedRef.current = true;
      }
      if (!isOpenControlled) setInnerOpen(nextOpen);
      onOpenChange?.(nextOpen, meta);
    },
    [isOpenControlled, onOpenChange]
  );

  const notifyChange = React.useCallback(
    (nextValue: number, reason: ImagePreviewChangeReason) => {
      const normalizedValue = normalizeIndex(nextValue, total);
      const previousValue = valueRef.current;
      if (normalizedValue === previousValue) return;
      valueRef.current = normalizedValue;
      if (!isValueControlled) setInnerValue(normalizedValue);
      onChange?.(
        normalizedValue,
        createChangeMeta(reason, previousValue, normalizedValue, normalizedImages)
      );
    },
    [isValueControlled, normalizedImages, onChange, total]
  );

  const close = React.useCallback(
    (reason: ImagePreviewCloseReason = 'api') => {
      notifyOpenChange(false, createOpenMeta(reason, valueRef.current, normalizedImages));
    },
    [normalizedImages, notifyOpenChange]
  );

  React.useImperativeHandle(
    ref,
    () => ({
      close,
      setValue: (nextValue) => notifyChange(nextValue, 'api'),
      getValue: () => valueRef.current,
    }),
    [close, notifyChange]
  );

  React.useEffect(() => {
    if (actualOpen) {
      closeReasonRef.current = 'api';
      closeRequestedRef.current = false;
    } else if (previousOpenRef.current && !actualOpen && !closeRequestedRef.current) {
      closeReasonRef.current = 'api';
    }
    previousOpenRef.current = actualOpen;
  }, [actualOpen]);

  React.useEffect(() => {
    if (actualOpen && total === 0) {
      notifyOpenChange(false, createOpenMeta('empty', 0, normalizedImages));
    }
  }, [actualOpen, normalizedImages, notifyOpenChange, total]);

  React.useEffect(() => {
    if (isValueControlled) return;
    const nextValue = normalizeIndex(innerValue, total);
    if (nextValue !== innerValue) setInnerValue(nextValue);
  }, [innerValue, isValueControlled, total]);

  const handleCloseComplete = React.useCallback(
    (result: ImagePreviewResult) => {
      onClose?.({
        ...result,
        reason: closeReasonRef.current,
      });
    },
    [onClose]
  );

  return (
    <ImagePreviewOverlay
      accessibilityLabel={accessibilityLabel}
      closeButton={closeButton}
      colors={resolvedColors}
      contentFit={contentFit}
      counter={counter}
      disabled={disabled}
      dismissible={dismissible}
      imageProps={imageProps}
      imageStyle={imageStyle}
      images={normalizedImages}
      interactions={resolvedInteractions}
      labels={resolvedLabels}
      modalProps={modalProps}
      onChange={notifyChange}
      onCloseComplete={handleCloseComplete}
      onImageError={onImageError}
      onImageLoad={onImageLoad}
      onOpenChange={notifyOpenChange}
      open={actualOpen && total > 0}
      prefetch={prefetch}
      prefetchCachePolicy={prefetchCachePolicy}
      renderAhead={clampRenderAhead(renderAhead)}
      renderFooter={renderFooter}
      renderHeader={renderHeader}
      renderOverlay={renderOverlay}
      rootStyle={rootStyle}
      testID={testID}
      value={actualValue}
    />
  );
});

ImagePreviewRoot.displayName = 'ImagePreview';

export const ImagePreview = React.memo(ImagePreviewRoot);
ImagePreview.displayName = 'ImagePreview';

type ProviderState = {
  open: boolean;
  request: ImagePreviewServiceRequest | null;
  value: number;
  closeReason: ImagePreviewCloseReason;
};

export function ImagePreviewProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ProviderState>({
    open: false,
    request: null,
    value: 0,
    closeReason: 'api',
  });
  const stateRef = React.useRef(state);
  stateRef.current = state;

  React.useEffect(() => {
    const controller: ImagePreviewServiceController = {
      open: (request) => {
        setState({
          open: true,
          request,
          value: request.index,
          closeReason: 'api',
        });
      },
      close: (reason) => {
        setState((prev) => ({ ...prev, open: false, closeReason: reason }));
      },
      setValue: (nextValue) => {
        setState((prev) => ({
          ...prev,
          value: normalizeIndex(nextValue, normalizeImages(prev.request?.images ?? []).length),
        }));
      },
      getSnapshot: () => {
        const current = stateRef.current;
        const images = normalizeImages(current.request?.images ?? []);
        const value = normalizeIndex(current.value, images.length);
        return {
          open: current.open,
          value,
          image: images[value] ?? null,
          total: images.length,
        };
      },
    };

    imagePreview._bind(controller);
    return () => {
      imagePreview._bind(null);
      const request = stateRef.current.request;
      if (request) imagePreview._dispose(request.id);
    };
  }, []);

  const request = state.request;

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean, meta: ImagePreviewOpenChangeMeta) => {
      request?.onOpenChange?.(nextOpen, meta);
      if (!nextOpen) {
        setState((prev) => ({
          ...prev,
          open: false,
          closeReason: meta.reason as ImagePreviewCloseReason,
        }));
      }
    },
    [request]
  );

  const handleChange = React.useCallback(
    (nextValue: number, meta: ImagePreviewChangeMeta) => {
      setState((prev) => ({ ...prev, value: nextValue }));
      request?.onChange?.(nextValue, meta);
    },
    [request]
  );

  const handleClose = React.useCallback(
    (result: ImagePreviewResult) => {
      if (!request) return;
      const finalResult = {
        ...result,
        reason: stateRef.current.closeReason,
      };
      imagePreview._complete(request.id, finalResult);
      setState((prev) =>
        prev.request?.id === request.id
          ? { open: false, request: null, value: 0, closeReason: 'api' }
          : prev
      );
    },
    [request]
  );

  let previewNode: React.ReactNode = null;

  if (request) {
    const {
      index: _index,
      onChange: _onChange,
      onClose: _onClose,
      onOpenChange: _onOpenChange,
      ...previewProps
    } = request;

    previewNode = (
      <ImagePreview
        key={request.id}
        {...previewProps}
        onChange={handleChange}
        onClose={handleClose}
        onOpenChange={handleOpenChange}
        open={state.open}
        value={state.value}
      />
    );
  }

  return (
    <>
      {children}
      {previewNode}
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  root: {
    flex: 1,
    width: '100%',
    height: '100%',
    elevation: Platform.OS === 'android' ? 100 : 0,
    overflow: 'hidden',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  imagePage: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    zIndex: 1,
  },
  overlaySlot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  headerSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 12,
  },
  closeButtonWrap: {
    position: 'absolute',
    left: CLOSE_BUTTON_LEFT,
    zIndex: 14,
  },
  closeButton: {
    width: CLOSE_BUTTON_SIDE,
    height: CLOSE_BUTTON_SIDE,
    borderRadius: CONTROL_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomChrome: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: BOTTOM_CHROME_GAP,
    zIndex: 12,
  },
  footerSlot: {
    alignSelf: 'stretch',
  },
  counterPill: {
    minHeight: COUNTER_MIN_HEIGHT,
    paddingHorizontal: COUNTER_PADDING_HORIZONTAL,
    borderRadius: COUNTER_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorState: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingState: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  errorCard: {
    maxWidth: ERROR_CARD_MAX_WIDTH,
    paddingHorizontal: ERROR_CARD_PADDING_HORIZONTAL,
    paddingVertical: ERROR_CARD_PADDING_VERTICAL,
    borderRadius: ERROR_CARD_RADIUS,
    alignItems: 'center',
  },
  errorIcon: {
    marginBottom: ERROR_ICON_MARGIN_BOTTOM,
  },
});
