import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  FadeInUp,
} from 'react-native-reanimated';
import { wp } from 'y2kit-tools';
import { Button, Text, useTheme } from 'y2kit-ui';
import { BRAND_ASSETS, BRAND_COLORS } from '../brand';
import { ExampleBlock, InfoChip, LinkTile } from '../components/DocPrimitives';
import { COMPONENT_PAGES } from '../content/pages';
import { CATEGORY_LABELS, COMPONENT_CATALOG, COMPONENT_ORDER } from '../data/catalog';
import type { ComponentId } from '../types';

export function ComponentScreen({
  id,
  onBack,
  onOpenComponent,
}: {
  id: ComponentId;
  onBack: () => void;
  onOpenComponent: (target: ComponentId) => void;
}) {
  const theme = useTheme();
  const catalog = COMPONENT_CATALOG.find((item) => item.id === id);
  const page = COMPONENT_PAGES[id];

  if (!catalog || !page) return null;

  const currentIndex = COMPONENT_ORDER.indexOf(id);
  const previous = currentIndex > 0 ? COMPONENT_CATALOG[currentIndex - 1] : null;
  const next = currentIndex < COMPONENT_ORDER.length - 1 ? COMPONENT_CATALOG[currentIndex + 1] : null;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <View style={styles.topBar}>
        <Button
          variant="ghost"
          tone="neutral"
          icon={<Feather name="arrow-left" size={16} color={theme.colors.onSurface} />}
          onPress={onBack}
        >
          返回目录
        </Button>
      </View>

      <View style={styles.heroWrap}>
        <View style={styles.heroSurface}>
          <View style={styles.heroHead}>
            <View style={styles.heroText}>
              <Text style={[styles.heroKicker, { color: theme.colors.muted }]}>
                {CATEGORY_LABELS[catalog.category]}
              </Text>
              <Text style={[styles.heroTitle, { color: theme.colors.onSurface }]}>{catalog.title}</Text>
              <Text style={[styles.heroSummary, { color: theme.colors.muted }]}>{page.intro}</Text>
            </View>
            <View style={styles.heroLogoWrap}>
              <Image source={BRAND_ASSETS.mark} style={styles.heroLogo} contentFit="contain" />
            </View>
          </View>

          <View style={styles.heroTagRow}>
            {catalog.tags.map((tag) => (
              <InfoChip key={tag} label={tag} tone="accent" />
            ))}
          </View>

          <View style={styles.heroMetrics}>
            <InfoChip label={`${catalog.exampleCount} 组示例`} />
            <InfoChip label="Expo 54" />
            <InfoChip label="单页文档结构" />
          </View>

          <View style={styles.highlightList}>
            {page.highlights.map((item) => (
              <View key={item} style={styles.highlightItem}>
                <Feather name="check-circle" size={16} color={theme.colors.primary} />
                <Text style={[styles.highlightText, { color: theme.colors.onSurface }]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.blocks}>
        {page.sections.map((section, index) => (
          <Animated.View key={section.title} entering={FadeInUp.delay(index * 40).duration(320)}>
            <ExampleBlock
              title={section.title}
              description={section.description}
              code={section.code}
            >
              <section.Demo />
            </ExampleBlock>
          </Animated.View>
        ))}
      </View>

      <View style={styles.footerBand}>
        <Text style={[styles.footerKicker, { color: theme.colors.muted }]}>Continue Browsing</Text>
        <Text style={[styles.footerTitle, { color: theme.colors.onSurface }]}>继续查看其它组件</Text>
        <View style={styles.linkGrid}>
          {previous ? (
            <LinkTile
              title={previous.title}
              label="上一页"
              icon={previous.icon}
              onPress={() => onOpenComponent(previous.id)}
            />
          ) : null}
          {next ? (
            <LinkTile
              title={next.title}
              label="下一页"
              icon={next.icon}
              onPress={() => onOpenComponent(next.id)}
            />
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: BRAND_COLORS.page,
    paddingBottom: 40,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  heroWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  heroSurface: {
    backgroundColor: '#FFFFFF',
    borderColor: BRAND_COLORS.line,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    shadowColor: '#0B1A33',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  heroHead: {
    gap: 16,
  },
  heroText: {
    gap: 8,
  },
  heroKicker: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  heroSummary: {
    fontSize: 15,
    lineHeight: 24,
  },
  heroLogoWrap: {
    alignItems: 'center',
    backgroundColor: '#EEF3FF',
    borderRadius: 8,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  heroLogo: {
    height: 42,
    width: 42,
  },
  heroTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
  },
  heroMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  highlightList: {
    gap: 10,
    marginTop: 18,
  },
  highlightItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  highlightText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  blocks: {
    gap: 18,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  footerBand: {
    borderTopColor: BRAND_COLORS.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  footerKicker: {
    fontSize: 12,
    fontWeight: '700',
  },
  footerTitle: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    marginTop: 4,
  },
  linkGrid: {
    gap: 14,
    marginTop: 18,
  },
});
