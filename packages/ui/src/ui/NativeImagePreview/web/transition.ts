/// <reference lib="dom" />

import type { NativeImagePreviewWebResolvedItem } from './types';
import { easeOutCubic, lerpRect, type SharedElementGeometry } from './geometry';
import { previewSourceFor } from './media';

type SharedTransitionOptions = {
  item: NativeImagePreviewWebResolvedItem;
  from: SharedElementGeometry;
  to: SharedElementGeometry;
  duration?: number;
  parent?: HTMLElement;
  beforeStart?: () => void | Promise<void>;
  onProgress?: (progress: number) => void;
  beforeRemove?: () => void | Promise<void>;
};

export async function animateSharedElement({
  item,
  from,
  to,
  duration = 320,
  parent = document.body,
  beforeStart,
  onProgress,
  beforeRemove,
}: SharedTransitionOptions): Promise<void> {
  const shell = document.createElement('div');
  shell.className = 'native-image-preview-fly-shell';
  shell.style.opacity = '0';

  const media = document.createElement('img');
  media.className = 'native-image-preview-fly-media';
  media.alt = item.alt;
  media.draggable = false;
  media.src = previewSourceFor(item);

  shell.append(media);
  applyGeometry(shell, media, from);
  parent.append(shell);
  await waitForFlyMedia(media);
  shell.style.opacity = '1';
  await waitFrames(1);
  await beforeStart?.();

  const startedAt = performance.now();

  return new Promise((resolve) => {
    const render = async (now: number) => {
      const raw = Math.min(1, (now - startedAt) / duration);
      const progress = easeOutCubic(raw);
      applyGeometry(shell, media, {
        visibleFrame: lerpRect(from.visibleFrame, to.visibleFrame, progress),
        contentFrame: lerpRect(from.contentFrame, to.contentFrame, progress),
      });
      onProgress?.(progress);

      if (raw < 1) {
        requestAnimationFrame(render);
        return;
      }
      await beforeRemove?.();
      await waitFrames(1);
      requestAnimationFrame(() => {
        shell.remove();
        resolve();
      });
    };

    requestAnimationFrame(render);
  });
}

function applyGeometry(
  shell: HTMLElement,
  media: HTMLImageElement,
  geometry: SharedElementGeometry
): void {
  const shellRect = geometry.visibleFrame;
  const mediaRect = geometry.contentFrame;
  shell.style.transform = `translate3d(${shellRect.left}px, ${shellRect.top}px, 0)`;
  shell.style.width = `${shellRect.width}px`;
  shell.style.height = `${shellRect.height}px`;
  media.style.transform = `translate3d(${mediaRect.left}px, ${mediaRect.top}px, 0)`;
  media.style.width = `${mediaRect.width}px`;
  media.style.height = `${mediaRect.height}px`;
}

function waitFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    const step = (remaining: number) => {
      if (remaining <= 0) {
        resolve();
        return;
      }
      requestAnimationFrame(() => step(remaining - 1));
    };
    step(count);
  });
}

function waitForFlyMedia(image: HTMLImageElement): Promise<void> {
  if (image.complete && image.naturalWidth > 0) {
    return Promise.resolve();
  }

  return Promise.race([
    image.decode().catch(() => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, 180)),
  ]);
}
