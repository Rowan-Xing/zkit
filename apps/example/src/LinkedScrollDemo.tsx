import * as React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { wp } from 'y2kit-tools';
import {
  LinkedScroll,
  Text,
  useTheme,
  type LinkedScrollSectionRenderContext,
} from 'y2kit-ui';

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
  const [selectedSection, setSelectedSection] = React.useState(linkedScrollItems[0].value);
  const selectedItem = React.useMemo(
    () => linkedScrollItems.find((item) => item.value === selectedSection) ?? linkedScrollItems[0],
    [selectedSection]
  );
  const selectedData = selectedItem.data ?? linkedFallbackData;

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
          accessibilityLabel="Back to playground"
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
            Selected: {selectedItem.label}
          </Text>
        </View>

        <View style={[styles.linkedSelectedBadge, { backgroundColor: theme.colors.secondary }]}>
          <Text style={[styles.linkedSelectedBadgeText, { color: theme.colors.primary }]}>
            {selectedData.kind}
          </Text>
        </View>
      </View>

      <View style={[styles.linkedDemoBody, { paddingBottom: insets.bottom }]}>
        <LinkedScroll
          items={linkedScrollItems}
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
          getMenuItemType={() => 'menu'}
          getSectionType={(item) => item.data?.kind ?? linkedFallbackData.kind}
          menuListProps={{
            drawDistance: wp(360),
            contentContainerStyle: styles.linkedMenuContent,
          }}
          contentListProps={{
            drawDistance: wp(900),
          }}
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
  const data = item.data ?? linkedFallbackData;

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
          <Text style={[styles.linkedSummary, { color: theme.colors.muted }]}>{data.summary}</Text>
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
        <LinkedMetricRow label="Render type" value={data.kind} />
        <LinkedMetricRow label="Section height" value={String(data.height)} />
        <LinkedMetricRow label="Source" value="FlashList" />
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
