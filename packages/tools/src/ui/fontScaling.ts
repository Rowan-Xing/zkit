import { Text, TextInput } from 'react-native';

export type ApplyGlobalFontScaleOptions = {
  maxFontScale?: number;
};

export type FontScalingConfig = {
  maxFontScale?: number;
};

export const DEFAULT_MAX_FONT_SCALE = 1.3;
export const MAX_FONT_SCALE = DEFAULT_MAX_FONT_SCALE;

let configuredMaxFontScale: number | undefined;
let appliedMaxFontScale = DEFAULT_MAX_FONT_SCALE;

export function configureFontScaling(config: FontScalingConfig = {}) {
  configuredMaxFontScale = typeof config.maxFontScale === 'number' ? config.maxFontScale : undefined;
}

export function getMaxFontScale() {
  return configuredMaxFontScale ?? DEFAULT_MAX_FONT_SCALE;
}

export function applyGlobalFontScale(options: ApplyGlobalFontScaleOptions = {}) {
  const maxFontScale = typeof options.maxFontScale === 'number' ? options.maxFontScale : getMaxFontScale();
  appliedMaxFontScale = maxFontScale;

  try {
    const ensure = (Comp: any) => {
      if (!Comp) return;
      const target = Comp.type ?? Comp;
      const render = target?.render;

      if (typeof render === 'function') {
        if ((render as any).__y2kitToolsFontScalePatched) return;
        const patched = (props: any, ref: any) =>
          render(
            {
              ...props,
              maxFontSizeMultiplier: props?.maxFontSizeMultiplier ?? appliedMaxFontScale,
            },
            ref
          );
        (patched as any).__y2kitToolsFontScalePatched = true;
        target.render = patched;
        return;
      }

      if (Comp.defaultProps == null) {
        Comp.defaultProps = {};
      }
      if ((Comp.defaultProps as any).maxFontSizeMultiplier == null) {
        (Comp.defaultProps as any).maxFontSizeMultiplier = appliedMaxFontScale;
      }
    };

    ensure(Text as any);
    ensure(TextInput as any);
  } catch {
    return;
  }
}
