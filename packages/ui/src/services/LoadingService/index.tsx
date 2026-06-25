/**
 * @file LoadingService
 *
 * A global, service-driven loading HUD. The service owns scheduling and
 * collision rules; the Provider only renders the current snapshot.
 */

import * as React from 'react';
import { Feather } from '@expo/vector-icons';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { wp } from 'y2kit-tools';
import { useI18n } from '../../i18n/useI18n';
import { useTheme } from '../../theme/useTheme';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { Text } from '../../ui/Text';

// ============================================================================
// Public Types
// ============================================================================

export type LoadingStatus = 'loading' | 'success' | 'error';
export type LoadingLiveRegion = 'none' | 'polite' | 'assertive';
export type LoadingDismissReason = 'api' | 'timeout' | 'replace' | 'provider-unmount';
export type LoadingOpenChangeReason = 'show' | 'update' | LoadingDismissReason;

export type LoadingLabels = {
  loading: string;
  success: string;
  error: string;
};

export type LoadingColors = {
  backdrop?: string;
  card?: string;
  foreground?: string;
  shadow?: string;
};

export type LoadingOpenChangeMeta = {
  id: string;
  open: boolean;
  reason: LoadingOpenChangeReason;
  status: LoadingStatus;
};

export type LoadingIconRenderContext = {
  item: LoadingItem;
  status: LoadingStatus;
  color: string;
  size: number;
};

export type LoadingRenderContext = {
  item: LoadingItem;
  id: string;
  status: LoadingStatus;
  title?: React.ReactNode;
  description?: React.ReactNode;
  open: boolean;
  hide: (reason?: LoadingDismissReason) => void;
  update: (patch: LoadingUpdateOptions) => void;
  defaultIcon: React.ReactNode;
};

export type LoadingShowOptions = {
  id?: string;
  status?: LoadingStatus;
  title?: React.ReactNode;
  description?: React.ReactNode;
  blocking?: boolean;
  duration?: number;
  timeout?: number;
  icon?: React.ReactNode | false | ((context: LoadingIconRenderContext) => React.ReactNode);
  render?: (context: LoadingRenderContext) => React.ReactNode;
  colors?: LoadingColors;
  accessibilityLabel?: string;
  accessibilityLiveRegion?: LoadingLiveRegion;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  onDismiss?: (reason: LoadingDismissReason, id: string) => void;
  onOpenChange?: (open: boolean, meta: LoadingOpenChangeMeta) => void;
};

export type LoadingResultOptions = Omit<LoadingShowOptions, 'status' | 'timeout'>;
export type LoadingUpdateOptions = Partial<Omit<LoadingShowOptions, 'id'>>;
export type LoadingInput = React.ReactNode | LoadingShowOptions;
export type LoadingResultInput = React.ReactNode | LoadingResultOptions;
export type LoadingPromiseResultInput<T> =
  | LoadingResultInput
  | false
  | ((result: T) => LoadingResultInput | false | undefined);
export type LoadingPromiseErrorInput<T> =
  | LoadingResultInput
  | false
  | ((error: unknown, result?: T) => LoadingResultInput | false | undefined);

export type LoadingPromiseOptions<T = unknown> = {
  loading?: LoadingInput | false;
  success?: LoadingPromiseResultInput<T>;
  error?: LoadingPromiseErrorInput<T>;
  isSuccess?: (result: T) => boolean;
};

export type LoadingDefaults = {
  blocking?: boolean;
  loadingTimeout?: number;
  successDuration?: number;
  errorDuration?: number;
  accessibilityLiveRegion?: LoadingLiveRegion;
  labels?: Partial<LoadingLabels>;
  colors?: LoadingColors;
};

export type LoadingProviderProps = {
  children: React.ReactNode;
  defaults?: LoadingDefaults;
};

export type LoadingItem = {
  id: string;
  status: LoadingStatus;
  title?: React.ReactNode;
  description?: React.ReactNode;
  blocking: boolean;
  duration: number;
  timeout: number;
  icon?: LoadingShowOptions['icon'];
  render?: LoadingShowOptions['render'];
  colors?: LoadingColors;
  accessibilityLabel: string;
  accessibilityLiveRegion: LoadingLiveRegion;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  open: boolean;
  createdAt: number;
  updatedAt: number;
  onDismiss?: LoadingShowOptions['onDismiss'];
  onOpenChange?: LoadingShowOptions['onOpenChange'];
};

export type LoadingSnapshot = {
  item: LoadingItem | null;
};

export type LoadingHandle = {
  readonly id: string;
  hide: (reason?: LoadingDismissReason) => void;
  update: (patch: LoadingUpdateOptions) => void;
  success: (options?: LoadingResultInput) => void;
  error: (options?: LoadingResultInput) => void;
  isActive: () => boolean;
};

export type LoadingResolvedDefaults = {
  blocking: boolean;
  loadingTimeout: number;
  successDuration: number;
  errorDuration: number;
  accessibilityLiveRegion: LoadingLiveRegion;
  labels: LoadingLabels;
  colors?: LoadingColors;
};

export type LoadingService = {
  configure: (defaults?: LoadingDefaults) => void;
  getDefaults: () => LoadingResolvedDefaults;
  getSnapshot: () => LoadingSnapshot;
  show: (options?: LoadingInput) => LoadingHandle;
  success: (options?: LoadingResultInput) => LoadingHandle;
  error: (options?: LoadingResultInput) => LoadingHandle;
  promise: <T>(promise: Promise<T>, options?: LoadingPromiseOptions<T>) => Promise<T>;
  update: (idOrHandle: string | LoadingHandle, patch: LoadingUpdateOptions) => boolean;
  hide: (idOrHandle?: string | LoadingHandle, reason?: LoadingDismissReason) => void;
  hideAll: (reason?: LoadingDismissReason) => void;
  isActive: (idOrHandle: string | LoadingHandle) => boolean;
};

type InternalLoadingItem = LoadingItem & {
  dismissedReason?: LoadingDismissReason;
};

type LoadingListener = () => void;

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_LABELS: LoadingLabels = {
  loading: 'Loading',
  success: 'Done',
  error: 'Failed',
};

const DEFAULTS: LoadingResolvedDefaults = {
  blocking: true,
  loadingTimeout: 15000,
  successDuration: 1200,
  errorDuration: 1600,
  accessibilityLiveRegion: 'polite',
  labels: DEFAULT_LABELS,
  colors: undefined,
};

const EMPTY_SNAPSHOT: LoadingSnapshot = { item: null };
const DEFAULT_ID_PREFIX = 'loading';

const HOST_Z_INDEX = 9999;
const ENTER_DURATION = 170;
const EXIT_DURATION = 150;
const CONTENT_SWAP_DURATION = 130;
const HUD_MIN_WIDTH = wp(128);
const HUD_MAX_WIDTH = wp(260);
const HUD_MIN_HEIGHT = wp(116);
const HUD_RADIUS = wp(18);
const HUD_PADDING_HORIZONTAL = wp(18);
const HUD_PADDING_VERTICAL = wp(18);
const ICON_FRAME_SIZE = wp(46);
const LOADING_ICON_SIZE = wp(35);
const RESULT_ICON_SIZE = wp(39);
const TITLE_MARGIN_TOP = wp(10);
const DESCRIPTION_MARGIN_TOP = wp(4);
const TITLE_MAX_WIDTH = wp(214);
const IOS_SHADOW_OFFSET_Y = wp(9);
const IOS_SHADOW_RADIUS = wp(22);
const CONTENT_ENTER_OFFSET = wp(3);
const HOST_BACKDROP = 'rgba(15, 23, 42, 0.10)';

const IS_IOS = Platform.OS === 'ios';
const IS_ANDROID = Platform.OS === 'android';
const IS_WEB = Platform.OS === 'web';

const ENTER_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const EXIT_EASING = Easing.bezier(0.4, 0, 1, 1);
const CONTENT_EASING = Easing.out(Easing.cubic);
const ENTER_SPRING = {
  damping: 18,
  stiffness: 260,
  mass: 0.72,
};

const webShadowStyle: StyleProp<ViewStyle> = IS_WEB
  ? ({
      boxShadow: '0 18px 42px rgba(15, 23, 42, 0.24)',
    } as ViewStyle)
  : undefined;

// ============================================================================
// Normalizers
// ============================================================================

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeMs(value: unknown, fallback: number) {
  if (!isFiniteNumber(value)) return fallback;
  return Math.max(0, value);
}

function normalizeLiveRegion(value: unknown, fallback: LoadingLiveRegion): LoadingLiveRegion {
  if (value === 'none' || value === 'polite' || value === 'assertive') return value;
  return fallback;
}

function normalizeStatus(value: unknown, fallback: LoadingStatus): LoadingStatus {
  if (value === 'loading' || value === 'success' || value === 'error') return value;
  return fallback;
}

function normalizeId(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const id = value.trim();
  return id || undefined;
}

function normalizeNode(value: unknown): React.ReactNode | undefined {
  if (value == null || value === false || value === true) return undefined;
  if (value instanceof Error) return value.message || String(value);
  return value as React.ReactNode;
}

function isOptionsInput(value: unknown): value is LoadingShowOptions {
  if (!value || typeof value !== 'object' || Array.isArray(value) || React.isValidElement(value)) return false;
  if (value instanceof Error) return false;
  return (
    'id' in value ||
    'status' in value ||
    'title' in value ||
    'description' in value ||
    'blocking' in value ||
    'duration' in value ||
    'timeout' in value ||
    'icon' in value ||
    'render' in value ||
    'colors' in value ||
    'accessibilityLabel' in value ||
    'accessibilityLiveRegion' in value ||
    'testID' in value ||
    'style' in value ||
    'onDismiss' in value ||
    'onOpenChange' in value
  );
}

function getTextFromNode(value: React.ReactNode): string {
  if (value == null || typeof value === 'boolean') return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(getTextFromNode).filter(Boolean).join(' ').trim();
  if (React.isValidElement<{ children?: React.ReactNode }>(value)) return getTextFromNode(value.props.children);
  return '';
}

function createAccessibilityLabel(status: LoadingStatus, title: React.ReactNode, description: React.ReactNode, labels: LoadingLabels) {
  const titleText = getTextFromNode(title);
  const descriptionText = getTextFromNode(description);
  const statusText = labels[status];
  const text = [titleText, descriptionText].filter(Boolean).join('，');
  if (!text || text === statusText) return statusText;
  return `${statusText}，${text}`;
}

function getHandleId(idOrHandle: string | LoadingHandle | undefined) {
  if (!idOrHandle) return undefined;
  if (typeof idOrHandle === 'string') return normalizeId(idOrHandle);
  return normalizeId(idOrHandle.id);
}

function getStatusDefaultDuration(status: LoadingStatus, defaults: LoadingResolvedDefaults) {
  if (status === 'success') return defaults.successDuration;
  if (status === 'error') return defaults.errorDuration;
  return 0;
}

function getStatusDefaultBlocking(status: LoadingStatus, defaults: LoadingResolvedDefaults) {
  return status === 'loading' ? defaults.blocking : false;
}

function mergeDefaults(base: LoadingResolvedDefaults, patch?: LoadingDefaults): LoadingResolvedDefaults {
  if (!patch) return base;
  return {
    blocking: patch.blocking ?? base.blocking,
    loadingTimeout: normalizeMs(patch.loadingTimeout, base.loadingTimeout),
    successDuration: normalizeMs(patch.successDuration, base.successDuration),
    errorDuration: normalizeMs(patch.errorDuration, base.errorDuration),
    accessibilityLiveRegion: normalizeLiveRegion(patch.accessibilityLiveRegion, base.accessibilityLiveRegion),
    labels: {
      ...base.labels,
      ...(patch.labels ?? {}),
    },
    colors: patch.colors ? { ...(base.colors ?? {}), ...patch.colors } : base.colors,
  };
}

function warnMissingProvider() {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn('[loading] LoadingProvider is not mounted.');
  }
}

function createBusinessError<T>(message: string, response: T, cause?: unknown) {
  const error = new Error(message || DEFAULT_LABELS.error) as Error & { response?: T; cause?: unknown };
  error.response = response;
  if (cause !== undefined) error.cause = cause;
  return error;
}

function coerceInputToOptions(input: LoadingInput | LoadingResultInput | undefined): LoadingShowOptions {
  if (isOptionsInput(input)) return input;
  return { title: normalizeNode(input) };
}

function attachIdToInput(input: LoadingResultInput | undefined, id: string): LoadingResultInput {
  if (isOptionsInput(input)) return { ...input, id };
  if (input === undefined) return { id };
  return { id, title: normalizeNode(input) };
}

function resolvePromiseResult<T>(
  input: LoadingPromiseResultInput<T> | undefined,
  result: T
): LoadingResultInput | false | undefined {
  if (typeof input !== 'function') return input;
  try {
    return input(result);
  } catch (error) {
    console.error('[loading] success resolver failed', error);
    return undefined;
  }
}

function resolvePromiseError<T>(
  input: LoadingPromiseErrorInput<T> | undefined,
  error: unknown,
  result?: T
): LoadingResultInput | false | undefined {
  if (typeof input !== 'function') return input;
  try {
    return input(error, result);
  } catch (resolverError) {
    console.error('[loading] error resolver failed', resolverError);
    return undefined;
  }
}

// ============================================================================
// Store
// ============================================================================

class LoadingStore implements LoadingService {
  private defaults: LoadingResolvedDefaults = DEFAULTS;
  private snapshot: LoadingSnapshot = EMPTY_SNAPSHOT;
  private listeners = new Set<LoadingListener>();
  private autoHideTimer: ReturnType<typeof setTimeout> | null = null;
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private idSeed = 0;
  private hostCount = 0;

  configure(defaults?: LoadingDefaults) {
    this.defaults = mergeDefaults(DEFAULTS, defaults);
  }

  getDefaults() {
    return {
      ...this.defaults,
      labels: { ...this.defaults.labels },
      colors: this.defaults.colors ? { ...this.defaults.colors } : undefined,
    };
  }

  getSnapshot = () => this.snapshot;

  subscribe = (listener: LoadingListener) => {
    this.listeners.add(listener);
    this.hostCount += 1;
    this.scheduleCurrent();

    return () => {
      this.listeners.delete(listener);
      this.hostCount = Math.max(0, this.hostCount - 1);
      if (this.hostCount === 0) this.clearAll('provider-unmount');
    };
  };

  show(options?: LoadingInput) {
    const item = this.resolveItem(options, 'loading');
    return this.openItem(item);
  }

  success(options?: LoadingResultInput) {
    const item = this.resolveItem(options, 'success');
    return this.openItem(item);
  }

  error(options?: LoadingResultInput) {
    const item = this.resolveItem(options, 'error');
    return this.openItem(item);
  }

  async promise<T>(promise: Promise<T>, options: LoadingPromiseOptions<T> = {}): Promise<T> {
    const handle = options.loading === false ? null : this.show(options.loading);

    let result: T;
    try {
      result = await promise;
    } catch (error) {
      this.completePromiseFailure(handle, resolvePromiseError(options.error, error));
      throw error;
    }

    let ok = true;
    let successCheckError: unknown;
    if (typeof options.isSuccess === 'function') {
      try {
        ok = Boolean(options.isSuccess(result));
      } catch (error) {
        ok = false;
        successCheckError = error;
      }
    }

    if (ok) {
      this.completePromiseSuccess(handle, resolvePromiseResult(options.success, result));
      return result;
    }

    const errorInput = resolvePromiseError(options.error, successCheckError, result);
    this.completePromiseFailure(handle, errorInput);
    const errorOptions = coerceInputToOptions(errorInput === false ? undefined : errorInput);
    const message = getTextFromNode(errorOptions.title) || this.defaults.labels.error;
    throw createBusinessError(message, result, successCheckError);
  }

  update(idOrHandle: string | LoadingHandle, patch: LoadingUpdateOptions) {
    const id = getHandleId(idOrHandle);
    if (!id) return false;
    const current = this.snapshot.item as InternalLoadingItem | null;
    if (!current || current.id !== id || !current.open) return false;

    const nextItem = this.applyPatch(current, patch);
    this.setItem(nextItem);
    this.callOpenChange(nextItem, true, 'update');
    this.scheduleCurrent();
    return true;
  }

  hide(idOrHandle?: string | LoadingHandle, reason: LoadingDismissReason = 'api') {
    const id = getHandleId(idOrHandle) ?? this.snapshot.item?.id;
    if (!id) return;
    this.hideById(id, reason);
  }

  hideAll(reason: LoadingDismissReason = 'api') {
    const id = this.snapshot.item?.id;
    if (!id) return;
    this.hideById(id, reason);
  }

  isActive(idOrHandle: string | LoadingHandle) {
    const id = getHandleId(idOrHandle);
    return Boolean(id && this.snapshot.item?.id === id && this.snapshot.item.open);
  }

  completeExit(id: string) {
    const current = this.snapshot.item;
    if (!current || current.id !== id || current.open) return;
    this.setItem(null);
  }

  private openItem(item: InternalLoadingItem): LoadingHandle {
    if (this.hostCount <= 0) warnMissingProvider();

    const current = this.snapshot.item as InternalLoadingItem | null;
    if (current?.id === item.id) {
      const nextItem = {
        ...current,
        ...item,
        open: true,
        createdAt: current.createdAt,
        updatedAt: Date.now(),
        dismissedReason: undefined,
      };
      this.setItem(nextItem);
      this.callOpenChange(nextItem, true, current.open ? 'update' : 'show');
      this.scheduleCurrent();
      return this.createHandle(nextItem.id);
    }

    if (current) {
      this.clearTimers();
      if (current.open) {
        this.callDismiss(current, 'replace');
        this.callOpenChange(current, false, 'replace');
      }
    }

    this.setItem(item);
    this.callOpenChange(item, true, 'show');
    this.scheduleCurrent();
    return this.createHandle(item.id);
  }

  private hideById(id: string, reason: LoadingDismissReason) {
    const current = this.snapshot.item as InternalLoadingItem | null;
    if (!current || current.id !== id || !current.open) return;

    this.clearTimers();
    const nextItem: InternalLoadingItem = {
      ...current,
      open: false,
      updatedAt: Date.now(),
      dismissedReason: reason,
    };
    this.callDismiss(nextItem, reason);
    this.callOpenChange(nextItem, false, reason);
    this.setItem(nextItem);
  }

  private clearAll(reason: LoadingDismissReason) {
    this.clearTimers();
    const current = this.snapshot.item as InternalLoadingItem | null;
    if (current) this.callDismiss(current, reason);
    this.setItem(null);
  }

  private resolveItem(input: LoadingInput | LoadingResultInput | undefined, defaultStatus: LoadingStatus): InternalLoadingItem {
    const raw = coerceInputToOptions(input);
    const status = normalizeStatus(raw.status, defaultStatus);
    const now = Date.now();
    const hasCustomBody = typeof raw.render === 'function';
    const title = normalizeNode(raw.title) ?? (hasCustomBody ? undefined : this.defaults.labels[status]);
    const description = normalizeNode(raw.description);
    const duration = normalizeMs(raw.duration, getStatusDefaultDuration(status, this.defaults));
    const timeout = status === 'loading' ? normalizeMs(raw.timeout, this.defaults.loadingTimeout) : 0;

    return {
      id: normalizeId(raw.id) ?? this.createId(),
      status,
      title,
      description,
      blocking: raw.blocking ?? getStatusDefaultBlocking(status, this.defaults),
      duration,
      timeout,
      icon: raw.icon,
      render: raw.render,
      colors: raw.colors ? { ...(this.defaults.colors ?? {}), ...raw.colors } : this.defaults.colors,
      accessibilityLabel:
        raw.accessibilityLabel ?? createAccessibilityLabel(status, title, description, this.defaults.labels),
      accessibilityLiveRegion: normalizeLiveRegion(raw.accessibilityLiveRegion, this.defaults.accessibilityLiveRegion),
      testID: raw.testID,
      style: raw.style,
      open: true,
      createdAt: now,
      updatedAt: now,
      onDismiss: raw.onDismiss,
      onOpenChange: raw.onOpenChange,
    };
  }

  private applyPatch(item: InternalLoadingItem, patch: LoadingUpdateOptions): InternalLoadingItem {
    const status = normalizeStatus(patch.status, item.status);
    const title = 'title' in patch ? normalizeNode(patch.title) : item.title;
    const description = 'description' in patch ? normalizeNode(patch.description) : item.description;
    const duration =
      'duration' in patch ? normalizeMs(patch.duration, getStatusDefaultDuration(status, this.defaults)) : item.duration;
    const timeout =
      status === 'loading'
        ? 'timeout' in patch
          ? normalizeMs(patch.timeout, this.defaults.loadingTimeout)
          : item.timeout
        : 0;

    return {
      ...item,
      status,
      title,
      description,
      blocking: patch.blocking ?? item.blocking,
      duration,
      timeout,
      icon: 'icon' in patch ? patch.icon : item.icon,
      render: 'render' in patch ? patch.render : item.render,
      colors: patch.colors ? { ...(item.colors ?? {}), ...patch.colors } : item.colors,
      accessibilityLabel:
        patch.accessibilityLabel ?? createAccessibilityLabel(status, title, description, this.defaults.labels),
      accessibilityLiveRegion: normalizeLiveRegion(patch.accessibilityLiveRegion, item.accessibilityLiveRegion),
      testID: patch.testID ?? item.testID,
      style: 'style' in patch ? patch.style : item.style,
      updatedAt: Date.now(),
      onDismiss: patch.onDismiss ?? item.onDismiss,
      onOpenChange: patch.onOpenChange ?? item.onOpenChange,
    };
  }

  private scheduleCurrent() {
    this.clearTimers();
    const current = this.snapshot.item;
    if (!current || !current.open || this.hostCount <= 0) return;

    if (current.duration > 0) {
      this.autoHideTimer = setTimeout(() => {
        this.hideById(current.id, 'timeout');
      }, current.duration);
    }

    if (current.status === 'loading' && current.timeout > 0) {
      this.timeoutTimer = setTimeout(() => {
        this.hideById(current.id, 'timeout');
      }, current.timeout);
    }
  }

  private clearTimers() {
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }

  private setItem(item: InternalLoadingItem | null) {
    this.snapshot = item ? { item } : EMPTY_SNAPSHOT;
    this.listeners.forEach((listener) => listener());
  }

  private completePromiseSuccess(handle: LoadingHandle | null, input: LoadingResultInput | false | undefined) {
    if (input === false) {
      handle?.hide();
      return;
    }
    if (handle && !this.isActive(handle)) return;
    this.success(handle ? attachIdToInput(input, handle.id) : input);
  }

  private completePromiseFailure(handle: LoadingHandle | null, input: LoadingResultInput | false | undefined) {
    if (input === false) {
      handle?.hide();
      return;
    }
    if (handle && !this.isActive(handle)) return;
    this.error(handle ? attachIdToInput(input, handle.id) : input);
  }

  private createId() {
    this.idSeed += 1;
    return `${DEFAULT_ID_PREFIX}_${Date.now()}_${this.idSeed}`;
  }

  private createHandle(id: string): LoadingHandle {
    return {
      id,
      hide: (reason = 'api') => this.hide(id, reason),
      update: (patch) => {
        this.update(id, patch);
      },
      success: (options) => {
        this.success(attachIdToInput(options, id));
      },
      error: (options) => {
        this.error(attachIdToInput(options, id));
      },
      isActive: () => this.isActive(id),
    };
  }

  private callDismiss(item: InternalLoadingItem, reason: LoadingDismissReason) {
    if (item.dismissedReason && item.dismissedReason !== reason) return;
    try {
      item.onDismiss?.(reason, item.id);
    } catch (error) {
      console.error('[loading] onDismiss failed', error);
    }
  }

  private callOpenChange(item: LoadingItem, open: boolean, reason: LoadingOpenChangeReason) {
    try {
      item.onOpenChange?.(open, { id: item.id, open, reason, status: item.status });
    } catch (error) {
      console.error('[loading] onOpenChange failed', error);
    }
  }
}

const loadingStore = new LoadingStore();

export const loading: LoadingService = loadingStore;

// ============================================================================
// Provider
// ============================================================================

function useLoadingSnapshot() {
  return React.useSyncExternalStore(loadingStore.subscribe, loadingStore.getSnapshot, loadingStore.getSnapshot);
}

export function LoadingProvider({ children, defaults }: LoadingProviderProps) {
  const snapshot = useLoadingSnapshot();
  const { t } = useI18n();

  const providerDefaults = React.useMemo<LoadingDefaults>(
    () => ({
      ...defaults,
      labels: {
        loading: t('loading.loading'),
        success: t('loading.success'),
        error: t('loading.error'),
        ...(defaults?.labels ?? {}),
      },
    }),
    [defaults, t]
  );

  React.useEffect(() => {
    loadingStore.configure(providerDefaults);
  }, [providerDefaults]);

  const handleExited = React.useCallback((id: string) => {
    loadingStore.completeExit(id);
  }, []);

  return (
    <>
      {children}
      <LoadingHost item={snapshot.item} onExited={handleExited} />
    </>
  );
}

// ============================================================================
// UI
// ============================================================================

type LoadingHostProps = {
  item: LoadingItem | null;
  onExited: (id: string) => void;
};

type LoadingCardProps = {
  item: LoadingItem;
  onExited: (id: string) => void;
};

type ResolvedColors = Required<Pick<LoadingColors, 'backdrop' | 'card' | 'foreground' | 'shadow'>>;

function LoadingHost({ item, onExited }: LoadingHostProps) {
  if (!item) return null;
  const pointerEvents = item.open ? (item.blocking ? 'auto' : 'none') : 'none';

  return (
    <View
      pointerEvents={pointerEvents}
      style={styles.host}
      accessibilityElementsHidden={!item.open}
      importantForAccessibility={item.open ? 'yes' : 'no-hide-descendants'}
      collapsable={false}
    >
      <LoadingCard item={item} onExited={onExited} />
    </View>
  );
}

function resolveColors(item: LoadingItem, themeColors: ReturnType<typeof useTheme>['colors']): ResolvedColors {
  return {
    backdrop: item.colors?.backdrop ?? (item.blocking ? HOST_BACKDROP : 'transparent'),
    card: item.colors?.card ?? themeColors.onSurface,
    foreground: item.colors?.foreground ?? themeColors.surface,
    shadow: item.colors?.shadow ?? '#000000',
  };
}

function LoadingCard({ item, onExited }: LoadingCardProps) {
  const theme = useTheme();
  const colors = resolveColors(item, theme.colors);
  const opacity = useSharedValue(item.open ? 1 : 0);
  const scale = useSharedValue(item.open ? 1 : 0.965);
  const translateY = useSharedValue(item.open ? 0 : CONTENT_ENTER_OFFSET);
  const contentProgress = useSharedValue(item.open ? 1 : 0);
  const previousIdRef = React.useRef(item.id);

  React.useEffect(() => {
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(scale);
      cancelAnimation(translateY);
      cancelAnimation(contentProgress);
    };
  }, [contentProgress, opacity, scale, translateY]);

  React.useEffect(() => {
    const isNewItem = previousIdRef.current !== item.id;
    previousIdRef.current = item.id;

    cancelAnimation(opacity);
    cancelAnimation(scale);
    cancelAnimation(translateY);
    cancelAnimation(contentProgress);

    if (item.open) {
      if (isNewItem || opacity.value <= 0.02) {
        opacity.value = 0;
        scale.value = 0.965;
        translateY.value = CONTENT_ENTER_OFFSET;
        contentProgress.value = 0;
      }

      opacity.value = withTiming(1, {
        duration: ENTER_DURATION,
        easing: ENTER_EASING,
        reduceMotion: ReduceMotion.System,
      });
      scale.value = withSpring(1, ENTER_SPRING);
      translateY.value = withSpring(0, ENTER_SPRING);
      contentProgress.value = withTiming(1, {
        duration: CONTENT_SWAP_DURATION,
        easing: CONTENT_EASING,
        reduceMotion: ReduceMotion.System,
      });
      return;
    }

    opacity.value = withTiming(
      0,
      {
        duration: EXIT_DURATION,
        easing: EXIT_EASING,
        reduceMotion: ReduceMotion.System,
      },
      (finished) => {
        if (finished) runOnJS(onExited)(item.id);
      }
    );
    scale.value = withTiming(0.965, {
      duration: EXIT_DURATION,
      easing: EXIT_EASING,
      reduceMotion: ReduceMotion.System,
    });
    translateY.value = withTiming(CONTENT_ENTER_OFFSET, {
      duration: EXIT_DURATION,
      easing: EXIT_EASING,
      reduceMotion: ReduceMotion.System,
    });
    contentProgress.value = withTiming(0, {
      duration: Math.min(EXIT_DURATION, CONTENT_SWAP_DURATION),
      easing: EXIT_EASING,
      reduceMotion: ReduceMotion.System,
    });
  }, [contentProgress, item.id, item.open, onExited, opacity, scale, translateY]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const frameStyle = useAnimatedStyle(() => {
    const progress = opacity.value;
    return {
      opacity: progress,
      transform: [{ translateY: translateY.value }, { scale: scale.value }],
      ...(IS_IOS
        ? {
            shadowOpacity: interpolate(progress, [0, 1], [0, 0.22]),
            shadowRadius: interpolate(progress, [0, 1], [0, IOS_SHADOW_RADIUS]),
          }
        : null),
    };
  });

  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(contentProgress.value, [0, 1], [0.72, 1]),
    transform: [{ translateY: interpolate(contentProgress.value, [0, 1], [CONTENT_ENTER_OFFSET, 0]) }],
  }));

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[styles.backdrop, { backgroundColor: colors.backdrop }, backdropStyle]}
      />
      <Animated.View
        pointerEvents={item.open && item.blocking ? 'auto' : 'none'}
        renderToHardwareTextureAndroid={IS_ANDROID && item.open}
        style={[
          styles.frame,
          webShadowStyle,
          IS_IOS ? { shadowColor: colors.shadow } : undefined,
          frameStyle,
        ]}
        collapsable={false}
      >
        <View style={[styles.card, item.style, { backgroundColor: colors.card }]} testID={item.testID}>
          <Animated.View
            accessible={item.open}
            accessibilityLabel={item.accessibilityLabel}
            accessibilityLiveRegion={item.accessibilityLiveRegion}
            accessibilityViewIsModal={item.blocking}
            style={[styles.content, contentStyle]}
          >
            {renderLoadingContent(item, colors)}
          </Animated.View>
        </View>
      </Animated.View>
    </>
  );
}

function renderLoadingContent(item: LoadingItem, colors: ResolvedColors) {
  const defaultIcon = renderDefaultIcon(item, colors);
  const context: LoadingRenderContext = {
    item,
    id: item.id,
    status: item.status,
    title: item.title,
    description: item.description,
    open: item.open,
    hide: (reason = 'api') => loadingStore.hide(item.id, reason),
    update: (patch) => {
      loadingStore.update(item.id, patch);
    },
    defaultIcon,
  };

  if (item.render) {
    try {
      return item.render(context) ?? null;
    } catch (error) {
      console.error('[loading] render failed', error);
    }
  }

  return (
    <>
      {defaultIcon}
      {item.title ? (
        <Text
          align="center"
          numberOfLines={2}
          size="sm"
          weight="semibold"
          style={[styles.title, { color: colors.foreground }]}
        >
          {item.title}
        </Text>
      ) : null}
      {item.description ? (
        <Text
          align="center"
          numberOfLines={3}
          size="xs"
          weight="regular"
          style={[styles.description, { color: colors.foreground }]}
        >
          {item.description}
        </Text>
      ) : null}
    </>
  );
}

function renderDefaultIcon(item: LoadingItem, colors: ResolvedColors) {
  const color = colors.foreground;
  const size = item.status === 'loading' ? LOADING_ICON_SIZE : RESULT_ICON_SIZE;
  const iconContext: LoadingIconRenderContext = {
    item,
    status: item.status,
    color,
    size,
  };

  if (item.icon === false) return null;
  if (typeof item.icon === 'function') return item.icon(iconContext);
  if (item.icon) return item.icon;

  return (
    <View style={styles.iconFrame}>
      {item.status === 'loading' ? (
        <LoadingSpinner size={LOADING_ICON_SIZE} color={colors.foreground} speed={1.2} animating={item.open} />
      ) : (
        <Feather name={item.status === 'success' ? 'check' : 'x'} size={RESULT_ICON_SIZE} color={color} />
      )}
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: HOST_Z_INDEX,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  frame: {
    alignSelf: 'center',
    borderRadius: HUD_RADIUS,
    maxWidth: HUD_MAX_WIDTH,
    ...Platform.select({
      ios: {
        shadowOffset: { width: wp(0), height: IOS_SHADOW_OFFSET_Y },
      },
    }),
  },
  card: {
    minWidth: HUD_MIN_WIDTH,
    maxWidth: HUD_MAX_WIDTH,
    minHeight: HUD_MIN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: HUD_RADIUS,
    overflow: 'hidden',
    paddingHorizontal: HUD_PADDING_HORIZONTAL,
    paddingVertical: HUD_PADDING_VERTICAL,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFrame: {
    width: ICON_FRAME_SIZE,
    height: ICON_FRAME_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    maxWidth: TITLE_MAX_WIDTH,
    marginTop: TITLE_MARGIN_TOP,
  },
  description: {
    maxWidth: TITLE_MAX_WIDTH,
    marginTop: DESCRIPTION_MARGIN_TOP,
    opacity: 0.82,
  },
});
