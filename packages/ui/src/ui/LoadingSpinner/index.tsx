import * as React from 'react';
import { processColor, View } from 'react-native';
import LottieView from 'lottie-react-native';
import spinnerJson from '../../assets/animations/spinner.json';

type RgbFractions = { r: number; g: number; b: number };

function getColorKeyAndRgb(inputColor: string): { key: string; rgb: RgbFractions } | null {
  const intColor = processColor(inputColor);
  if (typeof intColor !== 'number') return null;
  const key = String(intColor);
  const r = (intColor >> 16) & 255;
  const g = (intColor >> 8) & 255;
  const b = intColor & 255;
  return { key, rgb: { r: r / 255, g: g / 255, b: b / 255 } };
}

function colorizeLottieJson(json: unknown, rgb: RgbFractions) {
  const clone = JSON.parse(JSON.stringify(json)) as any;

  const overrideSolid = (node: any) => {
    if (node.c && Array.isArray(node.c.k)) {
      const k = node.c.k;
      if (k.length === 3) {
        node.c.k = [rgb.r, rgb.g, rgb.b];
      } else if (k.length === 4) {
        node.c.k = [rgb.r, rgb.g, rgb.b, k[3]];
      }
    }
  };

  const overrideGradient = (node: any) => {
    if (node.g && Array.isArray(node.g.k)) {
      const arr = node.g.k as any[];
      for (let i = 0; i < arr.length; i += 4) {
        if (typeof arr[i] === 'number' && i + 3 < arr.length) {
          arr[i + 1] = rgb.r;
          arr[i + 2] = rgb.g;
          arr[i + 3] = rgb.b;
        }
      }
    }
  };

  const traverse = (node: any) => {
    if (!node || typeof node !== 'object') return;

    overrideSolid(node);
    overrideGradient(node);

    if (Array.isArray(node)) {
      node.forEach(traverse);
    } else {
      Object.keys(node).forEach((key) => traverse(node[key]));
    }
  };

  traverse(clone);
  return clone;
}

const MAX_CACHE_ENTRIES = 12;
const sourceCache = new Map<string, any>();

function getColoredSource(color: string) {
  const keyAndRgb = getColorKeyAndRgb(color);
  if (!keyAndRgb) return spinnerJson;

  const cached = sourceCache.get(keyAndRgb.key);
  if (cached) {
    sourceCache.delete(keyAndRgb.key);
    sourceCache.set(keyAndRgb.key, cached);
    return cached;
  }

  const colored = colorizeLottieJson(spinnerJson, keyAndRgb.rgb);
  sourceCache.set(keyAndRgb.key, colored);
  while (sourceCache.size > MAX_CACHE_ENTRIES) {
    const firstKey = sourceCache.keys().next().value as string | undefined;
    if (firstKey == null) break;
    sourceCache.delete(firstKey);
  }

  return colored;
}

export type LoadingSpinnerProps = {
  size?: number;
  color?: string;
  animating?: boolean;
  speed?: number;
};

export function LoadingSpinner({ size = 100, color = 'white', animating = true, speed = 2 }: LoadingSpinnerProps) {
  if (!animating) return null;

  const coloredSource = React.useMemo(() => getColoredSource(color), [color]);

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <LottieView source={coloredSource} style={{ width: size, height: size }} autoPlay loop speed={speed} />
    </View>
  );
}
