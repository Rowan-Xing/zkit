import type {
  PickerOptionAccessors,
  PickerPrimitiveValue,
  PickerSelection,
  PickerValue,
  PickerValueMode,
} from './types';

export type PickerCascadeState<TOption> = {
  columns: TOption[][];
  indices: number[];
  values: PickerPrimitiveValue[];
  labels: string[];
  items: TOption[];
};

type SelectionOptions<TOption> = {
  separator: string;
  valueMode: PickerValueMode;
  preferPathValue: boolean;
  formatLabel?: (selection: PickerSelection<TOption>) => string;
};

export function clampNumber(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function toArrayValue(value: PickerValue | undefined): PickerPrimitiveValue[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' || typeof value === 'number') return [value];
  return [];
}

export function toOutputValue(
  values: PickerPrimitiveValue[],
  valueMode: PickerValueMode,
  preferPathValue: boolean
): PickerValue {
  if (valueMode === 'path') return values;
  if (valueMode === 'single') return values[values.length - 1] ?? '';
  if (preferPathValue || values.length !== 1) return values;
  return values[0] ?? '';
}

function isPrimitiveValue(value: unknown): value is PickerPrimitiveValue {
  return typeof value === 'string' || typeof value === 'number';
}

function toOptionRecord(option: unknown): Record<string, unknown> {
  if (option != null && typeof option === 'object') {
    return option as Record<string, unknown>;
  }
  return {};
}

export function resolveOptionValue<TOption>(
  option: TOption,
  index: number,
  path: TOption[],
  accessors: PickerOptionAccessors<TOption>
): PickerPrimitiveValue {
  const customValue = accessors.getOptionValue?.(option, index, path);
  if (isPrimitiveValue(customValue)) return customValue;

  const record = toOptionRecord(option);
  const fallbackValue = record.value ?? record.id ?? record.code ?? record.key;
  if (isPrimitiveValue(fallbackValue)) return fallbackValue;

  return index;
}

export function resolveOptionLabel<TOption>(
  option: TOption,
  index: number,
  path: TOption[],
  accessors: PickerOptionAccessors<TOption>
): string {
  const customLabel = accessors.getOptionLabel?.(option, index, path);
  if (typeof customLabel === 'string') return customLabel;
  if (typeof customLabel === 'number') return String(customLabel);

  const record = toOptionRecord(option);
  const fallbackLabel = record.label ?? record.title ?? record.text ?? record.name;
  if (typeof fallbackLabel === 'string') return fallbackLabel;
  if (typeof fallbackLabel === 'number') return String(fallbackLabel);

  return String(resolveOptionValue(option, index, path, accessors));
}

export function resolveOptionChildren<TOption>(
  option: TOption,
  index: number,
  path: TOption[],
  accessors: PickerOptionAccessors<TOption>
): TOption[] {
  const customChildren = accessors.getOptionChildren?.(option, index, path);
  if (Array.isArray(customChildren)) return customChildren as TOption[];

  const record = toOptionRecord(option);
  return Array.isArray(record.children) ? (record.children as TOption[]) : [];
}

export function resolveOptionDisabled<TOption>(
  option: TOption,
  index: number,
  path: TOption[],
  accessors: PickerOptionAccessors<TOption>
): boolean {
  const customDisabled = accessors.isOptionDisabled?.(option, index, path);
  if (typeof customDisabled === 'boolean') return customDisabled;
  return toOptionRecord(option).disabled === true;
}

export function findNearestEnabledIndex<TOption>(
  options: readonly TOption[],
  startIndex: number,
  path: TOption[],
  accessors: PickerOptionAccessors<TOption>
) {
  if (!options.length) return -1;

  const index = clampNumber(Math.round(startIndex), 0, options.length - 1);
  const isEnabled = (optionIndex: number) => {
    const option = options[optionIndex] as TOption;
    return !resolveOptionDisabled(option, optionIndex, [...path, option], accessors);
  };

  if (isEnabled(index)) return index;

  for (let i = index + 1; i < options.length; i += 1) {
    if (isEnabled(i)) return i;
  }

  for (let i = index - 1; i >= 0; i -= 1) {
    if (isEnabled(i)) return i;
  }

  return -1;
}

export function resolveCascade<TOption>(
  rootOptions: readonly TOption[],
  desiredValues: PickerPrimitiveValue[],
  accessors: PickerOptionAccessors<TOption>,
  maxColumns: number
): PickerCascadeState<TOption> {
  const columns: TOption[][] = [];
  const indices: number[] = [];
  const values: PickerPrimitiveValue[] = [];
  const labels: string[] = [];
  const items: TOption[] = [];

  let currentOptions = Array.isArray(rootOptions) ? (rootOptions as TOption[]) : [];
  let path: TOption[] = [];

  for (let columnIndex = 0; columnIndex < maxColumns; columnIndex += 1) {
    if (!currentOptions.length) break;
    columns.push(currentOptions);

    const desired = desiredValues[columnIndex];
    let selectedIndex = 0;

    if (desired !== undefined) {
      const foundIndex = currentOptions.findIndex((option, optionIndex) => {
        const nextPath = [...path, option];
        return Object.is(resolveOptionValue(option, optionIndex, nextPath, accessors), desired);
      });
      selectedIndex = foundIndex >= 0 ? foundIndex : 0;
    }

    selectedIndex = findNearestEnabledIndex(currentOptions, selectedIndex, path, accessors);
    if (selectedIndex < 0) break;

    const item = currentOptions[selectedIndex];
    if (item == null) break;

    const nextPath = [...path, item];
    indices.push(selectedIndex);
    values.push(resolveOptionValue(item, selectedIndex, nextPath, accessors));
    labels.push(resolveOptionLabel(item, selectedIndex, nextPath, accessors));
    items.push(item);

    currentOptions = resolveOptionChildren(item, selectedIndex, nextPath, accessors);
    path = nextPath;
  }

  return { columns, indices, values, labels, items };
}

export function createPickerSelection<TOption>(
  state: PickerCascadeState<TOption>,
  options: SelectionOptions<TOption>
): PickerSelection<TOption> {
  const value = toOutputValue(state.values, options.valueMode, options.preferPathValue);
  const baseLabel = state.labels.filter(Boolean).join(options.separator);
  const baseSelection: PickerSelection<TOption> = {
    value,
    values: state.values,
    label: baseLabel,
    labels: state.labels,
    items: state.items,
    columns: state.columns,
    indices: state.indices,
    isComplete:
      state.columns.length > 0 &&
      state.items.length === state.columns.length &&
      state.values.length === state.columns.length,
  };

  const formattedLabel = options.formatLabel?.(baseSelection);
  if (typeof formattedLabel === 'string') {
    return { ...baseSelection, label: formattedLabel };
  }

  return baseSelection;
}

export function transparentizeColor(color: string) {
  const input = color.trim();
  const fullHex = /^#([0-9a-f]{6})$/i.exec(input);
  if (fullHex) {
    const n = Number.parseInt(fullHex[1] as string, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r},${g},${b},0)`;
  }

  const shortHex = /^#([0-9a-f]{3})$/i.exec(input);
  if (shortHex) {
    const chars = shortHex[1] as string;
    const r = Number.parseInt(`${chars[0]}${chars[0]}`, 16);
    const g = Number.parseInt(`${chars[1]}${chars[1]}`, 16);
    const b = Number.parseInt(`${chars[2]}${chars[2]}`, 16);
    return `rgba(${r},${g},${b},0)`;
  }

  return 'transparent';
}
