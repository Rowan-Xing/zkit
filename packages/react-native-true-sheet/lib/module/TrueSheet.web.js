"use strict";

import { createElement, Fragment, forwardRef, isValidElement, useCallback, useContext, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, useColorScheme, useWindowDimensions } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetFooter, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import { BottomSheetContext } from "./TrueSheetProvider.web.js";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const DEFAULT_CORNER_RADIUS = 16;
const DEFAULT_ELEVATION = 4;
const DEFAULT_MAX_WIDTH = 640;
// M3 baseline surfaceContainerLow
const COLOR_SURFACE_CONTAINER_LOW_LIGHT = '#F7F2FA';
const COLOR_SURFACE_CONTAINER_LOW_DARK = '#1D1B20';
const DEFAULT_ANCHOR_OFFSET = 16;
const DEFAULT_DETACHED_OFFSET = 16;
const DEFAULT_GRABBER_COLOR_LIGHT = 'rgba(0, 0, 0, 0.3)';
const DEFAULT_GRABBER_COLOR_DARK = 'rgba(255, 255, 255, 0.3)';
const DEFAULT_GRABBER_WIDTH = 32;
const DEFAULT_GRABBER_HEIGHT = 4;

/**
 * Converts elevation to CSS box-shadow based on Material Design 3 elevation system.
 * Uses a combination of ambient and key shadows for realistic depth.
 */
const getElevationShadow = elevation => {
  if (elevation <= 0) return 'none';
  const ambientY = elevation * 0.5;
  const ambientBlur = elevation * 1.5;
  const ambientOpacity = 0.08 + elevation * 0.01;
  const keyY = elevation;
  const keyBlur = elevation * 2;
  const keyOpacity = 0.12 + elevation * 0.02;
  return `0px ${ambientY}px ${ambientBlur}px rgba(0, 0, 0, ${ambientOpacity}), 0px ${keyY}px ${keyBlur}px rgba(0, 0, 0, ${keyOpacity})`;
};
const renderSlot = slot => {
  if (!slot) return null;
  if (/*#__PURE__*/isValidElement(slot)) return slot;
  return /*#__PURE__*/createElement(slot);
};
const TrueSheetComponent = /*#__PURE__*/forwardRef((props, ref) => {
  const {
    name,
    detents = [0.5, 1],
    dismissible = true,
    draggable = true,
    dimmed = true,
    dimmedDetentIndex = 0,
    children,
    scrollable = false,
    initialDetentIndex = -1,
    backgroundColor: backgroundColorProp,
    cornerRadius = DEFAULT_CORNER_RADIUS,
    elevation = DEFAULT_ELEVATION,
    grabber = true,
    grabberOptions,
    maxContentHeight,
    maxContentWidth,
    anchor = 'center',
    anchorOffset = DEFAULT_ANCHOR_OFFSET,
    header,
    headerStyle,
    footer,
    footerStyle,
    onMount,
    onWillPresent,
    onDidPresent,
    onWillDismiss,
    onDidDismiss,
    onDetentChange,
    onPositionChange,
    onDragBegin,
    onDragChange,
    onDragEnd,
    onWillFocus,
    onDidFocus,
    onWillBlur,
    onDidBlur,
    detached,
    detachedOffset = DEFAULT_DETACHED_OFFSET,
    stackBehavior = 'switch',
    style
  } = props;
  const colorScheme = useColorScheme();
  const backgroundColor = backgroundColorProp ?? (colorScheme === 'dark' ? COLOR_SURFACE_CONTAINER_LOW_DARK : COLOR_SURFACE_CONTAINER_LOW_LIGHT);
  const {
    width: windowWidth,
    height: windowHeight
  } = useWindowDimensions();
  const isLandscapeOrTablet = windowWidth >= 600 || windowWidth > windowHeight;
  const defaultName = useId();
  const sheetName = name ?? defaultName;
  const bottomSheetContext = useContext(BottomSheetContext);
  const bottomSheetModalRef = useRef(null);
  const bottomSheetRef = useRef(null);
  const initialDetentIndexRef = useRef(initialDetentIndex);
  const currentIndexRef = useRef(0);
  const isPresenting = useRef(false);
  const isDismissing = useRef(false);
  const isMinimized = useRef(false);
  const isDragging = useRef(false);
  const presentResolver = useRef(null);
  const dismissResolver = useRef(null);
  const animatedPosition = useSharedValue(windowHeight);
  const animatedIndex = useSharedValue(0);
  const [snapIndex, setSnapIndex] = useState(initialDetentIndex);
  const [isMounted, setIsMounted] = useState(false);
  const isNonModal = stackBehavior === 'none';
  useDerivedValue(() => {
    onPositionChange?.({
      nativeEvent: {
        position: animatedPosition.value,
        index: animatedIndex.value,
        detent: detents[animatedIndex.value] ?? 0,
        realtime: true
      }
    });
  });
  const hasAutoDetent = detents.includes('auto');
  const containerHeight = maxContentHeight ?? windowHeight;
  const snapPoints = useMemo(() => detents.filter(detent => detent !== 'auto' && typeof detent === 'number').map(detent => Math.min(1, Math.max(0.1, detent)) * containerHeight), [detents, containerHeight]);
  const handleChange = useCallback((index, _position, _type) => {
    const previousIndex = currentIndexRef.current;
    currentIndexRef.current = index;

    // Handle drag end
    if (isDragging.current && !isPresenting.current) {
      isDragging.current = false;
      onDragEnd?.({
        nativeEvent: {
          index,
          position: animatedPosition.value,
          detent: detents[index] ?? 0
        }
      });
    }
    if (!isPresenting.current && !isMinimized.current && previousIndex !== index && index >= 0) {
      onDetentChange?.({
        nativeEvent: {
          index,
          position: animatedPosition.value,
          detent: detents[index] ?? 0
        }
      });
    }
    if (isPresenting.current) {
      isPresenting.current = false;

      // Resolve present promise
      if (presentResolver.current) {
        presentResolver.current();
        presentResolver.current = null;
      }
      onDidPresent?.({
        nativeEvent: {
          index,
          position: animatedPosition.value,
          detent: detents[index] ?? 0
        }
      });
      onDidFocus?.({
        nativeEvent: null
      });
    }

    // Fire onDidBlur when sheet reaches minimized state (index -1 but still mounted)
    if (isMinimized.current && index === -1) {
      onDidBlur?.({
        nativeEvent: null
      });
    }

    // Fire onDidFocus when sheet is restored from minimized state
    if (isMinimized.current && index >= 0) {
      isMinimized.current = false;
      onDidFocus?.({
        nativeEvent: null
      });
    }
  }, [detents, animatedPosition]);
  const handleDismiss = useCallback(() => {
    // Remove from stack when dismissed
    bottomSheetContext?.removeFromStack(sheetName);

    // Resolve dismiss promise
    if (dismissResolver.current) {
      dismissResolver.current();
      dismissResolver.current = null;
    }
    onDidDismiss?.({
      nativeEvent: null
    });

    // Reset states since sheet is being dismissed
    isMinimized.current = false;
    isDismissing.current = false;
    isDragging.current = false;
  }, [sheetName]);
  const handleAnimate = useCallback((_fromIndex, toIndex) => {
    // Detect drag begin (when not presenting or dismissing)
    if (!isPresenting.current && !isDismissing.current && !isDragging.current && toIndex >= 0) {
      isDragging.current = true;
      onDragBegin?.({
        nativeEvent: {
          index: currentIndexRef.current,
          position: animatedPosition.value,
          detent: detents[currentIndexRef.current] ?? 0
        }
      });
    }

    // Drag change during animation
    if (isDragging.current && toIndex >= 0) {
      onDragChange?.({
        nativeEvent: {
          index: toIndex,
          position: animatedPosition.value,
          detent: detents[toIndex] ?? 0
        }
      });
    }
    if (isPresenting.current) {
      // Fire onMount on first present (before willPresent, matching native)
      if (!isMounted) {
        setIsMounted(true);
        onMount?.({
          nativeEvent: null
        });
      }
      onWillPresent?.({
        nativeEvent: {
          index: toIndex,
          position: animatedPosition.value,
          detent: detents[toIndex] ?? 0
        }
      });

      // Focus events fire together with present events
      onWillFocus?.({
        nativeEvent: null
      });
    }

    // Detect if sheet is being restored (will focus)
    if (isMinimized.current && toIndex >= 0) {
      onWillFocus?.({
        nativeEvent: null
      });
    }
    if (toIndex === -1 && !isPresenting.current) {
      isMinimized.current = true;
      onWillBlur?.({
        nativeEvent: null
      });

      // Only fire willDismiss if this is an actual dismiss (not being backgrounded by another sheet)
      const sheetsAbove = bottomSheetContext?.getSheetsAbove(sheetName) ?? [];
      if (sheetsAbove.length === 0) {
        onWillDismiss?.({
          nativeEvent: null
        });
      }
    }
  }, [detents, animatedPosition, sheetName, bottomSheetContext, isMounted, onMount]);
  const backdropComponent = useCallback(backdropProps => {
    if (!dimmed) {
      return null;
    }

    // When not dismissible, collapse to below dimmed index instead of dismissing
    const pressBehavior = dismissible ? 'close' : dimmedDetentIndex > 0 ? dimmedDetentIndex - 1 : 'none';
    return /*#__PURE__*/_jsx(BottomSheetBackdrop, {
      ...backdropProps,
      opacity: 0.5,
      appearsOnIndex: dimmedDetentIndex,
      disappearsOnIndex: dimmedDetentIndex - 1,
      pressBehavior: pressBehavior
    });
  }, [dimmed, dimmedDetentIndex, dismissible]);
  const indicatorHeight = grabberOptions?.height ?? DEFAULT_GRABBER_HEIGHT;
  const handleStyle = useMemo(() => grabber ? [styles.handle, {
    paddingTop: grabberOptions?.topMargin
  }] : {
    display: 'none'
  }, [grabber, grabberOptions?.topMargin]);
  const defaultGrabberColor = colorScheme === 'dark' ? DEFAULT_GRABBER_COLOR_DARK : DEFAULT_GRABBER_COLOR_LIGHT;
  const handleIndicatorStyle = useMemo(() => ({
    height: indicatorHeight,
    borderRadius: grabberOptions?.cornerRadius ?? indicatorHeight / 2,
    width: grabberOptions?.width ?? DEFAULT_GRABBER_WIDTH,
    backgroundColor: grabberOptions?.color ?? defaultGrabberColor
  }), [grabberOptions, indicatorHeight, defaultGrabberColor]);
  const footerComponent = useMemo(() => footer ? footerProps => /*#__PURE__*/_jsx(BottomSheetFooter, {
    style: StyleSheet.flatten([styles.footer, footerStyle]),
    ...footerProps,
    children: renderSlot(footer)
  }) : undefined, [footer, footerStyle]);

  // For scrollable, we render the child directly
  const ContainerComponent = scrollable ? Fragment : BottomSheetView;
  const sheetMethodsRef = useRef({
    present: (index = 0) => {
      return new Promise(resolve => {
        presentResolver.current = resolve;
        setSnapIndex(index);
        isPresenting.current = true;
        if (isNonModal) {
          bottomSheetRef.current?.snapToIndex(index);
        } else {
          bottomSheetContext?.pushToStack(sheetName);
          bottomSheetModalRef.current?.present();
        }
      });
    },
    dismiss: () => {
      return new Promise(resolve => {
        dismissResolver.current = resolve;
        isDismissing.current = true;
        if (isNonModal) {
          bottomSheetRef.current?.close();
        } else {
          bottomSheetModalRef.current?.dismiss();
        }
      });
    },
    dismissStack: () => {
      return new Promise(resolve => {
        // Dismiss only sheets above, keeping this sheet presented
        const sheetsAbove = bottomSheetContext?.getSheetsAbove(sheetName) ?? [];
        const immediateChild = sheetsAbove[sheetsAbove.length - 1];
        if (immediateChild) {
          // Dismiss the immediate child - gorhom will dismiss all sheets above it
          bottomSheetContext?.dismiss(immediateChild).then(resolve);
          return;
        }
        resolve();
      });
    },
    resize: async index => {
      if (isNonModal) {
        bottomSheetRef.current?.snapToIndex(index);
      } else {
        bottomSheetModalRef.current?.snapToIndex(index);
      }
    }
  });
  useImperativeHandle(ref, () => sheetMethodsRef.current);

  // Register with context provider
  useEffect(() => {
    bottomSheetContext?.register(sheetName, sheetMethodsRef);
    return () => {
      bottomSheetContext?.unregister(sheetName);
    };
  }, [sheetName]);

  // Auto-present on mount if initialDetentIndex is set
  useEffect(() => {
    if (initialDetentIndexRef.current >= 0) {
      sheetMethodsRef.current.present(initialDetentIndexRef.current);
    }
  }, []);
  const sheetContent = /*#__PURE__*/_jsxs(ContainerComponent, {
    children: [header && /*#__PURE__*/_jsx(View, {
      style: headerStyle,
      children: renderSlot(header)
    }), scrollable ? children : /*#__PURE__*/_jsx(View, {
      style: style,
      children: children
    })]
  });
  const sharedProps = {
    style: [styles.root, {
      backgroundColor,
      borderTopLeftRadius: cornerRadius,
      borderTopRightRadius: cornerRadius,
      borderBottomLeftRadius: detached ? cornerRadius : 0,
      borderBottomRightRadius: detached ? cornerRadius : 0,
      boxShadow: getElevationShadow(elevation),
      maxWidth: isLandscapeOrTablet ? maxContentWidth ?? DEFAULT_MAX_WIDTH : undefined,
      marginLeft: isLandscapeOrTablet ? anchor === 'left' ? anchorOffset : 'auto' : undefined,
      marginRight: isLandscapeOrTablet ? anchor === 'right' ? anchorOffset : 'auto' : undefined,
      marginHorizontal: detached ? anchorOffset : undefined
    }],
    backgroundComponent: null,
    index: snapIndex,
    enablePanDownToClose: dismissible,
    enableContentPanningGesture: draggable,
    enableHandlePanningGesture: draggable,
    animatedPosition,
    animatedIndex,
    handleStyle,
    handleIndicatorStyle,
    onChange: handleChange,
    onAnimate: handleAnimate,
    enableDynamicSizing: hasAutoDetent,
    maxDynamicContentSize: maxContentHeight,
    snapPoints: snapPoints.length > 0 ? snapPoints : undefined,
    detached,
    bottomInset: detached ? detachedOffset : undefined,
    backdropComponent,
    footerComponent
  };
  if (isNonModal) {
    return /*#__PURE__*/_jsx(BottomSheet, {
      ref: bottomSheetRef,
      onClose: handleDismiss,
      ...sharedProps,
      children: sheetContent
    });
  }
  return /*#__PURE__*/_jsx(BottomSheetModal, {
    ref: bottomSheetModalRef,
    name: sheetName,
    animateOnMount: true,
    onDismiss: handleDismiss,
    stackBehavior: stackBehavior,
    ...sharedProps,
    children: sheetContent
  });
});
const STATIC_METHOD_ERROR = 'Static methods are not supported on web. Use the useTrueSheet() hook instead.';
export const TrueSheet = TrueSheetComponent;
TrueSheet.present = async () => {
  throw new Error(STATIC_METHOD_ERROR);
};
TrueSheet.dismiss = async () => {
  throw new Error(STATIC_METHOD_ERROR);
};
TrueSheet.dismissStack = async () => {
  throw new Error(STATIC_METHOD_ERROR);
};
TrueSheet.resize = async () => {
  throw new Error(STATIC_METHOD_ERROR);
};
TrueSheet.dismissAll = async () => {
  throw new Error(STATIC_METHOD_ERROR);
};
const styles = StyleSheet.create({
  root: {
    overflow: 'hidden'
  },
  handle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingVertical: 10,
    pointerEvents: 'none'
  },
  footer: {
    pointerEvents: 'box-none'
  }
});
//# sourceMappingURL=TrueSheet.web.js.map