import * as React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, useTheme } from 'y2kit-ui';
import { wp } from 'y2kit-tools';

import { showcaseMetrics } from '../data';
import { styles } from '../styles';
import { MetaPill } from './MetaPill';

const runtimeLabels = ['Expo 54', 'RN 0.81', 'React 19', 'Reanimated 4'];
const heroLogo = require('../../assets/images/y2icon.png');
const wordmark = require('../../assets/images/dfff1.png');

export const ExampleHeader = React.memo(function ExampleHeader({ topInset }: { topInset: number }) {
  const theme = useTheme();

  return (
    <View style={[styles.header, { paddingTop: topInset + wp(18) }]}>
      <LinearGradient
        colors={['#0B1220', '#2348A9', '#2F7D68']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroSurface}
      >
        <View style={styles.headerTopRow}>
          <View style={styles.brandMark}>
            <Image source={heroLogo} style={styles.brandImage} contentFit="contain" />
          </View>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: 'rgba(255,255,255,0.72)' }]}>@y2kit/example</Text>
            <Text style={[styles.title, { color: theme.colors.onPrimary }]}>Y2Kit Lab</Text>
          </View>
        </View>

        <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.78)' }]}>
          Component and tool showcase for fast native screens, polished motion, and provider-backed flows.
        </Text>

        <View style={styles.headerPreview}>
          <Image source={wordmark} style={styles.headerPreviewImage} contentFit="cover" />
          <View style={styles.headerPreviewFooter}>
            <Text style={[styles.headerPreviewLabel, { color: theme.colors.onPrimary }]}>Prototype surface</Text>
            <Text style={[styles.headerPreviewValue, { color: 'rgba(255,255,255,0.72)' }]}>mobile-first</Text>
          </View>
        </View>

        <View style={styles.headerStats}>
          {showcaseMetrics.map((metric) => (
            <View key={metric.label} style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: theme.colors.onPrimary }]}>{metric.value}</Text>
              <Text style={[styles.heroStatLabel, { color: 'rgba(255,255,255,0.7)' }]}>{metric.label}</Text>
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
