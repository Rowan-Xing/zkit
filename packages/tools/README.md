# y2kit-tools

`y2kit-tools` 是 `y2kit` Monorepo 中的共享工具包。

它承载“非业务、可复用、尽量与 UI 解耦”的能力，用来支撑 React Native 应用中的尺寸换算、字体缩放、设备判断、导航防抖、运行时配置读取等需求。

## 设计目标

- 小而稳：接口少而清楚，优先长期稳定
- 直接可用：默认行为尽量符合真实 App 需求
- 低心智负担：看到函数名就能大致猜到用途
- 不承载业务语义：只做通用能力，不做业务编排

## 当前导出

### 屏幕 / 字号

- `wp(size, options?)`
- `sp(size, options?)`
- `configureFontScaling(config?)`
- `applyGlobalFontScale(options?)`
- `getMaxFontScale()`
- `DEFAULT_MAX_FONT_SCALE`
- `MAX_FONT_SCALE`

### 设备

- `getPhoneBrand()`

### 导航

- `initRouterGuard(options)`

### 运行时配置

- `getExtra()`
- `getEnv(key, fallback?)`
- `getRequiredEnv(key)`
- `runtimeConfig`

## 使用示例

### 屏幕尺寸

```ts
import { wp, sp } from 'y2kit-tools';

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

### 路由防抖

```ts
import { router } from 'expo-router';
import { initRouterGuard } from 'y2kit-tools';

const destroy = initRouterGuard({ router, fallbackLockMs: 2000 });

// 需要时恢复原始行为
// destroy();
```

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
- `runtimeConfig` 依赖提供 `y2kit-tools-runtime-config` 模块映射；如果未注入，会抛出明确错误

## 开发

在仓库根目录执行：

```bash
pnpm --filter y2kit-tools build
pnpm --filter y2kit-tools typecheck
```
