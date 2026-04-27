const RUNTIME_CONFIG_MODULE_ID = 'y2kit-tools-runtime-config';

declare const require: (id: string) => unknown;

export type RuntimeConfig = Record<string, unknown>;

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  return value as Record<string, unknown>;
};

const hasOwn = (target: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(target, key);

const isMissingRuntimeConfigModuleError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = String(error.message || '');
  if (!message.includes(RUNTIME_CONFIG_MODULE_ID)) return false;
  const code = (error as { code?: unknown }).code;
  return (
    code === 'MODULE_NOT_FOUND' ||
    message.includes('Cannot find module') ||
    message.includes('Unable to resolve module') ||
    message.includes('Requiring unknown module')
  );
};

let cachedRuntimeConfig: RuntimeConfig | null | undefined;

const createInvalidRuntimeConfigError = (): Error & { code: string } => {
  const err = new Error(
    'Invalid runtime config provider: `y2kit-tools-runtime-config` must export a plain object.'
  ) as Error & { code: string };
  err.code = 'INVALID_RUNTIME_CONFIG_PROVIDER';
  return err;
};

const getRuntimeConfigOverride = (): Record<string, unknown> | null => {
  if (cachedRuntimeConfig !== undefined) return cachedRuntimeConfig;

  try {
    const loaded = require(RUNTIME_CONFIG_MODULE_ID);
    const candidate =
      loaded && typeof loaded === 'object' && 'default' in loaded ? loaded.default : loaded;
    const runtimeConfig = asRecord(candidate);
    if (!runtimeConfig) throw createInvalidRuntimeConfigError();
    cachedRuntimeConfig = runtimeConfig;
    return cachedRuntimeConfig;
  } catch (error) {
    if (!isMissingRuntimeConfigModuleError(error)) throw error;
    cachedRuntimeConfig = null;
    return null;
  }
};

const createMissingRuntimeConfigError = (): Error & { code: string } => {
  const err = new Error(
    'Missing runtime config provider: `y2kit-tools-runtime-config`. ' +
      'Ensure Metro maps it to `generated/runtimeEnv.js` and start/build through `scripts/app-env/with-app-env.js` so APP_ENV is synced.'
  ) as Error & { code: string };
  err.code = 'MISSING_RUNTIME_CONFIG_PROVIDER';
  return err;
};

export const getRuntimeConfig = (): RuntimeConfig => {
  const runtimeConfigOverride = getRuntimeConfigOverride();
  if (runtimeConfigOverride) return runtimeConfigOverride;
  throw createMissingRuntimeConfigError();
};

export const getExtra = getRuntimeConfig;

export const hasEnv = (key: string): boolean => {
  if (!key) return false;
  return hasOwn(getRuntimeConfig(), key);
};

export const getEnv = (key: string, fallback = ''): string => {
  if (!key) return fallback;
  const extra = getRuntimeConfig();
  if (hasOwn(extra, key) && extra[key] != null) return String(extra[key]);
  return fallback;
};

export const getRequiredEnv = (key: string): string => {
  const extra = getRuntimeConfig();
  if (key && hasOwn(extra, key) && extra[key] != null) {
    const val = String(extra[key]);
    if (val !== '') return val;
  }
  const err: any = new Error(`Missing runtime config: ${key}`);
  err.code = 'MISSING_RUNTIME_CONFIG';
  throw err;
};

export const tryGetEnv = (key: string, fallback = ''): string => {
  try {
    return getEnv(key, fallback);
  } catch (error) {
    if (isMissingRuntimeConfigModuleError(error)) return fallback;
    if ((error as { code?: string } | null)?.code === 'MISSING_RUNTIME_CONFIG_PROVIDER') {
      return fallback;
    }
    throw error;
  }
};

const IGNORED_PROXY_KEYS = new Set([
  'then',
  'toJSON',
  'inspect',
  'constructor',
  'valueOf',
  'toString',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  '__proto__',
]);

const runtimeConfig = new Proxy(
  {},
  {
    get: (_target, prop) => {
      if (typeof prop !== 'string') return undefined;
      if (IGNORED_PROXY_KEYS.has(prop)) return undefined;
      return getEnv(prop);
    },
    has: (_target, prop) => {
      if (typeof prop !== 'string') return false;
      return hasEnv(prop);
    },
    ownKeys: () => Reflect.ownKeys(getRuntimeConfig()),
    getOwnPropertyDescriptor: (_target, prop) => {
      if (typeof prop !== 'string' || !hasEnv(prop)) return undefined;
      return {
        enumerable: true,
        configurable: true,
      };
    },
  }
) as Record<string, string>;

export default runtimeConfig;
