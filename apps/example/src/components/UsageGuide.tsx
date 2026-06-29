import * as React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Text, useI18n, useTheme } from 'zkit-ui';
import { wp } from 'zkit-tools';

export type UsageGuideBlock = {
  title: string;
  items: string[];
};

export type UsageGuideProps = {
  title: string;
  description: string;
  blocks: UsageGuideBlock[];
  api: string[];
  snippet?: string;
};

export const UsageGuide = React.memo(function UsageGuide({
  title,
  description,
  blocks,
  api,
  snippet,
}: UsageGuideProps) {
  const theme = useTheme();
  const { locale } = useI18n();
  const normalizedLocale = locale.toLowerCase();
  const guideLabel = normalizedLocale.startsWith('zh')
    ? '指南'
    : normalizedLocale.startsWith('ja')
      ? 'ガイド'
      : normalizedLocale.startsWith('de')
        ? 'Anleitung'
        : 'Guide';

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>{guideLabel}</Text>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>
        <Text style={[styles.description, { color: theme.colors.muted }]}>{description}</Text>
      </View>

      <View style={styles.blockGrid}>
        {blocks.map((block, blockIndex) => (
          <View key={`${block.title}-${blockIndex}`} style={styles.block}>
            <Text style={[styles.blockTitle, { color: theme.colors.onSurface }]}>{block.title}</Text>
            <View style={styles.pointStack}>
              {block.items.map((item, itemIndex) => (
                <View key={`${item}-${itemIndex}`} style={styles.pointRow}>
                  <View style={[styles.pointDot, { backgroundColor: theme.colors.primary }]} />
                  <Text style={[styles.pointText, { color: theme.colors.muted }]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.apiWrap}>
        {api.map((item, itemIndex) => (
          <View key={`${item}-${itemIndex}`} style={[styles.apiChip, { backgroundColor: theme.colors.secondary }]}>
            <Text style={[styles.apiText, { color: theme.colors.onSecondary }]}>{item}</Text>
          </View>
        ))}
      </View>

      {snippet ? (
        <View style={[styles.codeBlock, { backgroundColor: '#0F172A' }]}>
          <Text style={styles.codeText}>{snippet}</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    gap: wp(16),
    paddingBottom: wp(4),
    paddingTop: wp(8),
  },
  header: {
    gap: wp(6),
  },
  eyebrow: {
    fontSize: wp(11),
    fontWeight: '900',
    letterSpacing: wp(0.5),
    lineHeight: wp(15),
    textTransform: 'uppercase',
  },
  title: {
    fontSize: wp(24),
    fontWeight: '900',
    lineHeight: wp(31),
  },
  description: {
    fontSize: wp(14),
    fontWeight: '500',
    lineHeight: wp(22),
  },
  blockGrid: {
    gap: wp(14),
  },
  block: {
    gap: wp(8),
  },
  blockTitle: {
    fontSize: wp(15),
    fontWeight: '900',
    lineHeight: wp(20),
  },
  pointStack: {
    gap: wp(7),
  },
  pointRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: wp(9),
  },
  pointDot: {
    borderRadius: wp(999),
    height: wp(6),
    marginTop: wp(7),
    width: wp(6),
  },
  pointText: {
    flex: 1,
    fontSize: wp(13),
    fontWeight: '500',
    lineHeight: wp(20),
  },
  apiWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(8),
  },
  apiChip: {
    borderRadius: wp(999),
    minHeight: wp(28),
    paddingHorizontal: wp(10),
    paddingVertical: wp(6),
  },
  apiText: {
    fontSize: wp(12),
    fontWeight: '800',
    lineHeight: wp(16),
  },
  codeBlock: {
    borderRadius: wp(12),
    overflow: 'hidden',
    padding: wp(14),
  },
  codeText: {
    color: '#E5E7EB',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: wp(12),
    lineHeight: wp(18),
  },
});
