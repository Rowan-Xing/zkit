import * as React from 'react';
import { Image as ExpoImage } from 'expo-image';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'zkit-ui';

import { TabScreenShell } from '../TabScreenShell';
import { type GaleriaDemoItem, galeriaDemoItems } from './data';
import { styles } from './styles.native';

const flowerVideoUri = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

type GaleriaNativeItem = {
  height?: number;
  id: string;
  poster?: string;
  type: GaleriaDemoItem['type'];
  url: string;
  width?: number;
};

type ImageRenderer = 'expo' | 'rn';

const imageRenderers: { label: string; value: ImageRenderer }[] = [
  { label: 'ExpoImage', value: 'expo' },
  { label: 'RN Image', value: 'rn' },
];

const nativeItems: GaleriaNativeItem[] = galeriaDemoItems.map((item) => {
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
    items: GaleriaNativeItem[];
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

function GalleryTile({
  backgroundColor,
  index,
  item,
  renderer,
}: {
  backgroundColor: string;
  index: number;
  item: GaleriaDemoItem;
  renderer: ImageRenderer;
}) {
  return (
    <View
      style={[
        styles.galleryCard,
        item.tall ? styles.galleryCardTall : null,
        { backgroundColor },
      ]}
    >
      <Galeria.Image edgeToEdge index={index} style={StyleSheet.absoluteFill}>
        {renderer === 'expo' ? (
          <ExpoImage
            cachePolicy="memory-disk"
            contentFit="cover"
            priority="high"
            recyclingKey={item.id}
            source={item.previewSource}
            style={styles.galleryImage}
            transition={0}
          />
        ) : (
          <Image resizeMode="cover" source={item.previewSource} style={styles.galleryImage} />
        )}
      </Galeria.Image>
      <View pointerEvents="none" style={styles.badge}>
        <Text numberOfLines={1} style={styles.badgeText}>
          {item.type === 'video' ? 'VIDEO' : item.label}
        </Text>
      </View>
    </View>
  );
}

export function GaleriaGuidePage() {
  const theme = useTheme();
  const [renderer, setRenderer] = React.useState<ImageRenderer>('expo');

  return (
    <TabScreenShell withTopInset={false}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>Galeria</Text>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Shared transition gallery</Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          Native image-source parity surface for pickup, swipe, pinch, pan, video preview, and drag-to-close.
        </Text>
      </View>

      <View style={styles.rendererSwitch}>
        {imageRenderers.map((option) => {
          const selected = renderer === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setRenderer(option.value)}
              style={[
                styles.rendererButton,
                {
                  backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                  borderColor: selected ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.rendererButtonText,
                  { color: selected ? '#FFFFFF' : theme.colors.onSurface },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Galeria key={renderer} items={nativeItems} theme="dark">
        <View style={styles.galleryGrid}>
          {galeriaDemoItems.map((item, index) => (
            <GalleryTile
              key={item.id}
              backgroundColor={theme.colors.secondary}
              index={index}
              item={item}
              renderer={renderer}
            />
          ))}
        </View>
      </Galeria>
    </TabScreenShell>
  );
}
