export type GaleriaTheme = 'dark' | 'light';

export type GaleriaMediaType = 'image' | 'video';

export type GaleriaObjectFit = 'cover' | 'contain' | 'fill';

export type GaleriaSourceVisibility = 'hidden' | 'visible';

export type GaleriaCloseReason = 'api' | 'backdrop' | 'button' | 'drag' | 'escape' | 'replace';

export type GaleriaChangeReason = 'api' | 'swipe';

export type GaleriaRect = {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

export type GaleriaImageSize = {
  width: number;
  height: number;
};

export type GaleriaMediaItem = {
  id?: string;
  type?: GaleriaMediaType;
  url?: string;
  src?: string;
  poster?: string;
  width?: number;
  height?: number;
  alt?: string;
};

export type GaleriaResolvedItem = {
  id: string;
  type: GaleriaMediaType;
  src: string;
  poster?: string;
  width?: number;
  height?: number;
  alt: string;
  raw: GaleriaMediaItem;
};

export type GaleriaChangeMeta = {
  reason: GaleriaChangeReason;
  previousIndex: number;
  index: number;
  item: GaleriaResolvedItem;
};

export type GaleriaCloseMeta = {
  reason: GaleriaCloseReason;
  index: number;
  item: GaleriaResolvedItem | null;
};

export type GaleriaOpenOptions = {
  items: readonly GaleriaMediaItem[];
  index?: number;
  sourceElement?: HTMLElement | null;
  sourceElements?: readonly (HTMLElement | null | undefined)[];
  getSourceElement?: (index: number, item: GaleriaResolvedItem) => HTMLElement | null | undefined;
  sourceRect?: GaleriaRect | DOMRectReadOnly | null;
  sourceImageSize?: GaleriaImageSize | null;
  objectFit?: GaleriaObjectFit;
  sourceObjectFit?: GaleriaObjectFit;
  sourceVisibility?: GaleriaSourceVisibility;
  theme?: GaleriaTheme;
  closeButton?: boolean;
  counter?: boolean;
  onChange?: (index: number, meta: GaleriaChangeMeta) => void;
  onClose?: (meta: GaleriaCloseMeta) => void;
};

export type GaleriaController = {
  open: (options: GaleriaOpenOptions) => Promise<void>;
  close: (reason?: GaleriaCloseReason) => Promise<void>;
  destroy: () => void;
  getIndex: () => number;
  isOpen: () => boolean;
};
