# zkit-tools

`zkit-tools` 是 `zkit` 的非业务基础工具库，用来支撑组件库和应用层的通用基础设施：尺寸缩放、字体缩放上限、设备品牌归一化、路由重复跳转守卫、运行时配置读取等。

它不是业务工具箱，也不是 UI 组件层。公共 API 的目标是少、稳、直觉统一，并且在 iOS / Android / Web / Node-like 构建场景下尽量可预测。

## 设计目标

- 稳定：根入口不因缺少 React Native 运行时而崩溃
- 可预测：配置缺失、非法输入和平台差异都有明确兜底或错误
- 轻量：不引入 UI 逻辑，不绑定 Expo 作为包级依赖
- 高性能：尺寸缩放、环境读取、路由守卫这些热路径避免多余订阅和全局副作用
- API 统一：命名直接表达能力，不继续扩散历史近义词
- 可维护：公开入口集中在 [src/index.ts](src/index.ts)，内部能力按模块分层

## 与 zkit-ui 的关系

`zkit-ui` 负责组件、主题、i18n、交互和视觉系统；`zkit-tools` 只提供 UI 无关的基础工具。

当前 `zkit-ui` 会使用：

- `wp(...)` / `sp(...)`：计算组件内部尺寸、圆角、间距、字号
- `getMaxFontSizeMultiplier()`：统一 `Text` / `TextInput` 的字体缩放上限

业务侧自定义 `zkit-ui` 组件的像素类 props 时，也应使用 `wp(...)` 或 `sp(...)`：

```tsx
import { Button } from 'zkit-ui';
import { sp, wp } from 'zkit-tools';

export function DemoButton() {
  return (
    <Button
      layout={{
        minHeight: wp(44),
        paddingHorizontal: wp(20),
        radius: wp(14),
        textSize: sp(16),
      }}
    >
      保存
    </Button>
  );
}
```

工具库不能反向依赖 `zkit-ui`，也不能沉入主题 token、业务文案或组件服务。

## 安装与导入

在本仓库 workspace 内直接使用：

```ts
import { wp, sp } from 'zkit-tools';
```

包入口只导出稳定公共 API。不要从 `src/internal/*` 或具体实现文件导入。

## 推荐应用初始化

应用入口可以集中配置尺寸和字体上限：

```ts
import {
  configureFontSizeMultiplier,
  configureViewportScale,
  installGlobalTextScalingLimit,
} from 'zkit-tools';

configureViewportScale({
  baseWidth: 375,
  minScale: 0.85,
  maxScale: 1.2,
  minFontScale: 0.85,
  maxFontScale: 1.2,
});

configureFontSizeMultiplier({
  maxFontSizeMultiplier: 1.3,
});

// 可选。优先让 zkit-ui 的 Text/TextInput 显式读取上限；
// 只有希望限制所有 RN Text/TextInput 时再安装全局 patch。
installGlobalTextScalingLimit();
```

## 尺寸缩放

### 基础用法

```ts
import { sp, wp } from 'zkit-tools';

const cardPadding = wp(16);
const iconSize = wp(20);
const titleSize = sp(18);
```

- `wp(size)`：用于像素尺寸、间距、圆角、宽高、图标尺寸、阴影半径等
- `sp(size)`：用于字号和文本行高
- 非有限数字会返回 `0`
- 默认设计宽度是 `375`
- 默认缩放会夹紧在 `0.85x` 到 `1.2x`
- 默认 `rounding="pixel"`，优先走 RN `PixelRatio.roundToNearestPixel`

### 配置

```ts
import { configureViewportScale, getViewportScaleConfig } from 'zkit-tools';

configureViewportScale({
  baseWidth: 390,
  fallbackWidth: 390,
  minScale: 0.82,
  maxScale: 1.18,
  minFontScale: 0.9,
  maxFontScale: 1.2,
  rounding: 'pixel',
});

const config = getViewportScaleConfig();
```

常用配置：

- `baseWidth`：设计稿基准宽度
- `fallbackWidth`：非 RN / 无 Dimensions 场景下的兜底宽度
- `minScale` / `maxScale`：普通尺寸缩放范围
- `minFontScale` / `maxFontScale`：文字尺寸缩放范围
- `rounding`：`pixel` / `none` / `round` / `floor` / `ceil`

### 读取视口

```ts
import {
  getViewportFontScale,
  getViewportMetrics,
  getViewportScale,
  subscribeViewportMetrics,
} from 'zkit-tools';

const metrics = getViewportMetrics();
const scale = getViewportScale();
const fontScale = getViewportFontScale();

const unsubscribe = subscribeViewportMetrics((nextMetrics) => {
  console.log(nextMetrics.width, nextMetrics.height);
});
```

`subscribeViewportMetrics` 只在至少存在一个订阅时绑定 `Dimensions` listener，取消最后一个订阅后会移除 listener。

### 单次覆盖

```ts
import { scaleFont, scaleSize } from 'zkit-tools';

const compactGap = scaleSize(8, { maxScale: 1 });
const fixedTitle = scaleFont(18, { minFontScale: 1, maxFontScale: 1 });
```

## 字体缩放上限

### 显式使用

```tsx
import { Text } from 'react-native';
import { getMaxFontSizeMultiplier } from 'zkit-tools';

<Text maxFontSizeMultiplier={getMaxFontSizeMultiplier()}>
  可访问性友好的文字
</Text>;
```

`zkit-ui` 的 `Text`、`TextInputPrimitive` 和 `WheelColumn` 已经读取这个值，业务通常不需要手动处理组件库内部文字。

### 配置上限

```ts
import {
  configureFontSizeMultiplier,
  getGlobalTextScalingLimitSnapshot,
  getMaxFontSizeMultiplier,
} from 'zkit-tools';

configureFontSizeMultiplier({ maxFontSizeMultiplier: 1.25 });

const max = getMaxFontSizeMultiplier();
const snapshot = getGlobalTextScalingLimitSnapshot();
```

### 全局 patch

```ts
import {
  installGlobalTextScalingLimit,
  uninstallGlobalTextScalingLimit,
} from 'zkit-tools';

const uninstall = installGlobalTextScalingLimit({ maxFontSizeMultiplier: 1.3 });

uninstall();
uninstallGlobalTextScalingLimit();
```

全局 patch 会尝试给 RN `Text` / `TextInput` 注入默认 `maxFontSizeMultiplier`。这是 escape hatch：优先使用显式组件 API，只有需要兜住第三方或历史 RN 文本时再启用。

## 设备品牌

### 当前设备

```ts
import { getDeviceBrand } from 'zkit-tools';

const brand = getDeviceBrand();
```

返回值：

```ts
type DeviceBrand =
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
```

### 纯函数归一化

```ts
import { resolveDeviceBrand } from 'zkit-tools';

const brand = resolveDeviceBrand({
  os: 'android',
  manufacturer: 'Xiaomi',
  brand: 'Redmi',
  model: '23090RA98C',
});
```

说明：

- iOS / macOS 统一归为 `apple`
- Android 会读取 RN `Platform.constants` 中的 `Manufacturer / Brand / Model / Product / Device`
- Web、模拟器、定制 ROM 或拿不到系统常量时可能返回 `unknown`
- 本工具只做设备品牌归一化，不判断安装来源、应用商店来源或业务渠道

## 路由守卫

`createRouterGuard` 用来防止快速连点导致重复前进导航。它会 patch router 的前进方法；前进导航后上锁，后退、状态变化、异常或超时会解锁。

### expo-router 用法

```ts
import { router } from 'expo-router';
import { createRouterGuard } from 'zkit-tools';

const guard = createRouterGuard({
  router,
  lockMs: 2000,
});

guard.isLocked();
guard.getSnapshot();
guard.unlock();
guard.destroy();
```

默认前进方法：

- `push`
- `replace`
- `navigate`
- `dismissTo`

默认后退方法：

- `back`
- `dismiss`
- `dismissAll`

### 自定义 router

```ts
import { createRouterGuard } from 'zkit-tools';

let currentPath = '/home';
const listeners = new Set<() => void>();

const router = {
  push(path: string) {
    currentPath = path;
    listeners.forEach((listener) => listener());
  },
  back() {
    currentPath = '/home';
    listeners.forEach((listener) => listener());
  },
};

const guard = createRouterGuard({
  router,
  lockMs: 800,
  getCurrentPath: () => currentPath,
  subscribeToStateChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
});
```

### 跳过守卫

```ts
router.push('/settings', { skipRouterGuard: true });
router.push({ pathname: '/settings', skipRouterGuard: true });
```

`skipRouterGuard` 会绕过本次锁定。旧实验字段 `unstable_skipRouterGuard` 也可识别。

### 事件

```ts
createRouterGuard({
  router,
  onEvent(event) {
    if (event.type === 'block') {
      console.log(event.method, event.reason);
    }
  },
});
```

事件类型：

- `ready`
- `allow`
- `bypass`
- `block`
- `unlock`
- `destroy`

注意事项：

- 同一个 router 重复调用 `createRouterGuard` 会返回同一个 controller，不会叠加 patch
- `destroy()` 会尽量只恢复自己 patch 的方法，不覆盖之后其它代码替换的方法
- `onEvent` 不应触发高频同步重渲染

## 运行时配置

运行时配置用于读取应用启动时已确定的环境值，例如 `APP_ENV`、`API_BASE_URL`、`CHANNEL`。

### 显式注入

```ts
import {
  configureRuntimeConfig,
  getRuntimeString,
  getRuntimeValue,
  requireRuntimeString,
  tryGetRuntimeString,
} from 'zkit-tools';

configureRuntimeConfig({
  APP_ENV: 'local',
  API_BASE_URL: 'https://api.example.com',
  FEATURE_FLAG: true,
});

const appEnv = requireRuntimeString('APP_ENV');
const apiBase = getRuntimeString('API_BASE_URL', '');
const rawFlag = getRuntimeValue('FEATURE_FLAG', false);
const channel = tryGetRuntimeString('CHANNEL', 'dev');
```

### 配置来源优先级

1. `configureRuntimeConfig(...)` 显式注入
2. `zkit-tools-runtime-config` 虚拟模块
3. `process.env`

如果调用 `getRuntimeConfig()` / `getRuntimeString()` 时没有任何配置来源，会抛出 `MISSING_RUNTIME_CONFIG_PROVIDER`。如果希望缺失时不抛错，使用 `tryGetRuntimeConfig()` 或 `tryGetRuntimeString()`。

### 虚拟模块形态

```ts
export default {
  APP_ENV: 'production',
  API_BASE_URL: 'https://api.example.com',
};
```

或：

```ts
export const runtimeConfig = {
  APP_ENV: 'production',
};
```

### API 区别

- `getRuntimeConfig()`：返回完整配置；缺失 provider 会抛错
- `tryGetRuntimeConfig()`：缺失 provider 返回 `null`
- `getRuntimeValue(key, fallback?)`：读取原始值
- `hasRuntimeValue(key)`：判断 key 存在且值不是 `null/undefined`
- `getRuntimeString(key, fallback?)`：读取字符串化后的 primitive 值；对象/数组返回 fallback
- `requireRuntimeString(key)`：要求存在非空字符串，否则抛 `MISSING_RUNTIME_CONFIG_VALUE`
- `tryGetRuntimeString(key, fallback?)`：provider 或值缺失时返回 fallback
- `configureRuntimeConfig(source)`：显式设置配置源
- `resetRuntimeConfig()`：清除显式配置和缓存

## 公开 API 清单

### layout

- `wp(size, options?)`
- `sp(size, options?)`
- `scaleSize(size, options?)`
- `scaleFont(size, options?)`
- `configureViewportScale(config?)`
- `getViewportScaleConfig()`
- `getViewportMetrics()`
- `getViewportScale(options?)`
- `getViewportFontScale(options?)`
- `subscribeViewportMetrics(listener)`

### accessibility

- `configureFontSizeMultiplier(config?)`
- `getMaxFontSizeMultiplier()`
- `installGlobalTextScalingLimit(options?)`
- `uninstallGlobalTextScalingLimit()`
- `getGlobalTextScalingLimitSnapshot()`

### device

- `getDeviceBrand()`
- `resolveDeviceBrand(input)`

### navigation

- `createRouterGuard(options)`

### config

- `configureRuntimeConfig(source)`
- `resetRuntimeConfig()`
- `getRuntimeConfig()`
- `tryGetRuntimeConfig()`
- `getRuntimeValue(key, fallback?)`
- `hasRuntimeValue(key)`
- `getRuntimeString(key, fallback?)`
- `requireRuntimeString(key)`
- `tryGetRuntimeString(key, fallback?)`

## 破坏性迁移

| 旧 API | 新 API |
| --- | --- |
| `configureScreenUtils` | `configureViewportScale` |
| `getScreenScale` | `getViewportScale` |
| `getScreenUtilsConfig` | `getViewportScaleConfig` |
| `getMaxFontScale` | `getMaxFontSizeMultiplier` |
| `configureFontScaling` | `configureFontSizeMultiplier` |
| `applyGlobalFontScale` | `installGlobalTextScalingLimit` |
| `getPhoneBrand` | `getDeviceBrand` |
| `resolvePhoneBrand` | `resolveDeviceBrand` |
| `initRouterGuard` | `createRouterGuard` |
| `fallbackLockMs` | `lockMs` |
| `getEnv` | `getRuntimeString` / `tryGetRuntimeString` |
| `getRequiredEnv` | `requireRuntimeString` |
| `hasEnv` | `hasRuntimeValue` |
| `runtimeConfig` Proxy | `getRuntimeValue` / `getRuntimeString` |

## 三端行为说明

### iOS

- `wp/sp` 读取 RN `Dimensions.get('window')`
- `rounding="pixel"` 走 `PixelRatio.roundToNearestPixel`
- `getDeviceBrand()` 返回 `apple`
- 全局字体 patch 会尝试覆盖 RN `Text` / `TextInput`

### Android

- `wp/sp` 行为与 iOS 一致
- `getDeviceBrand()` 依赖 `Platform.constants`，模拟器或定制 ROM 可能返回 `unknown`
- 路由守卫推荐保留 `lockMs` 兜底，避免导航状态事件缺失时永久锁住

### Web

- 在 React Native Web 环境下优先读取 RN `Dimensions`
- 在非 RN / Node-like 环境下，尺寸使用 `fallbackWidth`
- 根入口可被 Node require，用于纯函数、运行时配置和构建验证

## 包边界与维护规则

- 所有公开导出必须集中在 [src/index.ts](src/index.ts)
- `src/internal/*` 不对外导出
- 不把业务语义、主题 token、UI 组件或服务放进 `packages/tools`
- 运行时能力必须惰性读取平台依赖，不让根入口因为缺少 RN/Expo 崩溃
- 高频能力要避免隐式订阅、重复 patch 和不可回收全局状态
- 新增能力前先判断是否真的属于通用工具，而不是某个业务或组件的内部 helper

## 开发验证

```bash
pnpm --filter zkit-tools verify
pnpm validate
```

`verify` 会构建 `zkit-tools`，并在 Node 中直接 require `dist`，验证根入口无 RN 环境可加载、核心纯函数可运行、运行时配置和路由守卫基础行为正常。
