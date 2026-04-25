import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type {
  FlashListProps,
  FlashListRef,
  ListRenderItemInfo,
} from '@shopify/flash-list';
import { wp } from 'y2kit-tools';
import { useTheme } from '../../theme/useTheme';
import { Text } from '../Text';

export type LinkedScrollValue = string | number;

export type LinkedScrollItem<
  Value extends LinkedScrollValue = LinkedScrollValue,
  Data = unknown,
> = {
  value: Value;
  label: React.ReactNode;
  disabled?: boolean;
  data?: Data;
  accessibilityLabel?: string;
};

export type LinkedScrollChangeSource = 'menu' | 'content';

export type LinkedScrollChangeMeta<
  Value extends LinkedScrollValue = LinkedScrollValue,
  Data = unknown,
> = {
  source: LinkedScrollChangeSource;
  item: LinkedScrollItem<Value, Data>;
  index: number;
};

export type LinkedScrollMenuItemRenderContext<
  Value extends LinkedScrollValue = LinkedScrollValue,
  Data = unknown,
> = {
  item: LinkedScrollItem<Value, Data>;
  index: number;
  selected: boolean;
  disabled: boolean;
  press: () => void;
};

export type LinkedScrollSectionRenderContext<
  Value extends LinkedScrollValue = LinkedScrollValue,
  Data = unknown,
> = {
  item: LinkedScrollItem<Value, Data>;
  index: number;
  selected: boolean;
};

type ContentListReservedProps =
  | 'data'
  | 'extraData'
  | 'horizontal'
  | 'keyExtractor'
  | 'renderItem'
  | 'onViewableItemsChanged'
  | 'viewabilityConfig'
  | 'viewabilityConfigCallbackPairs';

type MenuListReservedProps =
  | 'data'
  | 'extraData'
  | 'horizontal'
  | 'keyExtractor'
  | 'renderItem';

export type LinkedScrollProps<
  Value extends LinkedScrollValue = LinkedScrollValue,
  Data = unknown,
> = {
  items: ReadonlyArray<LinkedScrollItem<Value, Data>>;
  renderSection: (context: LinkedScrollSectionRenderContext<Value, Data>) => React.ReactNode;

  value?: Value;
  defaultValue?: Value;
  onChange?: (
    value: Value,
    item: LinkedScrollItem<Value, Data>,
    meta: LinkedScrollChangeMeta<Value, Data>
  ) => void;

  disabled?: boolean;
  menuPosition?: 'left' | 'right';

  menuWidth?: number;
  menuItemHeight?: number;
  menuScrollViewPosition?: number;
  contentScrollViewPosition?: number;
  contentScrollViewOffset?: number;
  sectionGap?: number;
  contentPaddingHorizontal?: number;
  contentPaddingVertical?: number;
  activeViewAreaCoveragePercentThreshold?: number;
  programmaticScrollGuardDuration?: number;

  activeColor?: string;
  inactiveColor?: string;
  disabledColor?: string;
  activeBackgroundColor?: string;
  menuBackgroundColor?: string;
  contentBackgroundColor?: string;

  keyExtractor?: (item: LinkedScrollItem<Value, Data>, index: number) => string;
  renderMenuItem?: (context: LinkedScrollMenuItemRenderContext<Value, Data>) => React.ReactNode;
  getMenuItemType?: FlashListProps<LinkedScrollItem<Value, Data>>['getItemType'];
  getSectionType?: FlashListProps<LinkedScrollItem<Value, Data>>['getItemType'];
  viewabilityConfig?: FlashListProps<LinkedScrollItem<Value, Data>>['viewabilityConfig'];

  style?: StyleProp<ViewStyle>;
  menuStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  menuItemStyle?: StyleProp<ViewStyle>;
  activeMenuItemStyle?: StyleProp<ViewStyle>;
  disabledMenuItemStyle?: StyleProp<ViewStyle>;
  menuItemTextStyle?: StyleProp<TextStyle>;
  activeMenuItemTextStyle?: StyleProp<TextStyle>;
  disabledMenuItemTextStyle?: StyleProp<TextStyle>;
  sectionStyle?: StyleProp<ViewStyle>;
  activeSectionStyle?: StyleProp<ViewStyle>;

  menuListProps?: Omit<FlashListProps<LinkedScrollItem<Value, Data>>, MenuListReservedProps>;
  contentListProps?: Omit<FlashListProps<LinkedScrollItem<Value, Data>>, ContentListReservedProps>;
  testID?: string;
};

const DEFAULT_MENU_WIDTH = wp(96);
const DEFAULT_MENU_ITEM_HEIGHT = wp(52);
const DEFAULT_SECTION_GAP = wp(12);
const DEFAULT_CONTENT_PADDING_HORIZONTAL = wp(12);
const DEFAULT_CONTENT_PADDING_VERTICAL = wp(12);
const MIN_MENU_WIDTH = wp(64);
const MIN_TOUCH_TARGET = wp(44);
const ONE_PX = wp(1);
const DEFAULT_VIEW_AREA_THRESHOLD = 1;
const DEFAULT_PROGRAMMATIC_GUARD_DURATION = 2200;
const PROGRAMMATIC_SETTLE_DURATION = 120;
const DEFAULT_MINIMUM_VIEW_TIME = 32;
const DISABLED_OPACITY = 0.45;
const PRESSED_OPACITY = 0.72;
const DISABLED_MAINTAIN_VISIBLE_CONTENT_POSITION = { disabled: true };

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function resolveNonNegative(value: number | undefined, fallback: number) {
  if (value == null || !Number.isFinite(value)) return fallback;
  return Math.max(0, value);
}

function resolvePositive(value: number | undefined, fallback: number, min: number) {
  if (value == null || !Number.isFinite(value)) return fallback;
  return Math.max(min, value);
}

function findIndexByValue<Value extends LinkedScrollValue, Data>(
  items: ReadonlyArray<LinkedScrollItem<Value, Data>>,
  value: Value | undefined
) {
  if (value === undefined) return -1;
  return items.findIndex((item) => Object.is(item.value, value));
}

function findInitialIndex<Value extends LinkedScrollValue, Data>(
  items: ReadonlyArray<LinkedScrollItem<Value, Data>>
) {
  const enabledIndex = items.findIndex((item) => !item.disabled);
  if (enabledIndex >= 0) return enabledIndex;
  return items.length > 0 ? 0 : -1;
}

function renderDefaultMenuLabel(label: React.ReactNode, style: StyleProp<TextStyle>) {
  if (typeof label === 'string' || typeof label === 'number') {
    return (
      <Text numberOfLines={1} style={style}>
        {label}
      </Text>
    );
  }

  return <View style={styles.menuLabelNode}>{label}</View>;
}

export function LinkedScroll<
  Value extends LinkedScrollValue = LinkedScrollValue,
  Data = unknown,
>({
  items,
  renderSection,
  value: valueProp,
  defaultValue,
  onChange,
  disabled = false,
  menuPosition = 'left',
  menuWidth,
  menuItemHeight,
  menuScrollViewPosition = 0.5,
  contentScrollViewPosition = 0,
  contentScrollViewOffset,
  sectionGap,
  contentPaddingHorizontal,
  contentPaddingVertical,
  activeViewAreaCoveragePercentThreshold,
  programmaticScrollGuardDuration = DEFAULT_PROGRAMMATIC_GUARD_DURATION,
  activeColor,
  inactiveColor,
  disabledColor,
  activeBackgroundColor,
  menuBackgroundColor,
  contentBackgroundColor,
  keyExtractor,
  renderMenuItem,
  getMenuItemType,
  getSectionType,
  viewabilityConfig,
  style,
  menuStyle,
  contentStyle,
  menuItemStyle,
  activeMenuItemStyle,
  disabledMenuItemStyle,
  menuItemTextStyle,
  activeMenuItemTextStyle,
  disabledMenuItemTextStyle,
  sectionStyle,
  activeSectionStyle,
  menuListProps,
  contentListProps,
  testID,
}: LinkedScrollProps<Value, Data>) {
  const theme = useTheme();

  const isControlled = valueProp !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = React.useState<Value | undefined>(() => {
    if (defaultValue !== undefined) return defaultValue;
    const initialIndex = findInitialIndex(items);
    return initialIndex >= 0 ? items[initialIndex]?.value : undefined;
  });

  const currentValue = isControlled ? valueProp : uncontrolledValue;
  const rawActiveIndex = findIndexByValue(items, currentValue);
  const fallbackActiveIndex = findInitialIndex(items);
  const activeIndex = rawActiveIndex >= 0 ? rawActiveIndex : fallbackActiveIndex;
  const activeItem = activeIndex >= 0 ? items[activeIndex] : undefined;
  const activeValue = activeItem?.value;

  const resolvedMenuWidth = resolvePositive(menuWidth, DEFAULT_MENU_WIDTH, MIN_MENU_WIDTH);
  const resolvedMenuItemHeight = resolvePositive(
    menuItemHeight,
    DEFAULT_MENU_ITEM_HEIGHT,
    MIN_TOUCH_TARGET
  );
  const resolvedSectionGap = resolveNonNegative(sectionGap, DEFAULT_SECTION_GAP);
  const resolvedContentPaddingHorizontal = resolveNonNegative(
    contentPaddingHorizontal,
    DEFAULT_CONTENT_PADDING_HORIZONTAL
  );
  const resolvedContentPaddingVertical = resolveNonNegative(
    contentPaddingVertical,
    DEFAULT_CONTENT_PADDING_VERTICAL
  );
  const resolvedContentScrollViewOffset = resolveNonNegative(contentScrollViewOffset, 0);
  const resolvedMenuScrollViewPosition = clampNumber(menuScrollViewPosition, 0, 1);
  const resolvedContentScrollViewPosition = clampNumber(contentScrollViewPosition, 0, 1);
  const resolvedViewAreaThreshold = clampNumber(
    activeViewAreaCoveragePercentThreshold ?? DEFAULT_VIEW_AREA_THRESHOLD,
    0,
    100
  );
  const resolvedProgrammaticGuardDuration = Math.max(
    0,
    Number.isFinite(programmaticScrollGuardDuration) ? programmaticScrollGuardDuration : 0
  );
  const resolvedActiveColor = activeColor ?? theme.colors.primary;
  const resolvedInactiveColor = inactiveColor ?? theme.colors.muted;
  const resolvedDisabledColor = disabledColor ?? theme.colors.disabled;
  const resolvedActiveBackgroundColor = activeBackgroundColor ?? theme.colors.secondary;
  const resolvedMenuBackgroundColor = menuBackgroundColor ?? '#F7F8FA';
  const resolvedContentBackgroundColor = contentBackgroundColor ?? theme.colors.surface;

  const menuListRef = React.useRef<FlashListRef<LinkedScrollItem<Value, Data>>>(null);
  const contentListRef = React.useRef<FlashListRef<LinkedScrollItem<Value, Data>>>(null);
  const pendingProgrammaticValueRef = React.useRef<Value | null>(null);
  const programmaticTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmaticSettleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmaticScrollIdRef = React.useRef(0);
  const activeValueRef = React.useRef<Value | undefined>(activeValue);
  const disabledRef = React.useRef(disabled);
  const lastInternalCommitValueRef = React.useRef<Value | null>(null);
  const didInitialContentSyncRef = React.useRef(false);
  const didInitialMenuSyncRef = React.useRef(false);
  const itemsRef = React.useRef(items);

  itemsRef.current = items;
  activeValueRef.current = activeValue;
  disabledRef.current = disabled;

  const clearProgrammaticTimer = React.useCallback(() => {
    if (programmaticTimerRef.current == null) return;
    clearTimeout(programmaticTimerRef.current);
    programmaticTimerRef.current = null;
  }, []);

  const clearProgrammaticSettleTimer = React.useCallback(() => {
    if (programmaticSettleTimerRef.current == null) return;
    clearTimeout(programmaticSettleTimerRef.current);
    programmaticSettleTimerRef.current = null;
  }, []);

  const releaseProgrammaticSync = React.useCallback((scrollId?: number) => {
    if (scrollId != null && scrollId !== programmaticScrollIdRef.current) return;
    pendingProgrammaticValueRef.current = null;
    clearProgrammaticTimer();
    clearProgrammaticSettleTimer();
  }, [clearProgrammaticSettleTimer, clearProgrammaticTimer]);

  const releaseProgrammaticSyncRef = React.useRef(releaseProgrammaticSync);
  releaseProgrammaticSyncRef.current = releaseProgrammaticSync;

  const setProgrammaticTarget = React.useCallback(
    (nextValue: Value) => {
      const scrollId = programmaticScrollIdRef.current + 1;
      programmaticScrollIdRef.current = scrollId;
      pendingProgrammaticValueRef.current = nextValue;
      clearProgrammaticTimer();
      if (resolvedProgrammaticGuardDuration <= 0) return scrollId;
      programmaticTimerRef.current = setTimeout(() => {
        if (scrollId !== programmaticScrollIdRef.current) return;
        pendingProgrammaticValueRef.current = null;
        programmaticTimerRef.current = null;
      }, resolvedProgrammaticGuardDuration);

      return scrollId;
    },
    [clearProgrammaticTimer, resolvedProgrammaticGuardDuration]
  );

  const finishProgrammaticSync = React.useCallback(
    (scrollId: number | undefined) => {
      if (scrollId == null) return;
      clearProgrammaticSettleTimer();
      programmaticSettleTimerRef.current = setTimeout(() => {
        programmaticSettleTimerRef.current = null;
        releaseProgrammaticSyncRef.current(scrollId);
      }, PROGRAMMATIC_SETTLE_DURATION);
    },
    [clearProgrammaticSettleTimer]
  );

  React.useEffect(() => {
    return () => {
      clearProgrammaticTimer();
      clearProgrammaticSettleTimer();
    };
  }, [clearProgrammaticSettleTimer, clearProgrammaticTimer]);

  React.useEffect(() => {
    if (isControlled || rawActiveIndex >= 0 || activeItem == null) return;
    setUncontrolledValue(activeItem.value);
  }, [activeItem, isControlled, rawActiveIndex]);

  const commitValue = React.useCallback(
    (
      nextValue: Value,
      item: LinkedScrollItem<Value, Data>,
      index: number,
      source: LinkedScrollChangeSource
    ) => {
      if (Object.is(activeValueRef.current, nextValue)) return;

      lastInternalCommitValueRef.current = nextValue;
      if (!isControlled) {
        activeValueRef.current = nextValue;
        setUncontrolledValue(nextValue);
      }

      onChange?.(nextValue, item, { source, item, index });
    },
    [isControlled, onChange]
  );

  const commitValueRef = React.useRef(commitValue);
  commitValueRef.current = commitValue;

  const resolvedKeyExtractor = React.useCallback(
    (item: LinkedScrollItem<Value, Data>, index: number) => {
      return keyExtractor?.(item, index) ?? String(item.value);
    },
    [keyExtractor]
  );

  const scrollMenuToIndex = React.useCallback(
    (index: number, animated: boolean) => {
      if (index < 0) return Promise.resolve();
      return menuListRef.current?.scrollToIndex({
        index,
        animated,
        viewPosition: resolvedMenuScrollViewPosition,
      }) ?? Promise.resolve();
    },
    [resolvedMenuScrollViewPosition]
  );

  const scrollContentToIndex = React.useCallback(
    (index: number, animated: boolean) => {
      if (index < 0) return Promise.resolve();
      return contentListRef.current?.scrollToIndex({
        index,
        animated,
        viewPosition: resolvedContentScrollViewPosition,
        viewOffset: resolvedContentScrollViewOffset,
      }) ?? Promise.resolve();
    },
    [resolvedContentScrollViewOffset, resolvedContentScrollViewPosition]
  );

  React.useEffect(() => {
    if (activeIndex < 0) return;
    const animated = didInitialMenuSyncRef.current;
    didInitialMenuSyncRef.current = true;
    const frame = requestAnimationFrame(() => scrollMenuToIndex(activeIndex, animated));
    return () => cancelAnimationFrame(frame);
  }, [activeIndex, scrollMenuToIndex]);

  React.useEffect(() => {
    if (activeIndex < 0 || activeValue === undefined) return;

    if (!didInitialContentSyncRef.current) {
      didInitialContentSyncRef.current = true;
      if (activeIndex <= 0) return;
      const frame = requestAnimationFrame(() => scrollContentToIndex(activeIndex, false));
      return () => cancelAnimationFrame(frame);
    }

    if (!isControlled || valueProp === undefined || rawActiveIndex < 0) return;
    if (Object.is(lastInternalCommitValueRef.current, valueProp)) return;

    const scrollId = setProgrammaticTarget(valueProp);
    const frame = requestAnimationFrame(() => {
      void scrollContentToIndex(rawActiveIndex, true).then(() => finishProgrammaticSync(scrollId));
    });
    return () => cancelAnimationFrame(frame);
  }, [
    activeIndex,
    activeValue,
    isControlled,
    rawActiveIndex,
    finishProgrammaticSync,
    scrollContentToIndex,
    setProgrammaticTarget,
    valueProp,
  ]);

  const handleMenuPress = React.useCallback(
    (item: LinkedScrollItem<Value, Data>, index: number) => {
      if (disabled || item.disabled) return;
      const scrollId = setProgrammaticTarget(item.value);
      commitValue(item.value, item, index, 'menu');
      void scrollMenuToIndex(index, true);
      void scrollContentToIndex(index, true).then(() => finishProgrammaticSync(scrollId));
    },
    [
      commitValue,
      disabled,
      finishProgrammaticSync,
      scrollContentToIndex,
      scrollMenuToIndex,
      setProgrammaticTarget,
    ]
  );

  const viewabilityConfigRef = React.useRef<
    FlashListProps<LinkedScrollItem<Value, Data>>['viewabilityConfig']
  >(
    viewabilityConfig ?? {
      minimumViewTime: DEFAULT_MINIMUM_VIEW_TIME,
      viewAreaCoveragePercentThreshold: resolvedViewAreaThreshold,
    }
  );

  const handleViewableItemsChanged = React.useRef<
    NonNullable<FlashListProps<LinkedScrollItem<Value, Data>>['onViewableItemsChanged']>
  >(({ viewableItems }) => {
    if (disabledRef.current || viewableItems.length === 0) return;

    const candidates = viewableItems
      .filter((token) => token.isViewable && token.index != null)
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    const candidate = candidates[0];
    if (candidate?.item == null || candidate.index == null) return;

    if (pendingProgrammaticValueRef.current != null) return;

    commitValueRef.current(candidate.item.value, candidate.item, candidate.index, 'content');
  }).current;

  const {
    contentContainerStyle: menuContentContainerStyle,
    style: menuListStyle,
    onScrollBeginDrag: onMenuScrollBeginDrag,
    drawDistance: menuDrawDistance = wp(240),
    maintainVisibleContentPosition: menuMaintainVisibleContentPosition =
      DISABLED_MAINTAIN_VISIBLE_CONTENT_POSITION,
    scrollEnabled: menuScrollEnabled = true,
    showsVerticalScrollIndicator: menuShowsVerticalScrollIndicator = false,
    ...restMenuListProps
  } = menuListProps ?? {};

  const {
    contentContainerStyle: contentListContentContainerStyle,
    style: contentListStyle,
    onScrollBeginDrag: onContentScrollBeginDrag,
    onScrollEndDrag: onContentScrollEndDrag,
    onMomentumScrollEnd: onContentMomentumScrollEnd,
    drawDistance: contentDrawDistance = wp(640),
    maintainVisibleContentPosition: contentMaintainVisibleContentPosition =
      DISABLED_MAINTAIN_VISIBLE_CONTENT_POSITION,
    scrollEnabled: contentScrollEnabled = true,
    showsVerticalScrollIndicator: contentShowsVerticalScrollIndicator = false,
    ...restContentListProps
  } = contentListProps ?? {};

  const handleMenuScrollBeginDrag = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      releaseProgrammaticSync();
      onMenuScrollBeginDrag?.(event);
    },
    [onMenuScrollBeginDrag, releaseProgrammaticSync]
  );

  const handleContentScrollBeginDrag = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      releaseProgrammaticSync();
      onContentScrollBeginDrag?.(event);
    },
    [onContentScrollBeginDrag, releaseProgrammaticSync]
  );

  const handleContentScrollEndDrag = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      onContentScrollEndDrag?.(event);
    },
    [onContentScrollEndDrag]
  );

  const handleContentMomentumScrollEnd = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      onContentMomentumScrollEnd?.(event);
    },
    [onContentMomentumScrollEnd]
  );

  const renderMenuListItem = React.useCallback(
    ({ item, index }: ListRenderItemInfo<LinkedScrollItem<Value, Data>>) => {
      const selected = activeValue !== undefined && Object.is(item.value, activeValue);
      const itemDisabled = disabled || !!item.disabled;
      const press = () => handleMenuPress(item, index);

      if (renderMenuItem) {
        return (
          <>
            {renderMenuItem({
              item,
              index,
              selected,
              disabled: itemDisabled,
              press,
            })}
          </>
        );
      }

      return (
        <Pressable
          accessibilityLabel={item.accessibilityLabel}
          accessibilityRole="button"
          accessibilityState={{ selected, disabled: itemDisabled }}
          disabled={itemDisabled}
          onPress={press}
          style={({ pressed }) => [
            styles.menuItem,
            {
              height: resolvedMenuItemHeight,
              backgroundColor: selected ? resolvedActiveBackgroundColor : 'transparent',
              opacity: itemDisabled ? DISABLED_OPACITY : pressed ? PRESSED_OPACITY : 1,
            },
            menuItemStyle,
            selected ? activeMenuItemStyle : null,
            itemDisabled ? disabledMenuItemStyle : null,
          ]}
        >
          {renderDefaultMenuLabel(item.label, [
            styles.menuItemText,
            {
              color: itemDisabled
                ? resolvedDisabledColor
                : selected
                  ? resolvedActiveColor
                  : resolvedInactiveColor,
            },
            menuItemTextStyle,
            selected ? activeMenuItemTextStyle : null,
            itemDisabled ? disabledMenuItemTextStyle : null,
          ])}
        </Pressable>
      );
    },
    [
      activeMenuItemStyle,
      activeMenuItemTextStyle,
      activeValue,
      disabled,
      disabledMenuItemStyle,
      disabledMenuItemTextStyle,
      handleMenuPress,
      menuItemStyle,
      menuItemTextStyle,
      renderMenuItem,
      resolvedActiveBackgroundColor,
      resolvedActiveColor,
      resolvedDisabledColor,
      resolvedInactiveColor,
      resolvedMenuItemHeight,
    ]
  );

  const renderContentListItem = React.useCallback(
    ({ item, index }: ListRenderItemInfo<LinkedScrollItem<Value, Data>>) => {
      const selected = activeValue !== undefined && Object.is(item.value, activeValue);
      const isLast = index === itemsRef.current.length - 1;
      return (
        <View
          style={[
            styles.section,
            !isLast && resolvedSectionGap > 0 ? { marginBottom: resolvedSectionGap } : null,
            sectionStyle,
            selected ? activeSectionStyle : null,
          ]}
        >
          {renderSection({ item, index, selected })}
        </View>
      );
    },
    [activeSectionStyle, activeValue, renderSection, resolvedSectionGap, sectionStyle]
  );

  return (
    <View
      testID={testID}
      style={[
        styles.root,
        menuPosition === 'right' ? styles.rootReverse : null,
        { backgroundColor: resolvedContentBackgroundColor },
        style,
      ]}
    >
      <View
        style={[
          styles.menuFrame,
          {
            width: resolvedMenuWidth,
            backgroundColor: resolvedMenuBackgroundColor,
            borderColor: theme.colors.border,
            borderRightWidth: menuPosition === 'left' ? ONE_PX : 0,
            borderLeftWidth: menuPosition === 'right' ? ONE_PX : 0,
          },
          menuStyle,
        ]}
      >
        <FlashList
          {...restMenuListProps}
          ref={menuListRef}
          data={items}
          drawDistance={menuDrawDistance}
          extraData={activeValue}
          getItemType={getMenuItemType}
          keyExtractor={resolvedKeyExtractor}
          maintainVisibleContentPosition={menuMaintainVisibleContentPosition}
          onScrollBeginDrag={handleMenuScrollBeginDrag}
          renderItem={renderMenuListItem}
          scrollEnabled={!disabled && menuScrollEnabled}
          showsVerticalScrollIndicator={menuShowsVerticalScrollIndicator}
          style={[styles.list, menuListStyle]}
          contentContainerStyle={menuContentContainerStyle}
        />
      </View>

      <View style={[styles.contentFrame, contentStyle]}>
        <FlashList
          {...restContentListProps}
          ref={contentListRef}
          data={items}
          drawDistance={contentDrawDistance}
          extraData={activeValue}
          getItemType={getSectionType}
          keyExtractor={resolvedKeyExtractor}
          maintainVisibleContentPosition={contentMaintainVisibleContentPosition}
          onMomentumScrollEnd={handleContentMomentumScrollEnd}
          onScrollBeginDrag={handleContentScrollBeginDrag}
          onScrollEndDrag={handleContentScrollEndDrag}
          onViewableItemsChanged={handleViewableItemsChanged}
          renderItem={renderContentListItem}
          scrollEnabled={!disabled && contentScrollEnabled}
          showsVerticalScrollIndicator={contentShowsVerticalScrollIndicator}
          style={[styles.list, contentListStyle]}
          contentContainerStyle={[
            {
              paddingHorizontal: resolvedContentPaddingHorizontal,
              paddingVertical: resolvedContentPaddingVertical,
            },
            contentListContentContainerStyle,
          ]}
          viewabilityConfig={viewabilityConfigRef.current}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
  },
  rootReverse: {
    flexDirection: 'row-reverse',
  },
  menuFrame: {
    overflow: 'hidden',
  },
  contentFrame: {
    flex: 1,
    minWidth: 0,
  },
  list: {
    flex: 1,
  },
  menuItem: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(10),
  },
  menuItemText: {
    fontSize: wp(15),
    lineHeight: wp(20),
    fontWeight: '500',
    includeFontPadding: false,
  },
  menuLabelNode: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  section: {
    width: '100%',
  },
});
