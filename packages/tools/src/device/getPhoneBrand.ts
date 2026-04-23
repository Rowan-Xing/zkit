import { Platform } from 'react-native';

/**
 * 手机品牌（用于推断“应该跳转哪个应用商城”）。
 *
 * 说明：
 * - 这里的“品牌”是为了业务侧做更新提醒/跳转商店时的归类结果，而不是严格的硬件厂商枚举。
 * - iOS 统一返回 `ios`（对应 App Store 口径）。
 * - Android 只依赖系统 Build 信息：`Platform.constants.Manufacturer` + `Platform.constants.Brand`。
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

/**
 * 将任意输入规整为可比对的小写字符串。
 */
function norm(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

/**
 * 获取当前设备应归类到的品牌（用于映射到应用商城）。
 *
 * Android 判定策略：
 * - 取 Manufacturer + Brand 拼接做匹配，尽量覆盖“子品牌/别名”。
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
  const constants = (Platform as any).constants || {};
  const manufacturer = norm(constants.Manufacturer);
  const brand = norm(constants.Brand);
  // 拼接成一个可搜索串，方便一次性覆盖 manufacturer/brand 两处的特征
  const s = `${manufacturer} ${brand}`.trim();

  // OPPO 系：OPPO/一加/真我/HeyTap（同一套应用商店口径）
  if (/(oppo|oneplus|realme|heytap|欧珀|一加|真我)/.test(s)) return 'oppo';
  // vivo 系：vivo/iQOO/bbk
  if (/(vivo|iqoo|bbk|维沃)/.test(s)) return 'vivo';
  // 小米系：小米/红米/POCO
  if (/(xiaomi|redmi|poco|小米|红米)/.test(s)) return 'xiaomi';
  // 荣耀：优先做“老荣耀→华为”兼容
  if (/honor/.test(s)) {
    if (/huawei|华为/.test(manufacturer)) return 'huawei';
    return 'honor';
  }
  // 华为
  if (/huawei|华为/.test(s)) return 'huawei';
  // 魅族/魅蓝
  if (/meizu|mblu|魅族/.test(s)) return 'meizu';

  // 不在映射内的机型统一返回 unknown，交由业务侧兜底处理
  return 'unknown';
}
