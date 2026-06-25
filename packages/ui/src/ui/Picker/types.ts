import type * as React from 'react';

export type PickerPrimitiveValue = string | number;
export type PickerValue = PickerPrimitiveValue | PickerPrimitiveValue[];
export type PickerValueMode = 'auto' | 'single' | 'path';

export type PickerOption<TValue extends PickerPrimitiveValue = PickerPrimitiveValue> = {
  value: TValue;
  label: string;
  disabled?: boolean;
  children?: PickerOption<TValue>[];
  key?: React.Key;
  testID?: string;
  accessibilityLabel?: string;
  [key: string]: unknown;
};

/**
 * @deprecated Prefer `PickerOption`. Kept as a loose internal bridge for adjacent
 * components that still accept external tree-shaped data.
 */
export type PickerTreeNode = {
  [key: string]: unknown;
  disabled?: boolean;
  children?: PickerTreeNode[];
};

export type PickerSelection<TOption = PickerOption> = {
  value: PickerValue;
  values: PickerPrimitiveValue[];
  label: string;
  labels: string[];
  items: TOption[];
  columns: TOption[][];
  indices: number[];
  isComplete: boolean;
};

export type PickerConfirmPayload<TOption = PickerOption> = PickerSelection<TOption>;
export type PickerChangePayload<TOption = PickerOption> = PickerSelection<TOption>;
export type PickerDraftChangePayload<TOption = PickerOption> = PickerSelection<TOption>;

export type PickerHandle = {
  open: () => void;
  close: () => void;
};

export type PickerTriggerContext<TOption = PickerOption> = PickerSelection<TOption> & {
  open: () => void;
  close: () => void;
  isOpen: boolean;
  disabled: boolean;
  placeholder: string;
};

export type PickerColumnHeaderContext<TOption = PickerOption> = {
  columnIndex: number;
  columnCount: number;
  options: TOption[];
  selectedItem?: TOption;
  selectedValue?: PickerPrimitiveValue;
  selectedLabel?: string;
};

export type PickerOptionAccessors<TOption> = {
  getOptionValue?: (option: TOption, index: number, path: TOption[]) => PickerPrimitiveValue | undefined;
  getOptionLabel?: (option: TOption, index: number, path: TOption[]) => string | number | undefined;
  getOptionChildren?: (option: TOption, index: number, path: TOption[]) => readonly TOption[] | undefined;
  isOptionDisabled?: (option: TOption, index: number, path: TOption[]) => boolean;
};

export type PickerProps<TOption = PickerOption> = PickerOptionAccessors<TOption> & {
  options: readonly TOption[];

  value?: PickerValue;
  defaultValue?: PickerValue;
  onChange?: (value: PickerValue, selection: PickerChangePayload<TOption>) => void;
  valueMode?: PickerValueMode;

  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onDismissComplete?: () => void;

  title?: string;
  placeholder?: string;
  cancelText?: string;
  confirmText?: string;
  emptyText?: string;
  separator?: string;
  formatLabel?: (selection: PickerSelection<TOption>) => string;
  renderColumnHeader?: (context: PickerColumnHeaderContext<TOption>) => React.ReactNode;
  maxColumns?: number;

  lazyContent?: boolean;
  sheetHeight?: number | 'auto';
  disabled?: boolean;

  onCancel?: () => void;
  onConfirm?: (selection: PickerConfirmPayload<TOption>) => void;
  onDraftChange?: (selection: PickerDraftChangePayload<TOption>) => void;

  children?: React.ReactNode | ((context: PickerTriggerContext<TOption>) => React.ReactNode);
};
