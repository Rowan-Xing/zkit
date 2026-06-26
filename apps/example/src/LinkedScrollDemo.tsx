import * as React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { wp } from 'zkit-tools';
import {
  LinkedScroll,
  Text,
  useI18n,
  useTheme,
  type LinkedScrollSectionRenderContext,
} from 'zkit-ui';

import {
  linkedFallbackData,
  linkedScrollItems,
  type LinkedDemoData,
  type LinkedScrollItem,
} from './data';
import { renderIcon } from './demoUtils';
import { styles } from './styles';
import { exampleBackgroundColor } from './theme';

export function LinkedScrollDemo({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t } = useI18n();
  const items = React.useMemo(
    () =>
      linkedScrollItems.map((item, index) => {
        const order = index + 1;
        const kind = item.data?.kind ?? linkedFallbackData.kind;
        const summary =
          kind === 'overview'
            ? t('example.linked.summary.overview')
            : kind === 'media'
              ? t('example.linked.summary.media')
              : t('example.linked.summary.metrics');

        return {
          ...item,
          label: t('example.linked.section', { n: order }),
          data: {
            ...(item.data ?? linkedFallbackData),
            summary,
            chips: [
              t('example.linked.batch', { n: Math.ceil(order / 4) }),
              t(`example.linked.kind.${kind}`),
              t('example.linked.items', { n: 24 + index * 3 }),
            ],
          },
        };
      }),
    [t]
  );
  const [selectedSection, setSelectedSection] = React.useState(items[0].value);
  const selectedItem = React.useMemo(
    () => items.find((item) => item.value === selectedSection) ?? items[0],
    [items, selectedSection]
  );
  const selectedData = selectedItem.data ?? linkedFallbackData;
  const menuContentContainerStyle = React.useMemo(
    () => [styles.linkedMenuContent, { paddingBottom: insets.bottom + wp(8) }],
    [insets.bottom]
  );
  const contentListContentContainerStyle = React.useMemo(
    () => ({ paddingBottom: insets.bottom + wp(12) }),
    [insets.bottom]
  );
  const menuListProps = React.useMemo(
    () => ({
      drawDistance: wp(360),
      contentContainerStyle: menuContentContainerStyle,
    }),
    [menuContentContainerStyle]
  );
  const contentListProps = React.useMemo(
    () => ({
      drawDistance: wp(900),
      contentContainerStyle: contentListContentContainerStyle,
    }),
    [contentListContentContainerStyle]
  );
  const getMenuItemType = React.useCallback(() => 'menu', []);
  const getSectionType = React.useCallback(
    (item: LinkedScrollItem) => item.data?.kind ?? linkedFallbackData.kind,
    []
  );

  const renderSection = React.useCallback(
    ({ item, index, selected }: LinkedScrollSectionRenderContext<string, LinkedDemoData>) => (
      <LinkedSectionCard item={item} index={index} selected={selected} />
    ),
    []
  );

  return (
    <View style={[styles.screen, { backgroundColor: exampleBackgroundColor }]}>
      <View
        style={[
          styles.linkedDemoHeader,
          {
            backgroundColor: exampleBackgroundColor,
            borderBottomColor: theme.colors.border,
            paddingTop: insets.top + wp(10),
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('example.linked.backA11y')}
          onPress={onBack}
          style={({ pressed }) => [
            styles.linkedBackButton,
            {
              backgroundColor: theme.colors.surface,
              opacity: pressed ? 0.72 : 1,
            },
          ]}
        >
          {renderIcon('arrow-left', theme.colors.onSurface, wp(20))}
        </Pressable>

        <View style={styles.linkedDemoTitleWrap}>
          <Text style={[styles.linkedDemoTitle, { color: theme.colors.onSurface }]}>LinkedScroll</Text>
          <Text numberOfLines={1} style={[styles.linkedDemoSubtitle, { color: theme.colors.muted }]}>
            {t('example.linked.selected', { label: selectedItem.label })}
          </Text>
        </View>

        <View style={[styles.linkedSelectedBadge, { backgroundColor: theme.colors.secondary }]}>
          <Text style={[styles.linkedSelectedBadgeText, { color: theme.colors.primary }]}>
            {t(`example.linked.kind.${selectedData.kind}`)}
          </Text>
        </View>
      </View>

      <View style={styles.linkedDemoBody}>
        <LinkedScroll
          items={items}
          value={selectedSection}
          onChange={setSelectedSection}
          menuWidth={wp(108)}
          menuItemHeight={wp(54)}
          sectionGap={wp(12)}
          contentPaddingHorizontal={wp(12)}
          contentPaddingVertical={wp(12)}
          activeBackgroundColor="#DCEBFF"
          activeColor={theme.colors.primary}
          inactiveColor={theme.colors.muted}
          menuBackgroundColor="#F0F3F8"
          contentBackgroundColor={exampleBackgroundColor}
          getMenuItemType={getMenuItemType}
          getSectionType={getSectionType}
          menuListProps={menuListProps}
          contentListProps={contentListProps}
          renderSection={renderSection}
        />
      </View>
    </View>
  );
}

const LinkedSectionCard = React.memo(function LinkedSectionCard({
  item,
  index,
  selected,
}: {
  item: LinkedScrollItem;
  index: number;
  selected: boolean;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const data = item.data ?? linkedFallbackData;
  const summary = item.data ? data.summary : t('example.linked.summary.fallback');

  return (
    <View
      style={[
        styles.linkedSectionCard,
        {
          minHeight: wp(data.height),
          backgroundColor: selected ? data.accent : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
        },
      ]}
    >
      <View style={styles.linkedSectionHeader}>
        <Text style={[styles.linkedSectionNumber, { color: theme.colors.primary }]}>
          {String(index + 1).padStart(2, '0')}
        </Text>
        <View style={styles.linkedSectionTitleWrap}>
          <Text style={[styles.linkedSectionTitle, { color: theme.colors.onSurface }]}>{item.label}</Text>
          <Text style={[styles.linkedSummary, { color: theme.colors.muted }]}>{summary}</Text>
        </View>
      </View>

      <View style={styles.linkedChipRow}>
        {data.chips.map((chip) => (
          <View key={chip} style={[styles.linkedChip, { borderColor: theme.colors.border }]}>
            <Text style={[styles.linkedChipText, { color: theme.colors.onSurface }]}>{chip}</Text>
          </View>
        ))}
      </View>

      <View style={styles.linkedMetricStack}>
        <LinkedMetricRow label={t('example.linked.renderType')} value={t(`example.linked.kind.${data.kind}`)} />
        <LinkedMetricRow label={t('example.linked.sectionHeight')} value={String(data.height)} />
        <LinkedMetricRow label={t('example.linked.source')} value="FlashList" />
      </View>
    </View>
  );
});

const LinkedMetricRow = React.memo(function LinkedMetricRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={styles.linkedMetricRow}>
      <Text style={[styles.linkedMetricLabel, { color: theme.colors.muted }]}>{label}</Text>
      <Text style={[styles.linkedMetricValue, { color: theme.colors.onSurface }]}>{value}</Text>
    </View>
  );
});
