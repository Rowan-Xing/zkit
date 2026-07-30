import * as React from 'react';
import { FlashList, type FlashListRef, type ListRenderItemInfo } from '@shopify/flash-list';
import {
  StyleSheet,
  Text,
  View,
  type ColorValue,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { getMaxFontSizeMultiplier, sp, wp } from 'zkit-tools';
import type { WheelColumnOption } from './index';

export type AndroidVirtualizedWheelHandle = {
  scrollToIndex: (index: number, animated?: boolean) => void;
  settleToNearest: (animated?: boolean) => number;
};

type AndroidVirtualizedWheelProps = {
  options: WheelColumnOption[];
  selectedIndex: number;
  canInteract: boolean;
  itemHeight: number;
  visibleItems: number;
  itemTextColor: ColorValue;
  selectedTextColor: ColorValue;
  disabledTextColor: ColorValue;
  itemTextStyle?: StyleProp<TextStyle>;
  selectedItemTextStyle?: StyleProp<TextStyle>;
  disabledItemTextStyle?: StyleProp<TextStyle>;
  numberOfLines: number;
  resolveSelectableIndex: (index: number, direction?: number) => number;
  onSelectIndex: (index: number) => void;
};

const DISABLED_MAINTAIN_VISIBLE_CONTENT_POSITION = { disabled: true } as const;

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function optionKey(option: WheelColumnOption, index: number) {
  return `${String(option.key ?? option.value ?? index)}-${index}`;
}

export const AndroidVirtualizedWheel = React.forwardRef<AndroidVirtualizedWheelHandle, AndroidVirtualizedWheelProps>(
  function AndroidVirtualizedWheel(
    {
      options,
      selectedIndex,
      canInteract,
      itemHeight,
      visibleItems,
      itemTextColor,
      selectedTextColor,
      disabledTextColor,
      itemTextStyle,
      selectedItemTextStyle,
      disabledItemTextStyle,
      numberOfLines,
      resolveSelectableIndex,
      onSelectIndex,
    },
    ref
  ) {
    const listRef = React.useRef<FlashListRef<WheelColumnOption>>(null);
    const offsetRef = React.useRef(selectedIndex * itemHeight);
    const selectedIndexRef = React.useRef(selectedIndex);
    const userScrollingRef = React.useRef(false);
    const momentumScrollingRef = React.useRef(false);
    const settleFrameRef = React.useRef<number | null>(null);
    const maxIndex = Math.max(0, options.length - 1);
    const maxOffset = maxIndex * itemHeight;
    const centerOffset = itemHeight * Math.floor(visibleItems / 2);

    selectedIndexRef.current = selectedIndex;

    const cancelPendingSettle = React.useCallback(() => {
      if (settleFrameRef.current == null) return;
      cancelAnimationFrame(settleFrameRef.current);
      settleFrameRef.current = null;
    }, []);

    const scrollToIndex = React.useCallback(
      (index: number, animated = false) => {
        const nextIndex = clampNumber(Math.round(index), 0, maxIndex);
        const nextOffset = nextIndex * itemHeight;
        cancelPendingSettle();
        offsetRef.current = nextOffset;
        listRef.current?.scrollToOffset({
          offset: nextOffset,
          animated,
          skipFirstItemOffset: true,
        });
      },
      [cancelPendingSettle, itemHeight, maxIndex]
    );

    const settleToNearest = React.useCallback(
      (animated = false) => {
        const rawIndex = Math.round(clampNumber(offsetRef.current, 0, maxOffset) / itemHeight);
        const nextIndex = resolveSelectableIndex(rawIndex, rawIndex - selectedIndexRef.current);
        scrollToIndex(nextIndex, animated);
        return nextIndex;
      },
      [itemHeight, maxOffset, resolveSelectableIndex, scrollToIndex]
    );

    React.useImperativeHandle(ref, () => ({ scrollToIndex, settleToNearest }), [scrollToIndex, settleToNearest]);

    React.useEffect(() => {
      scrollToIndex(selectedIndex, false);
    }, [options.length, scrollToIndex, selectedIndex]);

    React.useEffect(() => cancelPendingSettle, [cancelPendingSettle]);

    const finishUserScroll = React.useCallback(
      (offset: number) => {
        if (!userScrollingRef.current) return;

        userScrollingRef.current = false;
        momentumScrollingRef.current = false;
        offsetRef.current = clampNumber(offset, 0, maxOffset);
        const rawIndex = Math.round(offsetRef.current / itemHeight);
        const nextIndex = resolveSelectableIndex(rawIndex, rawIndex - selectedIndexRef.current);
        scrollToIndex(nextIndex, nextIndex !== rawIndex);
        onSelectIndex(nextIndex);
      },
      [itemHeight, maxOffset, onSelectIndex, resolveSelectableIndex, scrollToIndex]
    );

    const handleScroll = React.useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        offsetRef.current = clampNumber(event.nativeEvent.contentOffset.y, 0, maxOffset);
      },
      [maxOffset]
    );

    const handleScrollBeginDrag = React.useCallback(() => {
      cancelPendingSettle();
      userScrollingRef.current = true;
      momentumScrollingRef.current = false;
    }, [cancelPendingSettle]);

    const handleScrollEndDrag = React.useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offset = event.nativeEvent.contentOffset.y;
        offsetRef.current = clampNumber(offset, 0, maxOffset);
        cancelPendingSettle();
        settleFrameRef.current = requestAnimationFrame(() => {
          settleFrameRef.current = null;
          if (!momentumScrollingRef.current) {
            finishUserScroll(offsetRef.current);
          }
        });
      },
      [cancelPendingSettle, finishUserScroll, maxOffset]
    );

    const handleMomentumScrollBegin = React.useCallback(() => {
      momentumScrollingRef.current = true;
      cancelPendingSettle();
    }, [cancelPendingSettle]);

    const handleMomentumScrollEnd = React.useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        finishUserScroll(event.nativeEvent.contentOffset.y);
      },
      [finishUserScroll]
    );

    const contentContainerStyle = React.useMemo(() => ({ paddingVertical: centerOffset }), [centerOffset]);
    const renderItem = React.useCallback(
      ({ item, index }: ListRenderItemInfo<WheelColumnOption>) => (
        <View style={[styles.itemContainer, { height: itemHeight }]}>
          <Text
            accessibilityLabel={item.accessibilityLabel ?? item.label}
            maxFontSizeMultiplier={getMaxFontSizeMultiplier()}
            numberOfLines={numberOfLines}
            style={[
              styles.itemText,
              { color: itemTextColor },
              itemTextStyle,
              index === selectedIndex && [styles.itemTextSelected, { color: selectedTextColor }, selectedItemTextStyle],
              item.disabled && [styles.itemTextDisabled, { color: disabledTextColor }, disabledItemTextStyle],
            ]}
            testID={item.testID}
          >
            {item.label}
          </Text>
        </View>
      ),
      [
        disabledItemTextStyle,
        disabledTextColor,
        itemHeight,
        itemTextColor,
        itemTextStyle,
        numberOfLines,
        selectedIndex,
        selectedItemTextStyle,
        selectedTextColor,
      ]
    );
    const handleLoad = React.useCallback(() => {
      scrollToIndex(selectedIndex, false);
    }, [scrollToIndex, selectedIndex]);

    return (
      <FlashList
        ref={listRef}
        data={options}
        contentContainerStyle={contentContainerStyle}
        decelerationRate="fast"
        drawDistance={itemHeight * (visibleItems + 2)}
        extraData={selectedIndex}
        keyExtractor={optionKey}
        keyboardShouldPersistTaps="handled"
        maintainVisibleContentPosition={DISABLED_MAINTAIN_VISIBLE_CONTENT_POSITION}
        nestedScrollEnabled
        onMomentumScrollBegin={handleMomentumScrollBegin}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onLoad={handleLoad}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        overScrollMode="never"
        renderItem={renderItem}
        scrollEnabled={canInteract}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={itemHeight}
        style={styles.list}
      />
    );
  }
);

const styles = StyleSheet.create({
  list: {
    flex: 1,
    width: '100%',
  },
  itemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(8),
  },
  itemText: {
    fontSize: sp(18),
    fontWeight: '500',
    textAlign: 'center',
  },
  itemTextSelected: {
    opacity: 1,
  },
  itemTextDisabled: {
    opacity: 0.62,
  },
});
