import { Feather } from '@expo/vector-icons';
import * as React from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sp, wp } from 'zkit-tools';
import { useI18n } from '../../i18n/useI18n';
import { useTheme } from '../../theme/useTheme';
import { Sheet, type SheetOpenChangeDetails } from '../Sheet';
import { Text } from '../Text';
import { PickerActionBar, getPickerActionBarBottomInset } from '../Picker/actionBar';
import { areaList } from '@vant/area-data';

export type AddressCascaderHandle = {
  open: () => void;
  close: () => void;
};

export type AddressCascaderOption = {
  value?: string | number;
  text?: string | number;
  label?: string | number;
  title?: string | number;
  name?: string | number;
  id?: string | number;
  code?: string | number;
  key?: string | number;
  disabled?: boolean;
  children?: AddressCascaderOption[];
  [key: string]: unknown;
};

// 懒加载转换省市区数据。
let cachedAreaData: AddressCascaderOption[] | null = null;

function getAreaData(): AddressCascaderOption[] {
  if (cachedAreaData) return cachedAreaData;

  const { province_list, city_list, county_list } = areaList;

  const countiesByCity = new Map<string, AddressCascaderOption[]>();
  for (const [countyCode, countyName] of Object.entries(county_list)) {
    const cityPrefix = countyCode.slice(0, 4);
    const county = { value: countyCode, text: String(countyName) };
    const counties = countiesByCity.get(cityPrefix);

    if (counties) {
      counties.push(county);
    } else {
      countiesByCity.set(cityPrefix, [county]);
    }
  }

  const citiesByProvince = new Map<string, AddressCascaderOption[]>();
  for (const [cityCode, cityName] of Object.entries(city_list)) {
    const provincePrefix = cityCode.slice(0, 2);
    const children = countiesByCity.get(cityCode.slice(0, 4));
    const city: AddressCascaderOption = children?.length
      ? { value: cityCode, text: String(cityName), children }
      : { value: cityCode, text: String(cityName) };
    const cities = citiesByProvince.get(provincePrefix);

    if (cities) {
      cities.push(city);
    } else {
      citiesByProvince.set(provincePrefix, [city]);
    }
  }

  const provinces: AddressCascaderOption[] = Object.entries(province_list).map(([provinceCode, provinceName]) => {
    const children = citiesByProvince.get(provinceCode.slice(0, 2));
    return children?.length
      ? { value: provinceCode, text: String(provinceName), children }
      : { value: provinceCode, text: String(provinceName) };
  });

  cachedAreaData = provinces;
  return provinces;
}

export type AddressCascaderValue = string[];

export type AddressCascaderConfirmPayload = {
  value: AddressCascaderValue;
  values: string[];
  label: string;
  labels: string[];
  items: AddressCascaderOption[];
};

export type AddressCascaderChangePayload = AddressCascaderConfirmPayload;

export type AddressCascaderRenderContext = {
  value: AddressCascaderValue;
  label: string;
  labels: string[];
  items: AddressCascaderOption[];
};

export type AddressCascaderProps = {
  list?: AddressCascaderOption[];

  value?: AddressCascaderValue;
  defaultValue?: AddressCascaderValue;
  onValueChange?: (next: AddressCascaderValue) => void;

  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (next: boolean) => void;
  onDismissComplete?: () => void;

  label?: string;
  defaultLabel?: string;
  onLabelChange?: (next: string) => void;

  title?: string;
  separator?: string;
  levelLabels?: string[];

  lazyContent?: boolean;
  drawerSize?: string | number;
  disabled?: boolean;

  onCancel?: () => void;
  onConfirm?: (payload: AddressCascaderConfirmPayload) => void;
  onChange?: (payload: AddressCascaderChangePayload) => void;

  children?: React.ReactNode | ((ctx: AddressCascaderRenderContext) => React.ReactNode);
};

type AddressDraft = {
  value: AddressCascaderValue;
  labels: string[];
  items: AddressCascaderOption[];
  activeLevel: number;
};

type AddressOption = {
  item: AddressCascaderOption;
  index: number;
  level: number;
  value: string;
  text: string;
  disabled: boolean;
  hasChildren: boolean;
};

type Primitive = string | number;

const MAX_LEVELS = 3;
const LEVELS = Array.from({ length: MAX_LEVELS }, (_, level) => level);
const LIST_FADE_DURATION = 180;
const LIST_FADE_START_OPACITY = 0.58;
const OPTION_ROW_ESTIMATED_HEIGHT = wp(58);
const SELECTED_OPTION_VIEW_POSITION = 0.18;

function clampNumber(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pickPrimitive(node: AddressCascaderOption, keys: string[], fallback?: Primitive): Primitive | undefined {
  for (const key of keys) {
    const v = node?.[key];
    if (typeof v === 'string' || typeof v === 'number') return v;
  }
  return fallback;
}

function pickValue(node: AddressCascaderOption, fallbackIndex?: number) {
  const fallback = fallbackIndex == null ? undefined : String(fallbackIndex);
  return String(pickPrimitive(node, ['value', 'id', 'code', 'key'], fallback) ?? '');
}

function pickText(node: AddressCascaderOption) {
  const v = pickPrimitive(node, ['text', 'label', 'title', 'name']);
  return v == null ? '' : String(v);
}

function getChildren(node: AddressCascaderOption | undefined) {
  return Array.isArray(node?.children) ? node.children : [];
}

function hasNextLevel(node: AddressCascaderOption | undefined, level: number) {
  return level < MAX_LEVELS - 1 && getChildren(node).length > 0;
}

function buildLabel(labels: string[], separator: string) {
  return labels.filter(Boolean).join(separator);
}

function resolvePath(
  list: AddressCascaderOption[],
  value: AddressCascaderValue | undefined
): Omit<AddressDraft, 'activeLevel'> {
  const nextValue: string[] = [];
  const labels: string[] = [];
  const items: AddressCascaderOption[] = [];
  let currentList = Array.isArray(list) ? list : [];

  for (let level = 0; level < MAX_LEVELS; level += 1) {
    const desired = value?.[level];
    if (desired == null || !currentList.length) break;

    const idx = currentList.findIndex((item, index) => pickValue(item, index) === String(desired));
    if (idx < 0) break;

    const item = currentList[idx];
    if (!item) break;

    nextValue.push(pickValue(item, idx));
    labels.push(pickText(item));
    items.push(item);
    currentList = getChildren(item);
  }

  return { value: nextValue, labels, items };
}

function getActiveLevelFromItems(items: AddressCascaderOption[]) {
  if (!items.length) return 0;
  const lastIndex = Math.min(items.length - 1, MAX_LEVELS - 1);
  const lastItem = items[lastIndex];
  if (hasNextLevel(lastItem, lastIndex) && items.length < MAX_LEVELS) return items.length;
  return lastIndex;
}

function createDraft(list: AddressCascaderOption[], value: AddressCascaderValue | undefined): AddressDraft {
  const resolved = resolvePath(list, value);
  return {
    ...resolved,
    activeLevel: getActiveLevelFromItems(resolved.items),
  };
}

function getListForLevel(
  list: AddressCascaderOption[],
  items: AddressCascaderOption[],
  level: number
) {
  let currentList = Array.isArray(list) ? list : [];
  for (let i = 0; i < level; i += 1) {
    const next = getChildren(items[i]);
    if (!next.length) return [];
    currentList = next;
  }
  return currentList;
}

function isCompleteDraft(draft: AddressDraft) {
  if (!draft.items.length) return false;
  const lastLevel = draft.items.length - 1;
  const lastItem = draft.items[lastLevel];
  return !hasNextLevel(lastItem, lastLevel);
}

function composeTrigger(
  children: AddressCascaderProps['children'],
  onPress: () => void,
  disabled: boolean | undefined,
  ctx: AddressCascaderRenderContext
) {
  if (typeof children === 'function') {
    const node = children(ctx);
    return composeTrigger(node, onPress, disabled, ctx);
  }
  if (React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      onPress?: (...args: unknown[]) => void;
      disabled?: boolean;
    }>;
    const prevOnPress = child.props.onPress;
    if (typeof prevOnPress === 'function') {
      return React.cloneElement(child, {
        onPress: (...args: unknown[]) => {
          prevOnPress(...args);
          onPress();
        },
        disabled: disabled || child.props.disabled,
      });
    }
    return React.cloneElement(child, {
      onPress,
      disabled: disabled || child.props.disabled,
    });
  }
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      {children}
    </Pressable>
  );
}

type AddressOptionRowProps = {
  option: AddressOption;
  selected: boolean;
  disabled: boolean;
  primaryColor: string;
  onSurfaceColor: string;
  mutedColor: string;
  onPress: (item: AddressCascaderOption, index: number, level: number) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
};

const AddressOptionRow = React.memo(function AddressOptionRow({
  option,
  selected,
  disabled,
  primaryColor,
  onSurfaceColor,
  mutedColor,
  onPress,
  onLayout,
}: AddressOptionRowProps) {
  const handlePress = React.useCallback(() => {
    onPress(option.item, option.index, option.level);
  }, [onPress, option]);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || option.disabled}
      onLayout={onLayout}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.optionRow,
        {
          opacity: option.disabled ? 0.46 : pressed ? 0.78 : 1,
        },
      ]}
    >
      <View style={styles.optionMain}>
        <Text
          numberOfLines={2}
          style={[
            styles.optionText,
            {
              color: selected ? primaryColor : onSurfaceColor,
              fontWeight: selected ? '700' : '500',
            },
          ]}
        >
          {option.text}
        </Text>
      </View>
      <View style={styles.optionMark}>
        {selected ? (
          <Feather name="check" size={wp(19)} color={primaryColor} />
        ) : option.hasChildren ? (
          <Feather name="chevron-right" size={wp(18)} color={mutedColor} />
        ) : null}
      </View>
    </Pressable>
  );
});

export const AddressCascader = React.forwardRef<AddressCascaderHandle, AddressCascaderProps>(function AddressCascader({
  list,
  value: valueProp,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onDismissComplete,
  label: labelProp,
  defaultLabel,
  onLabelChange,
  title,
  separator = ' / ',
  levelLabels,
  lazyContent = true,
  drawerSize,
  disabled = false,
  onCancel,
  onConfirm,
  onChange,
  children,
}, ref) {
  const { t } = useI18n();
  const theme = useTheme();
  const { height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const safeBottom = getPickerActionBarBottomInset(insets.bottom);
  const areaData = React.useMemo(() => list ?? getAreaData(), [list]);

  const isValueControlled = valueProp !== undefined;
  const [innerValue, setInnerValue] = React.useState<AddressCascaderValue | undefined>(defaultValue);
  const value = valueProp !== undefined ? valueProp : innerValue;

  const [innerOpen, setInnerOpen] = React.useState(defaultOpen);
  const isOpenControlled = openProp !== undefined;
  const visible = openProp !== undefined ? !!openProp : innerOpen;
  const [contentMounted, setContentMounted] = React.useState(() => !lazyContent || visible);

  const [innerLabel, setInnerLabel] = React.useState(defaultLabel ?? '');
  const [draft, setDraft] = React.useState(() => createDraft(areaData, value));
  const draftRef = React.useRef(draft);
  draftRef.current = draft;

  const defaultLevelLabels = React.useMemo(
    () => [
      t('addressCascader.province'),
      t('addressCascader.city'),
      t('addressCascader.district'),
    ],
    [t]
  );
  const resolvedLevelLabels = React.useMemo(() => {
    const next = levelLabels?.length ? levelLabels : defaultLevelLabels;
    return Array.from({ length: MAX_LEVELS }, (_, i) => next[i] ?? defaultLevelLabels[i] ?? '');
  }, [defaultLevelLabels, levelLabels]);

  React.useEffect(() => {
    const nextDraft = createDraft(areaData, value);
    draftRef.current = nextDraft;
    setDraft(nextDraft);
  }, [areaData, value]);

  React.useEffect(() => {
    if (visible) {
      const nextDraft = createDraft(areaData, value);
      draftRef.current = nextDraft;
      setDraft(nextDraft);
      if (lazyContent) setContentMounted(true);
    }
    // 这里只希望在进入打开态时重置草稿和挂载懒加载内容。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const sheetHeight = React.useMemo(() => {
    const maxHeight = Math.max(wp(320), screenH - Math.max(insets.top, wp(24)));
    const n = typeof drawerSize === 'number' ? drawerSize : drawerSize == null ? undefined : Number.parseFloat(drawerSize);
    if (n != null && Number.isFinite(n) && n > 0) {
      return clampNumber(n, Math.min(wp(360), maxHeight), maxHeight);
    }
    return clampNumber(screenH * 0.72, Math.min(wp(430), maxHeight), maxHeight);
  }, [drawerSize, insets.top, screenH]);

  const detents = React.useMemo<Array<'auto' | number>>(
    () => [clampNumber(sheetHeight / screenH, 0.1, 0.92)],
    [screenH, sheetHeight]
  );

  const setCascaderOpen = React.useCallback((nextOpen: boolean) => {
    onOpenChange?.(nextOpen);
    if (!isOpenControlled) setInnerOpen(nextOpen);
  }, [isOpenControlled, onOpenChange]);

  const close = React.useCallback(() => {
    setCascaderOpen(false);
  }, [setCascaderOpen]);

  const openPicker = React.useCallback(() => {
    if (disabled) return;
    if (!visible) {
      setCascaderOpen(true);
    }
    const nextDraft = createDraft(areaData, value);
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    if (lazyContent) setContentMounted(true);
  }, [areaData, disabled, lazyContent, setCascaderOpen, value, visible]);

  React.useImperativeHandle(ref, () => ({
    open: openPicker,
    close,
  }), [close, openPicker]);

  const committed = React.useMemo(() => resolvePath(areaData, value), [areaData, value]);
  const committedLabel = React.useMemo(() => buildLabel(committed.labels, separator), [committed.labels, separator]);
  const effectiveLabel = labelProp !== undefined ? labelProp : committedLabel || innerLabel;
  const effectiveCtx = React.useMemo<AddressCascaderRenderContext>(
    () => ({
      value: committed.value,
      label: effectiveLabel,
      labels: committed.labels,
      items: committed.items,
    }),
    [committed.items, committed.labels, committed.value, effectiveLabel]
  );

  const currentList = React.useMemo(
    () => getListForLevel(areaData, draft.items, draft.activeLevel),
    [areaData, draft.activeLevel, draft.items]
  );
  const currentOptions = React.useMemo<AddressOption[]>(
    () =>
      currentList.map((item, index) => ({
        item,
        index,
        level: draft.activeLevel,
        value: pickValue(item, index),
        text: pickText(item),
        disabled: !!item.disabled,
        hasChildren: hasNextLevel(item, draft.activeLevel),
      })),
    [currentList, draft.activeLevel]
  );
  const activeSelectedValue = draft.value[draft.activeLevel];
  const activeSelectedIndex = React.useMemo(
    () => currentOptions.findIndex((item) => item.value === activeSelectedValue),
    [activeSelectedValue, currentOptions]
  );
  const currentOptionsRef = React.useRef(currentOptions);
  const activeSelectedIndexRef = React.useRef(activeSelectedIndex);
  currentOptionsRef.current = currentOptions;
  activeSelectedIndexRef.current = activeSelectedIndex;
  const confirmDisabled = disabled || !isCompleteDraft(draft);
  const stepsScrollRef = React.useRef<ScrollView>(null);
  const optionsScrollRef = React.useRef<ScrollView>(null);
  const optionLayoutYRef = React.useRef(new Map<string, number>());
  const optionsViewportHeightRef = React.useRef(0);
  const pendingOptionScrollFrameRef = React.useRef<number | null>(null);
  const pendingActiveOptionScrollRef = React.useRef(false);
  const listOpacity = React.useRef(new Animated.Value(1)).current;
  const pendingListTransitionFrameRef = React.useRef<number | null>(null);
  const previousActiveLevelRef = React.useRef(draft.activeLevel);

  const listAnimatedStyle = React.useMemo(
    () => ({
      opacity: listOpacity,
    }),
    [listOpacity]
  );

  React.useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      if (draft.activeLevel <= 0) {
        stepsScrollRef.current?.scrollTo({ x: 0, animated: true });
        return;
      }
      stepsScrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => cancelAnimationFrame(rafId);
  }, [draft.activeLevel]);

  const cancelListTransitionFrame = React.useCallback(() => {
    if (pendingListTransitionFrameRef.current == null) return;
    cancelAnimationFrame(pendingListTransitionFrameRef.current);
    pendingListTransitionFrameRef.current = null;
  }, []);

  const resetListTransition = React.useCallback(() => {
    cancelListTransitionFrame();
    listOpacity.stopAnimation();
    listOpacity.setValue(1);
  }, [cancelListTransitionFrame, listOpacity]);

  const startListTransition = React.useCallback(
    (fromLevel: number, toLevel: number) => {
      previousActiveLevelRef.current = toLevel;

      if (!visible || !contentMounted || fromLevel === toLevel) {
        resetListTransition();
        return;
      }

      cancelListTransitionFrame();
      listOpacity.stopAnimation();
      listOpacity.setValue(LIST_FADE_START_OPACITY);

      pendingListTransitionFrameRef.current = requestAnimationFrame(() => {
        pendingListTransitionFrameRef.current = null;
        Animated.timing(listOpacity, {
          toValue: 1,
          duration: LIST_FADE_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    },
    [
      cancelListTransitionFrame,
      contentMounted,
      listOpacity,
      resetListTransition,
      visible,
    ]
  );

  React.useEffect(() => {
    if (!visible || !contentMounted) {
      previousActiveLevelRef.current = draft.activeLevel;
      resetListTransition();
      return;
    }

    if (previousActiveLevelRef.current !== draft.activeLevel) {
      previousActiveLevelRef.current = draft.activeLevel;
      resetListTransition();
    }
  }, [contentMounted, draft.activeLevel, resetListTransition, visible]);

  React.useEffect(() => {
    return resetListTransition;
  }, [resetListTransition]);

  const keyExtractor = React.useCallback(
    (item: AddressOption) => `${item.level}-${item.value}-${item.index}`,
    []
  );

  const scrollActiveOptionIntoView = React.useCallback(
    (animated: boolean) => {
      const scrollView = optionsScrollRef.current;
      if (!scrollView) return;

      const activeIndex = activeSelectedIndexRef.current;
      if (activeIndex <= 0) {
        scrollView.scrollTo({ y: 0, animated });
        return;
      }

      const activeOption = currentOptionsRef.current[activeIndex];
      if (!activeOption) return;

      const key = keyExtractor(activeOption);
      const layoutY = optionLayoutYRef.current.get(key);
      const viewportHeight = optionsViewportHeightRef.current;
      const fallbackY = activeIndex * OPTION_ROW_ESTIMATED_HEIGHT;
      const measuredY = layoutY ?? fallbackY;
      const viewOffset = viewportHeight > 0 ? viewportHeight * SELECTED_OPTION_VIEW_POSITION : 0;

      scrollView.scrollTo({
        y: Math.max(0, measuredY - viewOffset),
        animated,
      });
    },
    [keyExtractor]
  );

  const scheduleActiveOptionScroll = React.useCallback(
    (animated = false) => {
      if (!visible || !contentMounted || !pendingActiveOptionScrollRef.current) return;

      if (pendingOptionScrollFrameRef.current != null) {
        cancelAnimationFrame(pendingOptionScrollFrameRef.current);
      }

      pendingOptionScrollFrameRef.current = requestAnimationFrame(() => {
        pendingOptionScrollFrameRef.current = null;
        if (!pendingActiveOptionScrollRef.current) return;
        pendingActiveOptionScrollRef.current = false;
        scrollActiveOptionIntoView(animated);
      });
    },
    [contentMounted, scrollActiveOptionIntoView, visible]
  );

  React.useEffect(() => {
    optionLayoutYRef.current.clear();
  }, [currentOptions]);

  React.useEffect(() => {
    if (!visible || !contentMounted) {
      pendingActiveOptionScrollRef.current = false;
      return;
    }

    pendingActiveOptionScrollRef.current = true;
    scheduleActiveOptionScroll(false);
    return () => {
      if (pendingOptionScrollFrameRef.current != null) {
        cancelAnimationFrame(pendingOptionScrollFrameRef.current);
        pendingOptionScrollFrameRef.current = null;
      }
    };
  }, [contentMounted, draft.activeLevel, scheduleActiveOptionScroll, visible]);

  const emitDraftChange = React.useCallback(
    (nextDraft: AddressDraft) => {
      const label = buildLabel(nextDraft.labels, separator);
      onChange?.({
        value: nextDraft.value,
        values: nextDraft.value,
        label,
        labels: nextDraft.labels,
        items: nextDraft.items,
      });
    },
    [onChange, separator]
  );

  const handleLevelPress = React.useCallback(
    (level: number) => {
      if (disabled) return;
      const prevDraft = draftRef.current;
      if (level !== 0 && !prevDraft.items[level - 1]) return;
      if (prevDraft.activeLevel === level) return;

      const nextDraft = { ...prevDraft, activeLevel: level };
      startListTransition(prevDraft.activeLevel, nextDraft.activeLevel);
      draftRef.current = nextDraft;
      setDraft(nextDraft);
    },
    [disabled, startListTransition]
  );

  const handleItemPress = React.useCallback(
    (item: AddressCascaderOption, index: number, level: number) => {
      if (disabled || item.disabled) return;
      const prevDraft = draftRef.current;
      if (level !== prevDraft.activeLevel) return;

      const nextItems = prevDraft.items.slice(0, level);
      const nextLabels = prevDraft.labels.slice(0, level);
      const nextValue = prevDraft.value.slice(0, level);

      nextItems[level] = item;
      nextLabels[level] = pickText(item);
      nextValue[level] = pickValue(item, index);

      const nextDraft: AddressDraft = {
        value: nextValue,
        labels: nextLabels,
        items: nextItems,
        activeLevel: hasNextLevel(item, level) ? level + 1 : level,
      };

      if (prevDraft.activeLevel !== nextDraft.activeLevel) {
        startListTransition(prevDraft.activeLevel, nextDraft.activeLevel);
      }
      draftRef.current = nextDraft;
      setDraft(nextDraft);
      emitDraftChange(nextDraft);
    },
    [disabled, emitDraftChange, startListTransition]
  );

  const handleCancel = React.useCallback(() => {
    onCancel?.();
    close();
  }, [close, onCancel]);

  const handleConfirm = React.useCallback(() => {
    if (confirmDisabled) return;
    const label = buildLabel(draft.labels, separator);
    const payload: AddressCascaderConfirmPayload = {
      value: draft.value,
      values: draft.value,
      label,
      labels: draft.labels,
      items: draft.items,
    };
    onLabelChange?.(label);
    if (labelProp === undefined) setInnerLabel(label);
    onValueChange?.(draft.value);
    if (!isValueControlled) setInnerValue(draft.value);
    onConfirm?.(payload);
    close();
  }, [
    close,
    confirmDisabled,
    draft.items,
    draft.labels,
    draft.value,
    isValueControlled,
    labelProp,
    onConfirm,
    onLabelChange,
    onValueChange,
    separator,
  ]);

  const handleSheetOpenChange = React.useCallback((nextOpen: boolean, meta: SheetOpenChangeDetails) => {
    if (!nextOpen && visible && meta.reason !== 'api') {
      onCancel?.();
    }
    setCascaderOpen(nextOpen);
  }, [onCancel, setCascaderOpen, visible]);

  const handleSheetDismissComplete = React.useCallback(() => {
    if (lazyContent) setContentMounted(false);
    onDismissComplete?.();
  }, [lazyContent, onDismissComplete]);

  const triggerNode = React.useMemo(
    () => (children != null ? composeTrigger(children, openPicker, disabled, effectiveCtx) : null),
    [children, disabled, effectiveCtx, openPicker]
  );

  const renderStep = React.useCallback(
    (level: number) => {
      const selected = draft.labels[level];
      const isActive = draft.activeLevel === level;
      const enabled = level === 0 || !!draft.items[level - 1];
      return (
        <React.Fragment key={`step-${level}`}>
          {level > 0 ? <Feather name="chevron-right" size={wp(14)} color={theme.colors.muted} /> : null}
          <Pressable
            accessibilityRole="button"
            disabled={!enabled || disabled}
            onPress={() => handleLevelPress(level)}
            style={({ pressed }) => [
              styles.stepPill,
              {
                backgroundColor: isActive ? theme.colors.secondary : theme.colors.surface,
                borderColor: isActive ? theme.colors.secondary : theme.colors.border,
                opacity: enabled ? (pressed ? 0.78 : 1) : 0.45,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.stepText,
                { color: isActive || selected ? theme.colors.onSurface : theme.colors.muted },
              ]}
            >
              {selected || resolvedLevelLabels[level]}
            </Text>
          </Pressable>
        </React.Fragment>
      );
    },
    [
      disabled,
      draft.activeLevel,
      draft.items,
      draft.labels,
      handleLevelPress,
      resolvedLevelLabels,
      theme.colors.border,
      theme.colors.muted,
      theme.colors.onSurface,
      theme.colors.secondary,
      theme.colors.surface,
    ]
  );

  const handleOptionLayout = React.useCallback(
    (key: string, event: LayoutChangeEvent) => {
      optionLayoutYRef.current.set(key, event.nativeEvent.layout.y);
      scheduleActiveOptionScroll(false);
    },
    [scheduleActiveOptionScroll]
  );

  const handleOptionsContentSizeChange = React.useCallback(() => {
    scheduleActiveOptionScroll(false);
  }, [scheduleActiveOptionScroll]);

  const handleOptionsViewportLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      optionsViewportHeightRef.current = event.nativeEvent.layout.height;
      scheduleActiveOptionScroll(false);
    },
    [scheduleActiveOptionScroll]
  );

  const renderOption = React.useCallback(
    (item: AddressOption) => {
      const key = keyExtractor(item);
      const selected = item.value === activeSelectedValue;
      return (
        <AddressOptionRow
          option={item}
          selected={selected}
          disabled={disabled}
          primaryColor={theme.colors.primary}
          onSurfaceColor={theme.colors.onSurface}
          mutedColor={theme.colors.muted}
          onPress={handleItemPress}
          onLayout={selected ? (event) => handleOptionLayout(key, event) : undefined}
        />
      );
    },
    [
      activeSelectedValue,
      disabled,
      handleOptionLayout,
      handleItemPress,
      keyExtractor,
      theme.colors.muted,
      theme.colors.onSurface,
      theme.colors.primary,
    ]
  );

  const renderSeparator = React.useCallback(
    () => <View style={[styles.separatorLine, { backgroundColor: theme.colors.border }]} />,
    [theme.colors.border]
  );

  const sheetNode = (
    <Sheet
      placement="bottom"
      open={visible}
      onOpenChange={handleSheetOpenChange}
      onCloseComplete={handleSheetDismissComplete}
      detents={detents}
      backgroundColor={theme.colors.surface}
      handle={false}
      draggable={false}
      dismissible={!disabled}
      nativeProps={{ insetAdjustment: 'never' }}
    >
      <View
        style={[
          styles.sheetInner,
          {
            backgroundColor: theme.colors.surface,
            height: sheetHeight,
            paddingBottom: safeBottom,
          },
        ]}
        pointerEvents={disabled ? 'none' : 'auto'}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {title ?? t('addressCascader.title')}
          </Text>
        </View>

        {contentMounted ? (
          <>
            <ScrollView
              ref={stepsScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.stepsContent}
              style={styles.stepsScroll}
            >
              {LEVELS.map(renderStep)}
            </ScrollView>

            <Animated.View style={[styles.listFrame, { borderColor: theme.colors.border }, listAnimatedStyle]}>
              {currentOptions.length > 0 ? (
                <ScrollView
                  ref={optionsScrollRef}
                  contentContainerStyle={styles.listContent}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  onContentSizeChange={handleOptionsContentSizeChange}
                  onLayout={handleOptionsViewportLayout}
                  showsVerticalScrollIndicator={false}
                  style={styles.optionsScroll}
                >
                  {currentOptions.map((option, index) => {
                    const key = keyExtractor(option);
                    return (
                      <React.Fragment key={key}>
                        {renderOption(option)}
                        {index < currentOptions.length - 1 ? renderSeparator() : null}
                      </React.Fragment>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: theme.colors.muted }]}>{t('addressCascader.empty')}</Text>
                </View>
              )}
            </Animated.View>
          </>
        ) : (
          <View style={styles.lazyPlaceholder} />
        )}

        <PickerActionBar
          cancelText={t('picker.cancel')}
          confirmText={t('picker.confirm')}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
          disabled={disabled}
          confirmDisabled={confirmDisabled}
          style={styles.footer}
        />
      </View>
    </Sheet>
  );

  return (
    <>
      {triggerNode}
      {sheetNode}
    </>
  );
});

const styles = StyleSheet.create({
  sheetInner: {
    paddingHorizontal: wp(16),
    paddingTop: wp(12),
    width: '100%',
  },
  header: {
    alignItems: 'center',
    height: wp(34),
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: sp(16),
    fontWeight: '600',
  },
  stepsScroll: {
    alignSelf: 'stretch',
    flexGrow: 0,
    marginTop: wp(10),
    maxHeight: wp(40),
    width: '100%',
  },
  stepsContent: {
    alignItems: 'center',
    flexGrow: 1,
    gap: wp(8),
    justifyContent: 'center',
    paddingHorizontal: wp(4),
  },
  stepPill: {
    alignItems: 'center',
    borderRadius: wp(8),
    borderWidth: wp(1),
    justifyContent: 'center',
    maxWidth: wp(178),
    minHeight: wp(34),
    minWidth: wp(76),
    paddingHorizontal: wp(11),
  },
  stepText: {
    fontSize: sp(14),
    fontWeight: '700',
  },
  listFrame: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flex: 1,
    marginTop: wp(12),
    overflow: 'hidden',
  },
  optionsScroll: {
    flex: 1,
  },
  listContent: {
    paddingBottom: wp(6),
  },
  optionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: wp(56),
    paddingHorizontal: wp(10),
    paddingVertical: wp(7),
  },
  optionMain: {
    flex: 1,
    minWidth: 0,
    paddingRight: wp(12),
  },
  optionText: {
    fontSize: sp(16),
    lineHeight: sp(22),
  },
  optionMark: {
    alignItems: 'center',
    justifyContent: 'center',
    width: wp(28),
  },
  separatorLine: {
    height: StyleSheet.hairlineWidth,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: wp(180),
  },
  emptyText: {
    fontSize: sp(14),
    fontWeight: '600',
  },
  lazyPlaceholder: {
    flex: 1,
  },
  footer: {
    paddingTop: wp(12),
  },
});
