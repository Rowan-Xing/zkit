const RUNTIME_CONFIG_PROVIDER_ID = 'y2kit-tools-runtime-config';

declare const require: undefined | ((id: string) => unknown);

export type RuntimeConfigPrimitive = string | number | boolean | null | undefined;
export type RuntimeConfigValue =
  | RuntimeConfigPrimitive
  | readonly RuntimeConfigValue[]
  | { readonly [key: string]: RuntimeConfigValue };
export type RuntimeConfig = Readonly<Record<string, RuntimeConfigValue>>;
export type RuntimeConfigSource = RuntimeConfig | (() => RuntimeConfig);
export type RuntimeConfigErrorCode =
  | 'INVALID_RUNTIME_CONFIG_PROVIDER'
  | 'MISSING_RUNTIME_CONFIG_PROVIDER'
  | 'MISSING_RUNTIME_CONFIG_VALUE';

export type RuntimeConfigError = Error & {
  code: RuntimeConfigErrorCode;
};

let configuredRuntimeConfigSource: RuntimeConfigSource | null = null;
let cachedRuntimeConfig: RuntimeConfig | null | undefined;

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const asPlainRecord = (value: unknown): Record<string, unknown> | null => {
  const record = asRecord(value);
  if (!record) return null;
  const prototype = Object.getPrototypeOf(record);
  return prototype === Object.prototype || prototype === null ? record : null;
};

const hasOwn = (target: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(target, key);

const createRuntimeConfigError = (
  code: RuntimeConfigErrorCode,
  message: string
): RuntimeConfigError => {
  const error = new Error(message) as RuntimeConfigError;
  error.code = code;
  return error;
};

const isMissingRuntimeConfigModuleError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = String(error.message || '');
  if (!message.includes(RUNTIME_CONFIG_PROVIDER_ID)) return false;

  const code = (error as { code?: unknown }).code;
  return (
    code === 'MODULE_NOT_FOUND' ||
    message.includes('Cannot find module') ||
    message.includes('Unable to resolve module') ||
    message.includes('Requiring unknown module')
  );
};

const normalizeRuntimeConfig = (source: unknown): RuntimeConfig => {
  const resolved = typeof source === 'function' ? (source as () => unknown)() : source;
  const record = asPlainRecord(resolved);

  if (!record) {
    throw createRuntimeConfigError(
      'INVALID_RUNTIME_CONFIG_PROVIDER',
      'Invalid runtime config provider: expected a plain object or a function returning one.'
    );
  }

  return Object.freeze({ ...record }) as RuntimeConfig;
};

const getProviderExport = (loaded: unknown): unknown => {
  const record = asRecord(loaded);
  if (!record) return loaded;
  if ('default' in record) return record.default;
  if ('runtimeConfig' in record) return record.runtimeConfig;
  return loaded;
};

const loadModuleRuntimeConfig = (): RuntimeConfig | null => {
  if (typeof require !== 'function') return null;

  try {
    return normalizeRuntimeConfig(getProviderExport(require(RUNTIME_CONFIG_PROVIDER_ID)));
  } catch (error) {
    if (isMissingRuntimeConfigModuleError(error)) return null;
    throw error;
  }
};

const loadProcessEnvRuntimeConfig = (): RuntimeConfig | null => {
  const processEnv = asRecord(
    (globalThis as { process?: { env?: unknown } }).process?.env
  );
  if (!processEnv) return null;
  return Object.freeze({ ...processEnv }) as RuntimeConfig;
};

const loadRuntimeConfig = (): RuntimeConfig | null => {
  if (cachedRuntimeConfig !== undefined) return cachedRuntimeConfig;

  if (configuredRuntimeConfigSource) {
    cachedRuntimeConfig = normalizeRuntimeConfig(configuredRuntimeConfigSource);
    return cachedRuntimeConfig;
  }

  cachedRuntimeConfig = loadModuleRuntimeConfig() ?? loadProcessEnvRuntimeConfig();
  return cachedRuntimeConfig;
};

const missingProviderError = () =>
  createRuntimeConfigError(
    'MISSING_RUNTIME_CONFIG_PROVIDER',
    'Missing runtime config provider. Call `configureRuntimeConfig(...)`, expose ' +
      '`y2kit-tools-runtime-config`, or provide `process.env` in the current runtime.'
  );

const missingValueError = (key: string) =>
  createRuntimeConfigError(
    'MISSING_RUNTIME_CONFIG_VALUE',
    `Missing runtime config value: ${key}`
  );

const getRuntimeRecord = (): RuntimeConfig => {
  const runtimeConfig = loadRuntimeConfig();
  if (runtimeConfig) return runtimeConfig;
  throw missingProviderError();
};

const isStringLikeRuntimeValue = (value: RuntimeConfigValue): value is RuntimeConfigPrimitive =>
  value == null ||
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean';

export function configureRuntimeConfig(source: RuntimeConfigSource | null): void {
  configuredRuntimeConfigSource = source;
  cachedRuntimeConfig = undefined;
}

export function resetRuntimeConfig(): void {
  configuredRuntimeConfigSource = null;
  cachedRuntimeConfig = undefined;
}

export function getRuntimeConfig(): RuntimeConfig {
  return getRuntimeRecord();
}

export function tryGetRuntimeConfig(): RuntimeConfig | null {
  try {
    return getRuntimeRecord();
  } catch (error) {
    if ((error as { code?: unknown }).code === 'MISSING_RUNTIME_CONFIG_PROVIDER') return null;
    throw error;
  }
}

export function hasRuntimeValue(key: string): boolean {
  if (!key) return false;
  const runtimeConfig = getRuntimeRecord();
  return hasOwn(runtimeConfig, key) && runtimeConfig[key] != null;
}

export function getRuntimeValue(key: string): RuntimeConfigValue | undefined;
export function getRuntimeValue<T extends RuntimeConfigValue>(
  key: string,
  fallback: T
): RuntimeConfigValue | T;
export function getRuntimeValue<T extends RuntimeConfigValue>(
  key: string,
  fallback?: T
): RuntimeConfigValue | T | undefined {
  if (!key) return fallback;
  const runtimeConfig = getRuntimeRecord();
  return hasOwn(runtimeConfig, key) ? runtimeConfig[key] : fallback;
}

export function getRuntimeString(key: string, fallback = ''): string {
  const value = getRuntimeValue(key);
  if (value == null) return fallback;
  if (!isStringLikeRuntimeValue(value)) return fallback;
  return String(value);
}

export function requireRuntimeString(key: string): string {
  const value = getRuntimeString(key, '');
  if (value !== '') return value;
  throw missingValueError(key);
}

export function tryGetRuntimeString(key: string, fallback = ''): string {
  try {
    return getRuntimeString(key, fallback);
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    if (
      code === 'MISSING_RUNTIME_CONFIG_PROVIDER' ||
      code === 'MISSING_RUNTIME_CONFIG_VALUE'
    ) {
      return fallback;
    }
    throw error;
  }
}
