import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  FadeInDown,
  LinearTransition,
} from 'react-native-reanimated';
import { wp } from 'y2kit-tools';
import { Text, TextInput, useTheme } from 'y2kit-ui';
import { BRAND_ASSETS, BRAND_COLORS } from '../brand';
import { CatalogCard, InfoChip } from '../components/DocPrimitives';
import { CATEGORY_LABELS, COMPONENT_CATALOG } from '../data/catalog';
import type { ComponentCategory, ComponentId } from '../types';

const FILTERS: Array<{ key: 'all' | ComponentCategory; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'foundation', label: '基础' },
  { key: 'input', label: '输入' },
  { key: 'selection', label: '选择' },
  { key: 'picker', label: '选择器' },
  { key: 'feedback', label: '反馈' },
];

export function HomeScreen({
  onOpenComponent,
}: {
  onOpenComponent: (id: ComponentId) => void;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [query, setQuery] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState<'all' | ComponentCategory>('all');

  const totalExamples = React.useMemo(
    () => COMPONENT_CATALOG.reduce((sum, item) => sum + item.exampleCount, 0),
    []
  );

  const filtered = React.useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return COMPONENT_CATALOG.filter((item) => {
      const matchesFilter = activeFilter === 'all' ? true : item.category === activeFilter;
      if (!matchesFilter) return false;
      if (!keyword) return true;

      const haystack = [
        item.title,
        item.summary,
        ...item.tags,
        CATEGORY_LABELS[item.category],
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [activeFilter, query]);

  const columns = width >= 1080 ? 3 : width >= 760 ? 2 : 1;
  const horizontalPadding = 20;
  const gap = 16;
  const cardWidth =
    width - horizontalPadding * 2 - gap * (columns - 1) <= 0
      ? width - horizontalPadding * 2
      : (width - horizontalPadding * 2 - gap * (columns - 1)) / columns;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <View style={styles.heroBand}>
        <View style={styles.topline}>
          <View style={styles.toplineLeft}>
            <View style={styles.markWrap}>
              <Image source={BRAND_ASSETS.mark} style={styles.mark} contentFit="contain" />
            </View>
            <View style={styles.toplineText}>
              <Text style={[styles.eyebrow, { color: theme.colors.muted }]}>Y2Kit Example</Text>
              <Text style={[styles.toplineTitle, { color: theme.colors.onSurface }]}>组件目录</Text>
            </View>
          </View>
          <InfoChip label="Expo 54" tone="accent" />
        </View>

        <View style={styles.bannerShell}>
          <Image source={BRAND_ASSETS.banner} style={styles.banner} contentFit="contain" />
        </View>

        <Text style={[styles.heroTitle, { color: theme.colors.onSurface }]}>
          把组件库做成可浏览、可点击、可直接照着接入的示例目录。
        </Text>
        <Text style={[styles.heroSubtitle, { color: theme.colors.muted }]}>
          每个组件单独成页，页面内同时展示实时交互、受控写法和最常见的组合方式。
        </Text>

        <View style={styles.metricsRow}>
          <InfoChip label={`${COMPONENT_CATALOG.length} 个组件页`} tone="accent" />
          <InfoChip label={`${totalExamples} 组 live demo`} />
          <InfoChip label="Expo 54 / RN 0.81" />
        </View>

        <View style={[styles.searchShell, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <Feather name="search" size={18} color={theme.colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="搜索组件、标签或能力"
            placeholderTextColor={theme.colors.muted}
            style={[styles.searchInput, { color: theme.colors.onSurface }]}
          />
        </View>
      </View>

      <View style={styles.sectionBand}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionCopy}>
            <Text style={[styles.sectionKicker, { color: theme.colors.muted }]}>Component Atlas</Text>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>按场景筛选</Text>
          </View>
          <Text style={[styles.resultCount, { color: theme.colors.muted }]}>{filtered.length} 个结果</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((filter) => {
            const active = filter.key === activeFilter;
            return (
              <Animated.View key={filter.key} layout={LinearTransition.springify().damping(20)}>
                <View
                  style={[
                    styles.filterChip,
                    active
                      ? { backgroundColor: BRAND_COLORS.navy }
                      : { backgroundColor: '#EEF2F8' },
                  ]}
                >
                  <Text
                    onPress={() => setActiveFilter(filter.key)}
                    style={[
                      styles.filterText,
                      { color: active ? '#FFFFFF' : theme.colors.muted },
                    ]}
                  >
                    {filter.label}
                  </Text>
                </View>
              </Animated.View>
            );
          })}
        </ScrollView>

        <Animated.View
          layout={LinearTransition.springify().damping(22)}
          style={[styles.grid, { gap }]}
        >
          {filtered.map((entry, index) => (
            <Animated.View
              key={entry.id}
              entering={FadeInDown.delay(index * 26).duration(360)}
            >
              <CatalogCard
                entry={entry}
                width={cardWidth}
                onPress={() => onOpenComponent(entry.id)}
              />
            </Animated.View>
          ))}
        </Animated.View>

        {filtered.length === 0 ? (
          <View style={[styles.emptyState, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>没有匹配结果</Text>
            <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
              试试换个关键词，或者把筛选切回“全部”。
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: BRAND_COLORS.page,
    paddingBottom: 40,
  },
  heroBand: {
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  topline: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toplineLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  markWrap: {
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.softBlue,
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  mark: {
    height: 28,
    width: 28,
  },
  toplineText: {
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
  },
  toplineTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  bannerShell: {
    marginTop: 22,
  },
  banner: {
    aspectRatio: 2172 / 724,
    width: '100%',
  },
  heroTitle: {
    fontSize: 31,
    fontWeight: '800',
    lineHeight: 38,
    marginTop: 18,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 24,
    marginTop: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
  },
  searchShell: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    minHeight: 44,
    paddingVertical: 10,
  },
  sectionBand: {
    borderTopColor: BRAND_COLORS.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHead: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionCopy: {
    gap: 4,
  },
  sectionKicker: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  resultCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterRow: {
    gap: 10,
    paddingBottom: 8,
    paddingTop: 16,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 26,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
});
