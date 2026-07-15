/// <reference lib="dom" />

export type NativeImagePreviewWebTheme = 'dark' | 'light';

export type NativeImagePreviewWebMediaType = 'image' | 'video';

export type NativeImagePreviewWebObjectFit = 'cover' | 'contain' | 'fill';

export type NativeImagePreviewWebSourceVisibility = 'hidden' | 'visible';

export type NativeImagePreviewWebCloseReason = 'api' | 'backdrop' | 'button' | 'drag' | 'escape' | 'replace';

export type NativeImagePreviewWebChangeReason = 'api' | 'swipe';

export type NativeImagePreviewWebRect = {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

export type NativeImagePreviewWebImageSize = {
  width: number;
  height: number;
};

export type NativeImagePreviewWebMediaItem = {
  id?: string;
  type?: NativeImagePreviewWebMediaType;
  url?: string;
  src?: string;
  poster?: string;
  width?: number;
  height?: number;
  alt?: string;
};

export type NativeImagePreviewWebResolvedItem = {
  id: string;
  type: NativeImagePreviewWebMediaType;
  src: string;
  poster?: string;
  width?: number;
  height?: number;
  alt: string;
  raw: NativeImagePreviewWebMediaItem;
};

export type NativeImagePreviewWebChangeMeta = {
  reason: NativeImagePreviewWebChangeReason;
  previousIndex: number;
  index: number;
  item: NativeImagePreviewWebResolvedItem;
};

export type NativeImagePreviewWebCloseMeta = {
  reason: NativeImagePreviewWebCloseReason;
  index: number;
  item: NativeImagePreviewWebResolvedItem | null;
};

export type NativeImagePreviewWebOpenOptions = {
  items: readonly NativeImagePreviewWebMediaItem[];
  index?: number;
  sourceElement?: HTMLElement | null;
  sourceElements?: readonly (HTMLElement | null | undefined)[];
  getSourceElement?: (index: number, item: NativeImagePreviewWebResolvedItem) => HTMLElement | null | undefined;
  sourceRect?: NativeImagePreviewWebRect | DOMRectReadOnly | null;
  sourceImageSize?: NativeImagePreviewWebImageSize | null;
  objectFit?: NativeImagePreviewWebObjectFit;
  sourceObjectFit?: NativeImagePreviewWebObjectFit;
  sourceVisibility?: NativeImagePreviewWebSourceVisibility;
  theme?: NativeImagePreviewWebTheme;
  closeButton?: boolean;
  counter?: boolean;
  onChange?: (index: number, meta: NativeImagePreviewWebChangeMeta) => void;
  onClose?: (meta: NativeImagePreviewWebCloseMeta) => void;
};

export type NativeImagePreviewWebController = {
  open: (options: NativeImagePreviewWebOpenOptions) => Promise<void>;
  close: (reason?: NativeImagePreviewWebCloseReason) => Promise<void>;
  destroy: () => void;
  getIndex: () => number;
  isOpen: () => boolean;
};
