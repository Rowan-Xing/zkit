/**
 * @file CardToastService
 * @description A service-driven toast viewport for lightweight global feedback.
 */

import * as React from 'react';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  Animated as RNAnimated,
  Easing as RNEasing,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { wp } from 'zkit-tools';
import { useTheme } from '../../theme/useTheme';
import { Text } from '../../ui/Text';

// ============================================================================
// Public Types
// ============================================================================

export type ToastTone = 'success' | 'error' | 'warning' | 'info' | 'neutral';
export type ToastPlacement = 'top' | 'bottom';
export type ToastStrategy = 'replace' | 'queue' | 'stack';
export type ToastDismissReason =
  | 'timeout'
  | 'action'
  | 'close-button'
  | 'api'
  | 'replace'
  | 'overflow'
  | 'provider-unmount';

export type ToastOpenChangeReason = 'show' | 'update' | ToastDismissReason;

export type ToastOpenChangeMeta = {
  id: string;
  open: boolean;
  reason: ToastOpenChangeReason;
};

export type ToastActionContext = {
  id: string;
  dismiss: (reason?: ToastDismissReason) => void;
  update: (patch: ToastUpdateOptions) => void;
};

export type ToastAction = {
  label: React.ReactNode;
  onPress?: (context: ToastActionContext) => void | boolean | Promise<void | boolean>;
  closeOnPress?: boolean;
  accessibilityLabel?: string;
  testID?: string;
};

export type ToastIconRenderContext = {
  toast: ToastItem;
  tone: ToastTone;
  color: string;
  size: number;
};

export type ToastRenderContext = ToastActionContext & {
  toast: ToastItem;
};

export type ToastOptions = {
  id?: string;
  tone?: ToastTone;
  title?: React.ReactNode;
  description?: React.ReactNode;
  duration?: number;
  placement?: ToastPlacement;
  offset?: number;
  strategy?: ToastStrategy;
  maxVisible?: number;
  action?: ToastAction;
  closeButton?: boolean;
  icon?: React.ReactNode | false | ((context: ToastIconRenderContext) => React.ReactNode);
  render?: (context: ToastRenderContext) => React.ReactNode;
  accessibilityLabel?: string;
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
  testID?: string;
  style?: StyleProp<ViewStyle>;
  onDismiss?: (reason: ToastDismissReason, id: string) => void;
  onOpenChange?: (open: boolean, meta: ToastOpenChangeMeta) => void;
};

export type ToastShortcutOptions = Omit<ToastOptions, 'tone' | 'title'>;
export type ToastCustomOptions = Omit<ToastOptions, 'render'>;
export type ToastUpdateOptions = Partial<
  Pick<
    ToastOptions,
    | 'tone'
    | 'title'
    | 'description'
    | 'duration'
    | 'placement'
    | 'offset'
    | 'action'
    | 'closeButton'
    | 'icon'
    | 'render'
    | 'accessibilityLabel'
    | 'accessibilityLiveRegion'
    | 'testID'
    | 'style'
    | 'onDismiss'
    | 'onOpenChange'
  >
>;

export type ToastDefaults = Partial<
  Pick<ToastOptions, 'duration' | 'placement' | 'offset' | 'strategy' | 'maxVisible' | 'closeButton'>
> & {
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
};

export type ToastHandle = {
  readonly id: string;
  dismiss: (reason?: ToastDismissReason) => void;
  update: (patch: ToastUpdateOptions) => void;
};

export type ToastService = {
  configure: (defaults?: ToastDefaults) => void;
  getDefaults: () => Required<ToastDefaults>;
  show: (options: ToastOptions) => ToastHandle;
  custom: (render: NonNullable<ToastOptions['render']>, options?: ToastCustomOptions) => ToastHandle;
  success: (title: React.ReactNode, options?: ToastShortcutOptions) => ToastHandle;
  error: (title: React.ReactNode, options?: ToastShortcutOptions) => ToastHandle;
  warning: (title: React.ReactNode, options?: ToastShortcutOptions) => ToastHandle;
  info: (title: React.ReactNode, options?: ToastShortcutOptions) => ToastHandle;
  neutral: (title: React.ReactNode, options?: ToastShortcutOptions) => ToastHandle;
  update: (idOrHandle: string | ToastHandle, patch: ToastUpdateOptions) => boolean;
  dismiss: (idOrHandle?: string | ToastHandle, reason?: ToastDismissReason) => void;
  dismissAll: (reason?: ToastDismissReason) => void;
  isActive: (idOrHandle: string | ToastHandle) => boolean;
};

export type ToastProviderProps = {
  children: React.ReactNode;
  defaults?: ToastDefaults;
};

export type ToastItem = {
  id: string;
  tone: ToastTone;
  title?: React.ReactNode;
  description?: React.ReactNode;
  duration: number;
  placement: ToastPlacement;
  offset: number;
  strategy: ToastStrategy;
  maxVisible: number;
  action?: ToastAction;
  closeButton: boolean;
  icon?: ToastOptions['icon'];
  render?: ToastOptions['render'];
  accessibilityLabel: string;
  accessibilityLiveRegion: 'none' | 'polite' | 'assertive';
  testID?: string;
  style?: StyleProp<ViewStyle>;
  open: boolean;
  createdAt: number;
  updatedAt: number;
  onDismiss?: ToastOptions['onDismiss'];
  onOpenChange?: ToastOptions['onOpenChange'];
};

type ToastSnapshot = {
  items: ToastItem[];
};

type InternalToastItem = ToastItem & {
  dismissedReason?: ToastDismissReason;
};

type ToastListener = () => void;

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_DURATION = 2400;
const DEFAULT_OFFSET = 35;
const DEFAULT_PLACEMENT: ToastPlacement = 'top';
const DEFAULT_STRATEGY: ToastStrategy = 'replace';
const DEFAULT_MAX_VISIBLE = 3;
const DEFAULT_CLOSE_BUTTON = false;
const DEFAULT_LIVE_REGION: Required<ToastDefaults>['accessibilityLiveRegion'] = 'polite';
const MAX_VISIBLE_TOASTS = 5;
const MAX_PENDING_TOASTS = 20;
const TOAST_HOST_Z_INDEX = 9200;
const DEFAULT_TOAST_ID_PREFIX = 'toast';

const EMPTY_SNAPSHOT: ToastSnapshot = { items: [] };

const TOAST_ICON_SUCCESS = require('../../assets/icons/toast/success.webp');
const TOAST_ICON_ERROR = require('../../assets/icons/toast/error.webp');
const TOAST_ICON_WARNING = require('../../assets/icons/toast/warning.webp');

const IOS_TOAST_ENTER_OFFSET = wp(22);
const IOS_TOAST_EXIT_OFFSET = wp(14);
const IOS_TOAST_CONTENT_OFFSET = wp(6);
const IOS_TOAST_SHADOW_RADIUS = wp(18);
const IOS_TOAST_ENTER_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const IOS_TOAST_EXIT_EASING = Easing.bezier(0.4, 0, 1, 1);
const IOS_TOAST_ENTER_SPRING = {
  damping: 18,
  stiffness: 260,
  mass: 0.78,
};
const IOS_TOAST_SCALE_SPRING = {
  damping: 16,
  stiffness: 280,
  mass: 0.72,
};
const IOS_TOAST_SQUASH_SPRING = {
  damping: 15,
  stiffness: 240,
  mass: 0.68,
};

const DEFAULTS: Required<ToastDefaults> = {
  duration: DEFAULT_DURATION,
  placement: DEFAULT_PLACEMENT,
  offset: DEFAULT_OFFSET,
  strategy: DEFAULT_STRATEGY,
  maxVisible: DEFAULT_MAX_VISIBLE,
  closeButton: DEFAULT_CLOSE_BUTTON,
  accessibilityLiveRegion: DEFAULT_LIVE_REGION,
};

// ============================================================================
// Normalizers
// ============================================================================

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return Boolean(value && typeof (value as PromiseLike<T>).then === 'function');
}

function normalizeId(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const id = value.trim();
  return id || undefined;
}

function normalizeTone(value: unknown): ToastTone | undefined {
  if (value === 'success' || value === 'error' || value === 'warning' || value === 'info' || value === 'neutral') {
    return value;
  }
  return undefined;
}

function normalizePlacement(value: unknown): ToastPlacement | undefined {
  if (value === 'top' || value === 'bottom') return value;
  return undefined;
}

function normalizeStrategy(value: unknown): ToastStrategy | undefined {
  if (value === 'replace' || value === 'queue' || value === 'stack') return value;
  return undefined;
}

function normalizeDuration(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.round(value));
}

function normalizeOffset(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, value);
}

function normalizeMaxVisible(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(MAX_VISIBLE_TOASTS, Math.round(value)));
}

function normalizeLiveRegion(
  value: unknown,
  fallback: Required<ToastDefaults>['accessibilityLiveRegion']
): Required<ToastDefaults>['accessibilityLiveRegion'] {
  if (value === 'none' || value === 'polite' || value === 'assertive') return value;
  return fallback;
}

function normalizeNode(value: unknown): React.ReactNode | undefined {
  if (value == null || value === false || value === true) return undefined;
  if (value instanceof Error) return value.message || String(value);
  return value as React.ReactNode;
}

function getTextFromNode(value: React.ReactNode): string {
  if (value == null || typeof value === 'boolean') return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(getTextFromNode).filter(Boolean).join(' ').trim();
  if (React.isValidElement<{ children?: React.ReactNode }>(value)) return getTextFromNode(value.props.children);
  return '';
}

function createAccessibilityLabel(title: React.ReactNode, description: React.ReactNode) {
  const titleText = getTextFromNode(title);
  const descriptionText = getTextFromNode(description);
  if (titleText && descriptionText) return `${titleText}，${descriptionText}`;
  return titleText || descriptionText || 'Notification';
}

function getHandleId(idOrHandle: string | ToastHandle | undefined) {
  if (!idOrHandle) return undefined;
  if (typeof idOrHandle === 'string') return normalizeId(idOrHandle);
  return normalizeId(idOrHandle.id);
}

function warnInvalidToast() {
  if (typeof console === 'undefined') return;
  console.warn('[toast] show() requires title, description, or render.');
}

// ============================================================================
// Store
// ============================================================================

class ToastStore {
  private defaults: Required<ToastDefaults> = { ...DEFAULTS };
  private snapshot: ToastSnapshot = EMPTY_SNAPSHOT;
  private pending: InternalToastItem[] = [];
  private listeners = new Set<ToastListener>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private idSeed = 0;
  private hostCount = 0;

  configure(defaults?: ToastDefaults) {
    if (!defaults) return;
    this.defaults = {
      duration: normalizeDuration(defaults.duration, this.defaults.duration),
      placement: normalizePlacement(defaults.placement) ?? this.defaults.placement,
      offset: normalizeOffset(defaults.offset, this.defaults.offset),
      strategy: normalizeStrategy(defaults.strategy) ?? this.defaults.strategy,
      maxVisible: normalizeMaxVisible(defaults.maxVisible, this.defaults.maxVisible),
      closeButton: defaults.closeButton ?? this.defaults.closeButton,
      accessibilityLiveRegion: normalizeLiveRegion(defaults.accessibilityLiveRegion, this.defaults.accessibilityLiveRegion),
    };
  }

  getDefaults() {
    return { ...this.defaults };
  }

  subscribe = (listener: ToastListener) => {
    this.listeners.add(listener);
    this.hostCount += 1;
    this.scheduleVisibleToasts();

    return () => {
      this.listeners.delete(listener);
      this.hostCount = Math.max(0, this.hostCount - 1);
      if (this.hostCount === 0) this.clearAll('provider-unmount');
    };
  };

  getSnapshot = () => this.snapshot;

  show(options: ToastOptions) {
    const item = this.resolveToast(options);
    if (!item) return this.createHandle('');
    this.enqueue(item);
    return this.createHandle(item.id);
  }

  custom(render: NonNullable<ToastOptions['render']>, options: ToastCustomOptions = {}) {
    return this.show({ ...options, render });
  }

  success(title: React.ReactNode, options?: ToastShortcutOptions) {
    return this.showShortcut('success', title, options);
  }

  error(title: React.ReactNode, options?: ToastShortcutOptions) {
    return this.showShortcut('error', title, options);
  }

  warning(title: React.ReactNode, options?: ToastShortcutOptions) {
    return this.showShortcut('warning', title, options);
  }

  info(title: React.ReactNode, options?: ToastShortcutOptions) {
    return this.showShortcut('info', title, options);
  }

  neutral(title: React.ReactNode, options?: ToastShortcutOptions) {
    return this.showShortcut('neutral', title, options);
  }

  update(idOrHandle: string | ToastHandle, patch: ToastUpdateOptions) {
    const id = getHandleId(idOrHandle);
    if (!id) return false;

    const pendingIndex = this.pending.findIndex((item) => item.id === id);
    if (pendingIndex >= 0) {
      this.pending[pendingIndex] = this.applyPatch(this.pending[pendingIndex], patch);
      return true;
    }

    const index = this.snapshot.items.findIndex((item) => item.id === id);
    if (index < 0) return false;

    const nextItems = [...this.snapshot.items];
    const nextItem = this.applyPatch(nextItems[index] as InternalToastItem, patch);
    nextItems[index] = nextItem;
    this.setItems(nextItems);

    if (nextItem.open) this.schedule(nextItem);
    this.callOpenChange(nextItem, true, 'update');

    return true;
  }

  dismiss(idOrHandle?: string | ToastHandle, reason: ToastDismissReason = 'api') {
    const id = getHandleId(idOrHandle) ?? this.getLatestOpenId();
    if (!id) return;
    this.dismissByIds([id], reason);
  }

  dismissAll(reason: ToastDismissReason = 'api') {
    const openIds = this.snapshot.items.filter((item) => item.open).map((item) => item.id);
    this.pending.forEach((item) => this.callDismiss(item, reason));
    this.pending = [];
    this.dismissByIds(openIds, reason);
  }

  isActive(idOrHandle: string | ToastHandle) {
    const id = getHandleId(idOrHandle);
    if (!id) return false;
    return this.snapshot.items.some((item) => item.id === id && item.open) || this.pending.some((item) => item.id === id);
  }

  completeExit(id: string) {
    if (!this.snapshot.items.some((item) => item.id === id && !item.open)) return;
    this.setItems(this.snapshot.items.filter((item) => item.id !== id));
    this.promoteQueuedToast();
  }

  private showShortcut(tone: ToastTone, title: React.ReactNode, options: ToastShortcutOptions = {}) {
    return this.show({ ...options, title, tone });
  }

  private resolveToast(options: ToastOptions): InternalToastItem | null {
    const title = normalizeNode(options.title);
    const description = normalizeNode(options.description);

    if (!title && !description && !options.render) {
      warnInvalidToast();
      return null;
    }

    const now = Date.now();
    const tone = normalizeTone(options.tone) ?? 'info';
    const duration = normalizeDuration(options.duration, this.defaults.duration);
    const closeButton = (options.closeButton ?? this.defaults.closeButton) || duration <= 0;

    return {
      id: normalizeId(options.id) ?? this.createId(),
      tone,
      title,
      description,
      duration,
      placement: normalizePlacement(options.placement) ?? this.defaults.placement,
      offset: normalizeOffset(options.offset, this.defaults.offset),
      strategy: normalizeStrategy(options.strategy) ?? this.defaults.strategy,
      maxVisible: normalizeMaxVisible(options.maxVisible, this.defaults.maxVisible),
      action: options.action,
      closeButton,
      icon: options.icon,
      render: options.render,
      accessibilityLabel: options.accessibilityLabel ?? createAccessibilityLabel(title, description),
      accessibilityLiveRegion: normalizeLiveRegion(
        options.accessibilityLiveRegion,
        tone === 'error' ? 'assertive' : this.defaults.accessibilityLiveRegion
      ),
      testID: options.testID,
      style: options.style,
      open: true,
      createdAt: now,
      updatedAt: now,
      onDismiss: options.onDismiss,
      onOpenChange: options.onOpenChange,
    };
  }

  private applyPatch(item: InternalToastItem, patch: ToastUpdateOptions): InternalToastItem {
    const title = 'title' in patch ? normalizeNode(patch.title) : item.title;
    const description = 'description' in patch ? normalizeNode(patch.description) : item.description;
    const tone = normalizeTone(patch.tone) ?? item.tone;
    const duration = 'duration' in patch ? normalizeDuration(patch.duration, item.duration) : item.duration;
    const closeButton = 'closeButton' in patch ? patch.closeButton ?? item.closeButton : item.closeButton || duration <= 0;

    return {
      ...item,
      tone,
      title,
      description,
      duration,
      placement: normalizePlacement(patch.placement) ?? item.placement,
      offset: normalizeOffset(patch.offset, item.offset),
      action: 'action' in patch ? patch.action : item.action,
      closeButton,
      icon: 'icon' in patch ? patch.icon : item.icon,
      render: 'render' in patch ? patch.render : item.render,
      accessibilityLabel: patch.accessibilityLabel ?? item.accessibilityLabel ?? createAccessibilityLabel(title, description),
      accessibilityLiveRegion: normalizeLiveRegion(patch.accessibilityLiveRegion, item.accessibilityLiveRegion),
      testID: patch.testID ?? item.testID,
      style: 'style' in patch ? patch.style : item.style,
      onDismiss: patch.onDismiss ?? item.onDismiss,
      onOpenChange: patch.onOpenChange ?? item.onOpenChange,
      updatedAt: Date.now(),
    };
  }

  private enqueue(item: InternalToastItem) {
    if (item.strategy === 'queue' && this.snapshot.items.length > 0) {
      this.pending.push(item);
      this.trimPendingQueue();
      return;
    }

    if (item.strategy === 'replace') {
      this.pending.forEach((pendingItem) => this.callDismiss(pendingItem, 'replace'));
      this.pending = [];
      this.snapshot.items.forEach((currentItem) => {
        this.clearTimer(currentItem.id);
        if (currentItem.open) {
          this.callDismiss(currentItem as InternalToastItem, 'replace');
          this.callOpenChange(currentItem, false, 'replace');
        }
      });
      this.setItems([item]);
      this.callOpenChange(item, true, 'show');
      this.schedule(item);
      return;
    }

    const openInPlacement = this.snapshot.items
      .filter((toastItem) => toastItem.open && toastItem.placement === item.placement)
      .sort((a, b) => a.createdAt - b.createdAt);

    let nextItems = this.snapshot.items;
    if (openInPlacement.length >= item.maxVisible) {
      const overflowItem = openInPlacement[0];
      nextItems = this.closeItems(nextItems, 'overflow', [overflowItem.id]);
    }

    this.setItems([...nextItems, item]);
    this.callOpenChange(item, true, 'show');
    this.schedule(item);
  }

  private closeItems(items: InternalToastItem[], reason: ToastDismissReason, ids?: string[]) {
    const idSet = ids ? new Set(ids) : undefined;
    return items.map((item) => {
      if (!item.open || (idSet && !idSet.has(item.id))) return item;
      this.clearTimer(item.id);
      const nextItem: InternalToastItem = {
        ...item,
        open: false,
        updatedAt: Date.now(),
        dismissedReason: reason,
      };
      this.callDismiss(nextItem, reason);
      this.callOpenChange(nextItem, false, reason);
      return nextItem;
    });
  }

  private dismissByIds(ids: string[], reason: ToastDismissReason) {
    if (!ids.length) return;
    const nextItems = this.closeItems(this.snapshot.items, reason, ids);
    this.setItems(nextItems);
    this.promoteQueuedToast();
  }

  private promoteQueuedToast() {
    if (this.snapshot.items.length > 0) return;
    const nextItem = this.pending.shift();
    if (!nextItem) return;
    this.setItems([...this.snapshot.items, nextItem]);
    this.callOpenChange(nextItem, true, 'show');
    this.schedule(nextItem);
  }

  private trimPendingQueue() {
    while (this.pending.length > MAX_PENDING_TOASTS) {
      const dropped = this.pending.shift();
      if (dropped) this.callDismiss(dropped, 'overflow');
    }
  }

  private scheduleVisibleToasts() {
    this.snapshot.items.forEach((item) => {
      if (item.open) this.schedule(item as InternalToastItem);
    });
  }

  private schedule(item: InternalToastItem) {
    this.clearTimer(item.id);
    if (this.hostCount <= 0 || !item.open || item.duration <= 0) return;
    this.timers.set(
      item.id,
      setTimeout(() => {
        this.dismiss(item.id, 'timeout');
      }, item.duration)
    );
  }

  private clearTimer(id: string) {
    const timer = this.timers.get(id);
    if (!timer) return;
    clearTimeout(timer);
    this.timers.delete(id);
  }

  private clearAll(reason: ToastDismissReason) {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    [...this.snapshot.items, ...this.pending].forEach((item) => {
      const internalItem = item as InternalToastItem;
      if (internalItem.open || !internalItem.dismissedReason) this.callDismiss(internalItem, reason);
    });
    this.pending = [];
    this.setItems([]);
  }

  private setItems(items: ToastItem[]) {
    this.snapshot = items.length ? { items } : EMPTY_SNAPSHOT;
    this.listeners.forEach((listener) => listener());
  }

  private getLatestOpenId() {
    const openItems = this.snapshot.items.filter((item) => item.open);
    return openItems.sort((a, b) => b.createdAt - a.createdAt)[0]?.id;
  }

  private createId() {
    this.idSeed += 1;
    return `${DEFAULT_TOAST_ID_PREFIX}_${Date.now()}_${this.idSeed}`;
  }

  private createHandle(id: string): ToastHandle {
    return {
      id,
      dismiss: (reason = 'api') => this.dismiss(id, reason),
      update: (patch) => {
        this.update(id, patch);
      },
    };
  }

  private callDismiss(item: InternalToastItem, reason: ToastDismissReason) {
    if (item.dismissedReason && item.dismissedReason !== reason) return;
    try {
      item.onDismiss?.(reason, item.id);
    } catch (error) {
      console.error('[toast] onDismiss failed', error);
    }
  }

  private callOpenChange(item: ToastItem, open: boolean, reason: ToastOpenChangeReason) {
    try {
      item.onOpenChange?.(open, { id: item.id, open, reason });
    } catch (error) {
      console.error('[toast] onOpenChange failed', error);
    }
  }
}

const toastStore = new ToastStore();

export const toast: ToastService = toastStore;

// ============================================================================
// Provider
// ============================================================================

function useToastSnapshot() {
  return React.useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, toastStore.getSnapshot);
}

export function ToastProvider({ children, defaults }: ToastProviderProps) {
  const snapshot = useToastSnapshot();
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    toastStore.configure(defaults);
  }, [defaults]);

  const topItems = React.useMemo(
    () =>
      snapshot.items
        .filter((item) => item.placement === 'top')
        .sort((a, b) => b.createdAt - a.createdAt),
    [snapshot.items]
  );

  const bottomItems = React.useMemo(
    () =>
      snapshot.items
        .filter((item) => item.placement === 'bottom')
        .sort((a, b) => b.createdAt - a.createdAt),
    [snapshot.items]
  );

  const handleExited = React.useCallback((id: string) => {
    toastStore.completeExit(id);
  }, []);

  return (
    <>
      {children}
      <ToastViewport insets={insets} items={topItems} placement="top" onExited={handleExited} />
      <ToastViewport insets={insets} items={bottomItems} placement="bottom" onExited={handleExited} />
    </>
  );
}

// ============================================================================
// UI
// ============================================================================

type ToastViewportProps = {
  insets: { top: number; bottom: number };
  items: ToastItem[];
  placement: ToastPlacement;
  onExited: (id: string) => void;
};

type ToastCardProps = {
  item: ToastItem;
  placement: ToastPlacement;
  onExited: (id: string) => void;
};

type ToneConfig = {
  bgColor: string;
  borderColor: string;
  accentColor: string;
  iconSource: number;
};

function pickToneConfig(tone: ToastTone): ToneConfig {
  if (tone === 'success') {
    return {
      bgColor: '#EEF7F2',
      borderColor: '#CFE1D9',
      accentColor: '#16A34A',
      iconSource: TOAST_ICON_SUCCESS,
    };
  }
  if (tone === 'error') {
    return {
      bgColor: '#FBEEF0',
      borderColor: '#E7D1D8',
      accentColor: '#DC2626',
      iconSource: TOAST_ICON_ERROR,
    };
  }
  return {
    bgColor: '#FDF7ED',
    borderColor: '#F7E0B3',
    accentColor: '#D97706',
    iconSource: TOAST_ICON_WARNING,
  };
}

function getDisplayContent(item: ToastItem) {
  if (item.title && item.description) {
    return (
      <>
        {item.title} {item.description}
      </>
    );
  }
  return item.title || item.description;
}

function useToastActionContext(id: string) {
  return React.useMemo<ToastActionContext>(
    () => ({
      id,
      dismiss: (reason = 'api') => toastStore.dismiss(id, reason),
      update: (patch) => {
        toastStore.update(id, patch);
      },
    }),
    [id]
  );
}

function ToastViewport({ insets, items, placement, onExited }: ToastViewportProps) {
  if (!items.length) return null;

  const edgeOffset = items[0]?.offset ?? DEFAULT_OFFSET;
  const edgeInset = placement === 'top' ? insets.top : insets.bottom;
  const viewportStyle =
    placement === 'top'
      ? { top: edgeInset + wp(edgeOffset) }
      : { bottom: edgeInset + wp(edgeOffset), flexDirection: 'column-reverse' as const };

  return (
    <View pointerEvents="box-none" style={[styles.viewport, viewportStyle]}>
      {items.map((item, index) => {
        const stackStyle =
          index === 0
            ? undefined
            : placement === 'top'
              ? { marginTop: wp(8) }
              : { marginBottom: wp(8) };

        return (
          <View key={item.id} pointerEvents="box-none" style={stackStyle}>
            <ToastCard item={item} placement={placement} onExited={onExited} />
          </View>
        );
      })}
    </View>
  );
}

type ToastCardBodyProps = {
  item: ToastItem;
  actionContext: ToastActionContext;
  toneConfig: ToneConfig;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

function ToastCardBody({ item, actionContext, toneConfig, style, children }: ToastCardBodyProps) {
  const theme = useTheme();
  const message = getDisplayContent(item);

  return (
    <View style={[styles.toastContent, style, { backgroundColor: toneConfig.bgColor, borderColor: toneConfig.borderColor }]}>
      {children}
      <View style={styles.row}>
        {renderToastIcon(item, toneConfig)}
        <View style={styles.content}>
          <Text style={[styles.message, { color: theme.colors.onSurface }]} numberOfLines={3}>
            {message}
          </Text>
          {item.action ? (
            <ToastActionButton action={item.action} context={actionContext} toneConfig={toneConfig} />
          ) : null}
        </View>
        {item.closeButton ? (
          <Pressable
            accessibilityLabel="Dismiss notification"
            accessibilityRole="button"
            hitSlop={wp(8)}
            onPress={() => actionContext.dismiss('close-button')}
            style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.62 : 1 }]}
          >
            <Feather name="x" size={wp(15)} color={theme.colors.muted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function IOSToastCard({ item, placement, onExited }: ToastCardProps) {
  const actionContext = useToastActionContext(item.id);
  const toneConfig = pickToneConfig(item.tone);
  const direction = placement === 'top' ? -1 : 1;
  const enterOffset = direction * IOS_TOAST_ENTER_OFFSET;
  const exitOffset = direction * IOS_TOAST_EXIT_OFFSET;
  const opacity = useSharedValue(item.open ? 1 : 0);
  const translateY = useSharedValue(item.open ? 0 : exitOffset);
  const scale = useSharedValue(item.open ? 1 : 0.975);
  const squash = useSharedValue(0);
  const contentProgress = useSharedValue(item.open ? 1 : 0);
  const sheenOpacity = useSharedValue(item.open ? 0.08 : 0);
  const isInteractive = Boolean(item.action || item.closeButton || item.render);

  React.useEffect(() => {
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
      cancelAnimation(scale);
      cancelAnimation(squash);
      cancelAnimation(contentProgress);
      cancelAnimation(sheenOpacity);
    };
  }, [contentProgress, opacity, scale, sheenOpacity, squash, translateY]);

  React.useEffect(() => {
    cancelAnimation(opacity);
    cancelAnimation(translateY);
    cancelAnimation(scale);
    cancelAnimation(squash);
    cancelAnimation(contentProgress);
    cancelAnimation(sheenOpacity);

    if (item.open) {
      opacity.value = 0;
      translateY.value = enterOffset;
      scale.value = 0.955;
      squash.value = 1;
      contentProgress.value = 0;
      sheenOpacity.value = 0.14;

      opacity.value = withTiming(1, { duration: 220, easing: IOS_TOAST_ENTER_EASING });
      translateY.value = withSpring(0, IOS_TOAST_ENTER_SPRING);
      scale.value = withSpring(1, IOS_TOAST_SCALE_SPRING);
      squash.value = withSpring(0, IOS_TOAST_SQUASH_SPRING);
      contentProgress.value = withTiming(1, { duration: 260, easing: IOS_TOAST_ENTER_EASING });
      sheenOpacity.value = withTiming(0.06, { duration: 340, easing: IOS_TOAST_ENTER_EASING });
      return;
    }

    opacity.value = withTiming(0, { duration: 160, easing: IOS_TOAST_EXIT_EASING }, (finished) => {
      if (finished) scheduleOnRN(onExited, item.id);
    });
    translateY.value = withTiming(exitOffset, { duration: 180, easing: IOS_TOAST_EXIT_EASING });
    scale.value = withTiming(0.975, { duration: 180, easing: IOS_TOAST_EXIT_EASING });
    squash.value = withTiming(0.32, { duration: 120, easing: IOS_TOAST_EXIT_EASING });
    contentProgress.value = withTiming(0, { duration: 120, easing: IOS_TOAST_EXIT_EASING });
    sheenOpacity.value = withTiming(0, { duration: 110, easing: IOS_TOAST_EXIT_EASING });
  }, [
    contentProgress,
    enterOffset,
    exitOffset,
    item.id,
    item.open,
    onExited,
    opacity,
    scale,
    sheenOpacity,
    squash,
    translateY,
  ]);

  const animatedStyle = useAnimatedStyle(() => {
    const scaleX = scale.value * interpolate(squash.value, [0, 1], [1, 1.028]);
    const scaleY = scale.value * interpolate(squash.value, [0, 1], [1, 0.942]);
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }, { scaleX }, { scaleY }],
      shadowOpacity: interpolate(opacity.value, [0, 1], [0, 0.16]),
      shadowRadius: interpolate(opacity.value, [0, 1], [0, IOS_TOAST_SHADOW_RADIUS]),
    };
  });

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(contentProgress.value, [0, 1], [0.7, 1]),
    transform: [
      { translateY: interpolate(contentProgress.value, [0, 1], [direction * IOS_TOAST_CONTENT_OFFSET, 0]) },
      { scale: interpolate(contentProgress.value, [0, 1], [0.985, 1]) },
    ],
  }));

  const sheenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sheenOpacity.value,
  }));

  if (item.render) {
    return (
      <Animated.View
        pointerEvents={isInteractive ? 'auto' : 'none'}
        accessible={!isInteractive}
        accessibilityRole="alert"
        accessibilityLabel={item.accessibilityLabel}
        accessibilityLiveRegion={item.accessibilityLiveRegion}
        shouldRasterizeIOS
        style={[styles.toast, styles.toastIOS, animatedStyle, item.style]}
        testID={item.testID}
      >
        <Animated.View style={contentAnimatedStyle}>
          {item.render({ ...actionContext, toast: item })}
        </Animated.View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      pointerEvents={isInteractive ? 'auto' : 'none'}
      accessible={!isInteractive}
      accessibilityRole="alert"
      accessibilityLabel={item.accessibilityLabel}
      accessibilityLiveRegion={item.accessibilityLiveRegion}
      shouldRasterizeIOS
      style={[
        styles.toast,
        styles.toastIOS,
        styles.toastSurface,
        { backgroundColor: toneConfig.bgColor },
        animatedStyle,
        item.style,
      ]}
      testID={item.testID}
    >
      <Animated.View style={contentAnimatedStyle}>
        <ToastCardBody
          item={item}
          actionContext={actionContext}
          toneConfig={toneConfig}
          style={styles.toastContentIOS}
        >
          <Animated.View pointerEvents="none" style={[styles.toastSheen, sheenAnimatedStyle]} />
        </ToastCardBody>
      </Animated.View>
    </Animated.View>
  );
}

function DefaultToastCard({ item, placement, onExited }: ToastCardProps) {
  const actionContext = useToastActionContext(item.id);
  const toneConfig = pickToneConfig(item.tone);
  const direction = placement === 'top' ? -1 : 1;
  const anim = React.useRef(new RNAnimated.Value(0)).current;
  const lastVisibleRef = React.useRef<boolean>(false);
  const isInteractive = Boolean(item.action || item.closeButton || item.render);

  React.useEffect(() => {
    return () => {
      anim.stopAnimation();
    };
  }, [anim]);

  React.useEffect(() => {
    if (item.open && !lastVisibleRef.current) {
      anim.stopAnimation();
      anim.setValue(0);
      RNAnimated.timing(anim, {
        toValue: 1,
        duration: 160,
        easing: RNEasing.out(RNEasing.cubic),
        useNativeDriver: true,
      }).start();
      lastVisibleRef.current = true;
      return;
    }

    if (!item.open && lastVisibleRef.current) {
      anim.stopAnimation();
      RNAnimated.timing(anim, {
        toValue: 0,
        duration: 140,
        easing: RNEasing.out(RNEasing.cubic),
        useNativeDriver: true,
      }).start(() => {
        lastVisibleRef.current = false;
        onExited(item.id);
      });
    }
  }, [anim, item.id, item.open, onExited]);

  const animatedStyle = React.useMemo(
    () => ({
      opacity: anim,
      transform: [
        {
          translateY: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [direction * wp(6), 0],
          }),
        },
      ],
    }),
    [anim, direction]
  );

  if (item.render) {
    return (
      <RNAnimated.View
        renderToHardwareTextureAndroid={Platform.OS === 'android'}
        shouldRasterizeIOS={Platform.OS === 'ios'}
        pointerEvents={isInteractive ? 'auto' : 'none'}
        accessible={!isInteractive}
        accessibilityRole="alert"
        accessibilityLabel={item.accessibilityLabel}
        accessibilityLiveRegion={item.accessibilityLiveRegion}
        style={[styles.toast, animatedStyle, item.style]}
        testID={item.testID}
      >
        {item.render({ ...actionContext, toast: item })}
      </RNAnimated.View>
    );
  }

  return (
    <RNAnimated.View
      renderToHardwareTextureAndroid={Platform.OS === 'android'}
      shouldRasterizeIOS={Platform.OS === 'ios'}
      pointerEvents={isInteractive ? 'auto' : 'none'}
      accessible={!isInteractive}
      accessibilityRole="alert"
      accessibilityLabel={item.accessibilityLabel}
      accessibilityLiveRegion={item.accessibilityLiveRegion}
      style={[
        styles.toast,
        styles.toastSurface,
        { backgroundColor: toneConfig.bgColor },
        animatedStyle,
        item.style,
      ]}
      testID={item.testID}
    >
      <ToastCardBody item={item} actionContext={actionContext} toneConfig={toneConfig} />
    </RNAnimated.View>
  );
}

function ToastCard(props: ToastCardProps) {
  if (Platform.OS === 'ios') return <IOSToastCard {...props} />;
  return <DefaultToastCard {...props} />;
}

function renderToastIcon(item: ToastItem, toneConfig: ToneConfig) {
  if (item.icon === false) return null;

  const icon =
    typeof item.icon === 'function'
      ? item.icon({ toast: item, tone: item.tone, color: toneConfig.accentColor, size: wp(24) })
      : item.icon;

  if (icon) return <View style={styles.iconSlot}>{icon}</View>;
  return <Image source={toneConfig.iconSource} style={styles.iconImage} contentFit="contain" />;
}

type ToastActionButtonProps = {
  action: ToastAction;
  context: ToastActionContext;
  toneConfig: ToneConfig;
};

function ToastActionButton({ action, context, toneConfig }: ToastActionButtonProps) {
  const handlePress = React.useCallback(() => {
    const closeOnPress = action.closeOnPress ?? true;
    const closeIfNeeded = (result: void | boolean) => {
      if (closeOnPress && result !== false) context.dismiss('action');
    };

    try {
      const result = action.onPress?.(context);
      if (isPromiseLike<void | boolean>(result)) {
        result.then(closeIfNeeded).catch((error) => {
          console.error('[toast] action failed', error);
          if (closeOnPress) context.dismiss('action');
        });
        return;
      }
      closeIfNeeded(result);
    } catch (error) {
      console.error('[toast] action failed', error);
      if (closeOnPress) context.dismiss('action');
    }
  }, [action, context]);

  return (
    <Pressable
      accessibilityLabel={action.accessibilityLabel}
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          borderColor: toneConfig.borderColor,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
      testID={action.testID}
    >
      <Text color={toneConfig.accentColor} numberOfLines={1} size="xs" weight="semibold">
        {action.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    left: wp(0),
    right: wp(0),
    alignItems: 'center',
    zIndex: TOAST_HOST_Z_INDEX,
    elevation: Platform.OS === 'android' ? TOAST_HOST_Z_INDEX : 0,
  },
  toast: {
    width: wp(320),
    maxWidth: '92%',
    alignSelf: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: wp(0), height: wp(2) },
    shadowOpacity: 0.1,
    shadowRadius: wp(8),
    elevation: wp(3),
  },
  toastSurface: {
    borderRadius: wp(10),
  },
  toastIOS: {
    borderRadius: wp(10),
    shadowOffset: { width: wp(0), height: wp(10) },
    shadowOpacity: 0.16,
    shadowRadius: wp(20),
  },
  toastContent: {
    borderRadius: wp(10),
    padding: wp(12),
    borderWidth: wp(1),
  },
  toastContentIOS: {
    borderRadius: wp(10),
    overflow: 'hidden',
  },
  toastSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    borderRadius: wp(10),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: wp(10),
  },
  iconImage: {
    width: wp(24),
    height: wp(24),
    flexShrink: 0,
  },
  iconSlot: {
    width: wp(24),
    height: wp(24),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: wp(13),
    lineHeight: wp(18),
  },
  actionButton: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: wp(28),
    marginTop: wp(8),
    paddingHorizontal: wp(10),
    borderRadius: wp(14),
    borderWidth: wp(1),
    backgroundColor: '#FFFFFF66',
  },
  closeButton: {
    width: wp(28),
    height: wp(28),
    borderRadius: wp(14),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: wp(2),
  },
});
