import * as React from 'react';
import { Text } from '../Text';
import {
  Picker,
  type PickerChangePayload,
  type PickerConfirmPayload,
  type PickerDraftChangePayload,
  type PickerTriggerContext,
} from '../Picker';
import { useI18n } from '../../i18n/useI18n';
import {
  buildDatePickerOptions,
  createDatePickerOptionChildrenResolver,
  createDatePickerOptionDisabledResolver,
  createDatePickerSelection,
  createDatePickerSelectionFromDate,
  DATE_PICKER_COLUMNS,
  dateFromOption,
  getColumnCount,
  normalizePrecision,
  pathFromDate,
  resolveCommittedDate,
  resolveDatePickerBounds,
  resolvePickerDate,
} from './utils';
import type {
  DatePickerColumn,
  DatePickerColumnHeaderContext,
  DatePickerHandle,
  DatePickerOption,
  DatePickerProps,
  DatePickerRenderContext,
} from './types';

export type {
  DatePickerChangePayload,
  DatePickerColumn,
  DatePickerColumnHeaderContext,
  DatePickerConfirmPayload,
  DatePickerDisableContext,
  DatePickerDraftChangePayload,
  DatePickerHandle,
  DatePickerInput,
  DatePickerLabelFormat,
  DatePickerOption,
  DatePickerParts,
  DatePickerPrecision,
  DatePickerProps,
  DatePickerRenderContext,
  DatePickerSelection,
  DatePickerValue,
} from './types';

function createEmptyRenderContext(
  precision: DatePickerRenderContext['precision'],
  pickerContext: PickerTriggerContext<DatePickerOption>,
  placeholder: string
): DatePickerRenderContext {
  return {
    value: null,
    date: null,
    precision,
    parts: null,
    values: [],
    label: '',
    labels: [],
    items: [],
    isComplete: false,
    open: pickerContext.open,
    close: pickerContext.close,
    isOpen: pickerContext.isOpen,
    disabled: pickerContext.disabled,
    placeholder,
  };
}

function createRenderContext(
  selection: ReturnType<typeof createDatePickerSelectionFromDate> | null,
  precision: DatePickerRenderContext['precision'],
  pickerContext: PickerTriggerContext<DatePickerOption>,
  placeholder: string
): DatePickerRenderContext {
  if (!selection) return createEmptyRenderContext(precision, pickerContext, placeholder);

  return {
    value: selection.value,
    date: selection.date,
    precision,
    parts: selection.parts,
    values: selection.values,
    label: selection.label,
    labels: selection.labels,
    items: selection.items,
    isComplete: selection.isComplete,
    open: pickerContext.open,
    close: pickerContext.close,
    isOpen: pickerContext.isOpen,
    disabled: pickerContext.disabled,
    placeholder,
  };
}

export const DatePicker = React.forwardRef<DatePickerHandle, DatePickerProps>(function DatePicker(
  {
    value: valueProp,
    defaultValue = null,
    onChange,
    open,
    defaultOpen,
    onOpenChange,
    onDismissComplete,
    precision: precisionProp = 'day',
    min,
    max,
    defaultPickerValue,
    isDateDisabled,
    title,
    placeholder,
    cancelText,
    confirmText,
    emptyText,
    labelFormat,
    columnLabels,
    renderColumnHeader,
    lazyContent = true,
    keepMounted = false,
    sheetHeight = 'auto',
    disabled = false,
    onCancel,
    onConfirm,
    onDraftChange,
    children,
  },
  ref
) {
  const { t } = useI18n();
  const precision = normalizePrecision(precisionProp);
  const placeholderText = placeholder ?? t('datePicker.placeholder');
  const isValueControlled = valueProp !== undefined;
  const [innerValue, setInnerValue] = React.useState<DatePickerProps['value']>(defaultValue);
  const committedValue = isValueControlled ? valueProp : innerValue;

  const bounds = React.useMemo(() => resolveDatePickerBounds(min, max), [max, min]);
  const optionConfig = React.useMemo(
    () => ({ bounds, precision, isDateDisabled }),
    [bounds, isDateDisabled, precision]
  );
  const options = React.useMemo(() => buildDatePickerOptions(optionConfig), [optionConfig]);
  const getDateOptionChildren = React.useMemo(
    () => createDatePickerOptionChildrenResolver(optionConfig),
    [optionConfig]
  );
  const isDateOptionDisabled = React.useMemo(
    () => createDatePickerOptionDisabledResolver(optionConfig, getDateOptionChildren),
    [getDateOptionChildren, optionConfig]
  );
  const committedDate = React.useMemo(
    () => resolveCommittedDate(committedValue, bounds, precision),
    [bounds, committedValue, precision]
  );
  const pickerDate = React.useMemo(
    () => resolvePickerDate(committedDate, defaultPickerValue, bounds, precision),
    [bounds, committedDate, defaultPickerValue, precision]
  );
  const pickerValue = React.useMemo(() => pathFromDate(pickerDate, precision), [pickerDate, precision]);
  const committedSelection = React.useMemo(
    () =>
      typeof children === 'function' && committedDate
        ? createDatePickerSelectionFromDate(
            committedDate,
            precision,
            options,
            labelFormat,
            getDateOptionChildren
          )
        : null,
    [children, committedDate, getDateOptionChildren, labelFormat, options, precision]
  );

  const resolveSelection = React.useCallback(
    (
      selection:
        | PickerChangePayload<DatePickerOption>
        | PickerConfirmPayload<DatePickerOption>
        | PickerDraftChangePayload<DatePickerOption>
    ) => createDatePickerSelection(selection, precision, labelFormat, selection.label),
    [labelFormat, precision]
  );

  const handlePickerChange = React.useCallback(
    (_next: unknown, selection: PickerChangePayload<DatePickerOption>) => {
      const nextSelection = resolveSelection(selection);
      if (!nextSelection) return;

      if (!isValueControlled) {
        setInnerValue(nextSelection.value);
      }

      onChange?.(nextSelection.value, nextSelection);
    },
    [isValueControlled, onChange, resolveSelection]
  );

  const handlePickerConfirm = React.useCallback(
    (selection: PickerConfirmPayload<DatePickerOption>) => {
      const nextSelection = resolveSelection(selection);
      if (!nextSelection) return;
      onConfirm?.(nextSelection);
    },
    [onConfirm, resolveSelection]
  );

  const handlePickerDraftChange = React.useCallback(
    (selection: PickerDraftChangePayload<DatePickerOption>) => {
      const nextSelection = resolveSelection(selection);
      if (!nextSelection) return;
      onDraftChange?.(nextSelection);
    },
    [onDraftChange, resolveSelection]
  );

  const formatPickerLabel = React.useCallback(
    (selection: PickerConfirmPayload<DatePickerOption>) =>
      createDatePickerSelection(selection, precision, labelFormat)?.label ?? selection.label,
    [labelFormat, precision]
  );

  const resolvedColumnLabels = React.useMemo(
    () => ({
      year: columnLabels?.year ?? t('datePicker.year'),
      month: columnLabels?.month ?? t('datePicker.month'),
      day: columnLabels?.day ?? t('datePicker.day'),
    }),
    [columnLabels?.day, columnLabels?.month, columnLabels?.year, t]
  );

  const handleRenderColumnHeader = React.useCallback(
    (context: {
      columnIndex: number;
      columnCount: number;
      options: DatePickerOption[];
      selectedItem?: DatePickerOption;
      selectedValue?: string | number;
      selectedLabel?: string;
    }) => {
      const column = DATE_PICKER_COLUMNS[context.columnIndex] as DatePickerColumn;
      const selectedDate = dateFromOption(context.selectedItem, precision);
      const headerContext: DatePickerColumnHeaderContext = {
        column,
        columnIndex: context.columnIndex,
        columnCount: context.columnCount,
        options: context.options,
        selectedItem: context.selectedItem,
        selectedValue: typeof context.selectedValue === 'number' ? context.selectedValue : undefined,
        selectedLabel: context.selectedLabel,
        selectedDate,
        selectedParts: context.selectedItem
          ? {
              year: context.selectedItem.year,
              month: context.selectedItem.month,
              day: context.selectedItem.day,
            }
          : undefined,
      };

      if (renderColumnHeader) return renderColumnHeader(headerContext);

      return (
        <Text variant="label" size="sm" weight="semibold" tone="muted">
          {resolvedColumnLabels[column]}
        </Text>
      );
    },
    [precision, renderColumnHeader, resolvedColumnLabels]
  );

  const pickerChildren = React.useMemo(() => {
    if (typeof children !== 'function') return children;

    return (pickerContext: PickerTriggerContext<DatePickerOption>) =>
      children(createRenderContext(committedSelection, precision, pickerContext, placeholderText));
  }, [children, committedSelection, placeholderText, precision]);

  return (
    <Picker<DatePickerOption>
      ref={ref}
      options={options}
      value={pickerValue}
      onChange={handlePickerChange}
      valueMode="path"
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      onDismissComplete={onDismissComplete}
      title={title ?? t('datePicker.title')}
      placeholder={placeholderText}
      cancelText={cancelText}
      confirmText={confirmText}
      emptyText={emptyText}
      formatLabel={formatPickerLabel}
      renderColumnHeader={handleRenderColumnHeader}
      getOptionChildren={getDateOptionChildren}
      isOptionDisabled={isDateOptionDisabled}
      maxColumns={getColumnCount(precision)}
      lazyContent={lazyContent}
      keepMounted={keepMounted}
      sheetHeight={sheetHeight}
      disabled={disabled}
      onCancel={onCancel}
      onConfirm={handlePickerConfirm}
      onDraftChange={handlePickerDraftChange}
    >
      {pickerChildren}
    </Picker>
  );
});
