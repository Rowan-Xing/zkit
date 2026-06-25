import * as React from 'react';
import { StyleSheet } from 'react-native';
import dayjs, { type Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { sp } from 'y2kit-tools';
import { useI18n } from '../../i18n/useI18n';
import { Text } from '../Text';
import {
  Picker,
  type PickerChangePayload,
  type PickerConfirmPayload,
  type PickerHandle,
  type PickerOption,
  type PickerValue,
} from '../Picker';

export type DatePickerHandle = PickerHandle;

dayjs.extend(customParseFormat);

type DateBounds = { min?: Dayjs; max?: Dayjs };

const STANDARD_INPUT_FORMATS = ['YYYY', 'YYYY-M', 'YYYY-MM', 'YYYY-M-D', 'YYYY-MM-DD'];

function parseStandardDateStrict(input?: string): Dayjs | undefined {
  if (!input) return undefined;
  const d = dayjs(input, STANDARD_INPUT_FORMATS, true);
  if (!d.isValid()) {
    throw new Error(`[y2kit-ui][DatePicker] Invalid date string: "${input}"`);
  }
  return d;
}

function ensureBoundsValid(bounds: DateBounds) {
  if (bounds.min && bounds.max && bounds.min.isAfter(bounds.max)) {
    throw new Error('[y2kit-ui][DatePicker] Invalid bounds: start is after end.');
  }
}

function clampToBounds(d: Dayjs, bounds: DateBounds) {
  if (bounds.min && d.isBefore(bounds.min)) return bounds.min;
  if (bounds.max && d.isAfter(bounds.max)) return bounds.max;
  return d;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toStandardValueFromYmd(ymd: { year: number; month: number; day: number }) {
  return `${ymd.year}-${pad2(ymd.month)}-${pad2(ymd.day)}`;
}

function toYmdFromStandardValue(v: string, bounds: DateBounds) {
  const parsed = parseStandardDateStrict(v);
  if (!parsed) {
    const seeded = clampToBounds(dayjs(), bounds);
    return { year: seeded.year(), month: seeded.month() + 1, day: seeded.date() };
  }
  const d = clampToBounds(parsed, bounds);
  return { year: d.year(), month: d.month() + 1, day: d.date() };
}

function normalizePickerValueToYmd(value: PickerValue | undefined, bounds: DateBounds) {
  if (Array.isArray(value)) {
    const y = Number(value[0]);
    const m = Number(value[1]);
    const d = Number(value[2]);
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      return clampYmdToBounds({ year: y, month: m, day: d }, bounds);
    }
  }
  if (typeof value === 'string') {
    return toYmdFromStandardValue(value, bounds);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const seeded = clampToBounds(dayjs(`${value}-01-01`, 'YYYY-MM-DD', true), bounds);
    return { year: seeded.year(), month: seeded.month() + 1, day: seeded.date() };
  }
  const seeded = clampToBounds(dayjs(), bounds);
  return { year: seeded.year(), month: seeded.month() + 1, day: seeded.date() };
}

function clampYmdToBounds(ymd: { year: number; month: number; day: number }, bounds: DateBounds) {
  const base = dayjs(toStandardValueFromYmd(ymd), 'YYYY-MM-DD', true);
  if (!base.isValid()) {
    const seeded = clampToBounds(dayjs(), bounds);
    return { year: seeded.year(), month: seeded.month() + 1, day: seeded.date() };
  }
  const clamped = clampToBounds(base, bounds);
  return { year: clamped.year(), month: clamped.month() + 1, day: clamped.date() };
}

// 缓存已构建的月份数据
const monthCache = new Map<string, PickerOption<number>[]>();

function buildDays(y: number, m: number, bounds: DateBounds): PickerOption<number>[] {
  const isMinYear = bounds.min != null && y === bounds.min.year();
  const isMaxYear = bounds.max != null && y === bounds.max.year();
  const isMinYM = bounds.min != null && isMinYear && m === bounds.min.month() + 1;
  const isMaxYM = bounds.max != null && isMaxYear && m === bounds.max.month() + 1;

  const base = dayjs(`${y}-${pad2(m)}-01`, 'YYYY-MM-DD', true);
  const dim = base.isValid() ? base.daysInMonth() : 31;
  const dayMin = isMinYM ? bounds.min!.date() : 1;
  const dayMax = isMaxYM ? bounds.max!.date() : dim;

  const days: PickerOption<number>[] = [];
  for (let d = dayMin; d <= dayMax; d += 1) {
    days.push({ value: d, label: pad2(d) });
  }
  return days;
}

function buildMonths(y: number, bounds: DateBounds): PickerOption<number>[] {
  const cacheKey = `${y}-${bounds.min?.format('YYYYMMDD') ?? ''}-${bounds.max?.format('YYYYMMDD') ?? ''}`;
  const cached = monthCache.get(cacheKey);
  if (cached) return cached;

  const isMinYear = bounds.min != null && y === bounds.min.year();
  const isMaxYear = bounds.max != null && y === bounds.max.year();
  const monthMin = isMinYear ? bounds.min!.month() + 1 : 1;
  const monthMax = isMaxYear ? bounds.max!.month() + 1 : 12;

  const months: PickerOption<number>[] = [];
  for (let m = monthMin; m <= monthMax; m += 1) {
    months.push({ value: m, label: pad2(m), children: buildDays(y, m, bounds) });
  }

  monthCache.set(cacheKey, months);
  return months;
}

function buildDateTree(bounds: DateBounds): PickerOption<number>[] {
  const minYear = bounds.min?.year() ?? 1970;
  const maxYear = bounds.max?.year() ?? 2099;
  const years: PickerOption<number>[] = [];

  for (let y = minYear; y <= maxYear; y += 1) {
    years.push({ value: y, label: String(y), children: buildMonths(y, bounds) });
  }

  return years;
}

export type DatePickerValue = string;

export type DatePickerConfirmPayload = {
  value: DatePickerValue;
  values: string[];
  label: string;
  labels: string[];
  items: PickerOption<number>[];
  date: Dayjs;
};

export type DatePickerChangePayload = DatePickerConfirmPayload;

export type DatePickerProps = {
  value?: DatePickerValue;
  defaultValue?: DatePickerValue;
  onValueChange?: (next: DatePickerValue) => void;

  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (next: boolean) => void;
  onDismissComplete?: () => void;

  label?: string;
  defaultLabel?: string;
  onLabelChange?: (next: string) => void;

  title?: string;
  separator?: string;

  start?: string;
  end?: string;

  lazyContent?: boolean;
  drawerSize?: string | number;
  disabled?: boolean;

  onCancel?: () => void;
  onConfirm?: (payload: DatePickerConfirmPayload) => void;
  onChange?: (payload: DatePickerChangePayload) => void;

  children?: React.ComponentProps<typeof Picker>['children'];
};

export const DatePicker = React.forwardRef<DatePickerHandle, DatePickerProps>(function DatePicker({
  value,
  defaultValue,
  onValueChange,
  open,
  defaultOpen,
  onOpenChange,
  onDismissComplete,
  onLabelChange,
  title,
  separator = '-',
  start,
  end,
  lazyContent,
  drawerSize,
  disabled,
  onCancel,
  onConfirm,
  onChange,
  children,
}, ref) {
  const { t } = useI18n();

  const bounds = React.useMemo<DateBounds>(() => {
    const min = parseStandardDateStrict(start);
    const max = parseStandardDateStrict(end);
    const b = { min, max };
    ensureBoundsValid(b);
    return b;
  }, [end, start]);

  const list = React.useMemo(() => buildDateTree(bounds), [bounds]);

  const resolvedValue = React.useMemo(() => {
    if (value === undefined) return undefined;
    const ymd = toYmdFromStandardValue(value, bounds);
    return [ymd.year, ymd.month, ymd.day] as number[];
  }, [bounds, value]);

  const resolvedDefaultValue = React.useMemo(() => {
    const input = defaultValue ?? toStandardValueFromYmd(normalizePickerValueToYmd(undefined, bounds));
    const ymd = toYmdFromStandardValue(input, bounds);
    return [ymd.year, ymd.month, ymd.day] as number[];
  }, [bounds, defaultValue]);

  const handleValueChange = React.useCallback(
    (next: PickerValue) => {
      const ymd = normalizePickerValueToYmd(next, bounds);
      const out = toStandardValueFromYmd(ymd);
      onValueChange?.(out);
    },
    [bounds, onValueChange]
  );

  const handleConfirm = React.useCallback(
    (payload: PickerConfirmPayload<PickerOption<number>>) => {
      const ymd = normalizePickerValueToYmd(payload.value, bounds);
      const out = toStandardValueFromYmd(ymd);
      const date = dayjs(out, 'YYYY-MM-DD', true);
      onLabelChange?.(payload.label);
      onConfirm?.({
        value: out,
        values: payload.values.map(String),
        label: payload.label,
        labels: payload.labels.map(String),
        items: payload.items,
        date,
      });
    },
    [bounds, onConfirm, onLabelChange]
  );

  const handleChange = React.useCallback(
    (payload: PickerChangePayload<PickerOption<number>>) => {
      const ymd = normalizePickerValueToYmd(payload.value, bounds);
      const out = toStandardValueFromYmd(ymd);
      const date = dayjs(out, 'YYYY-MM-DD', true);
      onChange?.({
        value: out,
        values: payload.values.map(String),
        label: payload.label,
        labels: payload.labels.map(String),
        items: payload.items,
        date,
      });
    },
    [bounds, onChange]
  );

  return (
    <Picker<PickerOption<number>>
      ref={ref}
      options={list}
      value={resolvedValue}
      defaultValue={resolvedDefaultValue}
      onChange={handleValueChange}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      onDismissComplete={onDismissComplete}
      title={title ?? t('datePicker.title')}
      separator={separator}
      renderColumnHeader={({ columnIndex }) => (
        <Text style={styles.columnLabel}>
          {[t('datePicker.year'), t('datePicker.month'), t('datePicker.day')][columnIndex]}
        </Text>
      )}
      lazyContent={lazyContent}
      sheetHeight={typeof drawerSize === 'number' ? drawerSize : drawerSize == null ? 'auto' : Number.parseFloat(drawerSize)}
      disabled={disabled}
      onCancel={onCancel}
      onConfirm={handleConfirm}
      onDraftChange={handleChange}
    >
      {children}
    </Picker>
  );
});

const styles = StyleSheet.create({
  columnLabel: {
    fontSize: sp(14),
    fontWeight: '600',
    color: '#666666',
  },
});
