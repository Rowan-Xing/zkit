import * as React from 'react';
import { Image as ExpoImage } from 'expo-image';
import { Image, PixelRatio, View } from 'react-native';
import { wp } from 'zkit-tools';
import { Text, useTheme } from 'zkit-ui';

import { TabScreenShell } from '../TabScreenShell';
import { type GaleriaDemoItem, galeriaDemoItems } from './data';
import { styles } from './styles.native';

const flowerVideoUri = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
const galeriaNativeItems = galeriaDemoItems.map((item) => {
  const previewUri = Image.resolveAssetSource(item.previewSource).uri;

  return {
    id: item.id,
    poster: item.type === 'video' ? previewUri : undefined,
    type: item.type,
    url: item.type === 'video' ? flowerVideoUri : previewUri,
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

function displaySizeFor(item: GaleriaDemoItem) {
  const pixelRatio = PixelRatio.get();
  const rawWidth = item.width / pixelRatio;
  const rawHeight = item.height / pixelRatio;
  const maxWidth = wp(224);
  const scale = Math.min(maxWidth / Math.max(1, rawWidth), 1);

  return {
    width: Math.max(1, Math.round(rawWidth * scale)),
    height: Math.max(1, Math.round(rawHeight * scale)),
  };
}

export function GaleriaGuidePage() {
  const theme = useTheme();

  return (
    <TabScreenShell withTopInset={false}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>Galeria</Text>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Shared transition gallery</Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          Native validation surface for pickup, swipe, pinch, pan, video preview, and drag-to-close.
        </Text>
      </View>

      <Galeria items={galeriaNativeItems} theme="dark">
        <View style={styles.messageList}>
          {galeriaDemoItems.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.messageRow,
                index % 2 === 0 ? styles.messageRowOther : styles.messageRowSelf,
              ]}
            >
              <View style={styles.imageContainer}>
                <Galeria.Image edgeToEdge index={index}>
                  <ExpoImage
                    cachePolicy="memory-disk"
                    contentFit="cover"
                    priority="high"
                    recyclingKey={item.id}
                    source={item.previewSource}
                    style={[
                      styles.image,
                      displaySizeFor(item),
                      { backgroundColor: theme.colors.secondary },
                    ]}
                    transition={0}
                  />
                </Galeria.Image>
                {item.type === 'video' ? (
                  <View pointerEvents="none" style={styles.playBadge}>
                    <Text style={styles.playBadgeText}>VIDEO</Text>
                  </View>
                ) : null}
                <View pointerEvents="none" style={styles.badge}>
                  <Text numberOfLines={1} style={styles.badgeText}>
                    {item.label}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </Galeria>
    </TabScreenShell>
  );
}
