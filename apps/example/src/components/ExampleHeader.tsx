import * as React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useI18n, useTheme } from 'zkit-ui';
import { Text } from 'zkit-ui/text';
import { wp } from 'zkit-tools';

import { styles } from '../styles';

const heroLogo = require('../../assets/images/zkit-icon.png');

const prototypeBars = [
  { width: '78%', color: '#1F5EFF' },
  { width: '56%', color: '#13A88B' },
  { width: '68%', color: '#F59E0B' },
] as const;

const prototypeControls = ['#1F5EFF', '#13A88B', '#0F172A'] as const;

export const ExampleHeader = React.memo(function ExampleHeader({ topInset }: { topInset: number }) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <View style={[styles.header, { paddingTop: topInset + wp(14) }]}>
      <View
        style={[
          styles.heroSurface,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>@zkit / example</Text>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>{t('example.header.title')}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          {t('example.header.subtitle')}
        </Text>

        <View style={styles.headerPreview}>
          <View style={styles.prototypeToolbar}>
            <View style={styles.prototypeTrafficLights}>
              <View style={[styles.prototypeDot, { backgroundColor: '#F97316' }]} />
              <View style={[styles.prototypeDot, { backgroundColor: '#FACC15' }]} />
              <View style={[styles.prototypeDot, { backgroundColor: '#22C55E' }]} />
            </View>
            <View style={styles.prototypeToolbarTrack} />
          </View>
          <View style={styles.prototypeStage}>
            <LinearGradient
              colors={['#102A5C', '#1F5EFF', '#13A88B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.prototypeCanvas}
            >
              <View style={styles.prototypeCanvasGlow} />
              <View style={styles.prototypeCardPrimary}>
                <Image source={heroLogo} style={styles.prototypeLogo} contentFit="contain" />
                <View style={styles.prototypeTextStack}>
                  <View style={styles.prototypeTitleLine} />
                  <View style={styles.prototypeSubLine} />
                </View>
              </View>
              <View style={styles.prototypeMetricRow}>
                {prototypeControls.map((color) => (
                  <View key={color} style={styles.prototypeMetric}>
                    <View style={[styles.prototypeMetricIcon, { backgroundColor: color }]} />
                    <View style={styles.prototypeMetricLine} />
                  </View>
                ))}
              </View>
            </LinearGradient>
            <View style={styles.prototypeInspector}>
              {prototypeBars.map((bar) => (
                <View key={bar.color} style={styles.prototypeBarTrack}>
                  <View
                    style={[
                      styles.prototypeBarFill,
                      { backgroundColor: bar.color, width: bar.width },
                    ]}
                  />
                </View>
              ))}
              <View style={styles.prototypeToggleRow}>
                <View style={styles.prototypeToggle} />
                <View style={styles.prototypeToggleLine} />
              </View>
            </View>
          </View>
          <View style={styles.headerPreviewFooter}>
            <Text style={[styles.headerPreviewLabel, { color: theme.colors.onSurface }]}>
              {t('example.header.previewLabel')}
            </Text>
            <Text style={[styles.headerPreviewValue, { color: theme.colors.muted }]}>
              {t('example.header.previewValue')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
});
