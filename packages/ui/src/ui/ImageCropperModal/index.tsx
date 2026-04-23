export type ImageCropperSource = {
  uri: string;
  width?: number;
  height?: number;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  [key: string]: unknown;
};

export type ImageCropperSourceInput = string | ImageCropperSource;

export type ImageCropperCropBoxSize =
  | number
  | {
      width?: number;
      height?: number;
    };

export type ImageCropperCropBoxMode = 'fixed' | 'interactive';

export type ImageCropperCropBoxOptions = {
  mode?: ImageCropperCropBoxMode;
  aspectRatio?: number | null;
  initialSize?: ImageCropperCropBoxSize;
  minSize?: ImageCropperCropBoxSize;
  movable?: boolean;
  resizable?: boolean;
  showGrid?: boolean;
  showHandles?: boolean;
};

export type ImageCropperFormat = 'jpeg' | 'png' | 'webp';

export type ImageCropperOutputOptions = {
  width?: number;
  height?: number;
  maxWidth?: number;
  maxHeight?: number;
  compress?: number;
  format?: ImageCropperFormat;
  fileName?: string;
  mimeType?: string;
};

export type ImageCropperTexts = {
  title?: string;
  description?: string;
  cancel?: string;
  reset?: string;
  confirm?: string;
  loadFailed?: string;
  processFailed?: string;
};

export type ImageCropperRect = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

export type ImageCropperResult = {
  source: ImageCropperSource;
  uri: string;
  width: number;
  height: number;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  cropRect: ImageCropperRect;
};

export type ImageCropperModalProps = {
  open: boolean;
  source: ImageCropperSourceInput | null;
  onOpenChange?: (open: boolean) => void;
  onCancel?: () => void;
  onComplete?: (result: ImageCropperResult) => void;
  cropBox?: ImageCropperCropBoxOptions;
  square?: boolean;
  aspectRatio?: number;
  cropBoxSize?: ImageCropperCropBoxSize;
  maxScale?: number;
  output?: ImageCropperOutputOptions;
  texts?: ImageCropperTexts;
};

// Kept as a compatibility export while the actual implementation now delegates
// cropping to react-native-image-crop-picker in the service layer.
export function ImageCropperModal(_props: ImageCropperModalProps) {
  return null;
}
