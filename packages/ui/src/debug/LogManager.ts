export type DebugLogType = 'log' | 'warn' | 'error' | 'info' | 'debug';

export type DebugLogEntry = {
  id: string;
  type: DebugLogType;
  message: string;
  timestamp: string;
  fullTimestamp: string;
};

export type DebugErrorSource = 'console' | 'global' | 'promise' | 'react' | string;

export type DebugErrorEntry = {
  id: string;
  source: DebugErrorSource;
  message: string;
  timestamp: string;
  fullTimestamp: string;
};

export type DebugNotificationType = 'log' | 'error' | 'clear';

export type DebugNotificationPayload = DebugLogEntry | DebugErrorEntry | 'logs' | 'errors' | 'all';

export type DebugListener = (type: DebugNotificationType, data: DebugNotificationPayload) => void;

type PendingNotification = {
  type: DebugNotificationType;
  data: DebugNotificationPayload;
};

type ErrorUtilsHandler = (error: Error, isFatal?: boolean) => void;

type ErrorUtilsShape = {
  getGlobalHandler?: () => ErrorUtilsHandler | null | undefined;
  setGlobalHandler?: (handler: ErrorUtilsHandler) => void;
};

type GlobalDebugScope = typeof globalThis & {
  ErrorUtils?: ErrorUtilsShape;
  addEventListener?: (type: string, handler: (event: unknown) => void) => void;
  removeEventListener?: (type: string, handler: (event: unknown) => void) => void;
};

function createId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function formatMessage(args: unknown[]) {
  return args
    .map((arg) => {
      if (typeof arg === 'object' && arg != null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(' ');
}

export class DebugLogManager {
  private logs: DebugLogEntry[] = [];
  private errors: DebugErrorEntry[] = [];
  private readonly maxLogs = 2000;
  private readonly maxErrors = 100;
  private readonly listeners = new Set<DebugListener>();
  private isEnabled = false;
  private readonly searchCache = new Map<string, DebugLogEntry[] | DebugErrorEntry[]>();
  private readonly cacheMaxSize = 50;
  private notifyTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingNotifications: PendingNotification[] = [];
  private readonly originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
  };
  private originalGlobalHandler: ErrorUtilsHandler | null = null;
  private unhandledRejectionHandler: ((event: unknown) => void) | null = null;

  enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;

    console.log = (...args: unknown[]) => {
      this.originalConsole.log(...args);
      this.addLog('log', args);
    };

    console.warn = (...args: unknown[]) => {
      this.originalConsole.warn(...args);
      this.addLog('warn', args);
    };

    console.error = (...args: unknown[]) => {
      this.originalConsole.error(...args);
      this.addLog('error', args);
      this.addError('console', args);
    };

    console.info = (...args: unknown[]) => {
      this.originalConsole.info(...args);
      this.addLog('info', args);
    };

    console.debug = (...args: unknown[]) => {
      this.originalConsole.debug(...args);
      this.addLog('debug', args);
    };

    this.setupGlobalErrorHandling();
  }

  disable() {
    if (!this.isEnabled) return;
    this.isEnabled = false;

    Object.assign(console, this.originalConsole);

    const globalScope = globalThis as GlobalDebugScope;
    if (globalScope.ErrorUtils?.setGlobalHandler && this.originalGlobalHandler) {
      globalScope.ErrorUtils.setGlobalHandler(this.originalGlobalHandler);
    }

    if (globalScope.removeEventListener && this.unhandledRejectionHandler) {
      globalScope.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
    }

    this.originalGlobalHandler = null;
    this.unhandledRejectionHandler = null;
  }

  addLog(type: DebugLogType, args: unknown[]) {
    const logEntry: DebugLogEntry = {
      id: createId(),
      type,
      message: formatMessage(args),
      timestamp: new Date().toLocaleTimeString(),
      fullTimestamp: new Date().toISOString(),
    };

    this.logs.unshift(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.length = this.maxLogs;
    }

    this.clearSearchCache();
    this.scheduleNotification('log', logEntry);
  }

  addError(source: DebugErrorSource, args: unknown[]) {
    const errorEntry: DebugErrorEntry = {
      id: createId(),
      source,
      message: formatMessage(args),
      timestamp: new Date().toLocaleTimeString(),
      fullTimestamp: new Date().toISOString(),
    };

    this.errors.unshift(errorEntry);
    if (this.errors.length > this.maxErrors) {
      this.errors.length = this.maxErrors;
    }

    this.clearSearchCache();
    this.scheduleNotification('error', errorEntry);
  }

  addListener(callback: DebugListener) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  getLogs() {
    return [...this.logs];
  }

  getErrors() {
    return [...this.errors];
  }

  clearLogs() {
    this.logs = [];
    this.notifyListeners('clear', 'logs');
  }

  clearErrors() {
    this.errors = [];
    this.notifyListeners('clear', 'errors');
  }

  clearAll() {
    this.logs = [];
    this.errors = [];
    this.notifyListeners('clear', 'all');
  }

  exportLogs() {
    return {
      logs: this.logs,
      errors: this.errors,
      exportTime: new Date().toISOString(),
    };
  }

  searchLogs(query: string) {
    if (!query || !query.trim()) return this.logs;

    const cacheKey = `logs:${query.toLowerCase()}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached) return cached as DebugLogEntry[];

    const lowerQuery = query.toLowerCase();
    const results = this.logs.filter(
      (log) =>
        log.message.toLowerCase().includes(lowerQuery) ||
        log.type.toLowerCase().includes(lowerQuery)
    );

    this.manageCacheSize();
    this.searchCache.set(cacheKey, results);
    return results;
  }

  searchErrors(query: string) {
    if (!query || !query.trim()) return this.errors;

    const cacheKey = `errors:${query.toLowerCase()}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached) return cached as DebugErrorEntry[];

    const lowerQuery = query.toLowerCase();
    const results = this.errors.filter(
      (error) =>
        error.message.toLowerCase().includes(lowerQuery) ||
        error.source.toLowerCase().includes(lowerQuery)
    );

    this.manageCacheSize();
    this.searchCache.set(cacheKey, results);
    return results;
  }

  private setupGlobalErrorHandling() {
    const globalScope = globalThis as GlobalDebugScope;

    if (globalScope.ErrorUtils?.getGlobalHandler && globalScope.ErrorUtils?.setGlobalHandler) {
      const originalHandler = globalScope.ErrorUtils.getGlobalHandler() ?? null;
      this.originalGlobalHandler = originalHandler;

      globalScope.ErrorUtils.setGlobalHandler((error, isFatal) => {
        this.addError('global', [`${isFatal ? '[FATAL] ' : ''}${error.message}`, error.stack]);
        originalHandler?.(error, isFatal);
      });
    }

    if (globalScope.addEventListener) {
      this.unhandledRejectionHandler = (event: unknown) => {
        const reason =
          typeof event === 'object' && event != null && 'reason' in event
            ? (event as { reason?: unknown }).reason
            : event;
        this.addError('promise', ['Unhandled Promise Rejection:', reason]);
      };
      globalScope.addEventListener('unhandledrejection', this.unhandledRejectionHandler);
    }
  }

  private scheduleNotification(type: DebugNotificationType, data: DebugNotificationPayload) {
    this.pendingNotifications.push({ type, data });

    if (this.notifyTimer) {
      clearTimeout(this.notifyTimer);
    }

    this.notifyTimer = setTimeout(() => {
      this.flushNotifications();
    }, 16);
  }

  private flushNotifications() {
    if (this.pendingNotifications.length === 0) return;

    const notifications = this.pendingNotifications.slice();
    this.pendingNotifications = [];
    this.notifyTimer = null;

    this.listeners.forEach((callback) => {
      try {
        notifications.forEach(({ type, data }) => {
          callback(type, data);
        });
      } catch {
        // no-op
      }
    });
  }

  private notifyListeners(type: DebugNotificationType, data: DebugNotificationPayload) {
    this.listeners.forEach((callback) => {
      try {
        callback(type, data);
      } catch {
        // no-op
      }
    });
  }

  private clearSearchCache() {
    this.searchCache.clear();
  }

  private manageCacheSize() {
    if (this.searchCache.size <= this.cacheMaxSize) return;
    const firstKey = this.searchCache.keys().next().value;
    if (firstKey) {
      this.searchCache.delete(firstKey);
    }
  }
}

export const debugLogManager = new DebugLogManager();

export default debugLogManager;
