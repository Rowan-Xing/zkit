import type * as React from 'react';
import type { Dayjs } from 'dayjs';
import type { PickerHandle, PickerOption } from '../Picker';

export type DatePickerHandle = PickerHandle;

export type DatePickerPrecision = 'year' | 'month' | 'day';
export type DatePickerColumn = DatePickerPrecision;
export type DatePickerValue = string;
export type DatePickerInput = DatePickerValue | Date | Dayjs;

export type DatePickerParts = {
  year: number;
  month?: number;
  day?: number;
};

export type DatePickerDisableContext = {
  precision: DatePickerPrecision;
  column: DatePickerColumn;
  parts: DatePickerParts;
};

export type DatePickerOption = PickerOption<number> & {
  column: DatePickerColumn;
  year: number;
  month?: number;
  day?: number;
  children?: DatePickerOption[];
};

export type DatePickerSelection = {
  value: DatePickerValue;
  date: Dayjs;
  precision: DatePickerPrecision;
  parts: DatePickerParts;
  values: number[];
  label: string;
  labels: string[];
  items: DatePickerOption[];
  columns: DatePickerOption[][];
  indices: number[];
  isComplete: boolean;
};

export type DatePickerChangePayload = DatePickerSelection;
export type DatePickerConfirmPayload = DatePickerSelection;
export type DatePickerDraftChangePayload = DatePickerSelection;

export type DatePickerRenderContext = {
  value: DatePickerValue | null;
  date: Dayjs | null;
  precision: DatePickerPrecision;
  parts: DatePickerParts | null;
  values: number[];
  label: string;
  labels: string[];
  items: DatePickerOption[];
  isComplete: boolean;
  open: () => void;
  close: () => void;
  isOpen: boolean;
  disabled: boolean;
  placeholder: string;
};

export type DatePickerColumnHeaderContext = {
  column: DatePickerColumn;
  columnIndex: number;
  columnCount: number;
  options: DatePickerOption[];
  selectedItem?: DatePickerOption;
  selectedValue?: number;
  selectedLabel?: string;
  selectedDate?: Dayjs;
  selectedParts?: DatePickerParts;
};

export type DatePickerLabelFormat = string | ((selection: DatePickerSelection) => string);

export type DatePickerProps = {
  value?: DatePickerValue | null;
  defaultValue?: DatePickerValue | null;
  onChange?: (value: DatePickerValue, payload: DatePickerChangePayload) => void;

  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onDismissComplete?: () => void;

  precision?: DatePickerPrecision;
  min?: DatePickerInput;
  max?: DatePickerInput;
  defaultPickerValue?: DatePickerInput;
  isDateDisabled?: (date: Dayjs, context: DatePickerDisableContext) => boolean;

  title?: string;
  placeholder?: string;
  cancelText?: string;
  confirmText?: string;
  emptyText?: string;
  labelFormat?: DatePickerLabelFormat;
  columnLabels?: Partial<Record<DatePickerColumn, string>>;
  renderColumnHeader?: (context: DatePickerColumnHeaderContext) => React.ReactNode;

  lazyContent?: boolean;
  /** Keep native wheels mounted while closed to make repeated opens immediate. */
  keepMounted?: boolean;
  sheetHeight?: number | 'auto';
  disabled?: boolean;

  onCancel?: () => void;
  onConfirm?: (payload: DatePickerConfirmPayload) => void;
  onDraftChange?: (payload: DatePickerDraftChangePayload) => void;

  children?: React.ReactNode | ((context: DatePickerRenderContext) => React.ReactNode);
};
