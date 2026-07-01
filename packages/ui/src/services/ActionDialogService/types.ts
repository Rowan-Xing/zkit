import type * as React from 'react';
import type { ModalProps, StyleProp, ViewProps, ViewStyle } from 'react-native';

export type ActionDialogActionRole = 'confirm' | 'cancel' | 'neutral';
export type ActionDialogActionTone = 'primary' | 'neutral' | 'danger';
export type ActionDialogActionVariant = 'solid' | 'soft' | 'outline' | 'ghost';
export type ActionDialogFooterLayout = 'auto' | 'row' | 'stack' | 'bar';
export type ActionDialogResolvedFooterLayout = Exclude<ActionDialogFooterLayout, 'auto'>;
export type ActionDialogDismissReason = 'api' | 'back' | 'overlay' | 'replace' | 'unmount';
export type ActionDialogOpenChangeReason = 'action' | ActionDialogDismissReason;
export type ActionDialogCollisionStrategy = 'replace' | 'queue';
export type ActionDialogHostMode = 'modal' | 'inline';
export type ActionDialogMotion = 'none' | 'fade' | 'scale';

export type ActionDialogActionResult = {
  type: 'action';
  action: {
    key: string;
    role: ActionDialogActionRole;
  };
};

export type ActionDialogDismissResult = {
  type: 'dismiss';
  reason: ActionDialogDismissReason;
};

export type ActionDialogResult = ActionDialogActionResult | ActionDialogDismissResult;

export type ActionDialogActionContext = {
  action: ActionDialogResolvedAction;
  close: () => void;
  dismiss: (reason?: Extract<ActionDialogDismissReason, 'api'>) => void;
};

export type ActionDialogActionPressResult = void | false;

export type ActionDialogAction = {
  key?: string;
  role?: ActionDialogActionRole;
  label?: React.ReactNode;
  tone?: ActionDialogActionTone;
  variant?: ActionDialogActionVariant;
  closeOnPress?: boolean;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  testID?: ViewProps['testID'];
  onPress?: (context: ActionDialogActionContext) => ActionDialogActionPressResult;
};

export type ActionDialogResolvedAction = Required<
  Pick<ActionDialogAction, 'closeOnPress' | 'disabled' | 'key' | 'loading' | 'role' | 'tone' | 'variant'>
> &
  Pick<ActionDialogAction, 'accessibilityLabel' | 'label' | 'onPress' | 'testID'>;

export type ActionDialogFooterRenderContext = {
  actions: ActionDialogResolvedAction[];
  layout: ActionDialogResolvedFooterLayout;
  close: () => void;
  pressAction: (key: string) => void;
};

export type ActionDialogFooterOptions = {
  layout?: ActionDialogFooterLayout;
  render?: (context: ActionDialogFooterRenderContext) => React.ReactNode;
};

export type ActionDialogDismissOptions = {
  overlayPress?: boolean;
  backPress?: boolean;
};

export type ActionDialogKeyboardOptions = {
  avoid?: boolean;
  dismissOnOverlayPress?: boolean;
  dismissOnClose?: boolean;
};

export type ActionDialogLayoutOptions = {
  width?: number;
  maxWidth?: number;
  contentPadding?: number;
  contentMinHeight?: number;
  radius?: number;
};

export type ActionDialogLayerOptions = {
  zIndex?: number;
};

export type ActionDialogColors = {
  backdrop?: string;
  surface?: string;
  title?: string;
  message?: string;
  border?: string;
};

export type ActionDialogLabels = {
  confirm: string;
  cancel: string;
  close: string;
};

export type ActionDialogOpenChangeMeta = {
  reason: ActionDialogOpenChangeReason;
  result?: ActionDialogResult;
};

export type ActionDialogRef = {
  close: (reason?: Extract<ActionDialogDismissReason, 'api'>) => void;
  pressAction: (key: string) => void;
  getOpen: () => boolean;
};

export type ActionDialogProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, meta: ActionDialogOpenChangeMeta) => void;
  onClose?: (result: ActionDialogResult) => void;
  onDismissComplete?: () => void;
  onActionError?: (error: unknown, action: ActionDialogResolvedAction) => void;

  title?: React.ReactNode;
  message?: React.ReactNode;
  children?: React.ReactNode;
  actions?: readonly ActionDialogAction[];
  footer?: ActionDialogFooterOptions;

  disabled?: boolean;
  dismissible?: boolean;
  dismiss?: ActionDialogDismissOptions;
  hostMode?: ActionDialogHostMode;
  keyboard?: ActionDialogKeyboardOptions;
  layout?: ActionDialogLayoutOptions;
  layer?: ActionDialogLayerOptions;
  colors?: Partial<ActionDialogColors>;
  labels?: Partial<ActionDialogLabels>;
  motion?: ActionDialogMotion;
  modalProps?: Omit<
    ModalProps,
    'children' | 'onRequestClose' | 'presentationStyle' | 'statusBarTranslucent' | 'transparent' | 'visible'
  >;

  style?: StyleProp<ViewStyle>;
  testID?: ViewProps['testID'];
  accessibilityLabel?: ViewProps['accessibilityLabel'];
};

export type ActionDialogSemanticActionOptions = Omit<Partial<ActionDialogAction>, 'role'>;

export type ActionDialogOpenOptions = Omit<
  ActionDialogProps,
  'defaultOpen' | 'modalProps' | 'onDismissComplete' | 'onOpenChange' | 'open'
> & {
  scopeKey?: string;
  collisionStrategy?: ActionDialogCollisionStrategy;
};

export type ActionDialogConfirmOptions = Omit<ActionDialogOpenOptions, 'actions' | 'footer'> & {
  confirmLabel?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  confirmAction?: ActionDialogSemanticActionOptions;
  cancelAction?: ActionDialogSemanticActionOptions;
  tone?: 'default' | 'danger';
  footer?: Pick<ActionDialogFooterOptions, 'layout'>;
};

export type ActionDialogAlertOptions = Omit<ActionDialogOpenOptions, 'actions' | 'footer'> & {
  confirmLabel?: React.ReactNode;
  confirmAction?: ActionDialogSemanticActionOptions;
  tone?: 'default' | 'danger';
  footer?: Pick<ActionDialogFooterOptions, 'layout'>;
};

export type ActionDialogHandle = {
  id: string;
  result: Promise<ActionDialogResult>;
  close: (reason?: Extract<ActionDialogDismissReason, 'api'>) => void;
  update: (patch: Partial<ActionDialogOpenOptions>) => void;
};

export type ActionDialogSnapshot = {
  open: boolean;
  activeId: string | null;
  queuedCount: number;
};

export type ActionDialogService = {
  open: (options?: ActionDialogOpenOptions) => ActionDialogHandle;
  confirm: (options?: ActionDialogConfirmOptions) => Promise<boolean>;
  alert: (options?: ActionDialogAlertOptions) => Promise<void>;
  close: (reason?: Extract<ActionDialogDismissReason, 'api'>) => void;
  closeByScope: (scopeKey: string) => void;
  closeAll: (reason?: Extract<ActionDialogDismissReason, 'api'>) => void;
  getSnapshot: () => ActionDialogSnapshot;
};
