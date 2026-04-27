import { Text, TextInput } from 'react-native';

export type ApplyGlobalFontScaleOptions = {
  maxFontScale?: number;
};

export type FontScalingConfig = {
  maxFontScale?: number;
};

export const DEFAULT_MAX_FONT_SCALE = 1.3;
export const MAX_FONT_SCALE = DEFAULT_MAX_FONT_SCALE;

const FONT_SCALE_PATCH_STATE = '__y2kitToolsFontScalePatchState';

type FontScalePatchState = {
  originalRender?: (props: unknown, ref: unknown) => unknown;
  ownsDefaultProps?: boolean;
};

type PatchableComponent = {
  defaultProps?: Record<string, unknown>;
  render?: (props: unknown, ref: unknown) => unknown;
  type?: PatchableComponent;
  [FONT_SCALE_PATCH_STATE]?: FontScalePatchState;
};

let configuredMaxFontScale = DEFAULT_MAX_FONT_SCALE;
let appliedMaxFontScale = DEFAULT_MAX_FONT_SCALE;

const isValidMaxFontScale = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const resolveMaxFontScale = (value: unknown, fallback: number) =>
  isValidMaxFontScale(value) ? value : fallback;

const getPatchState = (target: PatchableComponent): FontScalePatchState => {
  const state = target[FONT_SCALE_PATCH_STATE];
  if (state) return state;

  const next: FontScalePatchState = {};
  target[FONT_SCALE_PATCH_STATE] = next;
  return next;
};

const withMaxFontSizeMultiplier = (props: unknown): unknown => {
  const record =
    props && typeof props === 'object' ? (props as Record<string, unknown>) : undefined;

  if (record?.maxFontSizeMultiplier != null) return props;

  return {
    ...(record ?? {}),
    maxFontSizeMultiplier: appliedMaxFontScale,
  };
};

const patchRender = (target: PatchableComponent): boolean => {
  if (typeof target.render !== 'function') return false;

  const state = getPatchState(target);
  if (state.originalRender) return true;

  const originalRender = target.render;
  state.originalRender = originalRender;

  target.render = function patchedY2kitFontScaleRender(this: unknown, props: unknown, ref: unknown) {
    return originalRender.call(this, withMaxFontSizeMultiplier(props), ref);
  };

  return true;
};

const patchDefaultProps = (target: PatchableComponent) => {
  const state = getPatchState(target);

  if (target.defaultProps == null) {
    target.defaultProps = {};
    state.ownsDefaultProps = true;
  }

  if (state.ownsDefaultProps || target.defaultProps.maxFontSizeMultiplier == null) {
    target.defaultProps.maxFontSizeMultiplier = appliedMaxFontScale;
    state.ownsDefaultProps = true;
  }
};

const patchComponent = (component: unknown) => {
  if (!component || (typeof component !== 'object' && typeof component !== 'function')) return;

  const root = component as PatchableComponent;
  const target = root.type ?? root;

  if (patchRender(target)) return;
  patchDefaultProps(root);
};

export function configureFontScaling(config: FontScalingConfig = {}) {
  configuredMaxFontScale = resolveMaxFontScale(config.maxFontScale, DEFAULT_MAX_FONT_SCALE);
  appliedMaxFontScale = configuredMaxFontScale;
}

export function getMaxFontScale() {
  return configuredMaxFontScale;
}

export function applyGlobalFontScale(options: ApplyGlobalFontScaleOptions = {}) {
  appliedMaxFontScale = resolveMaxFontScale(options.maxFontScale, getMaxFontScale());
  try {
    patchComponent(Text);
    patchComponent(TextInput);
  } catch {
    return;
  }
}
