/**
 * Router Guard — 路由防重复跳转守卫
 *
 * 拦截 router.push / replace / navigate 等前进跳转方法，防止用户快速连点导致重复跳转。
 * 前进导航触发后上锁；导航状态变化、后退导航、异常或兜底超时会解锁。
 */

declare const __DEV__: boolean | undefined;
declare const require: (id: string) => unknown;

export type RouterMethod = (...args: any[]) => any;

/** router 对象最小接口（兼容 expo-router，也允许只实现部分方法） */
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
  | 'destroy';

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
      reason: 'locked' | 'same-path';
    }
  | {
      type: 'unlock';
      reason: RouterGuardUnlockReason;
    }
  | {
      type: 'ready' | 'destroy';
    };

export interface RouterGuardOptions {
  /** expo-router 的 router 对象 */
  router: RouterLike;
  /** 兜底锁定时长（毫秒），默认 2000 */
  fallbackLockMs?: number;
  /** 前进导航方法名（受锁控制），默认 ['push', 'replace', 'navigate', 'dismissTo'] */
  forwardMethods?: readonly string[];
  /** 后退导航方法名（不受锁控制，但会解锁），默认 ['back', 'dismiss', 'dismissAll'] */
  backMethods?: readonly string[];
  /** 调试或埋点用事件回调。不要在这里触发同步重渲染热路径。 */
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

const DEFAULT_FALLBACK_LOCK_MS = 2000;
const DEFAULT_FORWARD_METHODS = ['push', 'replace', 'navigate', 'dismissTo'] as const;
const DEFAULT_BACK_METHODS = ['back', 'dismiss', 'dismissAll'] as const;
const ORIGINAL_METHOD_KEY = '__y2kitRouterGuardOriginal';
const activeGuards = new WeakMap<GuardedRouter, RouterGuardController>();

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
  if (path.charCodeAt(0) !== 47 /* / */) path = `/${path}`;

  while (path.length > 1 && path.charCodeAt(path.length - 1) === 47) {
    path = path.substring(0, path.length - 1);
  }

  return path;
};

const getActivePathFromState = (state: any): string => {
  let current = state;
  let activePath = '';

  for (let depth = 0; depth < 20 && current?.routes?.length; depth += 1) {
    const index = typeof current.index === 'number' ? current.index : current.routes.length - 1;
    const route = current.routes[index];
    if (!route) break;

    if (typeof route.name === 'string' && route.name) {
      activePath = route.name;
    }

    if (!route.state) break;
    current = route.state;
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
  ((method as any)[ORIGINAL_METHOD_KEY] as RouterMethod | undefined) ?? method;

const markPatchedMethod = (patched: RouterMethod, original: RouterMethod) => {
  (patched as any)[ORIGINAL_METHOD_KEY] = original;
};

const getTargetPath = (firstArg: unknown): string | null => {
  if (typeof firstArg === 'string') return normalizePath(firstArg);
  if (!isRecord(firstArg)) return null;

  return normalizePath(firstArg.pathname ?? firstArg.path ?? firstArg.href);
};

const getBypassCallArgs = (args: IArguments): { bypass: boolean; callArgs: unknown[] } => {
  const callArgs = Array.prototype.slice.call(args) as unknown[];
  const last = callArgs[callArgs.length - 1];

  if (!isRecord(last) || last.skipRouterThrottle !== true) {
    return { bypass: false, callArgs };
  }

  const first = callArgs[0];
  const singleRouteObject =
    callArgs.length === 1 &&
    isRecord(first) &&
    ('pathname' in first || 'path' in first || 'href' in first);

  if (!singleRouteObject) callArgs.pop();
  return { bypass: true, callArgs };
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

const resolveFallbackLockMs = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_FALLBACK_LOCK_MS;

class RouterGuardController {
  private readonly router: GuardedRouter;
  private readonly fallbackLockMs: number;
  private readonly forwardMethods: string[];
  private readonly backMethods: string[];
  private readonly onEvent: ((event: RouterGuardEvent) => void) | undefined;
  private readonly originals = new Map<string, RouterMethod>();
  private readonly store: RouterStoreLike | null;

  private destroyed = false;
  private locked = false;
  private lockTimer: ReturnType<typeof setTimeout> | null = null;
  private lockTarget: string | null = null;
  private startPath: string | null = null;
  private unlockListener: (() => void) | null = null;

  constructor(options: RouterGuardOptions) {
    this.router = options.router as GuardedRouter;
    this.fallbackLockMs = resolveFallbackLockMs(options.fallbackLockMs);
    this.forwardMethods = getMethodList(options.forwardMethods, DEFAULT_FORWARD_METHODS);
    this.backMethods = getMethodList(options.backMethods, DEFAULT_BACK_METHODS);
    this.onEvent = options.onEvent;
    this.store = loadRouterStore();
  }

  install() {
    for (const method of this.forwardMethods) {
      this.patchForwardMethod(method);
    }

    for (const method of this.backMethods) {
      if (this.originals.has(method)) continue;
      this.patchBackMethod(method);
    }

    (globalThis as any).ROUTER_PATCH_APPLIED = true;

    if (isDev) {
      (globalThis as any).__verifyRouterGuard = () => {
        const patched = this.forwardMethods.some((method) => {
          const value = this.router[method];
          return typeof value === 'function' && !!(value as any)[ORIGINAL_METHOD_KEY];
        });
        console.log(`[RouterGuard] patched: ${patched}, locked: ${this.locked}`);
        return patched;
      };
    }

    this.emit({ type: 'ready' });
  }

  destroy() {
    if (this.destroyed) return;

    this.unlock('destroy');

    for (const [method, original] of this.originals) {
      this.router[method] = original;
    }

    this.originals.clear();
    this.destroyed = true;
    activeGuards.delete(this.router);

    (globalThis as any).ROUTER_PATCH_APPLIED = false;
    if (isDev) delete (globalThis as any).__verifyRouterGuard;

    this.emit({ type: 'destroy' });
  }

  private emit(event: RouterGuardEvent) {
    this.onEvent?.(event);
  }

  private getCurrentPath(): string | null {
    try {
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

  private unlock(reason: RouterGuardUnlockReason) {
    const wasLocked = this.locked;

    this.locked = false;
    this.lockTarget = null;
    this.startPath = null;
    this.clearLockTimer();
    this.clearUnlockListener();

    if (!wasLocked) return;

    this.emit({ type: 'unlock', reason });

    if (isDev && reason !== 'destroy') {
      console.log(`[RouterGuard] unlock: ${reason}`);
    }
  }

  private lock(target: string | null) {
    this.clearLockTimer();
    this.clearUnlockListener();

    this.locked = true;
    this.lockTarget = target;
    this.startPath = this.getCurrentPath();
    this.lockTimer = setTimeout(() => {
      if (this.locked) this.unlock('timeout');
    }, this.fallbackLockMs);

    const nav = getNavigationRef(this.store);
    if (typeof nav?.addListener === 'function') {
      try {
        const removeListener = nav.addListener.call(nav, 'state', () => {
          const currentPath = this.getCurrentPath();
          if (this.lockTarget && currentPath === this.lockTarget) {
            this.unlock('path-match');
            return;
          }

          if (!this.lockTarget || (currentPath && currentPath !== this.startPath)) {
            this.unlock('state-change');
          }
        });

        if (typeof removeListener === 'function') {
          this.unlockListener = removeListener;
        }
      } catch {
        if (isDev) {
          console.warn('[RouterGuard] failed to attach navigation listener');
        }
      }
    }
  }

  private patchForwardMethod(method: string) {
    const current = this.router[method];
    if (typeof current !== 'function') return;

    const original = getOriginalMethod(current as RouterMethod);
    this.originals.set(method, original);

    const controller = this;
    const patched: RouterMethod = function patchedRouterGuardForwardMethod(this: unknown) {
      const { bypass, callArgs } = getBypassCallArgs(arguments);
      const target = getTargetPath(callArgs[0]);

      if (bypass) {
        controller.emit({ type: 'bypass', method, target });
        return original.apply(resolveThisArg(this, controller.router), callArgs);
      }

      if (target) {
        const currentPath = controller.getCurrentPath();
        if (currentPath === target) {
          controller.emit({ type: 'block', method, target, reason: 'same-path' });
          if (isDev) console.log(`[RouterGuard] block same path: ${method}(${target})`);
          return undefined;
        }
      }

      if (controller.locked) {
        controller.emit({ type: 'block', method, target, reason: 'locked' });
        if (isDev) console.log(`[RouterGuard] block duplicate: ${method}(${target ?? ''})`);
        return undefined;
      }

      controller.lock(target);
      controller.emit({ type: 'allow', method, target });

      try {
        return original.apply(resolveThisArg(this, controller.router), callArgs);
      } catch (error) {
        controller.unlock('error');
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
    const patched: RouterMethod = function patchedRouterGuardBackMethod(this: unknown) {
      controller.unlock('back');
      return original.apply(resolveThisArg(this, controller.router), arguments as any);
    };

    markPatchedMethod(patched, original);
    this.router[method] = patched;
  }
}

/**
 * 初始化路由防重复跳转守卫。
 *
 * @returns 销毁函数，调用后移除 patch 并恢复原始方法。
 */
export function initRouterGuard(options: RouterGuardOptions): () => void {
  const router = options?.router as GuardedRouter | undefined;
  if (!router || typeof router !== 'object') {
    throw new TypeError('[RouterGuard] options.router must be an object');
  }

  const existing = activeGuards.get(router);
  if (existing) {
    if (isDev) console.warn('[RouterGuard] router is already guarded');
    return () => {};
  }

  const controller = new RouterGuardController(options);
  activeGuards.set(router, controller);
  controller.install();

  return () => controller.destroy();
}
