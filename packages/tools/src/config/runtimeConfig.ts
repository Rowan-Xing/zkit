const RUNTIME_CONFIG_MODULE_ID = 'y2kit-tools-runtime-config';

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const isMissingRuntimeConfigModuleError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = String(error.message || '');
  if (!message.includes(RUNTIME_CONFIG_MODULE_ID)) return false;
  return (
    message.includes('Cannot find module') ||
    message.includes('Unable to resolve module') ||
    message.includes('Requiring unknown module')
  );
};

const getRuntimeConfigOverride = (): Record<string, unknown> | null => {
  try {
    const loaded = require(RUNTIME_CONFIG_MODULE_ID);
    const candidate =
      loaded && typeof loaded === 'object' && 'default' in loaded ? loaded.default : loaded;
    return asRecord(candidate);
  } catch (error) {
    if (!isMissingRuntimeConfigModuleError(error)) throw error;
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

export const getExtra = (): Record<string, unknown> => {
  const runtimeConfigOverride = getRuntimeConfigOverride();
  if (runtimeConfigOverride) return runtimeConfigOverride;
  throw createMissingRuntimeConfigError();
};

export const getEnv = (key: string, fallback = ''): string => {
  const extra = getExtra();
  if (extra && key in extra && (extra as any)[key] != null) return String((extra as any)[key]);
  return fallback;
};

export const getRequiredEnv = (key: string): string => {
  const extra = getExtra();
  if (extra && key in extra && (extra as any)[key] != null) {
    const val = String((extra as any)[key]);
    if (val !== '') return val;
  }
  const err: any = new Error(`Missing runtime config: ${key}`);
  err.code = 'MISSING_RUNTIME_CONFIG';
  throw err;
};

const runtimeConfig = new Proxy(
  {},
  {
    get: (_target, prop) => {
      if (typeof prop !== 'string') return undefined;
      return getEnv(prop);
    },
    has: (_target, prop) => {
      if (typeof prop !== 'string') return false;
      const extra = getExtra();
      return prop in (extra || {});
    },
  }
) as Record<string, string>;

export default runtimeConfig;
