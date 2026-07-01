import type { GaleriaImageSize, GaleriaMediaItem, GaleriaMediaType, GaleriaResolvedItem } from '../types';

export function normalizeItems(items: readonly GaleriaMediaItem[]): GaleriaResolvedItem[] {
  return items
    .map((item, index): GaleriaResolvedItem | null => {
      const src = item.src ?? item.url ?? '';
      if (!src.trim()) {
        return null;
      }
      const type = resolveType(item);
      return {
        id: item.id ?? String(index),
        type,
        src,
        poster: item.poster,
        width: item.width,
        height: item.height,
        alt: item.alt ?? `Image ${index + 1}`,
        raw: item,
      };
    })
    .filter((item): item is GaleriaResolvedItem => item !== null);
}

export function previewSourceFor(item: GaleriaResolvedItem): string {
  return item.type === 'video' ? item.poster ?? item.src : item.src;
}

export async function resolveMediaSize(
  item: GaleriaResolvedItem,
  fallback?: GaleriaImageSize | null
): Promise<GaleriaImageSize> {
  if (fallback && fallback.width > 0 && fallback.height > 0) {
    return fallback;
  }
  if (item.width && item.height) {
    return { width: item.width, height: item.height };
  }
  const previewSource = previewSourceFor(item);
  if (!previewSource) {
    return { width: 1, height: 1 };
  }
  try {
    return await loadImageSize(previewSource);
  } catch {
    return { width: 1, height: 1 };
  }
}

export function waitForElementImage(element: Element | null | undefined): Promise<void> {
  if (!(element instanceof HTMLImageElement)) {
    return Promise.resolve();
  }
  if (element.complete && element.naturalWidth > 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const done = () => {
      element.removeEventListener('load', done);
      element.removeEventListener('error', done);
      resolve();
    };
    element.addEventListener('load', done, { once: true });
    element.addEventListener('error', done, { once: true });
  });
}

function resolveType(item: GaleriaMediaItem): GaleriaMediaType {
  if (item.type === 'video') {
    return 'video';
  }
  const src = item.src ?? item.url ?? '';
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(src) ? 'video' : 'image';
}

function loadImageSize(src: string): Promise<GaleriaImageSize> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      resolve({
        width: image.naturalWidth || image.width || 1,
        height: image.naturalHeight || image.height || 1,
      });
    };
    image.onerror = () => reject(new Error(`Unable to load image: ${src}`));
    image.src = src;
  });
}
