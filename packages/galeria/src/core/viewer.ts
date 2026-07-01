import type {
  GaleriaChangeMeta,
  GaleriaCloseMeta,
  GaleriaCloseReason,
  GaleriaController,
  GaleriaImageSize,
  GaleriaObjectFit,
  GaleriaOpenOptions,
  GaleriaRect,
  GaleriaResolvedItem,
  GaleriaSourceVisibility,
} from '../types';
import {
  clamp,
  isUsableRect,
  normalizeRect,
  rectFromDOMRect,
  rectFromElement,
  sharedGeometryFor,
  targetGeometryFor,
  type SharedElementGeometry,
} from './geometry';
import { normalizeItems, previewSourceFor, resolveMediaSize, waitForElementImage } from './media';
import { animateSharedElement } from './transition';

type Point = {
  id: number;
  x: number;
  y: number;
};

type SlideState = {
  scale: number;
  translateX: number;
  translateY: number;
  lastTapAt: number;
};

type GestureMode = 'none' | 'pan' | 'pinch' | 'swipe' | 'dismiss';

const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const DRAG_DISMISS_DISTANCE = 72;
const DRAG_DISMISS_MIN_FLING_DISTANCE = 24;
const DRAG_DISMISS_VELOCITY = 520;
const SWIPE_DISTANCE = 52;
const SWIPE_MIN_FLING_DISTANCE = 22;
const SWIPE_VELOCITY = 480;
const MODE_LOCK_DISTANCE = 8;

export class GaleriaViewer implements GaleriaController {
  private root: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;
  private viewport: HTMLElement | null = null;
  private track: HTMLElement | null = null;
  private closeButton: HTMLButtonElement | null = null;
  private counter: HTMLElement | null = null;
  private mediaElements: HTMLElement[] = [];
  private slideStates: SlideState[] = [];
  private items: GaleriaResolvedItem[] = [];
  private options: GaleriaOpenOptions | null = null;
  private index = 0;
  private openState = false;
  private closing = false;
  private sourceVisibility: GaleriaSourceVisibility = 'hidden';
  private sourceElement: HTMLElement | null = null;
  private sourcePreviousVisibility = '';
  private pointers = new Map<number, Point>();
  private mode: GestureMode = 'none';
  private downX = 0;
  private downY = 0;
  private lastX = 0;
  private lastY = 0;
  private downAt = 0;
  private dragX = 0;
  private dragY = 0;
  private pinchStartDistance = 1;
  private pinchStartScale = 1;
  private pinchStartTranslateX = 0;
  private pinchStartTranslateY = 0;
  private pinchStartCenterX = 0;
  private pinchStartCenterY = 0;
  private previousBodyOverflow = '';
  private previousHtmlOverflow = '';
  private viewportWidth = 1;
  private viewportHeight = 1;

  async open(options: GaleriaOpenOptions): Promise<void> {
    if (this.openState) {
      await this.close('replace');
    }

    const items = normalizeItems(options.items);
    if (!items.length) {
      return;
    }

    this.options = options;
    this.items = items;
    this.index = clamp(Math.trunc(options.index ?? 0), 0, items.length - 1);
    this.sourceVisibility = options.sourceVisibility ?? 'hidden';
    this.sourceElement = this.resolveSourceElement(this.index);
    this.slideStates = items.map(() => this.createSlideState());
    this.openState = true;
    this.closing = false;
    this.captureViewportSize();

    this.lockDocumentScroll();
    this.mount();
    await this.layoutMediaElements();
    this.updateCounter();
    this.updateTrack();

    await this.nextFrame();
    await this.performOpenTransition();
    this.showContent();
  }

  async close(reason: GaleriaCloseReason = 'api'): Promise<void> {
    if (!this.openState || this.closing) {
      return;
    }
    this.closing = true;
    await this.performCloseTransition(reason);
    this.finishClose(reason);
  }

  destroy(): void {
    this.finishClose('api');
  }

  getIndex(): number {
    return this.index;
  }

  isOpen(): boolean {
    return this.openState;
  }

  private mount(): void {
    const root = document.createElement('div');
    root.className = `galeria-root galeria-theme-${this.options?.theme ?? 'dark'}`;
    root.tabIndex = -1;
    this.applyViewportStyle(root);

    const backdrop = document.createElement('div');
    backdrop.className = 'galeria-backdrop';
    backdrop.style.opacity = '0';
    root.append(backdrop);

    const viewport = document.createElement('div');
    viewport.className = 'galeria-viewport';

    const track = document.createElement('div');
    track.className = 'galeria-track';
    track.style.opacity = '0';

    this.items.forEach((item, index) => {
      const slide = document.createElement('div');
      slide.className = 'galeria-slide';
      slide.dataset.index = String(index);
      const media = this.createMediaElement(item);
      this.mediaElements.push(media);
      slide.append(media);
      track.append(slide);
    });

    viewport.append(track);
    root.append(viewport);

    const closeButton = document.createElement('button');
    closeButton.className = 'galeria-close';
    closeButton.type = 'button';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', '关闭');
    closeButton.hidden = this.options?.closeButton === false;
    closeButton.style.opacity = '0';
    root.append(closeButton);

    const counter = document.createElement('div');
    counter.className = 'galeria-counter';
    counter.hidden = this.options?.counter === false || this.items.length <= 1;
    counter.style.opacity = '0';
    root.append(counter);

    this.root = root;
    this.backdrop = backdrop;
    this.viewport = viewport;
    this.track = track;
    this.closeButton = closeButton;
    this.counter = counter;

    root.addEventListener('pointerdown', this.handlePointerDown);
    root.addEventListener('pointermove', this.handlePointerMove);
    root.addEventListener('pointerup', this.handlePointerUp);
    root.addEventListener('pointercancel', this.handlePointerUp);
    root.addEventListener('lostpointercapture', this.handleLostPointerCapture);
    root.addEventListener('wheel', this.handleWheel, { passive: false });
    root.addEventListener('click', this.handleRootClick);
    closeButton.addEventListener('click', this.handleCloseClick);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('pagehide', this.handleWindowBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    document.body.append(root);
    root.focus({ preventScroll: true });
  }

  private createMediaElement(item: GaleriaResolvedItem): HTMLElement {
    if (item.type === 'video') {
      const video = document.createElement('video');
      video.className = 'galeria-media galeria-video';
      video.src = item.src;
      video.poster = item.poster ?? '';
      if (item.width && item.height) {
        video.width = item.width;
        video.height = item.height;
      }
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      return video;
    }

    const image = document.createElement('img');
    image.className = 'galeria-media galeria-image';
    image.src = item.src;
    image.alt = item.alt;
    if (item.width && item.height) {
      image.width = item.width;
      image.height = item.height;
    }
    image.draggable = false;
    image.decoding = 'async';
    return image;
  }

  private async performOpenTransition(): Promise<void> {
    const root = this.root;
    const backdrop = this.backdrop;
    const track = this.track;
    const item = this.items[this.index];
    if (!root || !backdrop || !track || !item) {
      return;
    }

    track.style.opacity = '0';
    backdrop.style.opacity = '0';

    const sourceGeometry = await this.resolveSourceGeometry(item);
    const targetGeometry = await this.resolveTargetGeometry(item);
    if (!sourceGeometry || !targetGeometry) {
      backdrop.style.opacity = '1';
      return;
    }

    await animateSharedElement({
      item,
      from: sourceGeometry,
      to: targetGeometry,
      parent: root,
      beforeStart: () => {
        this.hideSourceElement();
      },
      onProgress: (progress) => {
        backdrop.style.opacity = String(progress);
      },
      beforeRemove: () => {
        this.showContent();
      },
    });
  }

  private async performCloseTransition(reason: GaleriaCloseReason): Promise<void> {
    const root = this.root;
    const backdrop = this.backdrop;
    const track = this.track;
    const item = this.items[this.index];
    const media = this.mediaElements[this.index];
    if (!root || !backdrop || !track || !item || !media) {
      return;
    }

    this.pauseInactiveVideos(-1);
    this.hideControls();

    const from = await this.resolveCurrentMediaGeometry(item, media);
    const to = await this.resolveReturnGeometry(item);
    if (!from || !to) {
      root.classList.add('galeria-fading-out');
      await this.delay(180);
      return;
    }

    const backdropStartOpacity = this.resolveBackdropCloseStartOpacity(backdrop, reason);
    await animateSharedElement({
      item,
      from,
      to,
      parent: root,
      duration: reason === 'drag' ? 260 : 300,
      beforeStart: () => {
        track.style.opacity = '0';
      },
      onProgress: (progress) => {
        backdrop.style.opacity = String(backdropStartOpacity * (1 - progress));
      },
      beforeRemove: () => {
        this.restoreSourceElement();
      },
    });
  }

  private resolveBackdropCloseStartOpacity(
    backdrop: HTMLElement,
    reason: GaleriaCloseReason
  ): number {
    if (reason !== 'drag') {
      return 1;
    }
    const opacity = Number.parseFloat(getComputedStyle(backdrop).opacity);
    return Number.isFinite(opacity) ? clamp(opacity, 0, 1) : 1;
  }

  private showContent(): void {
    if (!this.track || !this.backdrop) {
      return;
    }
    this.backdrop.style.opacity = '1';
    this.track.style.opacity = '1';
    this.showControls();
    this.applyActiveMediaTransform(false);
  }

  private showControls(): void {
    if (this.closeButton && !this.closeButton.hidden) {
      this.closeButton.style.opacity = '1';
    }
    if (this.counter && !this.counter.hidden) {
      this.counter.style.opacity = '1';
    }
  }

  private hideControls(): void {
    if (this.closeButton) {
      this.closeButton.style.opacity = '0';
    }
    if (this.counter) {
      this.counter.style.opacity = '0';
    }
  }

  private finishClose(reason: GaleriaCloseReason): void {
    const item = this.items[this.index] ?? null;
    const index = this.index;
    this.restoreSourceElement();
    this.unlockDocumentScroll();
    this.unmount();
    this.options?.onClose?.({ reason, index, item });
    this.openState = false;
    this.closing = false;
    this.items = [];
    this.options = null;
    this.mediaElements = [];
    this.slideStates = [];
    this.pointers.clear();
    this.mode = 'none';
  }

  private unmount(): void {
    const root = this.root;
    const closeButton = this.closeButton;
    if (!root) {
      return;
    }
    root.removeEventListener('pointerdown', this.handlePointerDown);
    root.removeEventListener('pointermove', this.handlePointerMove);
    root.removeEventListener('pointerup', this.handlePointerUp);
    root.removeEventListener('pointercancel', this.handlePointerUp);
    root.removeEventListener('lostpointercapture', this.handleLostPointerCapture);
    root.removeEventListener('wheel', this.handleWheel);
    root.removeEventListener('click', this.handleRootClick);
    closeButton?.removeEventListener('click', this.handleCloseClick);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('pagehide', this.handleWindowBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    root.remove();
    this.root = null;
    this.backdrop = null;
    this.viewport = null;
    this.track = null;
    this.closeButton = null;
    this.counter = null;
  }

  private captureViewportSize(): void {
    const visualViewport = window.visualViewport;
    this.viewportWidth = Math.max(1, visualViewport?.width ?? window.innerWidth);
    this.viewportHeight = Math.max(1, visualViewport?.height ?? window.innerHeight);
  }

  private applyViewportStyle(root = this.root): void {
    if (!root) {
      return;
    }
    root.style.setProperty('--galeria-vw', `${this.viewportWidth}px`);
    root.style.setProperty('--galeria-vh', `${this.viewportHeight}px`);
  }

  private viewportRect(): GaleriaRect {
    return normalizeRect({
      left: 0,
      top: 0,
      width: this.viewportWidth,
      height: this.viewportHeight,
    });
  }

  private async resolveSourceGeometry(item: GaleriaResolvedItem): Promise<SharedElementGeometry | null> {
    const element = this.sourceElement;
    const rect = this.options?.sourceRect
      ? rectFromDOMRect(this.options.sourceRect)
      : element ? rectFromElement(element) : null;
    if (!isUsableRect(rect)) {
      return null;
    }
    await waitForElementImage(element);
    const size = await this.resolveSharedMediaSize(item);
    return sharedGeometryFor(rect, size, this.resolveSourceObjectFit(element));
  }

  private async resolveReturnGeometry(item: GaleriaResolvedItem): Promise<SharedElementGeometry | null> {
    const element = this.resolveSourceElement(this.index);
    if (!element || !element.isConnected) {
      return null;
    }
    await waitForElementImage(element);
    const rect = rectFromElement(element);
    if (!isUsableRect(rect)) {
      return null;
    }
    const size = await this.resolveSharedMediaSize(item);
    return sharedGeometryFor(rect, size, this.resolveSourceObjectFit(element));
  }

  private async resolveTargetGeometry(item: GaleriaResolvedItem): Promise<SharedElementGeometry | null> {
    const size = await this.resolveSharedMediaSize(item);
    return targetGeometryFor(size, this.viewportRect());
  }

  private async resolveCurrentMediaGeometry(
    item: GaleriaResolvedItem,
    media: HTMLElement
  ): Promise<SharedElementGeometry | null> {
    const rect = rectFromElement(media);
    if (!isUsableRect(rect)) {
      return null;
    }
    const size = await this.resolveSharedMediaSize(item);
    return sharedGeometryFor(rect, size, 'fill');
  }

  private async resolveSharedMediaSize(item: GaleriaResolvedItem): Promise<GaleriaImageSize> {
    return resolveMediaSize(item, this.options?.sourceImageSize);
  }

  private resolveSourceObjectFit(element: HTMLElement | null): GaleriaObjectFit {
    const optionFit = this.options?.sourceObjectFit ?? this.options?.objectFit;
    if (optionFit) {
      return optionFit;
    }
    if (!element) {
      return 'cover';
    }
    const fit = getComputedStyle(element).objectFit;
    if (fit === 'contain' || fit === 'fill') {
      return fit;
    }
    return 'cover';
  }

  private resolveSourceElement(index: number): HTMLElement | null {
    const item = this.items[index];
    if (!item) {
      return null;
    }
    return this.options?.getSourceElement?.(index, item)
      ?? this.options?.sourceElements?.[index]
      ?? (index === (this.options?.index ?? 0) ? this.options?.sourceElement ?? null : null);
  }

  private hideSourceElement(): void {
    if (this.sourceVisibility !== 'hidden' || !this.sourceElement) {
      return;
    }
    this.sourcePreviousVisibility = this.sourceElement.style.visibility;
    this.sourceElement.style.visibility = 'hidden';
  }

  private restoreSourceElement(): void {
    if (!this.sourceElement) {
      return;
    }
    this.sourceElement.style.visibility = this.sourcePreviousVisibility;
    this.sourceElement = null;
    this.sourcePreviousVisibility = '';
  }

  private syncHiddenSourceElement(index: number): void {
    this.restoreSourceElement();
    this.sourceElement = this.resolveSourceElement(index);
    this.hideSourceElement();
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (this.closing || !this.root) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (this.shouldIgnorePointerStart(target, event)) {
      return;
    }

    this.root.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { id: event.pointerId, x: event.clientX, y: event.clientY });
    this.downX = event.clientX;
    this.downY = event.clientY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.downAt = performance.now();
    this.dragX = 0;
    this.dragY = 0;
    this.mode = this.pointers.size >= 2 ? 'pinch' : 'none';
    this.preparePinchIfNeeded();
  };

  private shouldIgnorePointerStart(target: HTMLElement | null, event: PointerEvent): boolean {
    if (!target) {
      return false;
    }
    if (target.closest('button')) {
      return true;
    }

    const video = target.closest('video');
    if (!video) {
      return false;
    }
    return this.isPointerInVideoControls(video, event);
  }

  private isPointerInVideoControls(video: HTMLVideoElement, event: PointerEvent): boolean {
    if (!video.controls) {
      return false;
    }

    const rect = video.getBoundingClientRect();
    if (!isUsableRect(rectFromDOMRect(rect))) {
      return false;
    }

    const controlsHeight = Math.min(72, Math.max(44, rect.height * 0.24));
    return event.clientY >= rect.bottom - controlsHeight;
  }

  private handlePointerMove = (event: PointerEvent): void => {
    if (this.closing || !this.pointers.has(event.pointerId)) {
      return;
    }
    event.preventDefault();
    this.pointers.set(event.pointerId, { id: event.pointerId, x: event.clientX, y: event.clientY });

    if (this.pointers.size >= 2) {
      this.mode = 'pinch';
      this.applyPinch();
      return;
    }

    const state = this.activeState();
    const dx = event.clientX - this.downX;
    const dy = event.clientY - this.downY;
    const frameDx = event.clientX - this.lastX;
    const frameDy = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;

    if (this.mode === 'none') {
      if (Math.hypot(dx, dy) < MODE_LOCK_DISTANCE) {
        return;
      }
      if (state.scale > 1.02) {
        this.mode = 'pan';
      } else if (Math.abs(dy) > Math.abs(dx) * 1.15) {
        this.mode = 'dismiss';
      } else {
        this.mode = 'swipe';
      }
    }

    if (this.mode === 'pan') {
      state.translateX += frameDx;
      state.translateY += frameDy;
      this.clampActiveState();
      this.applyActiveMediaTransform(false);
      return;
    }

    if (this.mode === 'dismiss') {
      this.applyDismissDrag(dy);
      return;
    }

    if (this.mode === 'swipe') {
      this.dragX = dx;
      this.updateTrack();
    }
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (!this.pointers.has(event.pointerId)) {
      return;
    }
    const finalDx = event.clientX - this.downX;
    const finalDy = event.clientY - this.downY;
    this.pointers.delete(event.pointerId);
    if (this.root?.hasPointerCapture(event.pointerId)) {
      this.root.releasePointerCapture(event.pointerId);
    }
    if (this.pointers.size >= 2) {
      this.preparePinchIfNeeded();
      return;
    }
    if (this.pointers.size === 1) {
      const point = [...this.pointers.values()][0];
      this.downX = point.x;
      this.downY = point.y;
      this.lastX = point.x;
      this.lastY = point.y;
      this.mode = 'none';
      return;
    }

    const elapsed = Math.max(1, performance.now() - this.downAt);
    const velocityX = (event.clientX - this.downX) / elapsed * 1000;
    const velocityY = (event.clientY - this.downY) / elapsed * 1000;

    if (this.mode === 'dismiss') {
      this.applyDismissDrag(finalDy);
      const shouldClose = Math.abs(this.dragY) > DRAG_DISMISS_DISTANCE
        || (
          Math.abs(this.dragY) > DRAG_DISMISS_MIN_FLING_DISTANCE
          && Math.abs(velocityY) > DRAG_DISMISS_VELOCITY
        );
      if (shouldClose) {
        void this.close('drag');
      } else {
        this.resetDismissDrag();
      }
    } else if (this.mode === 'swipe') {
      this.dragX = finalDx;
      this.finishSwipe(velocityX);
    } else if (this.mode === 'none') {
      this.handleTap(event);
    }

    this.mode = 'none';
    this.dragX = 0;
    this.dragY = 0;
  };

  private handleWheel = (event: WheelEvent): void => {
    if (!event.ctrlKey && Math.abs(event.deltaY) < Math.abs(event.deltaX)) {
      return;
    }
    event.preventDefault();
    const state = this.activeState();
    const nextScale = clamp(state.scale * (event.deltaY > 0 ? 0.92 : 1.08), 1, MAX_SCALE);
    state.scale = nextScale;
    if (nextScale <= 1.01) {
      state.translateX = 0;
      state.translateY = 0;
    }
    this.clampActiveState();
    this.applyActiveMediaTransform(true);
  };

  private handleRootClick = (event: MouseEvent): void => {
    if (event.target === this.backdrop) {
      void this.close('backdrop');
    }
  };

  private handleCloseClick = (): void => {
    void this.close('button');
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.openState) {
      return;
    }
    if (event.key === 'Escape') {
      void this.close('escape');
    }
    if (event.key === 'ArrowLeft') {
      this.goTo(this.index - 1, 'api');
    }
    if (event.key === 'ArrowRight') {
      this.goTo(this.index + 1, 'api');
    }
  };

  private handleResize = (): void => {
    this.captureViewportSize();
    this.applyViewportStyle();
    void this.layoutMediaElements().then(() => {
      this.clampActiveState();
      this.updateTrack();
      this.applyActiveMediaTransform(false);
    });
  };

  private handleWindowBlur = (): void => {
    this.cancelActiveGesture();
  };

  private handleVisibilityChange = (): void => {
    if (document.visibilityState !== 'visible') {
      this.cancelActiveGesture();
    }
  };

  private handleLostPointerCapture = (event: PointerEvent): void => {
    const pointerId = event.pointerId;
    window.setTimeout(() => {
      if (this.pointers.has(pointerId)) {
        this.cancelActiveGesture();
      }
    }, 80);
  };

  private handleTap(event: PointerEvent): void {
    const state = this.activeState();
    const now = performance.now();
    if (now - state.lastTapAt < 280) {
      state.scale = state.scale > 1.02 ? 1 : DOUBLE_TAP_SCALE;
      state.translateX = 0;
      state.translateY = 0;
      this.applyActiveMediaTransform(true);
      state.lastTapAt = 0;
      event.preventDefault();
      return;
    }
    state.lastTapAt = now;
  }

  private preparePinchIfNeeded(): void {
    if (this.pointers.size < 2) {
      return;
    }
    const [first, second] = [...this.pointers.values()];
    const state = this.activeState();
    this.pinchStartDistance = Math.max(1, distance(first, second));
    this.pinchStartScale = state.scale;
    this.pinchStartTranslateX = state.translateX;
    this.pinchStartTranslateY = state.translateY;
    this.pinchStartCenterX = (first.x + second.x) / 2;
    this.pinchStartCenterY = (first.y + second.y) / 2;
  }

  private applyPinch(): void {
    if (this.pointers.size < 2) {
      return;
    }
    const [first, second] = [...this.pointers.values()];
    const state = this.activeState();
    const nextDistance = Math.max(1, distance(first, second));
    const centerX = (first.x + second.x) / 2;
    const centerY = (first.y + second.y) / 2;
    state.scale = clamp(this.pinchStartScale * nextDistance / this.pinchStartDistance, 1, MAX_SCALE);
    state.translateX = this.pinchStartTranslateX + centerX - this.pinchStartCenterX;
    state.translateY = this.pinchStartTranslateY + centerY - this.pinchStartCenterY;
    if (state.scale <= 1.01) {
      state.translateX = 0;
      state.translateY = 0;
    }
    this.clampActiveState();
    this.applyActiveMediaTransform(false);
  }

  private finishSwipe(velocityX: number): void {
    const previous = this.index;
    const shouldGoNext = this.dragX < -SWIPE_DISTANCE
      || (this.dragX < -SWIPE_MIN_FLING_DISTANCE && velocityX < -SWIPE_VELOCITY);
    const shouldGoPrevious = this.dragX > SWIPE_DISTANCE
      || (this.dragX > SWIPE_MIN_FLING_DISTANCE && velocityX > SWIPE_VELOCITY);
    if (shouldGoNext) {
      this.goTo(this.index + 1, 'swipe');
    } else if (shouldGoPrevious) {
      this.goTo(this.index - 1, 'swipe');
    }
    if (previous === this.index) {
      this.updateTrack(true);
    }
  }

  private goTo(nextIndex: number, reason: 'api' | 'swipe'): void {
    const clamped = clamp(nextIndex, 0, this.items.length - 1);
    const previousIndex = this.index;
    this.index = clamped;
    this.dragX = 0;
    this.resetSlideState(clamped);
    this.updateTrack(true);
    this.updateCounter();
    this.pauseInactiveVideos(clamped);
    if (previousIndex !== clamped) {
      this.syncHiddenSourceElement(clamped);
      const item = this.items[clamped];
      const meta: GaleriaChangeMeta = { reason, previousIndex, index: clamped, item };
      this.options?.onChange?.(clamped, meta);
    }
  }

  private resetDismissDrag(): void {
    this.dragX = 0;
    this.dragY = 0;
    this.updateTrack(true);
    this.applyActiveMediaTransform(true);
    if (this.backdrop) {
      this.backdrop.style.transition = 'opacity 220ms cubic-bezier(0.22, 1, 0.36, 1)';
      this.backdrop.style.opacity = '1';
      window.setTimeout(() => {
        if (this.backdrop) {
          this.backdrop.style.transition = '';
        }
      }, 240);
    }
  }

  private applyDismissDrag(dy: number): void {
    const media = this.mediaElements[this.index];
    this.dragX = 0;
    this.dragY = dy;
    this.updateTrack(false);

    const progress = Math.min(1, Math.abs(dy) / Math.max(1, this.viewportHeight));
    const scale = Math.max(0.84, 1 - progress * 0.16);
    if (media) {
      media.style.transition = 'none';
      media.style.transform = `translate3d(0px, ${dy}px, 0) scale(${scale})`;
    }
    if (this.backdrop) {
      this.backdrop.style.opacity = String(1 - Math.min(0.9, progress * 1.35));
    }
  }

  private cancelActiveGesture(): void {
    if (!this.pointers.size && this.mode === 'none' && !this.dragX && !this.dragY) {
      return;
    }

    const mode = this.mode;
    const pointers = [...this.pointers.values()];
    this.pointers.clear();
    this.mode = 'none';
    this.dragX = 0;
    this.dragY = 0;
    this.releasePointerCaptures(pointers);

    if (!this.openState || this.closing) {
      return;
    }

    if (mode === 'dismiss') {
      this.resetDismissDrag();
      return;
    }
    if (mode === 'swipe') {
      this.updateTrack(true);
    }
  }

  private releasePointerCaptures(pointers: Point[]): void {
    const root = this.root;
    if (!root) {
      return;
    }
    pointers.forEach((pointer) => {
      if (root.hasPointerCapture(pointer.id)) {
        root.releasePointerCapture(pointer.id);
      }
    });
  }

  private updateTrack(animated = false): void {
    if (!this.track) {
      return;
    }
    this.track.style.transition = animated ? 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
    const x = -this.index * this.viewportWidth + this.dragX;
    this.track.style.transform = `translate3d(${x}px, 0, 0)`;
  }

  private applyActiveMediaTransform(animated: boolean): void {
    const media = this.mediaElements[this.index];
    const state = this.activeState();
    if (!media) {
      return;
    }
    media.style.transition = animated ? 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
    media.style.transform = `translate3d(${state.translateX}px, ${state.translateY}px, 0) scale(${state.scale})`;
  }

  private clampActiveState(): void {
    const state = this.activeState();
    const media = this.mediaElements[this.index];
    if (!media || state.scale <= 1.01) {
      if (state.scale <= 1.01) {
        state.scale = 1;
        state.translateX = 0;
        state.translateY = 0;
      }
      return;
    }
    const rect = media.getBoundingClientRect();
    const baseWidth = rect.width / state.scale;
    const baseHeight = rect.height / state.scale;
    const maxX = Math.max(0, (baseWidth * state.scale - this.viewportWidth) / 2);
    const maxY = Math.max(0, (baseHeight * state.scale - this.viewportHeight) / 2);
    state.translateX = clamp(state.translateX, -maxX, maxX);
    state.translateY = clamp(state.translateY, -maxY, maxY);
  }

  private activeState(): SlideState {
    return this.slideStates[this.index] ?? this.createSlideState();
  }

  private resetSlideState(index: number): void {
    this.slideStates[index] = this.createSlideState();
    const media = this.mediaElements[index];
    if (media) {
      media.style.transition = 'none';
      media.style.transform = '';
    }
  }

  private createSlideState(): SlideState {
    return { scale: 1, translateX: 0, translateY: 0, lastTapAt: 0 };
  }

  private updateCounter(): void {
    if (!this.counter) {
      return;
    }
    this.counter.textContent = `${this.index + 1} / ${this.items.length}`;
  }

  private pauseInactiveVideos(activeIndex: number): void {
    this.mediaElements.forEach((element, index) => {
      if (index !== activeIndex && element instanceof HTMLVideoElement) {
        element.pause();
      }
    });
  }

  private async layoutMediaElements(): Promise<void> {
    const viewport = this.viewportRect();
    await Promise.all(this.items.map(async (item, index) => {
      const media = this.mediaElements[index];
      if (!media) {
        return;
      }
      const size = await resolveMediaSize(
        item,
        index === this.index ? this.options?.sourceImageSize : null
      );
      const frame = targetGeometryFor(size, viewport).visibleFrame;
      media.style.width = `${frame.width}px`;
      media.style.height = `${frame.height}px`;
    }));
  }

  private lockDocumentScroll(): void {
    this.previousBodyOverflow = document.body.style.overflow;
    this.previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }

  private unlockDocumentScroll(): void {
    document.body.style.overflow = this.previousBodyOverflow;
    document.documentElement.style.overflow = this.previousHtmlOverflow;
  }

  private nextFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
}

export function createGaleria(): GaleriaController {
  return new GaleriaViewer();
}

function distance(first: Point, second: Point): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

export function sourceRectFromElement(element: HTMLElement): GaleriaRect {
  return rectFromDOMRect(element.getBoundingClientRect());
}
