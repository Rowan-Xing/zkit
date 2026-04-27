import { Platform } from 'react-native';

/**
 * 手机品牌（用于推断“应该跳转哪个应用商城”）。
 *
 * 说明：
 * - 这里的“品牌”是为了业务侧做更新提醒/跳转商店时的归类结果，而不是严格的硬件厂商枚举。
 * - iOS 统一返回 `ios`（对应 App Store 口径）。
 * - Android 只依赖系统 Build 信息：Manufacturer / Brand / Model / Product / Device。
 *
 * 可靠性与边界：
 * - 大多数真机上 Manufacturer/Brand 比较稳定，满足“按手机品牌归类”这个需求。
 * - 但在模拟器、部分定制 ROM、ADB/工程机、极少数机型上可能拿不到或被改写，最终会返回 `unknown`。
 * - 本工具“不按安装来源（installer package）判断”，只按“设备品牌归类”。
 */
export type PhoneBrand =
  | 'ios'
  | 'oppo'
  | 'vivo'
  | 'xiaomi'
  | 'huawei'
  | 'honor'
  | 'meizu'
  | 'unknown';

export type PhoneBrandInput = {
  os?: unknown;
  manufacturer?: unknown;
  brand?: unknown;
  model?: unknown;
  product?: unknown;
  device?: unknown;
};

const norm = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase();

const readPlatformConstant = (constants: Record<string, unknown>, key: string): unknown =>
  constants[key] ?? constants[key.toLowerCase()];

/**
 * 将平台信息归类成应用商店口径的设备品牌。
 */
export function resolvePhoneBrand(input: PhoneBrandInput): PhoneBrand {
  const os = norm(input.os);
  if (os === 'ios') return 'ios';
  if (os && os !== 'android') return 'unknown';

  const manufacturer = norm(input.manufacturer);
  const brand = norm(input.brand);
  const value = [
    manufacturer,
    brand,
    input.model,
    input.product,
    input.device,
  ]
    .map(norm)
    .filter(Boolean)
    .join(' ');

  if (!value) return 'unknown';

  // OPPO 系：OPPO/一加/真我/HeyTap（同一套应用商店口径）
  if (/(oppo|one\s*plus|oneplus|realme|heytap|欧珀|一加|真我)/.test(value)) return 'oppo';
  // vivo 系：vivo/iQOO/bbk
  if (/(vivo|i\s*qoo|iqoo|bbk|维沃)/.test(value)) return 'vivo';
  // 小米系：小米/红米/POCO
  if (/(xiaomi|redmi|poco|小米|红米)/.test(value)) return 'xiaomi';
  // 荣耀：优先做“老荣耀→华为”兼容
  if (/(honor|荣耀)/.test(value)) {
    if (/(huawei|华为)/.test(manufacturer)) return 'huawei';
    return 'honor';
  }
  // 华为
  if (/(huawei|华为)/.test(value)) return 'huawei';
  // 魅族/魅蓝
  if (/(meizu|mblu|魅族|魅蓝)/.test(value)) return 'meizu';

  return 'unknown';
}

/**
 * 获取当前设备应归类到的品牌（用于映射到应用商城）。
 *
 * Android 判定策略：
 * - 取 Manufacturer / Brand / Model / Product / Device 拼接做匹配，尽量覆盖“子品牌/别名”。
 * - 映射规则（按业务口径归并）：
 *   - OPPO 系：oppo / oneplus(一加) / realme(真我) / heytap → `oppo`
 *   - vivo 系：vivo / iqoo / bbk → `vivo`
 *   - 小米系：xiaomi / redmi(红米) / poco → `xiaomi`
 *   - 华为系：huawei(华为) → `huawei`
 *   - 荣耀：需要区分“老荣耀(华为时期)”与“新荣耀(独立后)”
 *     - 如果识别到 honor 且 Manufacturer 仍是 huawei/华为 → 认为是老荣耀 → `huawei`
 *     - 否则 → `honor`
 *   - 魅族系：meizu(魅族) / mblu(魅蓝) → `meizu`
 *
 * 为什么荣耀要特殊处理：
 * - 历史上存在大量机型：Brand=HONOR，但 Manufacturer=HUAWEI（老荣耀）。
 * - 你们的“按品牌推断应用商城”的业务口径里，老荣耀应走华为应用市场，因此这里返回 `huawei`。
 */
export function getPhoneBrand(): PhoneBrand {
  // iOS 直接归类为 ios（App Store 口径）
  if (Platform.OS === 'ios') return 'ios';
  // 非 Android/iOS 平台不在本工具的目标范围内
  if (Platform.OS !== 'android') return 'unknown';

  // Android：读取 RN 暴露的系统常量
  const constants = ((Platform as any).constants || {}) as Record<string, unknown>;
  return resolvePhoneBrand({
    os: Platform.OS,
    manufacturer: readPlatformConstant(constants, 'Manufacturer'),
    brand: readPlatformConstant(constants, 'Brand'),
    model: readPlatformConstant(constants, 'Model'),
    product: readPlatformConstant(constants, 'Product'),
    device: readPlatformConstant(constants, 'Device'),
  });
}
