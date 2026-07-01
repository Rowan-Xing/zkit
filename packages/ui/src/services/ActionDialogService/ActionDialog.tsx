import * as React from 'react';
import {
  BackHandler,
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type KeyboardEvent,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { wp } from 'zkit-tools';
import { useI18n } from '../../i18n/useI18n';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../../ui/Button/index';
import { Text } from '../../ui/Text';
import {
  ACTION_DIALOG_DEFAULT_COLORS,
  ACTION_DIALOG_DEFAULT_Z_INDEX,
  createActionResult,
  resolveActions,
  resolveDismissOptions,
  resolveFooterLayout,
  resolveKeyboardOptions,
  resolveLayout,
} from './shared';
import type {
  ActionDialogActionContext,
  ActionDialogDismissReason,
  ActionDialogFooterRenderContext,
  ActionDialogProps,
  ActionDialogRef,
  ActionDialogResolvedAction,
  ActionDialogResult,
} from './types';

const ENTER_BACKDROP_TIMING = {
  duration: 190,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

const EXIT_BACKDROP_TIMING = {
  duration: 130,
  easing: Easing.in(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

const ENTER_CARD_OPACITY_TIMING = {
  duration: 140,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

const ENTER_CARD_SCALE_TIMING = {
  duration: 170,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

const EXIT_CARD_TIMING = {
  duration: 100,
  easing: Easing.in(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

const KEYBOARD_TIMING = {
  duration: 260,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

const KEYBOARD_SPRING = {
  damping: 28,
  mass: 1,
  overshootClamping: true,
  stiffness: 220,
} as const;

const KEYBOARD_CLEARANCE = wp(12);
const CARD_ENTER_SCALE = 0.92;
const CARD_EXIT_SCALE = 0.985;
const BAR_FOOTER_HEIGHT = wp(52);
const COMPACT_ROW_ACTION_BUTTON_LAYOUT: React.ComponentProps<typeof Button>['layout'] = {
  paddingHorizontal: wp(10),
};
const BAR_ACTION_BUTTON_LAYOUT: React.ComponentProps<typeof Button>['layout'] = {
  height: BAR_FOOTER_HEIGHT,
  minHeight: BAR_FOOTER_HEIGHT,
  paddingVertical: 0,
};

function getKeyboardTopInWindow(event: KeyboardEvent) {
  const windowHeight = Dimensions.get('window').height;
  const screenHeight = Dimensions.get('screen').height;
  const screenY = event.endCoordinates?.screenY;

  if (typeof screenY === 'number' && Number.isFinite(screenY)) {
    const windowOffset = Math.max(0, screenHeight - windowHeight);
    return Math.min(windowHeight, Math.max(0, screenY - windowOffset));
  }

  const keyboardHeight = event.endCoordinates?.height;
  if (typeof keyboardHeight === 'number' && Number.isFinite(keyboardHeight)) {
    return Math.max(0, windowHeight - keyboardHeight);
  }

  return windowHeight;
}

function getStringText(value: React.ReactNode) {
  return typeof value === 'string' ? value : undefined;
}

function getAccessibilityLabel(title: React.ReactNode, message: React.ReactNode, fallback: string) {
  const titleText = getStringText(title);
  const messageText = getStringText(message);
  if (titleText && messageText) return `${titleText}, ${messageText}`;
  return titleText ?? messageText ?? fallback;
}

const ActionDialogRoot = React.forwardRef<ActionDialogRef, ActionDialogProps>(function ActionDialog(
  {
    accessibilityLabel,
    actions,
    children,
    colors,
    defaultOpen = false,
    disabled = false,
    dismiss,
    dismissible = true,
    footer,
    hostMode = 'modal',
    keyboard,
    labels,
    layer,
    layout,
    message,
    modalProps,
    motion = 'fade',
    onActionError,
    onClose,
    onDismissComplete,
    onOpenChange,
    open,
    style,
    testID,
    title,
  },
  ref
) {
  const theme = useTheme();
  const { t } = useI18n();
  const dimensions = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isOpenControlled = open !== undefined;
  const [innerOpen, setInnerOpen] = React.useState(defaultOpen);
  const actualOpen = isOpenControlled ? !!open : innerOpen;
  const [mounted, setMounted] = React.useState(actualOpen);
  const dialogHeightRef = React.useRef(0);
  const keyboardMetricsRef = React.useRef<{ top: number } | null>(null);
  const closingRequestedRef = React.useRef(false);
  const dismissCompletePendingRef = React.useRef(false);
  const mountedRef = React.useRef(mounted);
  const onDismissCompleteRef = React.useRef(onDismissComplete);
  const openingFrameRef = React.useRef<number | null>(null);
  const openRef = React.useRef(actualOpen);
  mountedRef.current = mounted;
  onDismissCompleteRef.current = onDismissComplete;
  openRef.current = actualOpen;

  const backdropProgress = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(CARD_ENTER_SCALE);
  const keyboardOffset = useSharedValue(0);

  const resolvedLabels = React.useMemo(
    () => ({
      confirm: labels?.confirm ?? t('actionDialog.confirm'),
      cancel: labels?.cancel ?? t('actionDialog.cancel'),
      close: labels?.close ?? t('actionDialog.close'),
    }),
    [labels?.cancel, labels?.close, labels?.confirm, t]
  );

  const resolvedActions = React.useMemo(
    () => resolveActions(actions, resolvedLabels),
    [actions, resolvedLabels]
  );
  const resolvedFooterLayout = resolveFooterLayout(footer?.layout, resolvedActions);
  const resolvedDismiss = resolveDismissOptions(dismissible, dismiss);
  const resolvedKeyboard = resolveKeyboardOptions(keyboard);
  const resolvedLayout = resolveLayout(layout);
  const resolvedColors = {
    backdrop: colors?.backdrop ?? ACTION_DIALOG_DEFAULT_COLORS.backdrop,
    surface: colors?.surface || theme.colors.surface,
    title: colors?.title || theme.colors.onSurface,
    message: colors?.message || theme.colors.muted,
    border: colors?.border || theme.colors.border,
  };

  const availableWidth = Math.max(0, dimensions.width - wp(32));
  const dialogWidth = Math.min(wp(resolvedLayout.width), wp(resolvedLayout.maxWidth), availableWidth);
  const maxDialogHeight = Math.max(
    wp(180),
    dimensions.height - insets.top - insets.bottom - wp(64)
  );
  const maxBodyHeight = Math.max(wp(88), maxDialogHeight - wp(96));

  const finishDismiss = React.useCallback(() => {
    if (!dismissCompletePendingRef.current) return;
    dismissCompletePendingRef.current = false;
    setMounted(false);
    onDismissCompleteRef.current?.();
  }, []);

  React.useEffect(() => {
    return () => {
      if (openingFrameRef.current != null) {
        cancelAnimationFrame(openingFrameRef.current);
        openingFrameRef.current = null;
      }
      cancelAnimation(backdropProgress);
      cancelAnimation(cardOpacity);
      cancelAnimation(cardScale);
      cancelAnimation(keyboardOffset);
    };
  }, [backdropProgress, cardOpacity, cardScale, keyboardOffset]);

  React.useEffect(() => {
    if (openingFrameRef.current != null) {
      cancelAnimationFrame(openingFrameRef.current);
      openingFrameRef.current = null;
    }
    cancelAnimation(backdropProgress);
    cancelAnimation(cardOpacity);
    cancelAnimation(cardScale);

    if (actualOpen) {
      closingRequestedRef.current = false;
      dismissCompletePendingRef.current = false;
      setMounted(true);
      backdropProgress.value = 0;
      cardOpacity.value = 0;
      cardScale.value = motion === 'scale' ? CARD_ENTER_SCALE : 1;
      openingFrameRef.current = requestAnimationFrame(() => {
        openingFrameRef.current = null;
        if (motion === 'none') {
          backdropProgress.value = 1;
          cardOpacity.value = 1;
          cardScale.value = 1;
          return;
        }
        backdropProgress.value = withTiming(1, ENTER_BACKDROP_TIMING);
        cardOpacity.value = withTiming(1, ENTER_CARD_OPACITY_TIMING);
        if (motion === 'scale') {
          cardScale.value = withTiming(1, ENTER_CARD_SCALE_TIMING);
        }
      });
      return;
    }

    if (!mountedRef.current) return;
    dismissCompletePendingRef.current = true;
    if (motion === 'none') {
      backdropProgress.value = 0;
      cardOpacity.value = 0;
      cardScale.value = 1;
      finishDismiss();
      return;
    }
    backdropProgress.value = withTiming(0, EXIT_BACKDROP_TIMING);
    cardScale.value = withTiming(motion === 'scale' ? CARD_EXIT_SCALE : 1, EXIT_CARD_TIMING);
    cardOpacity.value = withTiming(0, EXIT_CARD_TIMING, (finished) => {
      if (finished) {
        scheduleOnRN(finishDismiss);
      }
    });
  }, [actualOpen, backdropProgress, cardOpacity, cardScale, finishDismiss, motion]);

  React.useEffect(() => {
    if (actualOpen || !resolvedKeyboard.dismissOnClose) return;
    try {
      Keyboard.dismiss();
    } catch {}
  }, [actualOpen, resolvedKeyboard.dismissOnClose]);

  const updateKeyboardOffset = React.useCallback(
    (metrics: { top: number } | null) => {
      keyboardMetricsRef.current = metrics;
      if (!metrics || !resolvedKeyboard.avoid) {
        keyboardOffset.value = withTiming(0, KEYBOARD_TIMING);
        return;
      }

      const dialogHeight = dialogHeightRef.current;
      if (dialogHeight <= 0) return;
      const dialogBottom = (dimensions.height + dialogHeight) / 2;
      const overlap = Math.max(0, dialogBottom + KEYBOARD_CLEARANCE - metrics.top);
      keyboardOffset.value = withSpring(overlap, KEYBOARD_SPRING);
    },
    [dimensions.height, keyboardOffset, resolvedKeyboard.avoid]
  );

  React.useEffect(() => {
    if (!mounted || !resolvedKeyboard.avoid) return undefined;

    const handleKeyboardChange = (event: KeyboardEvent) => {
      updateKeyboardOffset({ top: getKeyboardTopInWindow(event) });
    };
    const handleKeyboardHide = () => updateKeyboardOffset(null);

    const subscriptions =
      Platform.OS === 'ios'
        ? [
            Keyboard.addListener('keyboardWillChangeFrame', handleKeyboardChange),
            Keyboard.addListener('keyboardWillHide', handleKeyboardHide),
          ]
        : [
            Keyboard.addListener('keyboardDidShow', handleKeyboardChange),
            Keyboard.addListener('keyboardDidHide', handleKeyboardHide),
          ];

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [mounted, resolvedKeyboard.avoid, updateKeyboardOffset]);

  const requestClose = React.useCallback(
    (result: ActionDialogResult) => {
      if (!openRef.current || closingRequestedRef.current) return;
      closingRequestedRef.current = true;

      if (!isOpenControlled) setInnerOpen(false);
      onClose?.(result);
      onOpenChange?.(false, {
        reason: result.type === 'action' ? 'action' : result.reason,
        result,
      });
    },
    [isOpenControlled, onClose, onOpenChange]
  );

  const dismissWithReason = React.useCallback(
    (reason: ActionDialogDismissReason) => {
      if (disabled) return;
      requestClose({ type: 'dismiss', reason });
    },
    [disabled, requestClose]
  );

  const handleOverlayPress = React.useCallback(() => {
    if (resolvedKeyboard.dismissOnOverlayPress) {
      try {
        Keyboard.dismiss();
      } catch {}
    }

    if (resolvedDismiss.overlayPress) {
      dismissWithReason('overlay');
    }
  }, [dismissWithReason, resolvedDismiss.overlayPress, resolvedKeyboard.dismissOnOverlayPress]);

  const handleModalRequestClose = React.useCallback(() => {
    if (resolvedDismiss.backPress) dismissWithReason('back');
  }, [dismissWithReason, resolvedDismiss.backPress]);

  React.useEffect(() => {
    if (hostMode !== 'inline' || Platform.OS !== 'android' || !mounted || !actualOpen) return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (resolvedDismiss.backPress) dismissWithReason('back');
      return true;
    });

    return () => subscription.remove();
  }, [actualOpen, dismissWithReason, hostMode, mounted, resolvedDismiss.backPress]);

  const pressAction = React.useCallback(
    (key: string) => {
      if (disabled) return;
      const action = resolvedActions.find((item) => item.key === key);
      if (!action || action.disabled || action.loading) return;

      const actionResult = createActionResult(action);
      let handled = false;
      const context: ActionDialogActionContext = {
        action,
        close: () => {
          if (handled) return;
          handled = true;
          requestClose(actionResult);
        },
        dismiss: () => {
          if (handled) return;
          handled = true;
          requestClose({ type: 'dismiss', reason: 'api' });
        },
      };

      try {
        const handlerResult = action.onPress?.(context);
        if (handled) return;
        if (handlerResult !== false && action.closeOnPress) {
          requestClose(actionResult);
        }
      } catch (error) {
        onActionError?.(error, action);
        if (!onActionError && typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('[actionDialog] action onPress failed', error);
        }
      }
    },
    [disabled, onActionError, requestClose, resolvedActions]
  );

  React.useImperativeHandle(
    ref,
    () => ({
      close: () => requestClose({ type: 'dismiss', reason: 'api' }),
      pressAction,
      getOpen: () => openRef.current,
    }),
    [pressAction, requestClose]
  );

  const footerContext = React.useMemo<ActionDialogFooterRenderContext>(
    () => ({
      actions: resolvedActions,
      layout: resolvedFooterLayout,
      close: () => requestClose({ type: 'dismiss', reason: 'api' }),
      pressAction,
    }),
    [pressAction, requestClose, resolvedActions, resolvedFooterLayout]
  );
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: backdropProgress.value,
  }));

  const dialogAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [
      { translateY: -keyboardOffset.value },
      { scale: cardScale.value },
    ],
  }));

  const renderAction = React.useCallback(
    (action: ActionDialogResolvedAction, index: number) => {
      const actionLoading = action.loading;
      const actionDisabled = disabled || action.disabled;

      if (resolvedFooterLayout === 'bar') {
        return (
          <View
            key={action.key}
            style={[
              styles.barActionCell,
              index > 0 ? [styles.barActionDivider, { borderLeftColor: resolvedColors.border }] : null,
            ]}
          >
            <Button
              accessibilityLabel={action.accessibilityLabel}
              block
              disabled={actionDisabled}
              loading={actionLoading}
              onPress={() => void pressAction(action.key)}
              pressEffect="highlight"
              shape="square"
              size="md"
              layout={BAR_ACTION_BUTTON_LAYOUT}
              testID={action.testID}
              tone={action.tone === 'danger' ? 'danger' : action.tone}
              variant="ghost"
            >
              {action.label}
            </Button>
          </View>
        );
      }

      return (
        <View key={action.key} style={resolvedFooterLayout === 'row' ? styles.rowActionCell : null}>
          <Button
            accessibilityLabel={action.accessibilityLabel}
            block
            disabled={actionDisabled}
            layout={
              resolvedFooterLayout === 'row' && resolvedActions.length > 2
                ? COMPACT_ROW_ACTION_BUTTON_LAYOUT
                : undefined
            }
            loading={actionLoading}
            onPress={() => void pressAction(action.key)}
            pressEffect="highlight"
            shape="rounded"
            size="md"
            testID={action.testID}
            tone={action.tone === 'danger' ? 'danger' : action.tone}
            variant={action.variant}
          >
            {action.label}
          </Button>
        </View>
      );
    },
    [
      disabled,
      pressAction,
      resolvedColors.border,
      resolvedActions.length,
      resolvedFooterLayout,
    ]
  );

  const renderedFooter = React.useMemo(() => {
    if (footer?.render) return footer.render(footerContext);
    if (!resolvedActions.length) return null;

    if (resolvedFooterLayout === 'bar') {
      return (
        <View style={[styles.barFooter, { borderTopColor: resolvedColors.border }]}>
          {resolvedActions.map(renderAction)}
        </View>
      );
    }

    return (
      <View
        style={[
          styles.panelFooter,
          resolvedFooterLayout === 'row' ? styles.panelFooterRow : styles.panelFooterStack,
        ]}
      >
        {resolvedActions.map(renderAction)}
      </View>
    );
  }, [footer, footerContext, renderAction, resolvedActions, resolvedColors.border, resolvedFooterLayout]);

  const hasBody = title != null || message != null || children != null;
  const computedAccessibilityLabel =
    accessibilityLabel ?? getAccessibilityLabel(title, message, resolvedLabels.close);

  if (!mounted) return null;

  const dialogNode = (
      <View
        accessibilityLabel={computedAccessibilityLabel}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        accessibilityViewIsModal
        importantForAccessibility="yes"
        onAccessibilityEscape={() => {
          if (resolvedDismiss.backPress) dismissWithReason('back');
        }}
        pointerEvents={actualOpen ? 'auto' : 'none'}
        style={[
          hostMode === 'inline' ? styles.inlineRoot : styles.modalRoot,
          {
            elevation: Platform.OS === 'android' ? layer?.zIndex ?? ACTION_DIALOG_DEFAULT_Z_INDEX : 0,
            zIndex: layer?.zIndex ?? ACTION_DIALOG_DEFAULT_Z_INDEX,
          },
        ]}
        testID={testID}
      >
        <Pressable accessible={false} onPress={handleOverlayPress} style={StyleSheet.absoluteFill}>
          <Animated.View
            pointerEvents="none"
            style={[styles.backdrop, { backgroundColor: resolvedColors.backdrop }, overlayStyle]}
          />
        </Pressable>

        <View
          pointerEvents="box-none"
          style={[
            styles.center,
            {
              paddingBottom: Math.max(insets.bottom, wp(16)),
              paddingTop: Math.max(insets.top, wp(16)),
            },
          ]}
        >
          <Animated.View
            onLayout={(event) => {
              dialogHeightRef.current = event.nativeEvent.layout.height || 0;
              if (keyboardMetricsRef.current) updateKeyboardOffset(keyboardMetricsRef.current);
            }}
            shouldRasterizeIOS={Platform.OS === 'ios'}
            style={[
              styles.dialog,
              {
                borderRadius: wp(resolvedLayout.radius),
                maxHeight: maxDialogHeight,
                width: dialogWidth,
              },
              dialogAnimatedStyle,
              style,
            ]}
          >
            <View
              style={[
                styles.surface,
                {
                  backgroundColor: resolvedColors.surface,
                  borderRadius: wp(resolvedLayout.radius),
                },
              ]}
            >
              {hasBody ? (
                <ScrollView
                  bounces={false}
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: maxBodyHeight }}
                  contentContainerStyle={[
                    styles.body,
                    {
                      minHeight: wp(resolvedLayout.contentMinHeight),
                      padding: wp(resolvedLayout.contentPadding),
                    },
                    !renderedFooter ? styles.bodyWithoutFooter : null,
                  ]}
                >
                  {title != null ? (
                    typeof title === 'string' ? (
                      <Text
                        accessibilityRole="header"
                        align="center"
                        color={resolvedColors.title}
                        size="lg"
                        weight="semibold"
                      >
                        {title}
                      </Text>
                    ) : (
                      title
                    )
                  ) : null}
                  {message != null ? (
                    typeof message === 'string' ? (
                      <Text align="center" color={resolvedColors.message} size="md">
                        {message}
                      </Text>
                    ) : (
                      message
                    )
                  ) : null}
                  {children}
                </ScrollView>
              ) : null}
              {renderedFooter}
            </View>
          </Animated.View>
        </View>
      </View>
  );

  if (hostMode === 'inline') return dialogNode;

  return (
    <Modal
      {...modalProps}
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
    >
      {dialogNode}
    </Modal>
  );
});

export const ActionDialog = React.memo(ActionDialogRoot);

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  inlineRoot: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: wp(16),
  },
  dialog: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: wp(14) },
    shadowOpacity: 0.18,
    shadowRadius: wp(28),
    elevation: wp(10),
  },
  surface: {
    overflow: 'hidden',
  },
  body: {
    alignItems: 'center',
    gap: wp(10),
    justifyContent: 'center',
  },
  bodyWithoutFooter: {
    paddingBottom: wp(22),
  },
  panelFooter: {
    gap: wp(10),
    paddingBottom: wp(16),
    paddingHorizontal: wp(16),
    paddingTop: wp(2),
  },
  panelFooterRow: {
    flexDirection: 'row',
  },
  panelFooterStack: {
    flexDirection: 'column',
  },
  rowActionCell: {
    flex: 1,
    minWidth: 0,
  },
  barFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: BAR_FOOTER_HEIGHT,
  },
  barActionCell: {
    flex: 1,
    minWidth: 0,
  },
  barActionDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
});
