import type * as React from 'react';
import type {
  ColorValue,
  StyleProp,
  ViewProps,
  ViewStyle,
} from 'react-native';
import type { EasingFunction, ReduceMotion } from 'react-native-reanimated';
import type {
  SheetDetent as NativeSheetDetent,
  TrueSheetProps,
} from '@lodev09/react-native-true-sheet';

export type SheetPlacement = 'top' | 'right' | 'bottom' | 'left';
export type SheetSize = 'auto' | 'sm' | 'md' | 'lg' | 'full' | `${number}%` | number;
export type SheetState = 'closed' | 'opening' | 'open' | 'closing';
export type SheetDetent =
  | 'content'
  | 'auto'
  | 'medium'
  | 'large'
  | 'full'
  | `${number}%`
  | number;

type ManagedNativeProps =
  | 'name'
  | 'children'
  | 'detents'
  | 'initialDetentIndex'
  | 'initialDetentAnimated'
  | 'dimmed'
  | 'dimmedDetentIndex'
  | 'dismissible'
  | 'draggable'
  | 'backgroundColor'
  | 'cornerRadius'
  | 'grabber'
  | 'grabberOptions'
  | 'maxContentHeight'
  | 'maxContentWidth'
  | 'header'
  | 'headerStyle'
  | 'footer'
  | 'footerStyle'
  | 'style'
  | 'onDidPresent'
  | 'onDidDismiss'
  | 'onDetentChange';

export type SheetNativeProps = Omit<TrueSheetProps, ManagedNativeProps>;

export type SheetOpenReason = 'api';
export type SheetCloseReason = 'api' | 'backdrop' | 'back' | 'gesture' | 'system';
export type SheetOpenChangeReason = SheetOpenReason | SheetCloseReason;

export type SheetAnimationConfig = {
  duration?: number;
  openDuration?: number;
  closeDuration?: number;
  easing?: EasingFunction;
  reduceMotion?: ReduceMotion;
};

export type SheetSafeAreaEdges = {
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
};

export type SheetBackdropConfig = {
  visible?: boolean;
  dismissOnPress?: boolean;
  color?: string;
  opacity?: number;
};

export type SheetHandleConfig = {
  width?: number;
  height?: number;
  topMargin?: number;
  radius?: number;
  color?: ColorValue;
};

export type SheetOpenOptions = {
  detentIndex?: number;
  animated?: boolean;
};

export type SheetCloseOptions = {
  animated?: boolean;
};

export type SheetOpenChangeDetails = {
  reason: SheetOpenChangeReason;
  placement: SheetPlacement;
  detentIndex: number | null;
};

export type SheetOpenCompleteDetails = {
  placement: SheetPlacement;
  detentIndex: number | null;
};

export type SheetCloseCompleteDetails = {
  reason: SheetCloseReason;
  placement: SheetPlacement;
  detentIndex: number | null;
};

export type SheetDetentChangePayload = {
  index: number;
  detent: SheetDetent;
  nativeDetent: NativeSheetDetent;
  position: number;
  placement: 'bottom';
};

export type SheetRenderContext = {
  isOpen: boolean;
  state: SheetState;
  placement: SheetPlacement;
  detentIndex: number | null;
  open: (options?: SheetOpenOptions) => Promise<void>;
  close: (options?: SheetCloseOptions) => Promise<void>;
  snapTo: (detentIndex: number) => Promise<void>;
};

export type SheetRef = {
  open: (options?: SheetOpenOptions) => Promise<void>;
  close: (options?: SheetCloseOptions) => Promise<void>;
  snapTo: (detentIndex: number) => Promise<void>;
  getState: () => SheetState;
};

export type SheetSlot =
  | React.ReactNode
  | ((context: SheetRenderContext) => React.ReactNode);

export type SheetProps = {
  placement?: SheetPlacement;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: SheetOpenChangeDetails) => void;
  onOpenComplete?: (details: SheetOpenCompleteDetails) => void;
  onCloseComplete?: (details: SheetCloseCompleteDetails) => void;

  disabled?: boolean;
  dismissible?: boolean;
  draggable?: boolean;
  backdrop?: boolean | SheetBackdropConfig;

  title?: React.ReactNode;
  description?: React.ReactNode;
  header?: SheetSlot;
  footer?: SheetSlot;
  children?: SheetSlot;

  size?: SheetSize;
  safeArea?: boolean | SheetSafeAreaEdges;
  detents?: readonly SheetDetent[];
  detentIndex?: number;
  defaultDetentIndex?: number;
  onDetentChange?: (index: number, payload: SheetDetentChangePayload) => void;
  nativeProps?: SheetNativeProps;

  backgroundColor?: ColorValue;
  cornerRadius?: number;
  maxHeight?: number;
  maxWidth?: number;
  handle?: boolean | SheetHandleConfig;
  animation?: SheetAnimationConfig | false;
  dragCloseThreshold?: number;
  dragVelocityThreshold?: number;
  style?: StyleProp<ViewStyle>;
  headerStyle?: StyleProp<ViewStyle>;
  footerStyle?: StyleProp<ViewStyle>;

  testID?: ViewProps['testID'];
  accessibilityLabel?: ViewProps['accessibilityLabel'];
  backdropAccessibilityLabel?: string;
};

export type SheetHeaderProps = ViewProps & {
  title?: React.ReactNode;
  description?: React.ReactNode;
};

export type SheetContentProps = ViewProps;

export type SheetFooterProps = ViewProps & {
  safeArea?: boolean;
};
