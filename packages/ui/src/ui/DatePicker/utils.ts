import dayjs, { type Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import type { PickerSelection } from '../Picker';
import type {
  DatePickerColumn,
  DatePickerInput,
  DatePickerLabelFormat,
  DatePickerOption,
  DatePickerParts,
  DatePickerPrecision,
  DatePickerSelection,
  DatePickerValue,
  DatePickerProps,
} from './types';

dayjs.extend(customParseFormat);

export const DATE_PICKER_COLUMNS = ['year', 'month', 'day'] as const satisfies readonly DatePickerColumn[];

const DEFAULT_MIN = dayjs('1900-01-01', 'YYYY-MM-DD', true).startOf('day');
const DEFAULT_MAX = dayjs('2100-12-31', 'YYYY-MM-DD', true).endOf('day');
const VALUE_FORMAT: Record<DatePickerPrecision, string> = {
  year: 'YYYY',
  month: 'YYYY-MM',
  day: 'YYYY-MM-DD',
};
const PARSE_FORMATS: Record<DatePickerPrecision, string | string[]> = {
  year: 'YYYY',
  month: ['YYYY-M', 'YYYY-MM'],
  day: ['YYYY-M-D', 'YYYY-MM-DD'],
};
const PRECISION_COLUMN_COUNT: Record<DatePickerPrecision, number> = {
  year: 1,
  month: 2,
  day: 3,
};

type DateBounds = {
  min: Dayjs;
  max: Dayjs;
};

type ParsedDate = {
  date: Dayjs;
  inputPrecision: DatePickerPrecision;
};

type BuildOptionsConfig = {
  bounds: DateBounds;
  precision: DatePickerPrecision;
  isDateDisabled?: DatePickerProps['isDateDisabled'];
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function isDatePickerPrecision(input: unknown): input is DatePickerPrecision {
  return input === 'year' || input === 'month' || input === 'day';
}

export function normalizePrecision(input: DatePickerPrecision | undefined): DatePickerPrecision {
  return isDatePickerPrecision(input) ? input : 'day';
}

export function getColumnCount(precision: DatePickerPrecision) {
  return PRECISION_COLUMN_COUNT[precision];
}

export function formatDatePickerValue(date: Dayjs, precision: DatePickerPrecision): DatePickerValue {
  return date.format(VALUE_FORMAT[precision]);
}

export function toDatePickerParts(date: Dayjs, precision: DatePickerPrecision): DatePickerParts {
  if (precision === 'year') return { year: date.year() };
  if (precision === 'month') return { year: date.year(), month: date.month() + 1 };
  return { year: date.year(), month: date.month() + 1, day: date.date() };
}

export function pathFromDate(date: Dayjs, precision: DatePickerPrecision): number[] {
  const parts = toDatePickerParts(date, precision);
  if (precision === 'year') return [parts.year];
  if (precision === 'month') return [parts.year, parts.month ?? 1];
  return [parts.year, parts.month ?? 1, parts.day ?? 1];
}

function normalizeDateByPrecision(date: Dayjs, precision: DatePickerPrecision) {
  if (precision === 'year') return date.startOf('year');
  if (precision === 'month') return date.startOf('month');
  return date.startOf('day');
}

function parseStringInput(input: string, fieldName: string): ParsedDate | undefined {
  const value = input.trim();
  if (!value) return undefined;

  const inputPrecision: DatePickerPrecision | null =
    /^\d{4}$/.test(value)
      ? 'year'
      : /^\d{4}-\d{1,2}$/.test(value)
        ? 'month'
        : /^\d{4}-\d{1,2}-\d{1,2}$/.test(value)
          ? 'day'
          : null;

  if (!inputPrecision) {
    throw new Error(
      `[zkit-ui][DatePicker] Invalid ${fieldName}: "${input}". Expected YYYY, YYYY-MM, or YYYY-MM-DD.`
    );
  }

  const format = PARSE_FORMATS[inputPrecision];
  const date = dayjs(value, format, true);
  if (!date.isValid()) {
    throw new Error(`[zkit-ui][DatePicker] Invalid ${fieldName}: "${input}".`);
  }

  return { date, inputPrecision };
}

export function parseDatePickerInput(
  input: DatePickerInput | null | undefined,
  fieldName: string
): ParsedDate | undefined {
  if (input == null) return undefined;
  if (typeof input === 'string') return parseStringInput(input, fieldName);

  const date = dayjs.isDayjs(input) ? input : dayjs(input);
  if (!date.isValid()) {
    throw new Error(`[zkit-ui][DatePicker] Invalid ${fieldName}.`);
  }

  return { date, inputPrecision: 'day' };
}

function resolveBoundary(input: DatePickerInput | null | undefined, kind: 'min' | 'max') {
  const parsed = parseDatePickerInput(input, kind);
  if (!parsed) return kind === 'min' ? DEFAULT_MIN : DEFAULT_MAX;

  if (kind === 'min') {
    return normalizeDateByPrecision(parsed.date, parsed.inputPrecision);
  }

  if (parsed.inputPrecision === 'year') return parsed.date.endOf('year');
  if (parsed.inputPrecision === 'month') return parsed.date.endOf('month');
  return parsed.date.endOf('day');
}

export function resolveDatePickerBounds(
  min: DatePickerInput | null | undefined,
  max: DatePickerInput | null | undefined
): DateBounds {
  const bounds = {
    min: resolveBoundary(min, 'min'),
    max: resolveBoundary(max, 'max'),
  };

  if (bounds.min.isAfter(bounds.max)) {
    throw new Error('[zkit-ui][DatePicker] Invalid bounds: min is after max.');
  }

  return bounds;
}

function clampToBounds(date: Dayjs, bounds: DateBounds) {
  if (date.isBefore(bounds.min)) return bounds.min;
  if (date.isAfter(bounds.max)) return bounds.max;
  return date;
}

export function resolveCommittedDate(
  value: DatePickerValue | null | undefined,
  bounds: DateBounds,
  precision: DatePickerPrecision
) {
  const parsed = parseDatePickerInput(value, 'value');
  if (!parsed) return null;
  return normalizeDateByPrecision(clampToBounds(parsed.date, bounds), precision);
}

export function resolvePickerDate(
  committedDate: Dayjs | null,
  defaultPickerValue: DatePickerInput | null | undefined,
  bounds: DateBounds,
  precision: DatePickerPrecision
) {
  if (committedDate) return committedDate;

  const parsed = parseDatePickerInput(defaultPickerValue, 'defaultPickerValue');
  const seed = parsed?.date ?? dayjs();
  return normalizeDateByPrecision(clampToBounds(seed, bounds), precision);
}

function optionDate(parts: DatePickerParts) {
  const month = parts.month ?? 1;
  const day = parts.day ?? 1;
  return dayjs(`${parts.year}-${pad2(month)}-${pad2(day)}`, 'YYYY-MM-DD', true).startOf('day');
}

function createOption(column: DatePickerColumn, parts: DatePickerParts, disabled = false): DatePickerOption {
  const value = column === 'year' ? parts.year : column === 'month' ? parts.month ?? 1 : parts.day ?? 1;
  return {
    value,
    label: column === 'year' ? String(value) : pad2(value),
    disabled,
    column,
    year: parts.year,
    month: parts.month,
    day: parts.day,
  };
}

function resolveDisabled(
  date: Dayjs,
  parts: DatePickerParts,
  column: DatePickerColumn,
  precision: DatePickerPrecision,
  isDateDisabled: DatePickerProps['isDateDisabled']
) {
  return !!isDateDisabled?.(date, { column, precision, parts });
}

function buildDays(year: number, month: number, config: BuildOptionsConfig) {
  const { bounds, isDateDisabled, precision } = config;
  const isMinMonth = year === bounds.min.year() && month === bounds.min.month() + 1;
  const isMaxMonth = year === bounds.max.year() && month === bounds.max.month() + 1;
  const monthStart = dayjs(`${year}-${pad2(month)}-01`, 'YYYY-MM-DD', true);
  const dayMin = isMinMonth ? bounds.min.date() : 1;
  const dayMax = isMaxMonth ? bounds.max.date() : monthStart.daysInMonth();
  const days: DatePickerOption[] = [];

  for (let day = dayMin; day <= dayMax; day += 1) {
    const parts = { year, month, day };
    days.push(
      createOption(
        'day',
        parts,
        resolveDisabled(optionDate(parts), parts, 'day', precision, isDateDisabled)
      )
    );
  }

  return days;
}

function buildMonths(year: number, config: BuildOptionsConfig) {
  const { bounds, isDateDisabled, precision } = config;
  const isMinYear = year === bounds.min.year();
  const isMaxYear = year === bounds.max.year();
  const monthMin = isMinYear ? bounds.min.month() + 1 : 1;
  const monthMax = isMaxYear ? bounds.max.month() + 1 : 12;
  const months: DatePickerOption[] = [];

  for (let month = monthMin; month <= monthMax; month += 1) {
    const parts = { year, month };
    const option = createOption(
      'month',
      parts,
      precision === 'month'
        ? resolveDisabled(optionDate(parts), parts, 'month', precision, isDateDisabled)
        : false
    );

    if (precision === 'day') {
      option.children = buildDays(year, month, config);
      option.disabled = option.children.length > 0 && option.children.every((child) => child.disabled);
    }

    months.push(option);
  }

  return months;
}

export function buildDatePickerOptions(config: BuildOptionsConfig) {
  const { bounds, isDateDisabled, precision } = config;
  const years: DatePickerOption[] = [];

  for (let year = bounds.min.year(); year <= bounds.max.year(); year += 1) {
    const parts = { year };
    const option = createOption(
      'year',
      parts,
      precision === 'year'
        ? resolveDisabled(optionDate(parts), parts, 'year', precision, isDateDisabled)
        : false
    );

    if (precision !== 'year') {
      option.children = buildMonths(year, config);
      option.disabled = option.children.length > 0 && option.children.every((child) => child.disabled);
    }

    years.push(option);
  }

  return years;
}

function numberValues(values: PickerSelection<DatePickerOption>['values']) {
  return values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
}

function dateFromPath(values: number[], precision: DatePickerPrecision) {
  const year = values[0];
  if (!Number.isFinite(year)) return null;
  const month = precision === 'year' ? 1 : values[1];
  const day = precision === 'day' ? values[2] : 1;
  if (!Number.isFinite(month) || !Number.isFinite(day)) return null;

  const date = dayjs(`${year}-${pad2(month)}-${pad2(day)}`, 'YYYY-MM-DD', true);
  return date.isValid() ? normalizeDateByPrecision(date, precision) : null;
}

function resolveSelectionLabel(selection: DatePickerSelection, labelFormat: DatePickerLabelFormat | undefined) {
  if (typeof labelFormat === 'function') return labelFormat(selection);
  if (typeof labelFormat === 'string' && labelFormat.trim()) return selection.date.format(labelFormat);
  return selection.value;
}

export function createDatePickerSelection(
  pickerSelection: PickerSelection<DatePickerOption>,
  precision: DatePickerPrecision,
  labelFormat?: DatePickerLabelFormat,
  labelOverride?: string
): DatePickerSelection | null {
  const values = numberValues(pickerSelection.values).slice(0, getColumnCount(precision));
  const date = dateFromPath(values, precision);
  if (!date) return null;

  const base: DatePickerSelection = {
    value: formatDatePickerValue(date, precision),
    date,
    precision,
    parts: toDatePickerParts(date, precision),
    values,
    label: '',
    labels: pickerSelection.labels.slice(0, getColumnCount(precision)),
    items: pickerSelection.items.slice(0, getColumnCount(precision)),
    columns: pickerSelection.columns.slice(0, getColumnCount(precision)),
    indices: pickerSelection.indices.slice(0, getColumnCount(precision)),
    isComplete: pickerSelection.isComplete,
  };

  return {
    ...base,
    label: labelOverride ?? resolveSelectionLabel(base, labelFormat),
  };
}

function findOptionPath(options: DatePickerOption[], values: number[]) {
  const items: DatePickerOption[] = [];
  const columns: DatePickerOption[][] = [];
  const indices: number[] = [];
  let current = options;

  for (const value of values) {
    columns.push(current);
    const index = current.findIndex((option) => option.value === value);
    if (index < 0) break;

    const item = current[index];
    if (!item) break;

    items.push(item);
    indices.push(index);
    current = Array.isArray(item.children) ? item.children : [];
  }

  return { items, columns, indices };
}

export function createDatePickerSelectionFromDate(
  date: Dayjs,
  precision: DatePickerPrecision,
  options: DatePickerOption[],
  labelFormat?: DatePickerLabelFormat
): DatePickerSelection {
  const values = pathFromDate(date, precision);
  const { items, columns, indices } = findOptionPath(options, values);
  const labels = values.map((value, index) => (index === 0 ? String(value) : pad2(value)));
  const base: DatePickerSelection = {
    value: formatDatePickerValue(date, precision),
    date,
    precision,
    parts: toDatePickerParts(date, precision),
    values,
    label: '',
    labels,
    items,
    columns,
    indices,
    isComplete: true,
  };

  return {
    ...base,
    label: resolveSelectionLabel(base, labelFormat),
  };
}

export function dateFromOption(option: DatePickerOption | undefined, precision: DatePickerPrecision) {
  if (!option) return undefined;
  return normalizeDateByPrecision(optionDate(option), precision);
}
