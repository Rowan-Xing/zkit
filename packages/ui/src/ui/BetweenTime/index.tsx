import * as React from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import dayjs, { type Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sp, wp } from 'y2kit-tools';
import { useI18n } from '../../i18n/useI18n';
import { useTheme } from '../../theme/useTheme';
import { BottomSheet, type BottomSheetRef } from '../BottomSheet';
import { Button } from '../Button';
import { Text } from '../Text';
import {
  WheelColumn,
  WHEEL_AREA_HEIGHT,
  WHEEL_AREA_VERTICAL_INSET,
  WHEEL_ITEM_HEIGHT,
  WHEEL_VISIBLE_ITEMS,
  type WheelColumnHandle,
  type WheelOption,
} from '../WheelColumn';

dayjs.extend(customParseFormat);

const ITEM_HEIGHT = WHEEL_ITEM_HEIGHT;
const VISIBLE_ITEMS = WHEEL_VISIBLE_ITEMS;

type ModelType = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';
type Side = 'start' | 'end';
type SheetNativePhase = 'idle' | 'presenting' | 'presented' | 'dismissing';

type BetweenTimeConfirmPayload = {
  value: string[];
};

export type BetweenTimeHandle = {
  open: () => void;
  close: () => void;
};

export type BetweenTimeProps = {
  /**
   * 当前时间区间。
   * - 必须是“标准时间格式”字符串数组（长度 0 或 2）
   * - 组件内部会基于 start/end 做边界校正，并保证前后顺序
   */
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (next: string[]) => void;

  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (next: boolean) => void;
  onDismissComplete?: () => void;

  /**
   * 顶部标题。
   */
  title?: string;

  /**
   * 全局可选时间范围（建议提供标准时间格式）。
   */
  start?: string;
  end?: string;

  /**
   * 展示精确到的级别（影响展示列数/输出格式）。
   */
  type?: ModelType;

  /**
   * 输入框展示使用的格式化模板。
   */
  format?: string;

  /**
   * 是否把 format 格式化后的值同步到 value。
   * 注意：开启后必须保证 format 输出仍是可解析的标准时间格式，否则会抛错。
   */
  formatSyncValue?: boolean;

  /**
   * 单位名称（列头）。
   */
  cellUnits?: string[];

  /**
   * 快捷时间区间选择：
   * - d/w/m/y/q：本日/本周/本月/本年/本季度
   * - 数字字符串：最近 xx 天（例如 '7'）
   */
  quickDate?: string[];

  /**
   * 是否懒加载弹层内容（避免复杂内容影响开启动画）。
   */
  lazyContent?: boolean;

  /**
   * 弹层高度（数字或可解析为数字的字符串）。
   */
  drawerSize?: string | number;

  /**
   * 禁用打开弹层。
   */
  disabled?: boolean;

  /**
   * 取消回调。
   */
  onCancel?: () => void;
  /**
   * 确认回调。
   */
  onConfirm?: (payload: BetweenTimeConfirmPayload) => void;

  /**
   * slot：默认触发打开选择器的子节点（React 里即 children）。
   */
  children?: React.ReactNode;
};

type DateBounds = { min?: Dayjs; max?: Dayjs };


const STANDARD_INPUT_FORMATS = [
  'YYYY',
  'YYYY-M',
  'YYYY-MM',
  'YYYY-M-D',
  'YYYY-MM-DD',
  'YYYY-MM-DDHH',
  'YYYY-MM-DD HH',
  'YYYY-MM-DDHH:mm',
  'YYYY-MM-DD HH:mm',
  'YYYY-MM-DDHH:mm:ss',
  'YYYY-MM-DD HH:mm:ss',
];

function clampNumber(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function silentlyCatchPromise(value: unknown) {
  const maybePromise = value as { catch?: (onRejected: () => void) => unknown } | null | undefined;
  if (typeof maybePromise?.catch === 'function') {
    maybePromise.catch(() => {});
  }
}

function toIntOrNull(v: string) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function parseStandardDateStrict(input?: string): Dayjs | undefined {
  if (!input) return undefined;
  const d = dayjs(input, STANDARD_INPUT_FORMATS, true);
  if (!d.isValid()) {
    throw new Error(`[y2kit-ui][BetweenTime] Invalid date string: "${input}"`);
  }
  return d;
}

function formatByType(d: Dayjs, type: ModelType) {
  switch (type) {
    case 'year':
      return d.format('YYYY');
    case 'month':
      return d.format('YYYY-MM');
    case 'day':
      return d.format('YYYY-MM-DD');
    case 'hour':
      return d.format('YYYY-MM-DDHH');
    case 'minute':
      return d.format('YYYY-MM-DDHH:mm');
    case 'second':
      return d.format('YYYY-MM-DDHH:mm:ss');
  }
}

function normalizeDraftByType(d: Dayjs, type: ModelType) {
  if (type === 'year') return d.month(0).date(1).hour(0).minute(0).second(0);
  if (type === 'month') return d.date(1).hour(0).minute(0).second(0);
  if (type === 'day') return d.hour(0).minute(0).second(0);
  if (type === 'hour') return d.minute(0).second(0);
  if (type === 'minute') return d.second(0);
  return d;
}

function clampToBounds(d: Dayjs, bounds: DateBounds) {
  if (bounds.min && d.isBefore(bounds.min)) return bounds.min;
  if (bounds.max && d.isAfter(bounds.max)) return bounds.max;
  return d;
}

function resolveInitialPair(modelValue: string[] | undefined, bounds: DateBounds, type: ModelType) {
  const rawStart = Array.isArray(modelValue) ? modelValue[0] : undefined;
  const rawEnd = Array.isArray(modelValue) ? modelValue[1] : undefined;
  const min = bounds.min;
  const max = bounds.max;

  const now = dayjs();
  let s = rawStart ? parseStandardDateStrict(rawStart) : undefined;
  let e = rawEnd ? parseStandardDateStrict(rawEnd) : undefined;

  if (!s || !e) {
    const seed = clampToBounds(now, bounds);
    s = s ?? seed;
    e = e ?? seed;
  }

  s = normalizeDraftByType(clampToBounds(s, bounds), type);
  e = normalizeDraftByType(clampToBounds(e, bounds), type);

  if (s.isAfter(e)) {
    const tmp = s;
    s = e;
    e = tmp;
  }

  if (min && max && min.isAfter(max)) {
    throw new Error('[y2kit-ui][BetweenTime] Invalid bounds: start is after end.');
  }

  return { start: s, end: e };
}

function ensureFormatSyncValueIsStandard(value: string) {
  const d = dayjs(value, STANDARD_INPUT_FORMATS, true);
  if (!d.isValid()) {
    throw new Error(
      `[y2kit-ui][BetweenTime] formatSyncValue requires standard output, got "${value}".`
    );
  }
}

function getQuarterStart(d: Dayjs) {
  const m = d.month(); // 0-11
  const qStartMonth = Math.floor(m / 3) * 3;
  return d.month(qStartMonth).date(1).hour(0).minute(0).second(0);
}

function getQuickRange(key: string, now: Dayjs): { start: Dayjs; end: Dayjs } | null {
  if (key === 'd') {
    const t = now.startOf('day');
    return { start: t, end: t.endOf('day') };
  }
  if (key === 'w') {
    const s = now.startOf('week').startOf('day');
    const e = now.endOf('week').endOf('day');
    return { start: s, end: e };
  }
  if (key === 'm') {
    const s = now.startOf('month').startOf('day');
    const e = now.endOf('month').endOf('day');
    return { start: s, end: e };
  }
  if (key === 'y') {
    const s = now.startOf('year').startOf('day');
    const e = now.endOf('year').endOf('day');
    return { start: s, end: e };
  }
  if (key === 'q') {
    const s = getQuarterStart(now).startOf('day');
    const e = s.add(3, 'month').subtract(1, 'second').endOf('day');
    return { start: s, end: e };
  }
  const n = toIntOrNull(key);
  if (n != null && n > 0) {
    const e = now.endOf('day');
    const s = now.subtract(n - 1, 'day').startOf('day');
    return { start: s, end: e };
  }
  return null;
}


function getColumnsCount(type: ModelType) {
  if (type === 'year') return 1;
  if (type === 'month') return 2;
  if (type === 'day') return 3;
  if (type === 'hour') return 4;
  if (type === 'minute') return 5;
  return 6;
}

function ensureBoundsValid(bounds: DateBounds) {
  if (bounds.min && bounds.max && bounds.min.isAfter(bounds.max)) {
    throw new Error('[y2kit-ui][BetweenTime] Invalid bounds: start is after end.');
  }
}

// 缓存常用的选项数组，避免重复创建
const wheelOptionsCache = new Map<string, WheelOption[]>();

function buildWheelOptions(min: number, max: number, pad2 = false): WheelOption[] {
  const cacheKey = `${min}-${max}-${pad2}`;
  const cached = wheelOptionsCache.get(cacheKey);
  if (cached) return cached;

  const out: WheelOption[] = [];
  for (let v = min; v <= max; v += 1) {
    out.push({ key: v, label: pad2 ? String(v).padStart(2, '0') : String(v) });
  }
  wheelOptionsCache.set(cacheKey, out);
  return out;
}

function resolveWheelData(d: Dayjs, bounds: DateBounds, type: ModelType) {
  const count = getColumnsCount(type);
  const min = bounds.min;
  const max = bounds.max;

  const minYear = min?.year() ?? 1970;
  const maxYear = max?.year() ?? 2099;
  const years = buildWheelOptions(minYear, maxYear);

  const y = clampNumber(d.year(), minYear, maxYear);

  const mMin = y === min?.year() ? (min.month() + 1) : 1;
  const mMax = y === max?.year() ? (max.month() + 1) : 12;
  const months = buildWheelOptions(mMin, mMax, true);

  const month = clampNumber(d.month() + 1, mMin, mMax);
  const base = dayjs(`${y}-${String(month).padStart(2, '0')}-01`);
  const dim = base.daysInMonth();

  const isMinYM = y === min?.year() && month === (min.month() + 1);
  const isMaxYM = y === max?.year() && month === (max.month() + 1);
  const dMin = isMinYM ? min.date() : 1;
  const dMax = isMaxYM ? max.date() : dim;
  const days = buildWheelOptions(dMin, dMax, true);

  const day = clampNumber(d.date(), dMin, dMax);
  const sameMinYMD =
    min != null && y === min.year() && month === (min.month() + 1) && day === min.date();
  const sameMaxYMD =
    max != null && y === max.year() && month === (max.month() + 1) && day === max.date();
  const hMin = sameMinYMD ? min.hour() : 0;
  const hMax = sameMaxYMD ? max.hour() : 23;
  const hours = buildWheelOptions(hMin, hMax, true);

  const hour = clampNumber(d.hour(), hMin, hMax);
  const sameMinYMDH = sameMinYMD && hour === min?.hour();
  const sameMaxYMDH = sameMaxYMD && hour === max?.hour();
  const minMin = sameMinYMDH ? min.minute() : 0;
  const minMax = sameMaxYMDH ? max.minute() : 59;
  const minutes = buildWheelOptions(minMin, minMax, true);

  const minute = clampNumber(d.minute(), minMin, minMax);
  const sameMinYMDHM = sameMinYMDH && minute === min?.minute();
  const sameMaxYMDHM = sameMaxYMDH && minute === max?.minute();
  const sMin = sameMinYMDHM ? min.second() : 0;
  const sMax = sameMaxYMDHM ? max.second() : 59;
  const seconds = buildWheelOptions(sMin, sMax, true);

  const all = [years, months, days, hours, minutes, seconds].slice(0, count);
  const indices = [
    years.findIndex((it) => it.key === y),
    months.findIndex((it) => it.key === month),
    days.findIndex((it) => it.key === day),
    hours.findIndex((it) => it.key === hour),
    minutes.findIndex((it) => it.key === minute),
    seconds.findIndex((it) => it.key === clampNumber(d.second(), sMin, sMax)),
  ].slice(0, count);

  return { columns: all, indices };
}

function applyColumnValue(d: Dayjs, columnIndex: number, value: number) {
  if (columnIndex === 0) return d.year(value);
  if (columnIndex === 1) return d.month(value - 1);
  if (columnIndex === 2) return d.date(value);
  if (columnIndex === 3) return d.hour(value);
  if (columnIndex === 4) return d.minute(value);
  return d.second(value);
}

function composeTrigger(children: React.ReactNode, onPress: () => void, disabled?: boolean) {
  if (React.isValidElement(children)) {
    const anyChild = children as any;
    const prevOnPress = anyChild?.props?.onPress;
    if (typeof prevOnPress === 'function') {
      return React.cloneElement(children as any, {
        onPress: (...args: any[]) => {
          prevOnPress(...args);
          onPress();
        },
        disabled: disabled || anyChild?.props?.disabled,
      });
    }
    return React.cloneElement(children as any, {
      onPress,
      disabled: disabled || anyChild?.props?.disabled,
    });
  }
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      {children}
    </Pressable>
  );
}

export const BetweenTime = React.forwardRef<BetweenTimeHandle, BetweenTimeProps>(function BetweenTime({
  title,
  start,
  end,
  type = 'day',
  format = 'YYYY-MM-DD',
  formatSyncValue = false,
  cellUnits,
  quickDate,
  lazyContent = true,
  drawerSize,
  disabled = false,
  value: valueProp,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onDismissComplete,
  onCancel,
  onConfirm,
  children,
}: BetweenTimeProps, ref) {
  const { t } = useI18n();
  const theme = useTheme();
  const { height: screenH, width: screenW } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, wp(12));

  const bounds = React.useMemo<DateBounds>(() => {
    const min = parseStandardDateStrict(start);
    const max = parseStandardDateStrict(end);
    const b = { min, max };
    ensureBoundsValid(b);
    return b;
  }, [start, end]);

  const [innerValue, setInnerValue] = React.useState<string[]>(defaultValue ?? []);
  const isValueControlled = valueProp !== undefined;
  const value = isValueControlled ? (valueProp as string[]) : innerValue;

  const [innerOpen, setInnerOpen] = React.useState(defaultOpen);
  const isOpenControlled = openProp !== undefined;
  const visible = isOpenControlled ? !!openProp : innerOpen;
  const [sheetMounted, setSheetMounted] = React.useState(visible);
  const [contentMounted, setContentMounted] = React.useState(!lazyContent);
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const sheetPhaseRef = React.useRef<SheetNativePhase>('idle');
  const pendingDismissRef = React.useRef(false);
  const activeSheetLifecycleRef = React.useRef(!!visible);
  const visibleRef = React.useRef(!!visible);

  React.useEffect(() => {
    visibleRef.current = !!visible;
  }, [visible]);

  const finishClosedLifecycle = React.useCallback((shouldSyncOpenState: boolean) => {
    sheetPhaseRef.current = 'idle';
    pendingDismissRef.current = false;

    if (shouldSyncOpenState) {
      onOpenChange?.(false);
      if (!isOpenControlled) setInnerOpen(false);
    }

    if (Platform.OS === 'ios' || lazyContent) setSheetMounted(false);

    if (activeSheetLifecycleRef.current) {
      activeSheetLifecycleRef.current = false;
      onDismissComplete?.();
    }
  }, [isOpenControlled, lazyContent, onDismissComplete, onOpenChange]);

  const requestSheetDismiss = React.useCallback(() => {
    const phase = sheetPhaseRef.current;

    if (phase === 'dismissing') return;

    if (phase === 'presenting') {
      pendingDismissRef.current = true;
      return;
    }

    if (phase === 'presented') {
      const sheet = sheetRef.current;
      if (!sheet) {
        finishClosedLifecycle(true);
        return;
      }

      pendingDismissRef.current = false;
      sheetPhaseRef.current = 'dismissing';
      silentlyCatchPromise(sheet.dismiss());
      return;
    }

    if (activeSheetLifecycleRef.current) {
      finishClosedLifecycle(true);
    }
  }, [finishClosedLifecycle]);

  React.useEffect(() => {
    if (visible && !sheetMounted) {
      activeSheetLifecycleRef.current = true;
      pendingDismissRef.current = false;
      setSheetMounted(true);
    }
    if (visible && sheetMounted) {
      activeSheetLifecycleRef.current = true;
    }
  }, [sheetMounted, visible]);

  const detents = React.useMemo<Array<'auto' | number>>(() => {
    if (drawerSize == null) return ['auto'];
    const n = typeof drawerSize === 'number' ? drawerSize : Number.parseFloat(drawerSize);
    if (!Number.isFinite(n) || n <= 0) return ['auto'];
    const fraction = clampNumber(n / screenH, 0.1, 0.92);
    return [fraction];
  }, [drawerSize, screenH]);

  const [activeSide, setActiveSide] = React.useState<Side>('start');

  const [{ draftStart, draftEnd }, setDraft] = React.useState(() => {
    const pair = resolveInitialPair(value, bounds, type);
    return { draftStart: pair.start, draftEnd: pair.end };
  });

  React.useEffect(() => {
    const pair = resolveInitialPair(value, bounds, type);
    setDraft({ draftStart: pair.start, draftEnd: pair.end });
  }, [bounds, type, value?.[0], value?.[1]]);

  React.useEffect(() => {
    if (visible) {
      const pair = resolveInitialPair(value, bounds, type);
      setDraft({ draftStart: pair.start, draftEnd: pair.end });
      if (lazyContent && !contentMounted) setContentMounted(true);
    }
    // 只希望在进入打开态时重置草稿，不跟随其他依赖重复触发。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const defaultCellUnits = React.useMemo(() => [
    t('betweenTime.unit.year'),
    t('betweenTime.unit.month'),
    t('betweenTime.unit.day'),
    t('betweenTime.unit.hour'),
    t('betweenTime.unit.minute'),
    t('betweenTime.unit.second'),
  ], [t]);

  const getQuickLabel = React.useCallback((key: string) => {
    if (key === 'd') return t('betweenTime.quick.today');
    if (key === 'w') return t('betweenTime.quick.thisWeek');
    if (key === 'm') return t('betweenTime.quick.thisMonth');
    if (key === 'y') return t('betweenTime.quick.thisYear');
    if (key === 'q') return t('betweenTime.quick.thisQuarter');
    const n = toIntOrNull(key);
    if (n != null && n > 0) return t('betweenTime.quick.recentDays', { n });
    return key;
  }, [t]);

  const close = React.useCallback(() => {
    onOpenChange?.(false);
    if (!isOpenControlled) {
      setInnerOpen(false);
    }
    requestSheetDismiss();
  }, [isOpenControlled, onOpenChange, requestSheetDismiss]);

  const openPicker = React.useCallback(() => {
    if (disabled) return;
    if (!visible) {
      if (!isOpenControlled) setInnerOpen(true);
      onOpenChange?.(true);
    }

    const pair = resolveInitialPair(value, bounds, type);
    setDraft({ draftStart: pair.start, draftEnd: pair.end });

    if (lazyContent && !contentMounted) {
      setContentMounted(true);
    }
  }, [bounds, contentMounted, disabled, isOpenControlled, lazyContent, onOpenChange, type, value, visible]);

  React.useImperativeHandle(ref, () => ({
    open: openPicker,
    close,
  }), [openPicker, close]);

  React.useEffect(() => {
    if (visible && sheetMounted) {
      const rafId = requestAnimationFrame(() => {
        if (!visibleRef.current) return;
        if (sheetPhaseRef.current !== 'idle') return;

        const sheet = sheetRef.current;
        if (!sheet) return;

        pendingDismissRef.current = false;
        sheetPhaseRef.current = 'presenting';
        silentlyCatchPromise(sheet.present());
      });
      return () => cancelAnimationFrame(rafId);
    }
    if (!visible && sheetMounted) {
      requestSheetDismiss();
    }
  }, [requestSheetDismiss, sheetMounted, visible]);

  const columnsCount = React.useMemo(() => getColumnsCount(type), [type]);
  const wheelsRef = React.useRef<Array<WheelColumnHandle | null>>([]);
  React.useEffect(() => {
    wheelsRef.current.length = columnsCount;
  }, [columnsCount]);
  const resolvedCellUnits = cellUnits ?? defaultCellUnits;
  const unitLabels = React.useMemo(() => resolvedCellUnits.slice(0, columnsCount), [resolvedCellUnits, columnsCount]);
  const activeDraft = activeSide === 'start' ? draftStart : draftEnd;
  const { columns, indices } = React.useMemo(
    () => resolveWheelData(activeDraft, bounds, type),
    [activeDraft, bounds, type]
  );

  const columnsLayoutRef = React.useRef({ width: screenW - wp(32) });
  const onColumnsLayout = React.useCallback((e: LayoutChangeEvent) => {
    columnsLayoutRef.current = { width: e.nativeEvent.layout.width };
  }, []);
  const columnWidth = React.useMemo(() => {
    const w = columnsLayoutRef.current.width;
    return w / Math.max(1, columnsCount);
  }, [columnsCount, screenW]);

  const setValue = React.useCallback(
    (next: string[]) => {
      onValueChange?.(next);
      if (!isValueControlled) setInnerValue(next);
    },
    [isValueControlled, onValueChange]
  );

  const applyPairAndEmit = React.useCallback(
    (nextStart: Dayjs, nextEnd: Dayjs) => {
      const s = normalizeDraftByType(clampToBounds(nextStart, bounds), type);
      const e = normalizeDraftByType(clampToBounds(nextEnd, bounds), type);
      let a = s;
      let b = e;
      let nextActive = activeSide;
      if (a.isAfter(b)) {
        const tmp = a;
        a = b;
        b = tmp;
        nextActive = activeSide === 'start' ? 'end' : 'start';
      }
      setDraft({ draftStart: a, draftEnd: b });
      if (nextActive !== activeSide) setActiveSide(nextActive);

      const rawStart = formatByType(a, type);
      const rawEnd = formatByType(b, type);

      let outStart = rawStart;
      let outEnd = rawEnd;
      if (formatSyncValue) {
        outStart = a.format(format);
        outEnd = b.format(format);
        ensureFormatSyncValueIsStandard(outStart);
        ensureFormatSyncValueIsStandard(outEnd);
      }

      const nextValue = outStart && outEnd ? [outStart, outEnd] : [];
      setValue(nextValue);
    },
    [activeSide, bounds, format, formatSyncValue, setValue, type]
  );

  // iOS 原生 wheel 在减速尚未结束时，业务层未必已经拿到最新列值。
  // 确认按钮这里会主动向每一列请求一次“以当前中心项为准”的即时结算，
  // 然后再统一重建 start / end，避免出现“明明已经滚到新值，但确认后还是旧值”的错位。
  const syncDraftFromWheels = React.useCallback(async () => {
    let nextDraft = activeDraft;

    for (let columnIndex = 0; columnIndex < columnsCount; columnIndex += 1) {
      const opts = columns[columnIndex] ?? [];
      if (!opts.length) break;

      const wheel = wheelsRef.current[columnIndex];
      const settledIndex =
        Platform.OS === 'ios'
          ? await wheel?.syncCurrentSelection()
          : wheel?.settleToNearest(false);
      const safeIndex = clampNumber(settledIndex ?? indices[columnIndex] ?? 0, 0, opts.length - 1);
      const picked = opts[safeIndex];
      if (!picked) continue;

      nextDraft = applyColumnValue(nextDraft, columnIndex, picked.key as number);
    }

    nextDraft = normalizeDraftByType(clampToBounds(nextDraft, bounds), type);

    const startCandidate = activeSide === 'start' ? nextDraft : draftStart;
    const endCandidate = activeSide === 'start' ? draftEnd : nextDraft;
    const nextStart = normalizeDraftByType(clampToBounds(startCandidate, bounds), type);
    const nextEnd = normalizeDraftByType(clampToBounds(endCandidate, bounds), type);
    const nextPair = nextStart.isAfter(nextEnd)
      ? { start: nextEnd, end: nextStart }
      : { start: nextStart, end: nextEnd };

    applyPairAndEmit(nextPair.start, nextPair.end);
    return nextPair;
  }, [activeDraft, activeSide, applyPairAndEmit, bounds, columns, columnsCount, draftEnd, draftStart, indices, type]);

  const handleWheelIndexChange = React.useCallback(
    (columnIndex: number, nextIndex: number) => {
      const opts = columns[columnIndex];
      const picked = opts?.[nextIndex];
      if (!picked) return;
      const valueNum = picked.key as number;
      let nextDraft = applyColumnValue(activeDraft, columnIndex, valueNum);
      nextDraft = clampToBounds(nextDraft, bounds);
      nextDraft = normalizeDraftByType(nextDraft, type);

      if (activeSide === 'start') applyPairAndEmit(nextDraft, draftEnd);
      else applyPairAndEmit(draftStart, nextDraft);
    },
    [activeDraft, activeSide, applyPairAndEmit, bounds, columns, draftEnd, draftStart, type]
  );

  const handleClear = React.useCallback(() => {
    setValue([]);
  }, [setValue]);

  const handleCancel = React.useCallback(() => {
    onCancel?.();
    const pair = resolveInitialPair(value, bounds, type);
    setDraft({ draftStart: pair.start, draftEnd: pair.end });
    close();
  }, [bounds, close, onCancel, type, value]);

  const handleConfirm = React.useCallback(async () => {
    const synced = await syncDraftFromWheels();
    const next = [synced.start, synced.end];
    const rawStart = formatByType(next[0], type);
    const rawEnd = formatByType(next[1], type);
    let outStart = rawStart;
    let outEnd = rawEnd;
    if (formatSyncValue) {
      outStart = next[0].format(format);
      outEnd = next[1].format(format);
      ensureFormatSyncValueIsStandard(outStart);
      ensureFormatSyncValueIsStandard(outEnd);
    }
    const nextValue = outStart && outEnd ? [outStart, outEnd] : [];
    setValue(nextValue);
    onConfirm?.({ value: nextValue });
    close();
  }, [close, format, formatSyncValue, onConfirm, setValue, syncDraftFromWheels, type]);

  const handleQuickPick = React.useCallback(
    (key: string) => {
      const range = getQuickRange(key, dayjs());
      if (!range) return;
      applyPairAndEmit(range.start, range.end);
    },
    [applyPairAndEmit]
  );

  const triggerNode = React.useMemo(
    () => children != null ? composeTrigger(children, openPicker, disabled) : null,
    [children, disabled, openPicker]
  );

  const handleSheetDidPresent = React.useCallback(() => {
    sheetPhaseRef.current = 'presented';
    if (pendingDismissRef.current || !visibleRef.current) {
      requestSheetDismiss();
    }
  }, [requestSheetDismiss]);

  const handleSheetDidDismiss = React.useCallback(() => {
    const wasProgrammaticDismiss = sheetPhaseRef.current === 'dismissing' || pendingDismissRef.current;
    const shouldSyncOpenState = !visibleRef.current || !wasProgrammaticDismiss;
    finishClosedLifecycle(shouldSyncOpenState);
  }, [finishClosedLifecycle]);

  const handleBackdropPress = React.useCallback(() => {
    if (disabled || !visible) return;
    onCancel?.();
    const pair = resolveInitialPair(value, bounds, type);
    setDraft({ draftStart: pair.start, draftEnd: pair.end });
    close();
  }, [bounds, close, disabled, onCancel, type, value, visible]);

  const useManualIOSBackdrop = Platform.OS === 'ios';
  const backdropOpacity = React.useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [backdropMounted, setBackdropMounted] = React.useState(useManualIOSBackdrop && visible);

  React.useEffect(() => {
    if (!useManualIOSBackdrop) return;

    backdropOpacity.stopAnimation();

    if (visible) {
      setBackdropMounted(true);
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(backdropOpacity, {
      toValue: 0,
      duration: 120,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visibleRef.current) {
        setBackdropMounted(false);
      }
    });
  }, [backdropOpacity, useManualIOSBackdrop, visible]);

  const sheetNode = (
    <BottomSheet
      ref={sheetRef}
      detents={detents}
      backgroundColor={theme.colors.surface}
      cornerRadius={undefined}
      grabber={false}
      draggable={false}
      dimmed={!useManualIOSBackdrop}
      dimmedDetentIndex={0}
      insetAdjustment="never"
      dismissible={Platform.OS === 'ios' ? false : !disabled}
      onDidPresent={handleSheetDidPresent}
      onDidDismiss={handleSheetDidDismiss}
    >
      <View
        style={[
          styles.sheetInner,
          {
            backgroundColor: theme.colors.surface,
            paddingBottom: wp(16) + safeBottom,
          },
        ]}
        pointerEvents={disabled ? 'none' : 'auto'}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {title ?? t('betweenTime.title')}
          </Text>
          <Button
            variant="ghost"
            onPress={handleClear}
            disabled={disabled}
            fontSize={sp(14)}
            textColor={theme.colors.muted}
            minHeight={wp(32)}
            paddingHorizontal={wp(8)}
          >
            {t('betweenTime.clear')}
          </Button>
        </View>

        {Array.isArray(quickDate) && quickDate.length > 0 ? (
          <View style={styles.quickRow}>
            {quickDate.map((k) => (
              <Pressable
                key={k}
                onPress={() => handleQuickPick(k)}
                style={({ pressed }) => [
                  styles.quickPill,
                  {
                    borderColor: `${theme.colors.primary}22`,
                    backgroundColor: `${theme.colors.primary}14`,
                  },
                  pressed && { opacity: 0.8 },
                ]}
                disabled={disabled}
              >
                <Text style={[styles.quickText, { color: theme.colors.primary }]}>{getQuickLabel(k)}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.rangeRow}>
          <Pressable
            onPress={() => setActiveSide('start')}
            style={({ pressed }) => [
              styles.rangePill,
              activeSide === 'start'
                ? { borderColor: theme.colors.primary, backgroundColor: '#FFFFFF' }
                : { borderColor: theme.colors.border, backgroundColor: '#FFFFFF' },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text
              style={[
                styles.rangeText,
                { color: activeSide === 'start' ? theme.colors.primary : theme.colors.muted },
              ]}
              numberOfLines={1}
            >
              {draftStart ? draftStart.format(format) : t('betweenTime.startTime')}
            </Text>
          </Pressable>

          <Text style={[styles.toText, { color: theme.colors.muted }]}>{t('betweenTime.to')}</Text>

          <Pressable
            onPress={() => setActiveSide('end')}
            style={({ pressed }) => [
              styles.rangePill,
              activeSide === 'end'
                ? { borderColor: theme.colors.primary, backgroundColor: '#FFFFFF' }
                : { borderColor: theme.colors.border, backgroundColor: '#FFFFFF' },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text
              style={[
                styles.rangeText,
                { color: activeSide === 'end' ? theme.colors.primary : theme.colors.muted },
              ]}
              numberOfLines={1}
            >
              {draftEnd ? draftEnd.format(format) : t('betweenTime.endTime')}
            </Text>
          </Pressable>
        </View>

        {contentMounted ? (
          <View style={styles.pickerArea}>
            <View style={styles.unitRow}>
              {unitLabels.map((u, idx) => (
                <View key={`${u}-${idx}`} style={[styles.unitCell, { width: columnWidth }]}>
                  <Text style={[styles.unitText, { color: theme.colors.muted }]}>{u}</Text>
                </View>
              ))}
            </View>

            <View style={styles.pickerWrapper} onLayout={onColumnsLayout}>
              {Platform.OS !== 'ios' && (
                <View style={[styles.highlightBar, { backgroundColor: '#F2F2F2' }]} pointerEvents="none" />
              )}
              <View style={styles.columnsRow}>
                {columns.map((col, colIdx) => (
                  <WheelColumn
                    key={`col-${colIdx}-${columnsCount}`}
                    ref={(instance) => {
                      wheelsRef.current[colIdx] = instance;
                    }}
                    data={col}
                    selectedIndex={Math.max(0, indices[colIdx] ?? 0)}
                    onSelectedIndexChange={(idx) => handleWheelIndexChange(colIdx, idx)}
                    width={columnWidth}
                    disabled={disabled}
                  />
                ))}
              </View>
              {Platform.OS !== 'ios' && (
                <>
                  <View style={styles.topMask} pointerEvents="none">
                    <LinearGradient
                      colors={['#FFFFFF', 'rgba(255,255,255,0)']}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                  <View style={styles.bottomMask} pointerEvents="none">
                    <LinearGradient
                      colors={['rgba(255,255,255,0)', '#FFFFFF']}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                </>
              )}
            </View>
          </View>
        ) : (
          <View style={[styles.pickerArea, { height: WHEEL_AREA_HEIGHT + wp(26) }]} />
        )}

        <View style={styles.footer}>
          <View style={styles.footerBtnWrapper}>
            <Button
              variant="soft"
              onPress={handleCancel}
              disabled={disabled}
              block
              minHeight={wp(44)}
              radius={wp(14)}
              fontSize={sp(16)}
            >
              {t('betweenTime.cancel')}
            </Button>
          </View>
          <View style={styles.footerBtnWrapper}>
            <Button
              onPress={handleConfirm}
              disabled={disabled}
              block
              minHeight={wp(44)}
              radius={wp(14)}
              fontSize={sp(16)}
            >
              {t('betweenTime.confirm')}
            </Button>
          </View>
        </View>
      </View>
    </BottomSheet>
  );

  return (
    <>
      {triggerNode}
      {sheetMounted ? (
        useManualIOSBackdrop ? (
          <Modal
            visible
            transparent
            animationType="none"
            statusBarTranslucent
            presentationStyle="overFullScreen"
            onRequestClose={handleBackdropPress}
          >
            <View style={styles.modalRoot} pointerEvents="box-none">
              {backdropMounted ? (
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={handleBackdropPress}
                  disabled={disabled || !visible}
                >
                  <Animated.View style={[styles.iosBackdrop, { opacity: backdropOpacity }]} />
                </Pressable>
              ) : null}
              {sheetNode}
            </View>
          </Modal>
        ) : (
          sheetNode
        )
      ) : null}
    </>
  );
});

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  iosBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  sheetInner: {
    width: '100%',
    paddingHorizontal: wp(16),
    paddingTop: wp(14),
    paddingBottom: wp(16),
  },
  header: {
    height: wp(44),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: sp(16),
    fontWeight: '600',
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(10),
    paddingTop: wp(8),
    paddingBottom: wp(12),
  },
  quickPill: {
    height: wp(28),
    paddingHorizontal: wp(12),
    borderRadius: wp(14),
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: {
    fontSize: sp(12),
    fontWeight: '600',
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: wp(4),
    paddingBottom: wp(10),
  },
  rangePill: {
    flex: 1,
    height: wp(40),
    borderRadius: wp(20),
    borderWidth: wp(1.5),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(12),
  },
  rangeText: {
    fontSize: sp(14),
    fontWeight: '600',
  },
  toText: {
    width: wp(28),
    textAlign: 'center',
    fontSize: sp(13),
    fontWeight: '600',
  },
  pickerArea: {
    paddingTop: wp(4),
    paddingBottom: WHEEL_AREA_VERTICAL_INSET * 2,
  },
  unitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: wp(6),
  },
  unitCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitText: {
    fontSize: sp(12),
    fontWeight: '600',
  },
  pickerWrapper: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    position: 'relative',
    width: '100%',
    overflow: 'visible',
  },
  highlightBar: {
    position: 'absolute',
    top: ITEM_HEIGHT * ((VISIBLE_ITEMS - 1) / 2),
    left: -wp(16),
    right: -wp(16),
    height: ITEM_HEIGHT,
    backgroundColor: '#F2F2F2',
    zIndex: 0,
  },
  topMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * ((VISIBLE_ITEMS - 1) / 2),
    zIndex: 2,
  },
  bottomMask: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * ((VISIBLE_ITEMS - 1) / 2),
    zIndex: 2,
  },
  columnsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: wp(14),
    paddingTop: wp(16),
  },
  footerBtnWrapper: {
    flex: 1,
  },
});
