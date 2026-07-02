import { Feather } from '@expo/vector-icons';
import * as React from 'react';
import { wp } from 'zkit-tools';
import type { PickerValue } from 'zkit-ui/picker';

export type FeatherIconName = keyof typeof Feather.glyphMap;

export function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function renderIcon(name: FeatherIconName, color: string, size = wp(17)) {
  return <Feather name={name} color={color} size={size} />;
}

export function normalizePickerValue(value: PickerValue): string {
  if (Array.isArray(value)) return String(value[value.length - 1] ?? '');
  return String(value ?? '');
}
