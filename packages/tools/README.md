# y2kit-tools

`y2kit-tools` 是 `y2kit` Monorepo 中的共享工具包。

它承载非业务、轻量、稳定的通用能力，用来支撑 React Native 应用中的尺寸换算、字体缩放、设备判断、导航防重复跳转、运行时配置读取等需求。

## 设计目标

- 小而稳：接口少而清楚，优先长期稳定
- 直接可用：默认行为尽量符合真实 App 需求
- 低心智负担：看到函数名就能大致猜到用途
- 不承载业务语义：只做通用能力，不做业务编排

## 当前导出

### 屏幕 / 字号

- `wp(size, options?)`
- `sp(size, options?)`
- `configureScreenUtils(config?)`
- `getScreenScale(options?)`
- `getScreenUtilsConfig()`
- `configureFontScaling(config?)`
- `applyGlobalFontScale(options?)`
- `getMaxFontScale()`
- `DEFAULT_MAX_FONT_SCALE`
- `MAX_FONT_SCALE`

### 设备

- `getPhoneBrand()`
- `resolvePhoneBrand(input)`

### 导航

- `initRouterGuard(options)`

### 运行时配置

- `getRuntimeConfig()`
- `getExtra()`
- `getEnv(key, fallback?)`
- `getRequiredEnv(key)`
- `hasEnv(key)`
- `tryGetEnv(key, fallback?)`
- `runtimeConfig`

## 使用示例

### 屏幕尺寸

```ts
import { configureScreenUtils, wp, sp } from 'y2kit-tools';

configureScreenUtils({
  baseWidth: 375,
  minFontScale: 0.8,
});

const horizontalPadding = wp(16);
const titleFontSize = sp(16);
```

### 全局字体缩放上限

```ts
import { applyGlobalFontScale, configureFontScaling } from 'y2kit-tools';

configureFontScaling({ maxFontScale: 1.2 });
applyGlobalFontScale();
```

### 设备品牌归类

```ts
import { getPhoneBrand } from 'y2kit-tools';

const brand = getPhoneBrand();
```

如果需要做单元测试或脱离 `Platform` 做归类，可使用纯函数：

```ts
import { resolvePhoneBrand } from 'y2kit-tools';

const brand = resolvePhoneBrand({
  os: 'android',
  manufacturer: 'HUAWEI',
  brand: 'HONOR',
});
```

### 路由防抖

```ts
import { router } from 'expo-router';
import { initRouterGuard } from 'y2kit-tools';

const destroy = initRouterGuard({ router, fallbackLockMs: 2000 });

// 需要时恢复原始行为
// destroy();
```

`initRouterGuard` 按 router 实例管理 patch，重复初始化不会叠加 patch。前进导航会在导航状态变化、后退导航、异常或兜底超时后解锁。

### 运行时配置

```ts
import { getEnv, getRequiredEnv, runtimeConfig } from 'y2kit-tools';

const apiBase = getEnv('API_BASE_URL', '');
const appEnv = getRequiredEnv('APP_ENV');
const channel = runtimeConfig.CHANNEL;
```

## 注意事项

- 当前包虽然目标上偏“通用工具”，但部分能力仍依赖 React Native / Expo 运行时
- `initRouterGuard()` 面向 `expo-router` 这一类 router 对象
- `runtimeConfig` / `getRuntimeConfig()` 依赖提供 `y2kit-tools-runtime-config` 模块映射；如果未注入，会抛出明确错误
- `tryGetEnv()` 是显式兜底读取；配置提供方缺失时返回 fallback

## 开发

在仓库根目录执行：

```bash
pnpm --filter y2kit-tools build
pnpm --filter y2kit-tools typecheck
```
