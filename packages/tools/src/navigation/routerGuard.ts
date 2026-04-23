/**
 * Router Guard — 路由防抖补丁
 *
 * 拦截 router.push / replace / navigate 等前进跳转方法，
 * 防止用户快速连点导致重复跳转（全平台生效）。
 *
 * 策略：
 * - 前进导航触发后上锁，真正发生「导航状态变化」后解锁；
 * - 兜底超时自动解锁，防止极端情况卡死；
 * - 后退导航不受锁限制，并主动解锁。
 *
 * @example
 * ```ts
 * import { router } from 'expo-router';
 * import { initRouterGuard } from 'y2kit-tools';
 *
 * // 基本用法
 * initRouterGuard({ router });
 *
 * // 自定义配置
 * const destroy = initRouterGuard({
 *   router,
 *   fallbackLockMs: 3000,
 * });
 *
 * // 需要时可销毁，恢复原始路由方法
 * destroy();
 * ```
 */

// --- 类型定义 ---

/** router 对象最小接口（兼容 expo-router） */
export interface RouterLike {
  push: Function;
  replace: Function;
  navigate: Function;
  back: Function;
  dismiss?: Function;
  dismissAll?: Function;
  dismissTo?: Function;
  [key: string]: any;
}

export interface RouterGuardOptions {
  /** expo-router 的 router 对象 */
  router: RouterLike;
  /** 兜底锁定时长（毫秒），默认 2000 */
  fallbackLockMs?: number;
  /** 前进导航方法名（受锁控制），默认 ['push', 'replace', 'navigate', 'dismissTo'] */
  forwardMethods?: string[];
  /** 后退导航方法名（不受锁控制，但会解锁），默认 ['back', 'dismiss', 'dismissAll'] */
  backMethods?: string[];
}

// --- 内部类型 ---

interface NavigationRefLike {
  addListener?: (event: string, cb: () => void) => () => void;
  getRootState?: () => any;
  current?: {
    addListener?: (event: string, cb: () => void) => () => void;
    getRootState?: () => any;
  };
}

interface RouterStoreLike {
  navigationRef?: NavigationRefLike;
  getRouteInfo?: () => { pathname?: string } | null;
}

// --- 工具函数（纯函数，无副作用） ---

/**
 * 标准化路径：去 query/hash，加前缀 `/`，去尾部 `/`
 * 使用 indexOf 避免 split 产生中间数组
 */
function normalizePath(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let end = raw.length;
  const q = raw.indexOf('?');
  const h = raw.indexOf('#');
  if (q !== -1 && q < end) end = q;
  if (h !== -1 && h < end) end = h;

  let p = end === raw.length ? raw : raw.substring(0, end);
  if (p.charCodeAt(0) !== 47 /* '/' */) p = '/' + p;
  while (p.length > 1 && p.charCodeAt(p.length - 1) === 47) {
    p = p.substring(0, p.length - 1);
  }
  return p;
}

/** 从嵌套 navigation state 中提取当前活跃路由名称 */
function getActivePathFromState(state: any): string {
  let cur = state;
  for (let i = 0; i < 20 && cur?.routes?.length; i++) {
    const idx =
      typeof cur.index === 'number' ? cur.index : cur.routes.length - 1;
    const route = cur.routes[idx];
    if (!route) break;
    if (!route.state) return route.name || '';
    cur = route.state;
  }
  return '';
}

// --- 主函数 ---

declare const __DEV__: boolean | undefined;

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

/**
 * 初始化路由防抖守卫
 *
 * @param options 配置项
 * @returns 销毁函数，调用后移除所有 patch 并恢复原始方法
 */
export function initRouterGuard(options: RouterGuardOptions): () => void {
  const {
    router,
    fallbackLockMs = 2000,
    forwardMethods = ['push', 'replace', 'navigate', 'dismissTo'],
    backMethods = ['back', 'dismiss', 'dismissAll'],
  } = options;

  // 防止重复初始化
  if ((globalThis as any).ROUTER_PATCH_APPLIED) {
    if (isDev) {
      console.warn('[RouterGuard] 已初始化，跳过重复调用');
    }
    return () => {};
  }

  // 尝试获取 expo-router 内部 store（增强功能：导航状态变化解锁）
  let store: RouterStoreLike | null = null;
  try {
    ({ store } = require('expo-router/build/global-state/router-store'));
  } catch {
    store = null;
    if (isDev) {
      console.warn('[RouterGuard] 无法加载 router-store，退回为纯时间锁策略');
    }
  }

  // --- 导航锁状态 ---
  let locked = false;
  let lockTimer: ReturnType<typeof setTimeout> | 0 = 0;
  let unlockListener: (() => void) | null = null;
  let lockTarget: string | null = null;

  function getCurrentPath(): string | null {
    const info = store?.getRouteInfo?.();
    if (info?.pathname) return normalizePath(info.pathname);

    const ref = store?.navigationRef;
    const getRootState = ref?.getRootState || ref?.current?.getRootState;
    if (!getRootState) return null;
    return normalizePath(getActivePathFromState(getRootState()));
  }

  function unlock(reason?: string) {
    locked = false;
    lockTarget = null;
    if (lockTimer) {
      clearTimeout(lockTimer);
      lockTimer = 0;
    }
    if (unlockListener) {
      unlockListener();
      unlockListener = null;
    }
    if (isDev && reason) console.log(`[RouterGuard] 解锁: ${reason}`);
  }

  function lock(target: string | null) {
    locked = true;
    lockTarget = target;

    // 清理上一轮（防御性）
    if (lockTimer) {
      clearTimeout(lockTimer);
      lockTimer = 0;
    }
    if (unlockListener) {
      unlockListener();
      unlockListener = null;
    }

    // 1) 监听导航状态变化解锁（保留对象引用确保 this 绑定正确）
    if (target) {
      const ref = store?.navigationRef;
      const nav = ref?.addListener ? ref : ref?.current;
      if (nav?.addListener) {
        unlockListener = nav.addListener('state', () => {
          if (getCurrentPath() === lockTarget) unlock('path-match');
        });
      }
    }

    // 2) 兜底超时
    lockTimer = setTimeout(() => {
      if (locked) unlock('timeout');
    }, fallbackLockMs);
  }

  // --- 保存原始方法（用于销毁恢复） ---
  const originals = new Map<string, Function>();

  // --- Patch 前进导航 ---
  for (const method of forwardMethods) {
    const orig = router[method];
    if (typeof orig !== 'function') continue;
    const raw: Function = (orig as any)._original || orig;
    originals.set(method, orig);

    const patched = function (this: any) {
      const len = arguments.length;

      // skipRouterThrottle 快捷旁路
      if (len > 0) {
        const last = arguments[len - 1];
        if (last && typeof last === 'object' && last.skipRouterThrottle) {
          const cleaned = Array.prototype.slice.call(arguments, 0, -1);
          return raw.apply(router, cleaned);
        }
      }

      // 提取并标准化目标路径
      const first = len > 0 ? arguments[0] : undefined;
      const rawTarget =
        typeof first === 'string'
          ? first
          : first && typeof first === 'object'
            ? first.pathname || first.path || first.href
            : null;
      const target = normalizePath(rawTarget);

      // 同路径拦截
      if (target) {
        const cur = getCurrentPath();
        if (cur === target) {
          if (isDev)
            console.log(`[RouterGuard] 拦截同路径: ${method}(${target})`);
          return;
        }
      }

      // 导航锁拦截
      if (locked) {
        if (isDev)
          console.log(`[RouterGuard] 拦截重复: ${method}(${target || ''})`);
        return;
      }

      lock(target);
      if (isDev)
        console.log(`[RouterGuard] 放行: ${method}(${target || ''})`);
      return raw.apply(router, arguments);
    };

    (patched as any)._original = raw;
    router[method] = patched;
  }

  // --- Patch 后退导航（不阻止，但解锁） ---
  for (const method of backMethods) {
    const orig = router[method];
    if (typeof orig !== 'function') continue;
    const raw: Function = (orig as any)._original || orig;
    originals.set(method, orig);

    const patched = function (this: any) {
      unlock('back');
      if (isDev) console.log(`[RouterGuard] 放行后退: ${method}`);
      return raw.apply(router, arguments);
    };

    (patched as any)._original = raw;
    router[method] = patched;
  }

  // 标记已应用
  (globalThis as any).ROUTER_PATCH_APPLIED = true;

  if (isDev) {
    console.log(`[RouterGuard] 已启用 (兜底 ${fallbackLockMs}ms)`);
    (globalThis as any).__verifyRouterGuard = () => {
      const ok = !!(router.push as any)?._original;
      console.log(`[RouterGuard] push patched: ${ok}, locked: ${locked}`);
      return ok;
    };
  }

  // --- 返回销毁函数 ---
  return function destroyRouterGuard() {
    unlock('destroy');
    for (const [method, orig] of originals) {
      router[method] = orig;
    }
    originals.clear();
    (globalThis as any).ROUTER_PATCH_APPLIED = false;
    if (isDev) {
      console.log('[RouterGuard] 已销毁，路由方法已恢复');
      delete (globalThis as any).__verifyRouterGuard;
    }
  };
}
