import { resolvePositiveNumber } from '../internal/number';
import { getReactNative } from '../internal/reactNative';

export type FontSizeMultiplierConfig = {
  maxFontSizeMultiplier?: number;
};

export type GlobalTextScalingLimitOptions = FontSizeMultiplierConfig;

export type GlobalTextScalingLimitSnapshot = {
  installed: boolean;
  maxFontSizeMultiplier: number;
};

export const DEFAULT_MAX_FONT_SIZE_MULTIPLIER = 1.3;

const FONT_SIZE_MULTIPLIER_PATCH_STATE = '__zkitFontSizeMultiplierPatchState';

type FontSizeMultiplierPatchState = {
  originalRender?: (props: unknown, ref: unknown) => unknown;
  originalDefaultProps?: Record<string, unknown>;
  hadDefaultProps: boolean;
  usesDefaultPropsPatch: boolean;
};

type PatchableComponent = {
  defaultProps?: Record<string, unknown>;
  render?: (props: unknown, ref: unknown) => unknown;
  type?: PatchableComponent;
  [FONT_SIZE_MULTIPLIER_PATCH_STATE]?: FontSizeMultiplierPatchState;
};

let configuredMaxFontSizeMultiplier = DEFAULT_MAX_FONT_SIZE_MULTIPLIER;
let appliedMaxFontSizeMultiplier = DEFAULT_MAX_FONT_SIZE_MULTIPLIER;
let installed = false;
let patchedTargets: PatchableComponent[] = [];

const getPatchState = (target: PatchableComponent): FontSizeMultiplierPatchState => {
  const state = target[FONT_SIZE_MULTIPLIER_PATCH_STATE];
  if (state) return state;

  const next: FontSizeMultiplierPatchState = {
    hadDefaultProps: target.defaultProps !== undefined,
    originalDefaultProps: target.defaultProps ? { ...target.defaultProps } : undefined,
    usesDefaultPropsPatch: false,
  };
  target[FONT_SIZE_MULTIPLIER_PATCH_STATE] = next;
  return next;
};

const withMaxFontSizeMultiplier = (props: unknown): unknown => {
  const record =
    props && typeof props === 'object' ? (props as Record<string, unknown>) : undefined;

  if (record?.maxFontSizeMultiplier != null) return props;

  return {
    ...(record ?? {}),
    maxFontSizeMultiplier: appliedMaxFontSizeMultiplier,
  };
};

const resolveMaxFontSizeMultiplier = (value: unknown, fallback: number): number =>
  resolvePositiveNumber(value, fallback);

const patchRender = (target: PatchableComponent): boolean => {
  if (typeof target.render !== 'function') return false;

  const state = getPatchState(target);
  if (state.originalRender) return true;

  const originalRender = target.render;
  state.originalRender = originalRender;

  target.render = function patchedY2kitTextScalingRender(
    this: unknown,
    props: unknown,
    ref: unknown
  ) {
    return originalRender.call(this, withMaxFontSizeMultiplier(props), ref);
  };

  return true;
};

const patchDefaultProps = (target: PatchableComponent) => {
  const state = getPatchState(target);

  if (!target.defaultProps) {
    target.defaultProps = {};
  }

  if (state.usesDefaultPropsPatch || target.defaultProps.maxFontSizeMultiplier == null) {
    target.defaultProps.maxFontSizeMultiplier = appliedMaxFontSizeMultiplier;
    state.usesDefaultPropsPatch = true;
  }
};

const patchComponent = (component: unknown) => {
  if (!component || (typeof component !== 'object' && typeof component !== 'function')) return;

  const root = component as PatchableComponent;
  const target = root.type ?? root;
  if (patchRender(target)) {
    patchedTargets.push(target);
    return;
  }

  patchDefaultProps(root);
  patchedTargets.push(root);
};

const restoreComponent = (target: PatchableComponent) => {
  const state = target[FONT_SIZE_MULTIPLIER_PATCH_STATE];
  if (!state) return;

  if (state.originalRender) {
    target.render = state.originalRender;
  }

  if (state.usesDefaultPropsPatch) {
    if (state.hadDefaultProps) {
      target.defaultProps = state.originalDefaultProps ? { ...state.originalDefaultProps } : {};
    } else {
      delete target.defaultProps;
    }
  }

  delete target[FONT_SIZE_MULTIPLIER_PATCH_STATE];
};

const refreshDefaultPropsPatch = (target: PatchableComponent) => {
  const state = target[FONT_SIZE_MULTIPLIER_PATCH_STATE];
  if (!state?.usesDefaultPropsPatch || !target.defaultProps) return;
  target.defaultProps.maxFontSizeMultiplier = appliedMaxFontSizeMultiplier;
};

export function configureFontSizeMultiplier(
  config: FontSizeMultiplierConfig = {}
): GlobalTextScalingLimitSnapshot {
  configuredMaxFontSizeMultiplier = resolveMaxFontSizeMultiplier(
    config.maxFontSizeMultiplier,
    DEFAULT_MAX_FONT_SIZE_MULTIPLIER
  );
  appliedMaxFontSizeMultiplier = configuredMaxFontSizeMultiplier;

  for (const target of patchedTargets) {
    refreshDefaultPropsPatch(target);
  }

  return getGlobalTextScalingLimitSnapshot();
}

export function getMaxFontSizeMultiplier(): number {
  return configuredMaxFontSizeMultiplier;
}

export function getGlobalTextScalingLimitSnapshot(): GlobalTextScalingLimitSnapshot {
  return {
    installed,
    maxFontSizeMultiplier: appliedMaxFontSizeMultiplier,
  };
}

export function installGlobalTextScalingLimit(
  options: GlobalTextScalingLimitOptions = {}
): () => void {
  appliedMaxFontSizeMultiplier = resolveMaxFontSizeMultiplier(
    options.maxFontSizeMultiplier,
    getMaxFontSizeMultiplier()
  );

  if (installed) {
    for (const target of patchedTargets) {
      refreshDefaultPropsPatch(target);
    }
    return uninstallGlobalTextScalingLimit;
  }

  const rn = getReactNative();
  if (!rn) return () => undefined;

  patchedTargets = [];
  patchComponent(rn.Text);
  patchComponent(rn.TextInput);
  installed = patchedTargets.length > 0;

  return uninstallGlobalTextScalingLimit;
}

export function uninstallGlobalTextScalingLimit(): void {
  if (!installed) return;

  for (const target of patchedTargets) {
    restoreComponent(target);
  }

  patchedTargets = [];
  installed = false;
  appliedMaxFontSizeMultiplier = configuredMaxFontSizeMultiplier;
}
