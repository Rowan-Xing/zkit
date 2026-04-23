import * as React from 'react';
import ImageCropPicker, {
  type CropRect as NativeCropRect,
  type Image as NativeCroppedImage,
} from 'react-native-image-crop-picker';
import type {
  ImageCropperFormat,
  ImageCropperModalProps,
  ImageCropperOutputOptions,
  ImageCropperResult,
  ImageCropperSource,
  ImageCropperSourceInput,
} from '../../ui/ImageCropperModal/index';

export type ImageCropperOptions = Omit<ImageCropperModalProps, 'open' | 'onOpenChange'> & {
  source: NonNullable<ImageCropperModalProps['source']>;
};

export type ImageCropperPickOptions = Omit<ImageCropperOptions, 'source'>;

type NativePickerOptions = Parameters<typeof ImageCropPicker.openPicker>[0] & {
  mediaType: 'photo';
  multiple: false;
  cropping: true;
};

type NativeCropperOptions = Parameters<typeof ImageCropPicker.openCropper>[0];

const DEFAULT_COMPRESS = 0.92;
const DEFAULT_RESULT_EDGE = 1024;
const DEFAULT_TOOLBAR_TITLE = 'Edit Photo';

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function normalizeSource(source: ImageCropperSourceInput | null | undefined): ImageCropperSource | null {
  if (!source) return null;
  if (typeof source === 'string') {
    return { uri: source };
  }
  return source;
}

function normalizeAspectRatio(value: number | null | undefined) {
  if (value === null) return null;
  if (isPositiveNumber(value)) return value;
  return null;
}

function resolveAspectRatio(
  cropBox: ImageCropperModalProps['cropBox'],
  square: ImageCropperModalProps['square'],
  legacyAspectRatio: ImageCropperModalProps['aspectRatio']
) {
  if (cropBox && Object.prototype.hasOwnProperty.call(cropBox, 'aspectRatio')) {
    const nextAspectRatio = normalizeAspectRatio(cropBox.aspectRatio);
    if (nextAspectRatio) return nextAspectRatio;
    return cropBox.mode === 'interactive' ? null : 1;
  }

  if (square) return 1;
  if (isPositiveNumber(legacyAspectRatio)) return legacyAspectRatio;
  return cropBox?.mode === 'interactive' ? null : 1;
}

function fitSizeWithinBounds(maxWidth: number, maxHeight: number, aspectRatio: number) {
  const safeWidth = Math.max(1, Math.round(maxWidth));
  const safeHeight = Math.max(1, Math.round(maxHeight));

  let width = safeWidth;
  let height = Math.round(width / aspectRatio);

  if (height > safeHeight) {
    height = safeHeight;
    width = Math.max(1, Math.round(height * aspectRatio));
  }

  return {
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
}

function resolveTargetSize(
  output: ImageCropperOutputOptions | undefined,
  aspectRatio: number | null
) {
  const outputWidth = isPositiveNumber(output?.width) ? Math.round(output.width) : undefined;
  const outputHeight = isPositiveNumber(output?.height) ? Math.round(output.height) : undefined;
  const maxWidth = isPositiveNumber(output?.maxWidth) ? Math.round(output.maxWidth) : undefined;
  const maxHeight = isPositiveNumber(output?.maxHeight) ? Math.round(output.maxHeight) : undefined;

  if (outputWidth && outputHeight) {
    return { width: outputWidth, height: outputHeight };
  }

  if (aspectRatio) {
    if (outputWidth) {
      return {
        width: outputWidth,
        height: Math.max(1, Math.round(outputWidth / aspectRatio)),
      };
    }

    if (outputHeight) {
      return {
        width: Math.max(1, Math.round(outputHeight * aspectRatio)),
        height: outputHeight,
      };
    }

    return fitSizeWithinBounds(
      maxWidth ?? DEFAULT_RESULT_EDGE,
      maxHeight ?? DEFAULT_RESULT_EDGE,
      aspectRatio
    );
  }

  return {
    width: outputWidth ?? maxWidth ?? DEFAULT_RESULT_EDGE,
    height: outputHeight ?? maxHeight ?? DEFAULT_RESULT_EDGE,
  };
}

function resolveFormat(
  preferredFormat: ImageCropperFormat | undefined,
  sourceMimeType: string | undefined
): ImageCropperFormat {
  if (preferredFormat) return preferredFormat;
  if (sourceMimeType === 'image/png') return 'png';
  if (sourceMimeType === 'image/webp') return 'webp';
  return 'jpeg';
}

function resolveMimeType(format: ImageCropperFormat) {
  switch (format) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
}

function resolveFileExtension(format: ImageCropperFormat) {
  return format === 'jpeg' ? 'jpg' : format;
}

function resolveBaseName(preferredName: string | undefined, fallbackUri: string) {
  const explicitName = preferredName?.trim();
  if (explicitName) {
    return explicitName.replace(/\.[^.]+$/, '') || 'cropped';
  }

  const uriPath = fallbackUri.split('?')[0]?.split('#')[0] ?? '';
  const uriName = uriPath.split('/').pop()?.trim() ?? '';
  return uriName.replace(/\.[^.]+$/, '') || `cropped_${Date.now()}`;
}

function buildFileName(
  source: ImageCropperSource,
  image: NativeCroppedImage,
  output: ImageCropperOutputOptions | undefined
) {
  if (output?.fileName?.trim()) return output.fileName.trim();

  const format = resolveFormat(output?.format, image.mime ?? source.mimeType);
  const baseName = resolveBaseName(image.filename ?? source.fileName, image.path || source.uri);
  return `${baseName}.${resolveFileExtension(format)}`;
}

function resolveCropperInputPath(uri: string) {
  if (!uri) return uri;
  if (uri.startsWith('file://')) {
    return decodeURIComponent(uri.replace(/^file:\/\//, ''));
  }
  return uri;
}

function resolveOutputUri(path: string) {
  if (!path) return path;
  if (/^(file|content|ph|assets-library):/i.test(path)) return path;
  if (path.startsWith('/')) return `file://${path}`;
  return path;
}

function normalizeCropRect(cropRect: NativeCropRect | null | undefined, width: number, height: number) {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));

  if (!cropRect) {
    return {
      originX: 0,
      originY: 0,
      width: safeWidth,
      height: safeHeight,
    };
  }

  return {
    originX: Math.max(0, Math.round(cropRect.x)),
    originY: Math.max(0, Math.round(cropRect.y)),
    width: clampNumber(Math.round(cropRect.width), 1, safeWidth),
    height: clampNumber(Math.round(cropRect.height), 1, safeHeight),
  };
}

function buildPickerOptions(
  options: ImageCropperPickOptions | ImageCropperOptions,
  sourceMimeType?: string
): NativePickerOptions {
  const aspectRatio = resolveAspectRatio(options.cropBox, options.square, options.aspectRatio);
  const targetSize = resolveTargetSize(options.output, aspectRatio);
  const format = resolveFormat(options.output?.format, sourceMimeType);

  return {
    mediaType: 'photo',
    multiple: false,
    cropping: true,
    width: targetSize.width,
    height: targetSize.height,
    freeStyleCropEnabled: options.cropBox?.mode === 'interactive',
    showCropGuidelines: options.cropBox?.showGrid ?? true,
    showCropFrame: true,
    cropperToolbarTitle: options.texts?.title?.trim() || DEFAULT_TOOLBAR_TITLE,
    cropperChooseText: options.texts?.confirm?.trim(),
    cropperCancelText: options.texts?.cancel?.trim(),
    compressImageMaxWidth: isPositiveNumber(options.output?.maxWidth)
      ? Math.round(options.output.maxWidth)
      : undefined,
    compressImageMaxHeight: isPositiveNumber(options.output?.maxHeight)
      ? Math.round(options.output.maxHeight)
      : undefined,
    compressImageQuality: clampNumber(options.output?.compress ?? DEFAULT_COMPRESS, 0, 1),
    forceJpg: format === 'jpeg',
    avoidEmptySpaceAroundImage: true,
    cropperToolbarColor: '#0B1017',
    cropperToolbarWidgetColor: '#F3F4F6',
    cropperActiveWidgetColor: '#EB5A17',
    cropperTintColor: '#EB5A17',
    cropperStatusBarLight: false,
    cropperNavigationBarLight: false,
  };
}

function mapImageToSource(image: NativeCroppedImage): ImageCropperSource {
  return {
    uri: resolveOutputUri(image.path),
    width: image.width,
    height: image.height,
    fileName: image.filename,
    fileSize: image.size,
    mimeType: image.mime,
  };
}

function mapImageToResult(
  source: ImageCropperSource,
  image: NativeCroppedImage,
  output: ImageCropperOutputOptions | undefined
): ImageCropperResult {
  const format = resolveFormat(output?.format, image.mime ?? source.mimeType);

  return {
    source,
    uri: resolveOutputUri(image.path),
    width: image.width,
    height: image.height,
    fileName: buildFileName(source, image, output),
    fileSize: image.size,
    mimeType: output?.mimeType ?? image.mime ?? resolveMimeType(format),
    cropRect: normalizeCropRect(image.cropRect, image.width, image.height),
  };
}

function isCancellationError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String(error.code) : '';
  const message = 'message' in error ? String(error.message) : '';
  return code === 'E_PICKER_CANCELLED' || /cancel/i.test(message);
}

function toError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) return error;
  if (typeof error === 'string' && error.trim()) return new Error(error.trim());
  if (error && typeof error === 'object' && 'message' in error && error.message) {
    return new Error(String(error.message));
  }
  return new Error(fallbackMessage);
}

class ImageCropperServiceClass {
  private active = false;

  async pick(options: ImageCropperPickOptions): Promise<ImageCropperResult | null> {
    if (this.active) {
      console.warn('[imageCropper] Request ignored while another cropper is active');
      return null;
    }

    try {
      this.active = true;
      const image = await ImageCropPicker.openPicker(buildPickerOptions(options));
      const source = mapImageToSource(image);
      const result = mapImageToResult(source, image, options.output);
      options.onComplete?.(result);
      return result;
    } catch (error) {
      if (isCancellationError(error)) {
        options.onCancel?.();
        return null;
      }
      throw toError(error, options.texts?.processFailed ?? 'Failed to crop image');
    } finally {
      this.active = false;
    }
  }

  async crop(options: ImageCropperOptions): Promise<ImageCropperResult | null> {
    if (this.active) {
      console.warn('[imageCropper] Request ignored while another cropper is active');
      return null;
    }

    const source = normalizeSource(options.source);
    if (!source?.uri) return null;

    try {
      this.active = true;
      const cropperOptions: NativeCropperOptions = {
        ...buildPickerOptions(options, source.mimeType),
        path: resolveCropperInputPath(source.uri),
      };
      const image = await ImageCropPicker.openCropper(cropperOptions);
      const result = mapImageToResult(source, image, options.output);
      options.onComplete?.(result);
      return result;
    } catch (error) {
      if (isCancellationError(error)) {
        options.onCancel?.();
        return null;
      }
      throw toError(error, options.texts?.processFailed ?? 'Failed to crop image');
    } finally {
      this.active = false;
    }
  }

  show(options: ImageCropperOptions): Promise<ImageCropperResult | null> {
    return this.crop(options);
  }

  hide() {
    // Native cropper UI is managed by react-native-image-crop-picker itself.
  }
}

export const imageCropper = new ImageCropperServiceClass();

export function ImageCropperProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
