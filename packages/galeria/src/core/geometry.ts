import type { GaleriaImageSize, GaleriaObjectFit, GaleriaRect } from '../types';

export type SharedElementGeometry = {
  visibleFrame: GaleriaRect;
  contentFrame: GaleriaRect;
};

export function rectFromDOMRect(rect: DOMRectReadOnly | GaleriaRect): GaleriaRect {
  return normalizeRect({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  });
}

export function rectFromElement(element: Element): GaleriaRect {
  return rectFromDOMRect(element.getBoundingClientRect());
}

export function viewportRect(): GaleriaRect {
  return normalizeRect({
    left: 0,
    top: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  });
}

export function normalizeRect(input: Pick<GaleriaRect, 'left' | 'top' | 'width' | 'height'>): GaleriaRect {
  return {
    left: input.left,
    top: input.top,
    width: input.width,
    height: input.height,
    right: input.left + input.width,
    bottom: input.top + input.height,
  };
}

export function isUsableRect(rect: GaleriaRect | null | undefined): rect is GaleriaRect {
  return !!rect && rect.width > 1 && rect.height > 1;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function fitRect(
  mediaSize: GaleriaImageSize,
  container: GaleriaRect,
  objectFit: GaleriaObjectFit
): GaleriaRect {
  if (objectFit === 'fill') {
    return normalizeRect(container);
  }

  const widthScale = container.width / Math.max(1, mediaSize.width);
  const heightScale = container.height / Math.max(1, mediaSize.height);
  const scale = objectFit === 'cover'
    ? Math.max(widthScale, heightScale)
    : Math.min(widthScale, heightScale);
  const width = mediaSize.width * scale;
  const height = mediaSize.height * scale;
  return normalizeRect({
    left: container.left + (container.width - width) / 2,
    top: container.top + (container.height - height) / 2,
    width,
    height,
  });
}

export function sharedGeometryFor(
  container: GaleriaRect,
  mediaSize: GaleriaImageSize,
  objectFit: GaleriaObjectFit
): SharedElementGeometry {
  const contentFrameInWindow = fitRect(mediaSize, container, objectFit);
  const visibleFrame = intersectRects(container, contentFrameInWindow) ?? normalizeRect(container);
  const contentFrame = normalizeRect({
    left: contentFrameInWindow.left - visibleFrame.left,
    top: contentFrameInWindow.top - visibleFrame.top,
    width: contentFrameInWindow.width,
    height: contentFrameInWindow.height,
  });
  return { visibleFrame, contentFrame };
}

export function targetGeometryFor(mediaSize: GaleriaImageSize, container: GaleriaRect): SharedElementGeometry {
  const visibleFrame = fitRect(mediaSize, container, 'contain');
  return {
    visibleFrame,
    contentFrame: normalizeRect({
      left: 0,
      top: 0,
      width: visibleFrame.width,
      height: visibleFrame.height,
    }),
  };
}

export function intersectRects(first: GaleriaRect, second: GaleriaRect): GaleriaRect | null {
  const left = Math.max(first.left, second.left);
  const top = Math.max(first.top, second.top);
  const right = Math.min(first.right, second.right);
  const bottom = Math.min(first.bottom, second.bottom);
  if (right <= left || bottom <= top) {
    return null;
  }
  return normalizeRect({ left, top, width: right - left, height: bottom - top });
}

export function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

export function lerpRect(start: GaleriaRect, end: GaleriaRect, progress: number): GaleriaRect {
  return normalizeRect({
    left: lerp(start.left, end.left, progress),
    top: lerp(start.top, end.top, progress),
    width: lerp(start.width, end.width, progress),
    height: lerp(start.height, end.height, progress),
  });
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}
