import * as React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'zkit-ui';

import { TabScreenShell } from '../TabScreenShell';
import { galeriaDemoItems } from './data';
import { styles } from './styles.native';

const flowerVideoUri = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
const galeriaNativeItems = galeriaDemoItems.map((item) => {
  const previewUri = Image.resolveAssetSource(item.previewSource).uri;

  return {
    id: item.id,
    poster: item.type === 'video' ? previewUri : undefined,
    type: item.type,
    url: item.type === 'video' ? flowerVideoUri : previewUri,
    width: item.width,
    height: item.height,
  };
});

const { Galeria } = require('zkit-galeria/react-native') as {
  Galeria: React.ComponentType<{
    children: React.ReactNode;
    items: typeof galeriaNativeItems;
    theme?: 'dark' | 'light';
  }> & {
    Image: React.ComponentType<{
      children: React.ReactElement;
      edgeToEdge?: boolean;
      index: number;
      style?: unknown;
    }>;
  };
};

export function GaleriaGuidePage() {
  const theme = useTheme();

  return (
    <TabScreenShell>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>Galeria</Text>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Shared transition gallery</Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          Native validation surface for pickup, swipe, pinch, pan, video preview, and drag-to-close.
        </Text>
      </View>

      <Galeria items={galeriaNativeItems} theme="dark">
        <View style={styles.grid}>
          {galeriaDemoItems.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.card,
                item.tall ? styles.cardTall : null,
                { backgroundColor: theme.colors.secondary },
              ]}
            >
              <Galeria.Image edgeToEdge index={index} style={StyleSheet.absoluteFill}>
                <Image resizeMode="cover" source={item.previewSource} style={styles.image} />
              </Galeria.Image>
              <View pointerEvents="none" style={styles.badge}>
                <Text numberOfLines={1} style={styles.badgeText}>
                  {item.type === 'video' ? 'VIDEO' : item.label}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Galeria>
    </TabScreenShell>
  );
}
