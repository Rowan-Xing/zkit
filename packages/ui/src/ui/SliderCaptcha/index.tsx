import { Feather } from '@expo/vector-icons';
import * as React from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Platform,
  PanResponder,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { wp } from 'zkit-tools';
import { useI18n } from '../../i18n/useI18n';
import { useTheme } from '../../theme/useTheme';
import { createShadowStyle } from '../../utils/shadow';
import { Text } from '../Text';

const DEFAULT_CHALLENGE_WIDTH = 320;
const DEFAULT_CHALLENGE_HEIGHT = 220;
const DEFAULT_BLOCK_SIZE = 50;
const DEFAULT_SUCCESS_DURATION = 500;
const DEFAULT_ERROR_DURATION = 700;
const DEFAULT_CARD_MAX_WIDTH = wp(340);
const CARD_HORIZONTAL_PADDING = wp(24);
const CANVAS_BORDER_WIDTH = wp(1);
const CAPTCHA_LAYER_Z_INDEX = 4000;
const SLIDER_THUMB_SIZE = wp(44);
const CAPTCHA_ENTER_DURATION = 280;
const CAPTCHA_EXIT_DURATION = 220;
const CAPTCHA_CARD_OFFSET_Y = wp(18);
const CAPTCHA_ENTER_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const CAPTCHA_EXIT_EASING = Easing.out(Easing.cubic);

export type SliderCaptchaStatus = 'idle' | 'loading' | 'verifying' | 'success' | 'error';
export type SliderCaptchaLoadReason = 'open' | 'refresh' | 'retry';
export type SliderCaptchaErrorStage = 'load' | 'verify';

export type SliderCaptchaTexts = {
  title: string;
  verifyFailed: string;
  verifySuccess: string;
};

export type SliderCaptchaChallenge = {
  backgroundImage: string;
  blockImage: string;
  blockY: number;
  originalWidth: number;
  originalHeight: number;
  blockWidth: number;
  blockHeight?: number;
};

export type SliderCaptchaVerifyPayload<
  TChallenge extends SliderCaptchaChallenge = SliderCaptchaChallenge,
> = {
  challenge: TChallenge;
  offsetX: number;
  offsetY: number;
  displayOffsetX: number;
  progress: number;
  scale: number;
};

export type SliderCaptchaVerifyResult =
  | boolean
  | void
  | {
      success: boolean;
      message?: string;
    };

export type SliderCaptchaErrorInfo<
  TChallenge extends SliderCaptchaChallenge = SliderCaptchaChallenge,
> = {
  stage: SliderCaptchaErrorStage;
  reason?: SliderCaptchaLoadReason;
  challenge?: TChallenge;
};

export type SliderCaptchaProps<
  TChallenge extends SliderCaptchaChallenge = SliderCaptchaChallenge,
> = {
  visible: boolean;
  onClose: () => void;
  initialChallenge?: TChallenge | null;
  loadChallenge:
    | ((context: { reason: SliderCaptchaLoadReason }) => Promise<TChallenge>)
    | ((context: { reason: SliderCaptchaLoadReason }) => TChallenge);
  verifyChallenge:
    | ((
        payload: SliderCaptchaVerifyPayload<TChallenge>
      ) => Promise<SliderCaptchaVerifyResult>)
    | ((payload: SliderCaptchaVerifyPayload<TChallenge>) => SliderCaptchaVerifyResult);
  onVerified?: (payload: SliderCaptchaVerifyPayload<TChallenge>) => void;
  onError?: (error: unknown, info: SliderCaptchaErrorInfo<TChallenge>) => void;
  texts?: Partial<SliderCaptchaTexts>;
  dismissOnBackdropPress?: boolean;
  reloadOnOpen?: boolean;
  successFeedbackDuration?: number;
  errorFeedbackDuration?: number;
  maxCardWidth?: number;
  cardStyle?: StyleProp<ViewStyle>;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeImageUri(value: string) {
  if (!value) return '';
  if (/^(data:|https?:\/\/|file:\/\/|content:\/\/|asset:|ph:)/.test(value)) {
    return value;
  }
  return `data:image/png;base64,${value}`;
}

function parseVerifyResult(
  result: SliderCaptchaVerifyResult
): {
  success: boolean;
  message?: string;
} {
  if (typeof result === 'object' && result !== null) {
    return {
      success: Boolean(result.success),
      message: result.message,
    };
  }
  if (typeof result === 'boolean') {
    return { success: result };
  }
  return { success: true };
}

function getSafePositiveNumber(value: number | undefined, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return value;
}

const styles = StyleSheet.create({
  modalRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: CAPTCHA_LAYER_Z_INDEX,
    elevation: Platform.OS === 'android' ? CAPTCHA_LAYER_Z_INDEX : 0,
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayPressable: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(20),
  },
  cardContainer: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    borderRadius: wp(16),
    paddingHorizontal: CARD_HORIZONTAL_PADDING,
    paddingTop: wp(18),
    paddingBottom: wp(20),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: wp(14),
  },
  title: {
    fontSize: wp(16),
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    width: wp(28),
    height: wp(28),
    borderRadius: wp(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionSpacing: {
    marginLeft: wp(8),
  },
  canvasWrapper: {
    width: '100%',
    overflow: 'hidden',
    alignSelf: 'center',
    position: 'relative',
    borderWidth: CANVAS_BORDER_WIDTH,
    borderRadius: wp(16),
  },
  canvasImage: {
    width: '100%',
    height: '100%',
  },
  block: {
    position: 'absolute',
    left: 0,
  },
  feedbackOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: wp(36),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  feedbackError: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
  },
  feedbackText: {
    color: '#FFFFFF',
    fontSize: wp(14),
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderTrack: {
    marginTop: wp(16),
    marginBottom: wp(4),
    height: SLIDER_THUMB_SIZE,
    borderRadius: SLIDER_THUMB_SIZE / 2,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  sliderThumb: {
    position: 'absolute',
    left: 0,
    width: SLIDER_THUMB_SIZE,
    height: SLIDER_THUMB_SIZE,
    borderRadius: SLIDER_THUMB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: wp(0.5),
  },
});

export function SliderCaptcha<TChallenge extends SliderCaptchaChallenge = SliderCaptchaChallenge>({
  visible,
  onClose,
  initialChallenge = null,
  loadChallenge,
  verifyChallenge,
  onVerified,
  onError,
  texts,
  dismissOnBackdropPress = true,
  reloadOnOpen = true,
  successFeedbackDuration = DEFAULT_SUCCESS_DURATION,
  errorFeedbackDuration = DEFAULT_ERROR_DURATION,
  maxCardWidth = DEFAULT_CARD_MAX_WIDTH,
  cardStyle,
}: SliderCaptchaProps<TChallenge>) {
  const { t } = useI18n();
  const theme = useTheme();
  const [mounted, setMounted] = React.useState(visible);
  const [challenge, setChallenge] = React.useState<TChallenge | null>(null);
  const [status, setStatus] = React.useState<SliderCaptchaStatus>('idle');
  const [feedbackMessage, setFeedbackMessage] = React.useState<string | undefined>();
  const [canvasLayoutWidth, setCanvasLayoutWidth] = React.useState(0);

  const presentationProgress = useSharedValue(0);
  const thumbX = useSharedValue(0);
  const thumbXRef = React.useRef(0);
  const thumbStartRef = React.useRef(0);
  const visibleRef = React.useRef(visible);
  const visibilityAnimationIdRef = React.useRef(0);
  const loadRequestIdRef = React.useRef(0);
  const verifyRequestIdRef = React.useRef(0);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRefs = React.useRef<number[]>([]);

  const resolvedTexts = React.useMemo<SliderCaptchaTexts>(
    () => ({
      title: texts?.title ?? t('sliderCaptcha.title'),
      verifyFailed: texts?.verifyFailed ?? t('sliderCaptcha.verifyFailed'),
      verifySuccess: texts?.verifySuccess ?? t('sliderCaptcha.verifySuccess'),
    }),
    [t, texts?.title, texts?.verifyFailed, texts?.verifySuccess]
  );

  const clearPendingTimeout = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const clearPendingAnimationFrames = React.useCallback(() => {
    animationFrameRefs.current.forEach((frameId) => cancelAnimationFrame(frameId));
    animationFrameRefs.current = [];
  }, []);

  const resetThumbPosition = React.useCallback(() => {
    thumbX.value = 0;
    thumbXRef.current = 0;
    thumbStartRef.current = 0;
  }, [thumbX]);

  const resetCaptchaState = React.useCallback(() => {
    setStatus('idle');
    setFeedbackMessage(undefined);
    setChallenge(null);
    resetThumbPosition();
  }, [resetThumbPosition]);

  const originalWidth = getSafePositiveNumber(challenge?.originalWidth, DEFAULT_CHALLENGE_WIDTH);
  const originalHeight = getSafePositiveNumber(challenge?.originalHeight, DEFAULT_CHALLENGE_HEIGHT);
  const blockWidth = getSafePositiveNumber(challenge?.blockWidth, DEFAULT_BLOCK_SIZE);
  const blockHeight = getSafePositiveNumber(challenge?.blockHeight, blockWidth);
  const canvasOuterWidth =
    canvasLayoutWidth > 0
      ? canvasLayoutWidth
      : Math.max(maxCardWidth - CARD_HORIZONTAL_PADDING * 2, 0);
  // Use the drawable content box for coordinate mapping; including the border
  // here introduces the exact sub-pixel Y drift seen when the puzzle piece joins.
  const canvasContentWidth = Math.max(canvasOuterWidth - CANVAS_BORDER_WIDTH * 2, 0);
  const scale = canvasContentWidth > 0 ? canvasContentWidth / originalWidth : 0;
  const displayHeight =
    Math.max((canvasContentWidth * originalHeight) / originalWidth, 0) + CANVAS_BORDER_WIDTH * 2;
  const blockDisplayWidth = blockWidth * scale;
  const blockDisplayHeight = blockHeight * scale;
  const blockTop = Math.max(0, (challenge?.blockY ?? 0) * scale);
  const maxBlockOffset = Math.max(canvasContentWidth - blockDisplayWidth, 0);
  const maxThumbOffset = Math.max(canvasOuterWidth - SLIDER_THUMB_SIZE, 0);
  const blockTranslateRatio = maxThumbOffset > 0 ? maxBlockOffset / maxThumbOffset : 0;
  const isBusy = status === 'loading' || status === 'verifying';
  const canSlide = visible && Boolean(challenge) && !isBusy;

  const backgroundImageUri = normalizeImageUri(challenge?.backgroundImage ?? '');
  const blockImageUri = normalizeImageUri(challenge?.blockImage ?? '');
  const cardShadowStyle = React.useMemo(
    () =>
      createShadowStyle({
        color: theme.colors.onSurface,
        elevation: 10,
        offsetY: wp(10),
        opacity: 0.1,
        radius: wp(20),
      }),
    [theme.colors.onSurface]
  );
  const headerActionShadowStyle = React.useMemo(
    () =>
      createShadowStyle({
        color: theme.colors.onSurface,
        elevation: 3,
        offsetY: wp(2),
        opacity: 0.08,
        radius: wp(4),
      }),
    [theme.colors.onSurface]
  );
  const sliderThumbShadowStyle = React.useMemo(
    () =>
      createShadowStyle({
        color: theme.colors.onSurface,
        elevation: 3,
        offsetY: wp(2),
        opacity: 0.15,
        radius: wp(4),
      }),
    [theme.colors.onSurface]
  );

  const requestChallenge = React.useCallback(
    async (reason: SliderCaptchaLoadReason) => {
      if (!visibleRef.current) return;

      clearPendingTimeout();
      if (reason === 'open') {
        setChallenge(null);
      }
      setFeedbackMessage(undefined);
      setStatus('loading');

      const requestId = loadRequestIdRef.current + 1;
      loadRequestIdRef.current = requestId;

      try {
        const nextChallenge = await loadChallenge({ reason });
        if (!visibleRef.current || loadRequestIdRef.current !== requestId) return;

        setChallenge(nextChallenge);
        resetThumbPosition();
        setStatus('idle');
      } catch (error) {
        if (!visibleRef.current || loadRequestIdRef.current !== requestId) return;

        setStatus('idle');
        onError?.(error, { stage: 'load', reason });
      }
    },
    [clearPendingTimeout, loadChallenge, onError, resetThumbPosition]
  );

  const verifyCurrentChallenge = React.useCallback(async () => {
    if (!challenge || isBusy) return;

    clearPendingTimeout();
    setFeedbackMessage(undefined);
    setStatus('verifying');

    const progress = maxThumbOffset > 0 ? thumbXRef.current / maxThumbOffset : 0;
    const displayOffsetX = progress * maxBlockOffset;
    const offsetX = scale > 0 ? Math.round(displayOffsetX / scale) : 0;
    const payload: SliderCaptchaVerifyPayload<TChallenge> = {
      challenge,
      offsetX,
      offsetY: challenge.blockY,
      displayOffsetX,
      progress,
      scale,
    };

    const requestId = verifyRequestIdRef.current + 1;
    verifyRequestIdRef.current = requestId;

    try {
      const rawResult = await verifyChallenge(payload);
      if (!visibleRef.current || verifyRequestIdRef.current !== requestId) return;

      const result = parseVerifyResult(rawResult);
      if (result.success) {
        setFeedbackMessage(result.message ?? resolvedTexts.verifySuccess);
        setStatus('success');
        timeoutRef.current = setTimeout(() => {
          if (!visibleRef.current || verifyRequestIdRef.current !== requestId) return;
          onVerified?.(payload);
        }, successFeedbackDuration);
        return;
      }

      setFeedbackMessage(result.message ?? resolvedTexts.verifyFailed);
      setStatus('error');
      timeoutRef.current = setTimeout(() => {
        if (!visibleRef.current || verifyRequestIdRef.current !== requestId) return;
        void requestChallenge('retry');
      }, errorFeedbackDuration);
    } catch (error) {
      if (!visibleRef.current || verifyRequestIdRef.current !== requestId) return;

      setFeedbackMessage(resolvedTexts.verifyFailed);
      setStatus('error');
      onError?.(error, { stage: 'verify', challenge });
      timeoutRef.current = setTimeout(() => {
        if (!visibleRef.current || verifyRequestIdRef.current !== requestId) return;
        void requestChallenge('retry');
      }, errorFeedbackDuration);
    }
  }, [
    challenge,
    clearPendingTimeout,
    errorFeedbackDuration,
    isBusy,
    maxBlockOffset,
    maxThumbOffset,
    onError,
    onVerified,
    requestChallenge,
    resolvedTexts.verifyFailed,
    resolvedTexts.verifySuccess,
    scale,
    successFeedbackDuration,
    verifyChallenge,
  ]);

  React.useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  const handleDismissAnimationFinished = React.useCallback(
    (animationId: number) => {
      if (animationId !== visibilityAnimationIdRef.current || visibleRef.current) return;
      setMounted(false);
      resetCaptchaState();
    },
    [resetCaptchaState]
  );

  React.useEffect(() => {
    if (visible && !mounted) {
      setMounted(true);
    }
  }, [mounted, visible]);

  React.useEffect(() => {
    if (!mounted) return;

    clearPendingAnimationFrames();
    cancelAnimation(presentationProgress);

    const animationId = visibilityAnimationIdRef.current + 1;
    visibilityAnimationIdRef.current = animationId;

    if (visible) {
      setStatus('idle');
      setFeedbackMessage(undefined);
      resetThumbPosition();

      const frameId = requestAnimationFrame(() => {
        const nestedFrameId = requestAnimationFrame(() => {
          if (visibilityAnimationIdRef.current !== animationId || !visibleRef.current) return;
          presentationProgress.value = withTiming(1, {
            duration: CAPTCHA_ENTER_DURATION,
            easing: CAPTCHA_ENTER_EASING,
          });
        });
        animationFrameRefs.current.push(nestedFrameId);
      });
      animationFrameRefs.current.push(frameId);

      if (initialChallenge) {
        setChallenge(initialChallenge);
      } else if (reloadOnOpen || challenge === null) {
        void requestChallenge('open');
      }

      return () => {
        clearPendingAnimationFrames();
      };
    }

    loadRequestIdRef.current += 1;
    verifyRequestIdRef.current += 1;
    clearPendingTimeout();
    setStatus('idle');
    setFeedbackMessage(undefined);

    presentationProgress.value = withTiming(
      0,
      {
        duration: CAPTCHA_EXIT_DURATION,
        easing: CAPTCHA_EXIT_EASING,
      },
      (finished) => {
        if (finished) {
          scheduleOnRN(handleDismissAnimationFinished, animationId);
        }
      }
    );
  }, [
    challenge,
    clearPendingAnimationFrames,
    clearPendingTimeout,
    handleDismissAnimationFinished,
    initialChallenge,
    mounted,
    presentationProgress,
    reloadOnOpen,
    requestChallenge,
    resetThumbPosition,
    visible,
  ]);

  React.useEffect(
    () => () => {
      clearPendingAnimationFrames();
      clearPendingTimeout();
      cancelAnimation(presentationProgress);
    },
    [clearPendingAnimationFrames, clearPendingTimeout, presentationProgress]
  );

  React.useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => subscription.remove();
  }, [onClose, visible]);

  const handleCanvasLayout = React.useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (!Number.isFinite(nextWidth) || nextWidth <= 0) return;

    setCanvasLayoutWidth((currentWidth) => {
      if (Math.abs(currentWidth - nextWidth) < 0.5) {
        return currentWidth;
      }
      return nextWidth;
    });
  }, []);

  const handleRefresh = React.useCallback(() => {
    if (!visible || isBusy) return;
    void requestChallenge('refresh');
  }, [isBusy, requestChallenge, visible]);

  const handleBackdropPress = React.useCallback(() => {
    if (!visible || !dismissOnBackdropPress) return;
    onClose();
  }, [dismissOnBackdropPress, onClose, visible]);

  const handleRequestClose = React.useCallback(() => {
    if (!visible) return;
    onClose();
  }, [onClose, visible]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: presentationProgress.value,
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const progress = presentationProgress.value;

    return {
      opacity: progress,
      transform: [
        { translateY: (1 - progress) * CAPTCHA_CARD_OFFSET_Y },
        { scale: 0.96 + progress * 0.04 },
      ],
    };
  });

  const thumbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));

  const blockAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value * blockTranslateRatio }],
  }));

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => canSlide,
        onMoveShouldSetPanResponder: () => canSlide,
        onPanResponderGrant: () => {
          thumbStartRef.current = thumbXRef.current;
        },
        onPanResponderMove: (_event, gestureState) => {
          if (!canSlide) return;

          const next = clamp(thumbStartRef.current + gestureState.dx, 0, maxThumbOffset);
          thumbX.value = next;
          thumbXRef.current = next;
        },
        onPanResponderRelease: () => {
          void verifyCurrentChallenge();
        },
      }),
    [canSlide, maxThumbOffset, thumbX, verifyCurrentChallenge]
  );

  if (!mounted) return null;

  return (
    <View pointerEvents="box-none" style={styles.modalRoot}>
      <Animated.View style={[styles.overlayBackdrop, backdropAnimatedStyle]} />
      <Pressable style={styles.overlayPressable} onPress={handleBackdropPress}>
        {/* Fade a single composited layer to avoid dark ghosting on dismiss, especially on Android. */}
        <Animated.View
          style={[styles.cardContainer, cardAnimatedStyle]}
          collapsable={false}
          renderToHardwareTextureAndroid={Platform.OS === 'android'}
          shouldRasterizeIOS={Platform.OS === 'ios'}
          needsOffscreenAlphaCompositing={Platform.OS === 'android'}
        >
          <Pressable
            style={[
              styles.card,
              {
                maxWidth: maxCardWidth,
                backgroundColor: theme.colors.surface,
              },
              cardShadowStyle,
              cardStyle,
            ]}
            onPress={() => {}}
            collapsable={false}
            renderToHardwareTextureAndroid={Platform.OS === 'android'}
            shouldRasterizeIOS={Platform.OS === 'ios'}
            needsOffscreenAlphaCompositing={Platform.OS === 'android'}
          >
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                {resolvedTexts.title}
              </Text>
              <View style={styles.headerActions}>
                <Pressable
                  style={[
                    styles.headerActionButton,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      borderWidth: wp(0.5),
                    },
                    headerActionShadowStyle,
                  ]}
                  onPress={handleRefresh}
                  disabled={!visible || isBusy}
                  hitSlop={10}
                >
                  {isBusy ? (
                    <ActivityIndicator size="small" color={theme.colors.muted} />
                  ) : (
                    <Feather name="refresh-cw" size={wp(16)} color={theme.colors.muted} />
                  )}
                </Pressable>
                <Pressable
                  style={[
                    styles.headerActionButton,
                    styles.headerActionSpacing,
                    {
                      backgroundColor: theme.colors.secondary,
                    },
                    headerActionShadowStyle,
                  ]}
                  onPress={handleRequestClose}
                  disabled={!visible}
                  hitSlop={10}
                >
                  <Feather name="x" size={wp(18)} color={theme.colors.muted} />
                </Pressable>
              </View>
            </View>

            <View
              style={[
                styles.canvasWrapper,
                {
                  height: displayHeight,
                  backgroundColor: theme.colors.secondary,
                  borderColor: theme.colors.border,
                },
              ]}
              onLayout={handleCanvasLayout}
            >
              {backgroundImageUri ? (
                <Image
                  style={styles.canvasImage}
                  resizeMode="cover"
                  source={{ uri: backgroundImageUri }}
                />
              ) : (
                <View style={[styles.canvasImage, styles.placeholder]}>
                  <ActivityIndicator size="small" color={theme.colors.muted} />
                </View>
              )}

              {blockImageUri ? (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.block,
                    {
                      top: blockTop,
                      width: blockDisplayWidth,
                      height: blockDisplayHeight,
                    },
                    blockAnimatedStyle,
                  ]}
                >
                  <Image
                    style={styles.canvasImage}
                    resizeMode="cover"
                    source={{ uri: blockImageUri }}
                  />
                </Animated.View>
              ) : null}

              {(status === 'error' || status === 'success') && feedbackMessage ? (
                <View
                  style={[
                    styles.feedbackOverlay,
                    status === 'error' ? styles.feedbackError : styles.feedbackSuccess,
                  ]}
                >
                  <Text style={styles.feedbackText}>{feedbackMessage}</Text>
                </View>
              ) : null}
            </View>

            <View
              style={[
                styles.sliderTrack,
                { backgroundColor: theme.colors.secondary, borderColor: theme.colors.border },
              ]}
              {...panResponder.panHandlers}
            >
              <Animated.View
                style={[
                  styles.sliderThumb,
                  thumbAnimatedStyle,
                  {
                    backgroundColor: theme.colors.primary,
                    borderColor: 'rgba(0,0,0,0.04)',
                  },
                  sliderThumbShadowStyle,
                ]}
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color={theme.colors.onPrimary} />
                ) : (
                  <Feather name="arrow-right" size={wp(20)} color={theme.colors.onPrimary} />
                )}
              </Animated.View>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </View>
  );
}
