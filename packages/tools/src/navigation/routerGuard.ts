declare const __DEV__: boolean | undefined;
declare const require: undefined | ((id: string) => unknown);

export type RouterMethod = (...args: any[]) => unknown;

export interface RouterLike {
  push?: RouterMethod;
  replace?: RouterMethod;
  navigate?: RouterMethod;
  back?: RouterMethod;
  dismiss?: RouterMethod;
  dismissAll?: RouterMethod;
  dismissTo?: RouterMethod;
  [key: string]: unknown;
}

export type RouterGuardUnlockReason =
  | 'path-match'
  | 'state-change'
  | 'timeout'
  | 'back'
  | 'error'
  | 'manual'
  | 'destroy';

export type RouterGuardBlockReason = 'locked' | 'same-target';

export type RouterGuardEvent =
  | {
      type: 'allow' | 'bypass';
      method: string;
      target: string | null;
    }
  | {
      type: 'block';
      method: string;
      target: string | null;
      reason: RouterGuardBlockReason;
    }
  | {
      type: 'unlock';
      reason: RouterGuardUnlockReason;
    }
  | {
      type: 'ready' | 'destroy';
    };

export type RouterGuardSnapshot = {
  locked: boolean;
  target: string | null;
  startPath: string | null;
};

export type RouterGuardController = {
  destroy: () => void;
  unlock: () => void;
  isLocked: () => boolean;
  getSnapshot: () => RouterGuardSnapshot;
};

export interface RouterGuardOptions {
  router: RouterLike;
  lockMs?: number;
  forwardMethods?: readonly string[];
  backMethods?: readonly string[];
  blockSamePath?: boolean;
  getCurrentPath?: () => string | null | undefined;
  subscribeToStateChange?: (listener: () => void) => (() => void) | void;
  onEvent?: (event: RouterGuardEvent) => void;
}

interface NavigationRefLike {
  addListener?: (event: string, cb: () => void) => () => void;
  getRootState?: () => unknown;
  current?: NavigationRefLike;
}

interface RouterStoreLike {
  navigationRef?: NavigationRefLike;
  getRouteInfo?: () => { pathname?: string } | null;
}

type GuardedRouter = RouterLike & object;
type PatchedRouterMethod = RouterMethod & {
  __y2kitRouterGuardOriginal?: RouterMethod;
};
type PromiseLikeResult = {
  catch?: (onRejected: (error: unknown) => void) => unknown;
};

const DEFAULT_LOCK_MS = 2000;
const DEFAULT_FORWARD_METHODS = ['push', 'replace', 'navigate', 'dismissTo'] as const;
const DEFAULT_BACK_METHODS = ['back', 'dismiss', 'dismissAll'] as const;
const ORIGINAL_METHOD_KEY = '__y2kitRouterGuardOriginal';
const activeGuards = new WeakMap<GuardedRouter, RouterGuardImpl>();

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const normalizePath = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null;

  let path = raw.trim();
  if (!path) return null;

  let end = path.length;
  const queryIndex = path.indexOf('?');
  const hashIndex = path.indexOf('#');
  if (queryIndex !== -1 && queryIndex < end) end = queryIndex;
  if (hashIndex !== -1 && hashIndex < end) end = hashIndex;

  path = end === path.length ? path : path.substring(0, end);
  if (!path) return null;
  if (path.charCodeAt(0) !== 47) path = `/${path}`;

  while (path.length > 1 && path.charCodeAt(path.length - 1) === 47) {
    path = path.substring(0, path.length - 1);
  }

  return path;
};

const getActivePathFromState = (state: unknown): string => {
  let current = state as { index?: unknown; routes?: unknown[] } | undefined;
  let activePath = '';

  for (
    let depth = 0;
    depth < 20 && Array.isArray(current?.routes) && current.routes.length;
    depth += 1
  ) {
    const index = typeof current.index === 'number' ? current.index : current.routes.length - 1;
    const route = current.routes[index] as { name?: unknown; state?: unknown } | undefined;
    if (!route) break;

    if (typeof route.name === 'string' && route.name) activePath = route.name;
    if (!route.state) break;
    current = route.state as { index?: unknown; routes?: unknown[] } | undefined;
  }

  return activePath;
};

const getMethodList = (methods: readonly string[] | undefined, fallback: readonly string[]) => {
  const source = methods ?? fallback;
  const seen = new Set<string>();
  const result: string[] = [];

  for (const method of source) {
    if (typeof method !== 'string') continue;
    const name = method.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    result.push(name);
  }

  return result;
};

const getOriginalMethod = (method: RouterMethod): RouterMethod =>
  ((method as PatchedRouterMethod)[ORIGINAL_METHOD_KEY] as RouterMethod | undefined) ?? method;

const markPatchedMethod = (patched: RouterMethod, original: RouterMethod) => {
  (patched as PatchedRouterMethod)[ORIGINAL_METHOD_KEY] = original;
};

const getTargetPath = (firstArg: unknown): string | null => {
  if (typeof firstArg === 'string') return normalizePath(firstArg);
  if (!isRecord(firstArg)) return null;

  return normalizePath(firstArg.pathname ?? firstArg.path ?? firstArg.href);
};

const stripBypassFlag = (value: Record<string, unknown>): Record<string, unknown> => {
  const {
    skipRouterGuard: _skipRouterGuard,
    unstable_skipRouterGuard: _unstable,
    ...rest
  } = value;
  return rest;
};

const getBypassCallArgs = (args: unknown[]): { bypass: boolean; callArgs: unknown[] } => {
  if (args.length === 0) return { bypass: false, callArgs: args };

  const first = args[0];
  if (
    isRecord(first) &&
    (first.skipRouterGuard === true || first.unstable_skipRouterGuard === true)
  ) {
    return { bypass: true, callArgs: [stripBypassFlag(first), ...args.slice(1)] };
  }

  const last = args[args.length - 1];
  if (
    !isRecord(last) ||
    (last.skipRouterGuard !== true && last.unstable_skipRouterGuard !== true)
  ) {
    return { bypass: false, callArgs: args };
  }

  return { bypass: true, callArgs: args.slice(0, -1) };
};

const resolveThisArg = (value: unknown, router: GuardedRouter) =>
  value == null ? router : value;

const getNavigationRef = (store: RouterStoreLike | null): NavigationRefLike | null => {
  const ref = store?.navigationRef;
  if (!ref) return null;
  if (typeof ref.addListener === 'function' || typeof ref.getRootState === 'function') return ref;
  return ref.current ?? null;
};

const loadRouterStore = (): RouterStoreLike | null => {
  if (typeof require !== 'function') return null;

  try {
    const loaded = require('expo-router/build/global-state/router-store');
    if (isRecord(loaded) && isRecord(loaded.store)) return loaded.store as RouterStoreLike;
  } catch {
    if (isDev) {
      console.warn('[RouterGuard] expo-router store is unavailable, using timeout unlock only');
    }
  }

  return null;
};

const resolveLockMs = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : DEFAULT_LOCK_MS;

const isPromiseLikeResult = (value: unknown): value is PromiseLikeResult =>
  !!value && (typeof value === 'object' || typeof value === 'function');

const releaseTimer = (timer: ReturnType<typeof setTimeout>) => {
  const maybeNodeTimer = timer as ReturnType<typeof setTimeout> & { unref?: () => void };
  maybeNodeTimer.unref?.();
};

class RouterGuardImpl implements RouterGuardController {
  private readonly router: GuardedRouter;
  private readonly lockMs: number;
  private readonly forwardMethods: string[];
  private readonly backMethods: string[];
  private readonly blockSamePath: boolean;
  private readonly onEvent: ((event: RouterGuardEvent) => void) | undefined;
  private readonly originals = new Map<string, RouterMethod>();
  private readonly store: RouterStoreLike | null;
  private readonly getCurrentPathOverride: (() => string | null | undefined) | undefined;
  private readonly subscribeToStateChange:
    | ((listener: () => void) => (() => void) | void)
    | undefined;

  private destroyed = false;
  private locked = false;
  private lockTimer: ReturnType<typeof setTimeout> | null = null;
  private lockTarget: string | null = null;
  private startPath: string | null = null;
  private unlockListener: (() => void) | null = null;

  constructor(options: RouterGuardOptions) {
    this.router = options.router as GuardedRouter;
    this.lockMs = resolveLockMs(options.lockMs);
    this.forwardMethods = getMethodList(options.forwardMethods, DEFAULT_FORWARD_METHODS);
    this.backMethods = getMethodList(options.backMethods, DEFAULT_BACK_METHODS);
    this.blockSamePath = options.blockSamePath ?? true;
    this.onEvent = options.onEvent;
    this.getCurrentPathOverride = options.getCurrentPath;
    this.subscribeToStateChange = options.subscribeToStateChange;
    this.store =
      options.getCurrentPath || options.subscribeToStateChange ? null : loadRouterStore();
  }

  install() {
    for (const method of this.forwardMethods) {
      this.patchForwardMethod(method);
    }

    for (const method of this.backMethods) {
      if (this.originals.has(method)) continue;
      this.patchBackMethod(method);
    }

    this.emit({ type: 'ready' });
  }

  destroy() {
    if (this.destroyed) return;

    this.unlockWithReason('destroy');

    for (const [method, original] of this.originals) {
      const current = this.router[method];
      if (
        typeof current === 'function' &&
        getOriginalMethod(current as RouterMethod) === original
      ) {
        this.router[method] = original;
      }
    }

    this.originals.clear();
    this.destroyed = true;
    activeGuards.delete(this.router);
    this.emit({ type: 'destroy' });
  }

  unlock() {
    this.unlockWithReason('manual');
  }

  isLocked() {
    return this.locked;
  }

  getSnapshot(): RouterGuardSnapshot {
    return {
      locked: this.locked,
      target: this.lockTarget,
      startPath: this.startPath,
    };
  }

  private emit(event: RouterGuardEvent) {
    this.onEvent?.(event);
  }

  private getCurrentPath(): string | null {
    try {
      const overridePath = this.getCurrentPathOverride?.();
      if (overridePath) return normalizePath(overridePath);

      const pathname = this.store?.getRouteInfo?.()?.pathname;
      if (pathname) return normalizePath(pathname);

      const nav = getNavigationRef(this.store);
      if (typeof nav?.getRootState !== 'function') return null;

      return normalizePath(getActivePathFromState(nav.getRootState.call(nav)));
    } catch {
      return null;
    }
  }

  private clearUnlockListener() {
    if (!this.unlockListener) return;
    const listener = this.unlockListener;
    this.unlockListener = null;
    try {
      listener();
    } catch {
      if (isDev) {
        console.warn('[RouterGuard] failed to remove navigation listener');
      }
    }
  }

  private clearLockTimer() {
    if (!this.lockTimer) return;
    clearTimeout(this.lockTimer);
    this.lockTimer = null;
  }

  private unlockWithReason(reason: RouterGuardUnlockReason) {
    const wasLocked = this.locked;

    this.locked = false;
    this.lockTarget = null;
    this.startPath = null;
    this.clearLockTimer();
    this.clearUnlockListener();

    if (!wasLocked) return;
    this.emit({ type: 'unlock', reason });
  }

  private attachStateListener() {
    const onStateChange = () => {
      const currentPath = this.getCurrentPath();
      if (this.lockTarget && currentPath === this.lockTarget) {
        this.unlockWithReason('path-match');
        return;
      }

      if (!this.lockTarget || (currentPath && currentPath !== this.startPath)) {
        this.unlockWithReason('state-change');
      }
    };

    try {
      const overrideRemove = this.subscribeToStateChange?.(onStateChange);
      if (typeof overrideRemove === 'function') {
        this.unlockListener = overrideRemove;
        return;
      }

      const nav = getNavigationRef(this.store);
      if (typeof nav?.addListener !== 'function') return;
      const removeListener = nav.addListener.call(nav, 'state', onStateChange);
      if (typeof removeListener === 'function') this.unlockListener = removeListener;
    } catch {
      if (isDev) {
        console.warn('[RouterGuard] failed to attach navigation listener');
      }
    }
  }

  private lock(target: string | null) {
    this.clearLockTimer();
    this.clearUnlockListener();

    this.locked = true;
    this.lockTarget = target;
    this.startPath = this.getCurrentPath();
    this.lockTimer = setTimeout(() => {
      if (this.locked) this.unlockWithReason('timeout');
    }, this.lockMs);
    releaseTimer(this.lockTimer);
    this.attachStateListener();
  }

  private patchForwardMethod(method: string) {
    const current = this.router[method];
    if (typeof current !== 'function') return;

    const original = getOriginalMethod(current as RouterMethod);
    this.originals.set(method, original);

    const controller = this;
    const patched: RouterMethod = function patchedRouterGuardForwardMethod(
      this: unknown,
      ...args: unknown[]
    ) {
      const { bypass, callArgs } = getBypassCallArgs(args);
      const target = getTargetPath(callArgs[0]);

      if (bypass) {
        controller.emit({ type: 'bypass', method, target });
        return original.apply(resolveThisArg(this, controller.router), callArgs);
      }

      if (controller.blockSamePath && target) {
        const currentPath = controller.getCurrentPath();
        if (currentPath === target) {
          controller.emit({ type: 'block', method, target, reason: 'same-target' });
          return undefined;
        }
      }

      if (controller.locked) {
        controller.emit({ type: 'block', method, target, reason: 'locked' });
        return undefined;
      }

      controller.lock(target);
      controller.emit({ type: 'allow', method, target });

      try {
        const result = original.apply(resolveThisArg(this, controller.router), callArgs);
        if (isPromiseLikeResult(result) && typeof result.catch === 'function') {
          result.catch(() => controller.unlockWithReason('error'));
        }
        return result;
      } catch (error) {
        controller.unlockWithReason('error');
        throw error;
      }
    };

    markPatchedMethod(patched, original);
    this.router[method] = patched;
  }

  private patchBackMethod(method: string) {
    const current = this.router[method];
    if (typeof current !== 'function') return;

    const original = getOriginalMethod(current as RouterMethod);
    this.originals.set(method, original);

    const controller = this;
    const patched: RouterMethod = function patchedRouterGuardBackMethod(
      this: unknown,
      ...args: unknown[]
    ) {
      controller.unlockWithReason('back');
      return original.apply(resolveThisArg(this, controller.router), args);
    };

    markPatchedMethod(patched, original);
    this.router[method] = patched;
  }
}

export function createRouterGuard(options: RouterGuardOptions): RouterGuardController {
  const router = options?.router as GuardedRouter | undefined;
  if (!router || typeof router !== 'object') {
    throw new TypeError('[RouterGuard] options.router must be an object');
  }

  const existing = activeGuards.get(router);
  if (existing) return existing;

  const controller = new RouterGuardImpl(options);
  activeGuards.set(router, controller);
  controller.install();

  return controller;
}
