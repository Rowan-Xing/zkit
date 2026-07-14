import * as React from 'react';
import { Image as ExpoImage } from 'expo-image';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import {
  NativeImagePreview,
  Text,
  useI18n,
  useTheme,
  type NativeImagePreviewItem,
} from 'zkit-ui';

import { TabScreenShell } from '../TabScreenShell';
import { type GaleriaDemoItem, galeriaDemoItems } from './data';
import { styles } from './styles.native';

const flowerVideoUri = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

type ImageRenderer = 'expo' | 'rn';

const imageRendererValues: ImageRenderer[] = ['expo', 'rn'];
const imageRendererLabelKeys: Record<ImageRenderer, string> = {
  expo: 'example.galeria.renderer.expo',
  rn: 'example.galeria.renderer.rn',
};

const itemLabelKeys: Record<string, string> = {
  bunny: 'example.galeria.item.video',
  mountain: 'example.galeria.item.mountain',
  portrait: 'example.galeria.item.portrait',
  river: 'example.galeria.item.river',
  waterfall: 'example.galeria.item.waterfall',
  wide: 'example.galeria.item.wide',
};

const nativeItems: NativeImagePreviewItem[] = galeriaDemoItems.map((item) => {
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

function GalleryTile({
  backgroundColor,
  index,
  item,
  label,
  renderer,
  selected,
  videoBadge,
}: {
  backgroundColor: string;
  index: number;
  item: GaleriaDemoItem;
  label: string;
  renderer: ImageRenderer;
  selected: boolean;
  videoBadge: string;
}) {
  return (
    <View
      style={[
        styles.galleryCard,
        item.tall ? styles.galleryCardTall : null,
        { backgroundColor },
      ]}
    >
      <NativeImagePreview.Item index={index} style={StyleSheet.absoluteFill}>
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
      </NativeImagePreview.Item>
      <View pointerEvents="none" style={styles.badge}>
        <Text numberOfLines={1} style={styles.badgeText}>
          {item.type === 'video' ? videoBadge : label}
        </Text>
      </View>
      {selected ? <View pointerEvents="none" style={styles.activeRing} /> : null}
    </View>
  );
}

export function GaleriaGuidePage() {
  const { t } = useI18n();
  const theme = useTheme();
  const [renderer, setRenderer] = React.useState<ImageRenderer>('expo');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const activeItem = galeriaDemoItems[activeIndex];
  const activeLabel = activeItem
    ? t(itemLabelKeys[activeItem.id] ?? 'example.galeria.apiFallback')
    : t('example.galeria.apiFallback');

  return (
    <TabScreenShell withTopInset={false}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>
          {t('example.galeria.eyebrow')}
        </Text>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          {t('example.galeria.title')}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          {t('example.galeria.subtitle')}
        </Text>
      </View>

      <View style={[styles.apiPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.apiPanelHeader}>
          <Text style={[styles.apiPanelTitle, { color: theme.colors.onSurface }]}>
            {t('example.galeria.apiTitle')}
          </Text>
          <Text style={[styles.apiPanelValue, { color: theme.colors.primary }]}>
            {activeLabel}
          </Text>
        </View>
        <Text style={[styles.apiPanelSubtitle, { color: theme.colors.muted }]}>
          {t('example.galeria.apiSubtitle')}
        </Text>
      </View>

      <View style={styles.rendererSwitch}>
        {imageRendererValues.map((value) => {
          const selected = renderer === value;
          return (
            <Pressable
              key={value}
              onPress={() => setRenderer(value)}
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
                {t(imageRendererLabelKeys[value])}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <NativeImagePreview
        key={renderer}
        colorScheme="dark"
        edgeToEdge
        items={nativeItems}
        onChange={(value) => setActiveIndex(value)}
      >
        <View style={styles.galleryGrid}>
          {galeriaDemoItems.map((item, index) => (
            <GalleryTile
              key={item.id}
              backgroundColor={theme.colors.secondary}
              index={index}
              item={item}
              label={t(itemLabelKeys[item.id] ?? 'example.galeria.apiFallback')}
              renderer={renderer}
              selected={activeIndex === index}
              videoBadge={t('example.galeria.videoBadge')}
            />
          ))}
        </View>
      </NativeImagePreview>
    </TabScreenShell>
  );
}
