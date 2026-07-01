import type * as React from 'react';
import type {
  ActionDialogAction,
  ActionDialogActionRole,
  ActionDialogActionTone,
  ActionDialogActionVariant,
  ActionDialogColors,
  ActionDialogDismissOptions,
  ActionDialogFooterLayout,
  ActionDialogKeyboardOptions,
  ActionDialogLabels,
  ActionDialogLayoutOptions,
  ActionDialogOpenOptions,
  ActionDialogResolvedAction,
  ActionDialogResolvedFooterLayout,
  ActionDialogResult,
  ActionDialogSemanticActionOptions,
} from './types';

export const ACTION_DIALOG_DEFAULT_Z_INDEX = 4200;

export const ACTION_DIALOG_DEFAULT_LAYOUT: Required<ActionDialogLayoutOptions> = {
  width: 320,
  maxWidth: 380,
  contentPadding: 20,
  contentMinHeight: 120,
  radius: 20,
};

export const ACTION_DIALOG_DEFAULT_DISMISS: Required<ActionDialogDismissOptions> = {
  overlayPress: false,
  backPress: true,
};

export const ACTION_DIALOG_DEFAULT_KEYBOARD: Required<ActionDialogKeyboardOptions> = {
  avoid: true,
  dismissOnOverlayPress: true,
  dismissOnClose: true,
};

export const ACTION_DIALOG_DEFAULT_COLORS: Required<ActionDialogColors> = {
  backdrop: 'rgba(17, 24, 39, 0.48)',
  surface: '',
  title: '',
  message: '',
  border: '',
};

const AUTO_ROW_MAX_ACTIONS = 3;
const AUTO_ROW_MAX_LABEL_WEIGHT = 8;

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function positiveNumber(value: number | undefined, fallback: number) {
  return isFiniteNumber(value) && value > 0 ? value : fallback;
}

export function resolveLayout(layout: ActionDialogLayoutOptions | undefined): Required<ActionDialogLayoutOptions> {
  return {
    width: positiveNumber(layout?.width, ACTION_DIALOG_DEFAULT_LAYOUT.width),
    maxWidth: positiveNumber(layout?.maxWidth, ACTION_DIALOG_DEFAULT_LAYOUT.maxWidth),
    contentPadding: positiveNumber(layout?.contentPadding, ACTION_DIALOG_DEFAULT_LAYOUT.contentPadding),
    contentMinHeight: positiveNumber(
      layout?.contentMinHeight,
      ACTION_DIALOG_DEFAULT_LAYOUT.contentMinHeight
    ),
    radius: positiveNumber(layout?.radius, ACTION_DIALOG_DEFAULT_LAYOUT.radius),
  };
}

export function resolveDismissOptions(
  dismissible: boolean,
  dismiss: ActionDialogDismissOptions | undefined
): Required<ActionDialogDismissOptions> {
  return {
    overlayPress: dismissible && (dismiss?.overlayPress ?? ACTION_DIALOG_DEFAULT_DISMISS.overlayPress),
    backPress: dismissible && (dismiss?.backPress ?? ACTION_DIALOG_DEFAULT_DISMISS.backPress),
  };
}

export function resolveKeyboardOptions(
  keyboard: ActionDialogKeyboardOptions | undefined
): Required<ActionDialogKeyboardOptions> {
  return {
    avoid: keyboard?.avoid ?? ACTION_DIALOG_DEFAULT_KEYBOARD.avoid,
    dismissOnOverlayPress:
      keyboard?.dismissOnOverlayPress ?? ACTION_DIALOG_DEFAULT_KEYBOARD.dismissOnOverlayPress,
    dismissOnClose: keyboard?.dismissOnClose ?? ACTION_DIALOG_DEFAULT_KEYBOARD.dismissOnClose,
  };
}

export function resolveFooterLayout(
  layout: ActionDialogFooterLayout | undefined,
  actions: readonly Pick<ActionDialogResolvedAction, 'label'>[]
): ActionDialogResolvedFooterLayout {
  if (layout === 'bar' || layout === 'row' || layout === 'stack') return layout;
  if (actions.length <= 2) return 'row';
  if (actions.length > AUTO_ROW_MAX_ACTIONS) return 'stack';
  return actions.every((action) => {
    const weight = getPrimitiveLabelWeight(action.label);
    return weight != null && weight <= AUTO_ROW_MAX_LABEL_WEIGHT;
  })
    ? 'row'
    : 'stack';
}

function defaultToneForRole(role: ActionDialogActionRole): ActionDialogActionTone {
  if (role === 'confirm') return 'primary';
  return 'neutral';
}

function getPrimitiveLabelWeight(label: React.ReactNode) {
  const text = typeof label === 'string' || typeof label === 'number' ? String(label).trim() : '';
  if (!text) return null;

  return Array.from(text).reduce((total, char) => {
    const code = char.codePointAt(0) ?? 0;
    return total + (code > 0xff ? 2 : 1);
  }, 0);
}

function defaultVariantForTone(tone: ActionDialogActionTone): ActionDialogActionVariant {
  return tone === 'neutral' ? 'soft' : 'solid';
}

function fallbackLabel(role: ActionDialogActionRole, key: string, labels: ActionDialogLabels): React.ReactNode {
  if (role === 'confirm') return labels.confirm;
  if (role === 'cancel') return labels.cancel;
  return key;
}

export function resolveActions(
  actions: readonly ActionDialogAction[] | undefined,
  labels: ActionDialogLabels
): ActionDialogResolvedAction[] {
  if (!actions?.length) return [];

  return actions.map((action, index) => {
    const role = action.role ?? 'neutral';
    const key = action.key ?? `${role}-${index}`;
    const tone = action.tone ?? defaultToneForRole(role);
    const variant = action.variant ?? defaultVariantForTone(tone);

    return {
      key,
      role,
      label: action.label ?? fallbackLabel(role, key, labels),
      tone,
      variant,
      closeOnPress: action.closeOnPress ?? true,
      disabled: Boolean(action.disabled),
      loading: Boolean(action.loading),
      accessibilityLabel: action.accessibilityLabel,
      testID: action.testID,
      onPress: action.onPress,
    };
  });
}

export function createActionResult(action: ActionDialogResolvedAction): ActionDialogResult {
  return {
    type: 'action',
    action: {
      key: action.key,
      role: action.role,
    },
  };
}

export function mergeOpenOptions(
  base: ActionDialogOpenOptions,
  patch: Partial<ActionDialogOpenOptions>
): ActionDialogOpenOptions {
  return {
    ...base,
    ...patch,
    colors: { ...base.colors, ...patch.colors },
    dismiss: { ...base.dismiss, ...patch.dismiss },
    footer: { ...base.footer, ...patch.footer },
    keyboard: { ...base.keyboard, ...patch.keyboard },
    labels: { ...base.labels, ...patch.labels },
    layer: { ...base.layer, ...patch.layer },
    layout: { ...base.layout, ...patch.layout },
  };
}

export function createSemanticAction(
  input: ActionDialogSemanticActionOptions | undefined,
  fallbackLabel: React.ReactNode | undefined,
  key: string,
  role: ActionDialogActionRole,
  tone: ActionDialogActionTone
): ActionDialogAction {
  return {
    key: input?.key ?? key,
    role,
    label: input?.label ?? fallbackLabel,
    tone: input?.tone ?? tone,
    variant: input?.variant,
    closeOnPress: input?.closeOnPress ?? true,
    disabled: input?.disabled,
    loading: input?.loading,
    accessibilityLabel: input?.accessibilityLabel,
    testID: input?.testID,
    onPress: input?.onPress,
  };
}
