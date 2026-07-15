import {
  Image,
  type ColorSchemeName,
  type ImageSourcePropType,
} from 'react-native';
import type {
  NativeImagePreviewColorScheme,
  NativeImagePreviewItem,
  NativeImagePreviewItemDescriptor,
  NativeImagePreviewNativeItem,
  NativeImagePreviewResolvedItem,
  NativeImagePreviewResolvedColorScheme,
  NativeImagePreviewSource,
} from './types';

function isDescriptor(
  item: NativeImagePreviewItem
): item is NativeImagePreviewItemDescriptor {
  if (item == null || typeof item !== 'object' || Array.isArray(item)) return false;
  return (
    'source' in item ||
    'url' in item ||
    'poster' in item ||
    'type' in item ||
    'id' in item
  );
}

export function resolvePreviewSourceUri(
  source: NativeImagePreviewSource | undefined
) {
  if (source == null) return undefined;
  if (typeof source === 'string') return source;

  const normalizedSource = Array.isArray(source) ? source[0] : source;
  const resolved = Image.resolveAssetSource(normalizedSource as ImageSourcePropType);
  return resolved?.uri;
}

function normalizePreviewItem(
  item: NativeImagePreviewItem,
  index: number
): NativeImagePreviewResolvedItem | null {
  if (isDescriptor(item)) {
    const type = item.type ?? 'image';
    const sourceUrl = resolvePreviewSourceUri(item.source);
    const url = item.url ?? sourceUrl;
    if (!url) return null;

    const poster = resolvePreviewSourceUri(item.poster) ?? (type === 'video' ? sourceUrl : undefined);

    return {
      id: item.id ?? `${index}`,
      type,
      url,
      poster,
      width: item.width,
      height: item.height,
      alt: item.alt,
      raw: item,
    };
  }

  const url = resolvePreviewSourceUri(item);
  if (!url) return null;

  return {
    id: `${index}`,
    type: 'image',
    url,
    raw: item,
  };
}

export function normalizeNativeImagePreviewItems(
  items: readonly NativeImagePreviewItem[]
) {
  return items
    .map((item, index) => normalizePreviewItem(item, index))
    .filter((item): item is NativeImagePreviewResolvedItem => item != null);
}

export function toNativePreviewItems(
  items: readonly NativeImagePreviewResolvedItem[]
): NativeImagePreviewNativeItem[] {
  return items.map(({ id, type, url, poster, width, height }) => ({
    id,
    type,
    url,
    poster,
    width,
    height,
  }));
}

export function clampPreviewIndex(index: number, length: number) {
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(Math.round(index), Math.max(0, length - 1)));
}

export function resolveNativeImagePreviewColorScheme(
  colorScheme: NativeImagePreviewColorScheme | undefined,
  systemColorScheme: ColorSchemeName
): NativeImagePreviewResolvedColorScheme {
  if (colorScheme === 'light' || colorScheme === 'dark') return colorScheme;
  if (colorScheme === 'system') return systemColorScheme === 'light' ? 'light' : 'dark';
  return 'dark';
}
