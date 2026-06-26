import { getReactNative, getReactNativePlatformOS } from '../internal/reactNative';

export type DeviceBrand =
  | 'apple'
  | 'google'
  | 'honor'
  | 'huawei'
  | 'iqoo'
  | 'lenovo'
  | 'meizu'
  | 'motorola'
  | 'oneplus'
  | 'oppo'
  | 'poco'
  | 'realme'
  | 'redmi'
  | 'samsung'
  | 'vivo'
  | 'xiaomi'
  | 'unknown';

export type DeviceBrandInput = {
  os?: unknown;
  manufacturer?: unknown;
  brand?: unknown;
  model?: unknown;
  product?: unknown;
  device?: unknown;
};

const normalize = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase();

const readPlatformConstant = (constants: Record<string, unknown>, key: string): unknown =>
  constants[key] ?? constants[key.toLowerCase()];

export function resolveDeviceBrand(input: DeviceBrandInput): DeviceBrand {
  const os = normalize(input.os);
  if (os === 'ios' || os === 'macos') return 'apple';

  const value = [
    input.manufacturer,
    input.brand,
    input.model,
    input.product,
    input.device,
  ]
    .map(normalize)
    .filter(Boolean)
    .join(' ');

  if (!value) return 'unknown';

  if (/(iphone|ipad|apple)/.test(value)) return 'apple';
  if (/(google|pixel)/.test(value)) return 'google';
  if (/(samsung|三星)/.test(value)) return 'samsung';
  if (/(motorola|moto)/.test(value)) return 'motorola';
  if (/(lenovo|联想)/.test(value)) return 'lenovo';
  if (/(honor|荣耀)/.test(value)) return 'honor';
  if (/(huawei|华为)/.test(value)) return 'huawei';
  if (/(one\s*plus|oneplus|一加)/.test(value)) return 'oneplus';
  if (/(realme|真我)/.test(value)) return 'realme';
  if (/(oppo|heytap|欧珀)/.test(value)) return 'oppo';
  if (/(i\s*qoo|iqoo)/.test(value)) return 'iqoo';
  if (/(vivo|bbk|维沃)/.test(value)) return 'vivo';
  if (/(redmi|红米)/.test(value)) return 'redmi';
  if (/(poco)/.test(value)) return 'poco';
  if (/(xiaomi|小米)/.test(value)) return 'xiaomi';
  if (/(meizu|mblu|魅族|魅蓝)/.test(value)) return 'meizu';

  return 'unknown';
}

export function getDeviceBrand(): DeviceBrand {
  const os = getReactNativePlatformOS();
  if (os === 'ios' || os === 'macos') return 'apple';

  const constants = (getReactNative()?.Platform?.constants ?? {}) as Record<string, unknown>;
  return resolveDeviceBrand({
    os,
    manufacturer: readPlatformConstant(constants, 'Manufacturer'),
    brand: readPlatformConstant(constants, 'Brand'),
    model: readPlatformConstant(constants, 'Model'),
    product: readPlatformConstant(constants, 'Product'),
    device: readPlatformConstant(constants, 'Device'),
  });
}
