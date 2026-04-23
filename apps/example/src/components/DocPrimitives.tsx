import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { wp } from 'y2kit-tools';
import { Text, useTheme } from 'y2kit-ui';
import type { CatalogEntry } from '../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function renderFeather(name: string, color: string, size = 18) {
  return <Feather name={name as never} color={color} size={size} />;
}

export function InfoChip({
  label,
  tone = 'default',
}: {
  label: string;
  tone?: 'default' | 'accent';
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.infoChip,
        tone === 'accent'
          ? { backgroundColor: theme.colors.secondary }
          : { backgroundColor: '#EEF2F8' },
      ]}
    >
      <Text
        style={[
          styles.infoChipText,
          {
            color: tone === 'accent' ? theme.colors.primary : theme.colors.muted,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function CatalogCard({
  entry,
  width,
  onPress,
}: {
  entry: CatalogEntry;
  width: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.985, { duration: 120 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 160 });
      }}
      style={[animatedStyle, { width }]}
    >
      <View style={[styles.catalogCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <LinearGradient colors={entry.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.catalogAccent} />

        <View style={styles.catalogHeader}>
          <View style={styles.catalogIconWrap}>
            <LinearGradient colors={entry.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.catalogIconBadge}>
              {renderFeather(entry.icon, '#FFFFFF', 18)}
            </LinearGradient>
          </View>
          {renderFeather('arrow-up-right', theme.colors.muted, 18)}
        </View>

        <Text style={[styles.catalogTitle, { color: theme.colors.onSurface }]}>{entry.title}</Text>
        <Text style={[styles.catalogSummary, { color: theme.colors.muted }]}>{entry.summary}</Text>

        <View style={styles.catalogTagRow}>
          {entry.tags.map((tag) => (
            <InfoChip key={tag} label={tag} tone="accent" />
          ))}
        </View>

        <View style={styles.catalogMetaRow}>
          <Text style={[styles.catalogMetaText, { color: theme.colors.onSurface }]}>
            {entry.exampleCount} 组实时示例
          </Text>
          <Text style={[styles.catalogMetaText, { color: theme.colors.muted }]}>点击进入详情</Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

export function ExampleBlock({
  title,
  description,
  code,
  children,
}: {
  title: string;
  description: string;
  code: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.exampleBlock, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
      <View style={styles.exampleHeader}>
        <Text style={[styles.exampleTitle, { color: theme.colors.onSurface }]}>{title}</Text>
        <Text style={[styles.exampleDescription, { color: theme.colors.muted }]}>{description}</Text>
      </View>
      <PreviewSurface>{children}</PreviewSurface>
      <CodeBlock code={code} />
    </View>
  );
}

export function PreviewSurface({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.previewSurface,
        {
          borderColor: theme.colors.border,
          backgroundColor: '#F8FAFF',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function CodeBlock({ code }: { code: string }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.codeScroll}>
      <View style={styles.codeBlock}>
        <Text style={styles.codeText}>{code}</Text>
      </View>
    </ScrollView>
  );
}

export function LinkTile({
  title,
  label,
  icon,
  onPress,
}: {
  title: string;
  label: string;
  icon: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.985, { duration: 120 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 160 });
      }}
      style={animatedStyle}
    >
      <View style={[styles.linkTile, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <View style={styles.linkTileHead}>
          {renderFeather(icon, theme.colors.primary, 17)}
          {renderFeather('arrow-right', theme.colors.muted, 17)}
        </View>
        <Text style={[styles.linkTileLabel, { color: theme.colors.muted }]}>{label}</Text>
        <Text style={[styles.linkTileTitle, { color: theme.colors.onSurface }]}>{title}</Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  infoChip: {
    alignItems: 'center',
    borderRadius: 999,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  infoChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  catalogCard: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: wp(220),
    overflow: 'hidden',
    padding: 18,
    shadowColor: '#0B1A33',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  catalogAccent: {
    height: 4,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  catalogHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  catalogIconWrap: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  catalogIconBadge: {
    alignItems: 'center',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  catalogTitle: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  catalogSummary: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  catalogTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  catalogMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  catalogMetaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  exampleBlock: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 16,
    overflow: 'hidden',
    padding: 18,
    shadowColor: '#0B1A33',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  exampleHeader: {
    gap: 8,
  },
  exampleTitle: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  exampleDescription: {
    fontSize: 14,
    lineHeight: 22,
  },
  previewSurface: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 120,
    padding: 16,
  },
  codeScroll: {
    minWidth: '100%',
  },
  codeBlock: {
    backgroundColor: '#0A1830',
    borderRadius: 8,
    minWidth: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  codeText: {
    color: '#DDE7FF',
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    fontSize: 12,
    lineHeight: 18,
  },
  linkTile: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    minHeight: 118,
    padding: 18,
  },
  linkTileHead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  linkTileLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  linkTileTitle: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
});
