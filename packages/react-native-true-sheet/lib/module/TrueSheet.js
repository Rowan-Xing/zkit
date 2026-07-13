"use strict";

import { PureComponent, createRef, isValidElement, createElement } from 'react';
import TrueSheetViewNativeComponent from './fabric/TrueSheetViewNativeComponent';
import TrueSheetContainerViewNativeComponent from './fabric/TrueSheetContainerViewNativeComponent';
import TrueSheetContentViewNativeComponent from './fabric/TrueSheetContentViewNativeComponent';
import TrueSheetHeaderViewNativeComponent from './fabric/TrueSheetHeaderViewNativeComponent';
import TrueSheetFooterViewNativeComponent from './fabric/TrueSheetFooterViewNativeComponent';
import TrueSheetModule from "./specs/NativeTrueSheetModule.js";
import { Platform, StyleSheet, BackHandler, findNodeHandle, processColor } from 'react-native';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const LINKING_ERROR = `The package '@lodev09/react-native-true-sheet' doesn't seem to be linked. Make sure: \n\n` + Platform.select({
  ios: "- You have run 'pod install'\n",
  default: ''
}) + '- You rebuilt the app after installing the package\n' + '- You are not using Expo Go\n' + '- You are using the new architecture (Fabric)\n';
if (!TrueSheetModule) {
  throw new Error(LINKING_ERROR);
}
export class TrueSheet extends PureComponent {
  displayName = 'TrueSheet';
  backHandlerSubscription = null;
  isPresented = false;
  isSheetVisible = true;

  /**
   * Map of sheet names against their instances.
   */
  static instances = {};

  /**
   * Resolver to be called when mount event is received
   */
  presentationResolver = null;

  /**
   * Tracks if a present operation is in progress
   */
  isPresenting = false;
  constructor(props) {
    super(props);
    this.nativeRef = /*#__PURE__*/createRef();
    this.validateDetents();

    // Lazy load by default, except when initialDetentIndex is set (for auto-presentation)
    const shouldRenderImmediately = props.initialDetentIndex !== undefined && props.initialDetentIndex >= 0;
    this.state = {
      shouldRenderNativeView: shouldRenderImmediately
    };
    this.onMount = this.onMount.bind(this);
    this.onWillDismiss = this.onWillDismiss.bind(this);
    this.onDidDismiss = this.onDidDismiss.bind(this);
    this.onWillPresent = this.onWillPresent.bind(this);
    this.onDidPresent = this.onDidPresent.bind(this);
    this.onDetentChange = this.onDetentChange.bind(this);
    this.onDragBegin = this.onDragBegin.bind(this);
    this.onDragChange = this.onDragChange.bind(this);
    this.onDragEnd = this.onDragEnd.bind(this);
    this.onPositionChange = this.onPositionChange.bind(this);
    this.onWillFocus = this.onWillFocus.bind(this);
    this.onDidFocus = this.onDidFocus.bind(this);
    this.onWillBlur = this.onWillBlur.bind(this);
    this.onDidBlur = this.onDidBlur.bind(this);
    this.handleBackPress = this.handleBackPress.bind(this);
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
  }
  validateDetents() {
    const {
      detents,
      initialDetentIndex
    } = this.props;

    // Warn if detents length exceeds 3
    if (detents && detents.length > 3) {
      console.warn(`TrueSheet: detents array has ${detents.length} items but maximum is 3. Only the first 3 will be used.`);
    }

    // Warn for invalid detent fractions
    if (detents) {
      detents.forEach((detent, index) => {
        if (detent !== 'auto' && typeof detent === 'number') {
          if (detent <= 0 || detent > 1) {
            console.warn(`TrueSheet: detent at index ${index} (${detent}) should be between 0 and 1. It will be clamped.`);
          }
        }
      });
    }

    // Validate initialDetentIndex bounds
    if (initialDetentIndex !== undefined && initialDetentIndex >= 0) {
      const detentsLength = Math.min(detents?.length ?? 2, 3); // Max 3 detents
      if (initialDetentIndex >= detentsLength) {
        throw new Error(`TrueSheet: initialDetentIndex (${initialDetentIndex}) is out of bounds. detents array has ${detentsLength} item(s)`);
      }
    }
  }
  static getInstance(name) {
    const instance = TrueSheet.instances[name];
    if (!instance) {
      console.warn(`Could not find TrueSheet instance with name "${name}". Check your name prop.`);
      return;
    }
    return instance;
  }
  get handle() {
    const nodeHandle = findNodeHandle(this.nativeRef.current);
    if (nodeHandle == null || nodeHandle === -1) {
      throw new Error('Could not get native view tag');
    }
    return nodeHandle;
  }

  /**
   * Present the sheet by given `name` (Promise-based)
   * @param name - Sheet name (must match sheet's name prop)
   * @param index - Detent index (default: 0)
   * @param animated - Whether to animate the presentation (default: true)
   * @returns Promise that resolves when sheet is fully presented
   * @throws Error if sheet not found or presentation fails
   */
  static async present(name, index = 0, animated = true) {
    const instance = TrueSheet.getInstance(name);
    if (!instance) {
      throw new Error(`Sheet with name "${name}" not found`);
    }
    return instance.present(index, animated);
  }

  /**
   * Dismiss the sheet by given `name` (Promise-based)
   * @param name - Sheet name
   * @param animated - Whether to animate the dismissal (default: true)
   * @returns Promise that resolves when sheet is fully dismissed
   * @throws Error if sheet not found or dismissal fails
   */
  static async dismiss(name, animated = true) {
    const instance = TrueSheet.getInstance(name);
    if (!instance) {
      throw new Error(`Sheet with name "${name}" not found`);
    }
    return instance.dismiss(animated);
  }

  /**
   * Dismiss only the sheets presented on top of a sheet by given `name`
   * @param name - Sheet name
   * @param animated - Whether to animate the dismissal (default: true)
   * @returns Promise that resolves when all child sheets are dismissed
   * @throws Error if sheet not found
   */
  static async dismissStack(name, animated = true) {
    const instance = TrueSheet.getInstance(name);
    if (!instance) {
      throw new Error(`Sheet with name "${name}" not found`);
    }
    return instance.dismissStack(animated);
  }

  /**
   * Resize the sheet by given `name` (Promise-based)
   * @param name - Sheet name
   * @param index - New detent index
   * @returns Promise that resolves when resize is complete
   * @throws Error if sheet not found
   */
  static async resize(name, index) {
    const instance = TrueSheet.getInstance(name);
    if (!instance) {
      throw new Error(`Sheet with name "${name}" not found`);
    }
    return instance.resize(index);
  }

  /**
   * Dismiss all presented sheets by dismissing from the bottom of the stack.
   * This ensures child sheets are dismissed first before their parent.
   * @param animated - Whether to animate the dismissals (default: true)
   * @returns Promise that resolves when all sheets are dismissed
   */
  static async dismissAll(animated = true) {
    return TrueSheetModule?.dismissAll(animated);
  }
  registerInstance() {
    if (this.props.name) {
      TrueSheet.instances[this.props.name] = this;
    }
  }
  unregisterInstance() {
    if (this.props.name) {
      delete TrueSheet.instances[this.props.name];
    }
  }
  onDetentChange(event) {
    this.props.onDetentChange?.(event);
  }
  onWillPresent(event) {
    this.props.onWillPresent?.(event);
  }
  onDidPresent(event) {
    this.isPresented = true;
    if (Platform.OS === 'android') {
      this.backHandlerSubscription?.remove();
      this.backHandlerSubscription = BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);
    }
    this.props.onDidPresent?.(event);
  }
  onWillDismiss(event) {
    this.props.onWillDismiss?.(event);
  }
  onDidDismiss(event) {
    this.isPresented = false;
    this.isSheetVisible = true;
    this.backHandlerSubscription?.remove();
    this.backHandlerSubscription = null;

    // Clean up native view after dismiss for lazy loading.
    // Skip unmount if a present is in progress to avoid race condition.
    if (!this.isPresenting) {
      this.setState({
        shouldRenderNativeView: false
      });
    }
    this.props.onDidDismiss?.(event);
  }
  onMount(event) {
    // Resolve the mount promise if waiting
    if (this.presentationResolver) {
      this.presentationResolver();
      this.presentationResolver = null;
    }
    this.props.onMount?.(event);
  }
  onDragBegin(event) {
    this.props.onDragBegin?.(event);
  }
  onDragChange(event) {
    this.props.onDragChange?.(event);
  }
  onDragEnd(event) {
    this.props.onDragEnd?.(event);
  }
  onPositionChange(event) {
    this.props.onPositionChange?.(event);
  }
  onWillFocus(event) {
    this.props.onWillFocus?.(event);
  }
  onDidFocus(event) {
    this.props.onDidFocus?.(event);
  }
  onWillBlur(event) {
    this.props.onWillBlur?.(event);
  }
  onDidBlur(event) {
    this.props.onDidBlur?.(event);
  }
  onVisibilityChange(event) {
    this.isSheetVisible = event.nativeEvent.visible;
  }
  handleBackPress() {
    if (!this.isPresented || !this.isSheetVisible) return false;
    TrueSheetModule?.handleBackPress(this.handle);
    return this.props.onBackPress?.() ?? true;
  }

  /**
   * Present the sheet at a given detent index.
   * @param index - The detent index to present at (default: 0)
   * @param animated - Whether to animate the presentation (default: true)
   */
  async present(index = 0, animated = true) {
    const detentsLength = Math.min(this.props.detents?.length ?? 2, 3); // Max 3 detents
    if (index < 0 || index >= detentsLength) {
      throw new Error(`TrueSheet: present index (${index}) is out of bounds. detents array has ${detentsLength} item(s)`);
    }
    this.isPresenting = true;

    // Lazy load: render native view if not already rendered
    if (!this.state.shouldRenderNativeView) {
      await new Promise(resolve => {
        this.presentationResolver = resolve;
        this.setState({
          shouldRenderNativeView: true
        });
      });
    }
    await TrueSheetModule?.presentByRef(this.handle, index, animated);
    this.isPresenting = false;
  }

  /**
   * Resize the sheet to a given detent index.
   * @param index - The detent index to resize to
   */
  async resize(index) {
    await TrueSheetModule?.resizeByRef(this.handle, index);
  }

  /**
   * Dismiss this sheet and all sheets presented on top of it in a single animation.
   * @param animated - Whether to animate the dismissal (default: true)
   */
  async dismiss(animated = true) {
    return TrueSheetModule?.dismissByRef(this.handle, animated);
  }

  /**
   * Dismiss only the sheets presented on top of this sheet, keeping this sheet presented.
   * If no sheets are presented on top, this method does nothing.
   * @param animated - Whether to animate the dismissal (default: true)
   */
  async dismissStack(animated = true) {
    return TrueSheetModule?.dismissStackByRef(this.handle, animated);
  }
  componentDidMount() {
    this.registerInstance();
  }
  componentDidUpdate(prevProps) {
    this.registerInstance();

    // Validate when detents prop changes
    if (prevProps.detents !== this.props.detents) {
      this.validateDetents();
    }
  }
  componentWillUnmount() {
    this.unregisterInstance();
    this.backHandlerSubscription?.remove();
    this.backHandlerSubscription = null;
    this.presentationResolver = null;
  }
  render() {
    const {
      detents = [0.5, 1],
      backgroundColor,
      dismissible = true,
      draggable = true,
      grabber = true,
      grabberOptions,
      dimmed = true,
      initialDetentIndex = -1,
      initialDetentAnimated = true,
      dimmedDetentIndex,
      backgroundBlur,
      blurOptions,
      cornerRadius,
      maxContentHeight,
      maxContentWidth,
      anchor = 'center',
      anchorOffset,
      scrollable = false,
      scrollableOptions,
      pageSizing = true,
      children,
      style,
      header,
      headerStyle,
      footer,
      footerStyle,
      insetAdjustment = 'automatic',
      ...rest
    } = this.props;

    // Trim to max 3 detents and clamp fractions
    const resolvedDetents = detents.slice(0, 3).map(detent => {
      if (detent === 'auto' || detent === -1) return -1;

      // Default to 0.1 if zero or below
      if (detent <= 0) return 0.1;

      // Clamp to maximum of 1
      return Math.min(1, detent);
    });

    // Cache grabberOptions to avoid creating a new object every render
    if (grabberOptions !== this.cachedGrabberOptions) {
      this.cachedGrabberOptions = grabberOptions;
      this.resolvedGrabberOptions = {
        ...grabberOptions,
        color: processColor(grabberOptions?.color)
      };
    }
    return /*#__PURE__*/_jsx(TrueSheetViewNativeComponent, {
      ...rest,
      ref: this.nativeRef,
      style: styles.sheetView,
      detents: resolvedDetents,
      backgroundBlur: backgroundBlur,
      blurOptions: blurOptions,
      backgroundColor: backgroundColor,
      cornerRadius: cornerRadius,
      grabber: grabber,
      grabberOptions: this.resolvedGrabberOptions,
      dimmed: dimmed,
      dimmedDetentIndex: dimmedDetentIndex,
      initialDetentIndex: initialDetentIndex,
      initialDetentAnimated: initialDetentAnimated,
      dismissible: dismissible,
      draggable: draggable,
      maxContentHeight: maxContentHeight,
      maxContentWidth: maxContentWidth,
      anchor: anchor,
      anchorOffset: anchorOffset,
      scrollable: scrollable,
      scrollableOptions: scrollableOptions,
      pageSizing: pageSizing,
      insetAdjustment: insetAdjustment,
      onMount: this.onMount,
      onWillPresent: this.onWillPresent,
      onDidPresent: this.onDidPresent,
      onWillDismiss: this.onWillDismiss,
      onDidDismiss: this.onDidDismiss,
      onDetentChange: this.onDetentChange,
      onDragBegin: this.onDragBegin,
      onDragChange: this.onDragChange,
      onDragEnd: this.onDragEnd,
      onPositionChange: this.onPositionChange,
      onWillFocus: this.onWillFocus,
      onDidFocus: this.onDidFocus,
      onWillBlur: this.onWillBlur,
      onDidBlur: this.onDidBlur,
      onVisibilityChange: this.onVisibilityChange,
      children: this.state.shouldRenderNativeView && /*#__PURE__*/_jsxs(TrueSheetContainerViewNativeComponent, {
        style: scrollable ? styles.scrollableContainer : undefined,
        children: [header && /*#__PURE__*/_jsx(TrueSheetHeaderViewNativeComponent, {
          style: [styles.header, headerStyle],
          children: /*#__PURE__*/isValidElement(header) ? header : /*#__PURE__*/createElement(header)
        }), /*#__PURE__*/_jsx(TrueSheetContentViewNativeComponent, {
          style: scrollable ? [style, styles.scrollableContent] : style,
          children: children
        }), footer && /*#__PURE__*/_jsx(TrueSheetFooterViewNativeComponent, {
          style: [styles.footer, footerStyle],
          children: /*#__PURE__*/isValidElement(footer) ? footer : /*#__PURE__*/createElement(footer)
        })]
      })
    });
  }
}
const styles = StyleSheet.create({
  sheetView: {
    ...StyleSheet.absoluteFill,
    zIndex: -9999,
    pointerEvents: 'box-none'
  },
  scrollableContainer: {
    ...StyleSheet.absoluteFill
  },
  scrollableContent: {
    flex: 1
  },
  header: {
    pointerEvents: 'box-none'
  },
  footer: {
    pointerEvents: 'box-none',
    position: 'absolute',
    left: 0,
    right: 0
  }
});
//# sourceMappingURL=TrueSheet.js.map