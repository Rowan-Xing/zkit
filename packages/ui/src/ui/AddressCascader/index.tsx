import { Feather } from '@expo/vector-icons';
import * as React from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sp, wp } from 'y2kit-tools';
import { useI18n } from '../../i18n/useI18n';
import { useTheme } from '../../theme/useTheme';
import { BottomSheet, type BottomSheetRef } from '../BottomSheet';
import { Button } from '../Button';
import { Text } from '../Text';
import type { PickerTreeNode } from '../Picker';
import { areaList } from '@vant/area-data';

export type AddressCascaderHandle = {
  open: () => void;
  close: () => void;
};

// 懒加载转换省市区数据。
let cachedAreaData: PickerTreeNode[] | null = null;

function getAreaData(): PickerTreeNode[] {
  if (cachedAreaData) return cachedAreaData;

  const { province_list, city_list, county_list } = areaList;
  const provinces: PickerTreeNode[] = [];

  for (const [pCode, pName] of Object.entries(province_list)) {
    const cities: PickerTreeNode[] = [];
    const pPrefix = pCode.slice(0, 2);

    for (const [cCode, cName] of Object.entries(city_list)) {
      if (!cCode.startsWith(pPrefix)) continue;
      const counties: PickerTreeNode[] = [];
      const cPrefix = cCode.slice(0, 4);

      for (const [dCode, dName] of Object.entries(county_list)) {
        if (!dCode.startsWith(cPrefix)) continue;
        counties.push({ value: dCode, text: dName as string });
      }

      cities.push({ value: cCode, text: cName as string, children: counties });
    }

    provinces.push({ value: pCode, text: pName as string, children: cities });
  }

  cachedAreaData = provinces;
  return provinces;
}

export type AddressCascaderValue = string[];

export type AddressCascaderConfirmPayload = {
  value: AddressCascaderValue;
  values: string[];
  label: string;
  labels: string[];
  items: PickerTreeNode[];
};

export type AddressCascaderChangePayload = AddressCascaderConfirmPayload;

export type AddressCascaderRenderContext = {
  value: AddressCascaderValue;
  label: string;
  labels: string[];
  items: PickerTreeNode[];
};

export type AddressCascaderProps = {
  list?: PickerTreeNode[];

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
  items: PickerTreeNode[];
  activeLevel: number;
};

type Primitive = string | number;
type SheetNativePhase = 'idle' | 'presenting' | 'presented' | 'dismissing';

const MAX_LEVELS = 3;

function clampNumber(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function silentlyCatchPromise(value: unknown) {
  const maybePromise = value as { catch?: (onRejected: () => void) => unknown } | null | undefined;
  if (typeof maybePromise?.catch === 'function') {
    maybePromise.catch(() => {});
  }
}

function pickPrimitive(node: PickerTreeNode, keys: string[], fallback?: Primitive): Primitive | undefined {
  for (const key of keys) {
    const v = node?.[key];
    if (typeof v === 'string' || typeof v === 'number') return v;
  }
  return fallback;
}

function pickValue(node: PickerTreeNode, fallbackIndex?: number) {
  const fallback = fallbackIndex == null ? undefined : String(fallbackIndex);
  return String(pickPrimitive(node, ['value', 'id', 'code', 'key'], fallback) ?? '');
}

function pickText(node: PickerTreeNode) {
  const v = pickPrimitive(node, ['text', 'label', 'title', 'name']);
  return v == null ? '' : String(v);
}

function getChildren(node: PickerTreeNode | undefined) {
  return Array.isArray(node?.children) ? node.children : [];
}

function hasNextLevel(node: PickerTreeNode | undefined, level: number) {
  return level < MAX_LEVELS - 1 && getChildren(node).length > 0;
}

function buildLabel(labels: string[], separator: string) {
  return labels.filter(Boolean).join(separator);
}

function resolvePath(list: PickerTreeNode[], value: AddressCascaderValue | undefined): Omit<AddressDraft, 'activeLevel'> {
  const nextValue: string[] = [];
  const labels: string[] = [];
  const items: PickerTreeNode[] = [];
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

function getActiveLevelFromItems(items: PickerTreeNode[]) {
  if (!items.length) return 0;
  const lastIndex = Math.min(items.length - 1, MAX_LEVELS - 1);
  const lastItem = items[lastIndex];
  if (hasNextLevel(lastItem, lastIndex) && items.length < MAX_LEVELS) return items.length;
  return lastIndex;
}

function createDraft(list: PickerTreeNode[], value: AddressCascaderValue | undefined): AddressDraft {
  const resolved = resolvePath(list, value);
  return {
    ...resolved,
    activeLevel: getActiveLevelFromItems(resolved.items),
  };
}

function getListForLevel(list: PickerTreeNode[], items: PickerTreeNode[], level: number) {
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
  const safeBottom = Math.max(insets.bottom, wp(12));
  const areaData = React.useMemo(() => list ?? getAreaData(), [list]);

  const isValueControlled = valueProp !== undefined;
  const [innerValue, setInnerValue] = React.useState<AddressCascaderValue | undefined>(defaultValue);
  const value = valueProp !== undefined ? valueProp : innerValue;

  const [innerOpen, setInnerOpen] = React.useState(defaultOpen);
  const isOpenControlled = openProp !== undefined;
  const visible = openProp !== undefined ? !!openProp : innerOpen;
  const [sheetMounted, setSheetMounted] = React.useState(visible);
  const [contentMounted, setContentMounted] = React.useState(!lazyContent);
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const sheetPhaseRef = React.useRef<SheetNativePhase>('idle');
  const pendingDismissRef = React.useRef(false);
  const activeSheetLifecycleRef = React.useRef(!!visible);
  const visibleRef = React.useRef(!!visible);

  const [innerLabel, setInnerLabel] = React.useState(defaultLabel ?? '');
  const [draft, setDraft] = React.useState(() => createDraft(areaData, value));

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
    visibleRef.current = !!visible;
  }, [visible]);

  React.useEffect(() => {
    setDraft(createDraft(areaData, value));
  }, [areaData, value]);

  React.useEffect(() => {
    if (visible) {
      setDraft(createDraft(areaData, value));
      if (lazyContent && !contentMounted) setContentMounted(true);
    }
    // 这里只希望在进入打开态时重置草稿和懒加载内容。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

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

  const close = React.useCallback(() => {
    onOpenChange?.(false);
    if (!isOpenControlled) setInnerOpen(false);
    requestSheetDismiss();
  }, [isOpenControlled, onOpenChange, requestSheetDismiss]);

  const openPicker = React.useCallback(() => {
    if (disabled) return;
    if (!visible) {
      if (!isOpenControlled) setInnerOpen(true);
      onOpenChange?.(true);
    }
    setDraft(createDraft(areaData, value));
    if (lazyContent && !contentMounted) setContentMounted(true);
  }, [areaData, contentMounted, disabled, isOpenControlled, lazyContent, onOpenChange, value, visible]);

  React.useImperativeHandle(ref, () => ({
    open: openPicker,
    close,
  }), [close, openPicker]);

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
  const activeSelectedValue = draft.value[draft.activeLevel];
  const activeSelectedIndex = React.useMemo(
    () => currentList.findIndex((item, index) => pickValue(item, index) === activeSelectedValue),
    [activeSelectedValue, currentList]
  );
  const confirmDisabled = disabled || !isCompleteDraft(draft);
  const stepsScrollRef = React.useRef<ScrollView>(null);
  const listRef = React.useRef<FlatList<PickerTreeNode>>(null);
  const listOpacity = React.useRef(new Animated.Value(1)).current;
  const listTranslateX = React.useRef(new Animated.Value(0)).current;
  const previousActiveLevelRef = React.useRef(draft.activeLevel);

  const listAnimatedStyle = React.useMemo(
    () => ({
      opacity: listOpacity,
      transform: [{ translateX: listTranslateX }],
    }),
    [listOpacity, listTranslateX]
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

  React.useEffect(() => {
    if (!visible || !contentMounted) {
      previousActiveLevelRef.current = draft.activeLevel;
      listOpacity.setValue(1);
      listTranslateX.setValue(0);
      return;
    }

    const previous = previousActiveLevelRef.current;
    if (previous === draft.activeLevel) return;
    previousActiveLevelRef.current = draft.activeLevel;

    const direction = draft.activeLevel > previous ? 1 : -1;
    listOpacity.stopAnimation();
    listTranslateX.stopAnimation();
    listOpacity.setValue(0);
    listTranslateX.setValue(direction * wp(10));

    Animated.parallel([
      Animated.timing(listOpacity, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(listTranslateX, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentMounted, draft.activeLevel, listOpacity, listTranslateX, visible]);

  React.useEffect(() => {
    if (!visible || !contentMounted) return;

    const rafId = requestAnimationFrame(() => {
      if (activeSelectedIndex > 0) {
        listRef.current?.scrollToIndex({
          index: activeSelectedIndex,
          animated: false,
          viewPosition: 0.18,
        });
        return;
      }
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    });

    return () => cancelAnimationFrame(rafId);
  }, [activeSelectedIndex, contentMounted, draft.activeLevel, visible]);

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
      if (level === 0 || draft.items[level - 1]) {
        setDraft((prev) => ({ ...prev, activeLevel: level }));
      }
    },
    [disabled, draft.items]
  );

  const handleItemPress = React.useCallback(
    (item: PickerTreeNode, index: number) => {
      if (disabled || item.disabled) return;
      const nextItems = draft.items.slice(0, draft.activeLevel);
      const nextLabels = draft.labels.slice(0, draft.activeLevel);
      const nextValue = draft.value.slice(0, draft.activeLevel);

      nextItems[draft.activeLevel] = item;
      nextLabels[draft.activeLevel] = pickText(item);
      nextValue[draft.activeLevel] = pickValue(item, index);

      const nextDraft: AddressDraft = {
        value: nextValue,
        labels: nextLabels,
        items: nextItems,
        activeLevel: hasNextLevel(item, draft.activeLevel) ? draft.activeLevel + 1 : draft.activeLevel,
      };

      setDraft(nextDraft);
      emitDraftChange(nextDraft);
    },
    [disabled, draft.activeLevel, draft.items, draft.labels, draft.value, emitDraftChange]
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
    close();
  }, [close, disabled, onCancel, visible]);

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
                borderColor: isActive ? 'transparent' : theme.colors.border,
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
      theme.colors.primary,
      theme.colors.secondary,
      theme.colors.surface,
    ]
  );

  const renderItem = React.useCallback(
    ({ item, index }: ListRenderItemInfo<PickerTreeNode>) => {
      const itemValue = pickValue(item, index);
      const selected = itemValue === activeSelectedValue;
      const hasChildren = hasNextLevel(item, draft.activeLevel);
      return (
        <Pressable
          accessibilityRole="button"
          disabled={disabled || item.disabled}
          onPress={() => handleItemPress(item, index)}
          style={({ pressed }) => [
            styles.optionRow,
            {
              opacity: item.disabled ? 0.46 : pressed ? 0.78 : 1,
            },
          ]}
        >
          <View style={styles.optionMain}>
            <Text
              numberOfLines={2}
              style={[
                styles.optionText,
                {
                  color: selected ? theme.colors.primary : theme.colors.onSurface,
                  fontWeight: selected ? '700' : '500',
                },
              ]}
            >
              {pickText(item)}
            </Text>
          </View>
          <View style={styles.optionMark}>
            {selected ? (
              <Feather name="check" size={wp(19)} color={theme.colors.primary} />
            ) : hasChildren ? (
              <Feather name="chevron-right" size={wp(18)} color={theme.colors.muted} />
            ) : null}
          </View>
        </Pressable>
      );
    },
    [
      activeSelectedValue,
      disabled,
      draft.activeLevel,
      handleItemPress,
      theme.colors.muted,
      theme.colors.onSurface,
      theme.colors.primary,
    ]
  );

  const keyExtractor = React.useCallback((item: PickerTreeNode, index: number) => `${pickValue(item, index)}-${index}`, []);
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
              {Array.from({ length: MAX_LEVELS }, (_, level) => renderStep(level))}
            </ScrollView>

            <Animated.View style={[styles.listFrame, { borderColor: theme.colors.border }, listAnimatedStyle]}>
              {currentList.length > 0 ? (
                <FlatList
                  ref={listRef}
                  data={currentList}
                  extraData={`${draft.activeLevel}-${activeSelectedValue ?? ''}`}
                  keyExtractor={keyExtractor}
                  renderItem={renderItem}
                  keyboardShouldPersistTaps="handled"
                  initialNumToRender={18}
                  maxToRenderPerBatch={18}
                  removeClippedSubviews={Platform.OS === 'android'}
                  showsVerticalScrollIndicator={false}
                  windowSize={7}
                  ItemSeparatorComponent={() => (
                    <View style={[styles.separatorLine, { backgroundColor: theme.colors.border }]} />
                  )}
                  contentContainerStyle={styles.listContent}
                  onScrollToIndexFailed={(info) => {
                    listRef.current?.scrollToOffset({
                      offset: Math.max(0, info.averageItemLength * info.index),
                      animated: false,
                    });
                  }}
                />
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
              {t('picker.cancel')}
            </Button>
          </View>
          <View style={styles.footerBtnWrapper}>
            <Button
              onPress={handleConfirm}
              disabled={confirmDisabled}
              block
              minHeight={wp(44)}
              radius={wp(14)}
              fontSize={sp(16)}
            >
              {t('picker.confirm')}
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
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    maxWidth: wp(178),
    minHeight: wp(34),
    minWidth: wp(76),
    overflow: 'hidden',
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
    flexDirection: 'row',
    gap: wp(14),
    paddingTop: wp(12),
  },
  footerBtnWrapper: {
    flex: 1,
  },
});
