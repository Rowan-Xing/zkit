import * as React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, useI18n, useTheme } from 'zkit-ui';
import { wp } from 'zkit-tools';

import { showcaseMetrics } from '../data';
import { styles } from '../styles';
import { MetaPill } from './MetaPill';

const runtimeLabels = ['Expo 54', 'React Native 0.81', 'React 19', 'Reanimated 4'];
const heroLogo = require('../../assets/images/y2icon.png');
const wordmark = require('../../assets/images/dfff1.png');

export const ExampleHeader = React.memo(function ExampleHeader({ topInset }: { topInset: number }) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <View style={[styles.header, { paddingTop: topInset + wp(14) }]}>
      <LinearGradient
        colors={['#0B1428', '#1E40AF', '#0D9488']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroSurface}
      >
        <View style={styles.headerTopRow}>
          <View style={styles.brandMark}>
            <Image source={heroLogo} style={styles.brandImage} contentFit="contain" />
          </View>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: 'rgba(255,255,255,0.6)' }]}>@zkit / example</Text>
            <Text style={[styles.title, { color: theme.colors.onPrimary }]}>{t('example.header.title')}</Text>
          </View>
        </View>

        <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.75)' }]}>
          {t('example.header.subtitle')}
        </Text>

        <View style={styles.headerPreview}>
          <Image source={wordmark} style={styles.headerPreviewImage} contentFit="cover" />
          <View style={styles.headerPreviewFooter}>
            <Text style={[styles.headerPreviewLabel, { color: theme.colors.onPrimary }]}>
              {t('example.header.previewLabel')}
            </Text>
            <Text style={[styles.headerPreviewValue, { color: 'rgba(255,255,255,0.6)' }]}>
              {t('example.header.previewValue')}
            </Text>
          </View>
        </View>

        <View style={styles.headerStats}>
          {showcaseMetrics.map((metric) => (
            <View key={metric.labelKey} style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: theme.colors.onPrimary }]}>{metric.value}</Text>
              <Text style={[styles.heroStatLabel, { color: 'rgba(255,255,255,0.6)' }]}>
                {t(metric.labelKey)}
              </Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={styles.metaRow}>
        {runtimeLabels.map((label) => (
          <MetaPill key={label} label={label} />
        ))}
      </View>
    </View>
  );
});
