# @y2kit/example

Expo 54 示例应用，用于本地联调 `y2kit-ui` 组件库。

## 前置条件

- 已在仓库根目录执行过 `pnpm install`
- iOS 开发需要本机可用的 Xcode
- Android 开发需要本机可用的 Android Studio / SDK

## 启动方式

这个示例应用包含原生依赖，不适合只靠 Expo Go。日常联调优先使用 development build。

### 在仓库根目录执行

仅启动 Metro：

```bash
pnpm example:start
```

运行 iOS development build 到真机：

```bash
pnpm example:ios:device
```

运行 iOS 模拟器：

```bash
pnpm example:ios:simulator
```

运行 Android development build：

```bash
pnpm example:android
```

运行 Android development build 到真机：

```bash
pnpm example:android:device
```

### 在 `apps/example` 目录执行

仅启动 Metro：

```bash
pnpm start
```

运行 iOS development build 到真机：

```bash
pnpm ios:device
```

运行 iOS 模拟器：

```bash
pnpm ios:simulator
```

运行 Android development build：

```bash
pnpm android
```

运行 Android development build 到真机：

```bash
pnpm android:device
```

## 区别

- `pnpm example:start` / `pnpm start`：只启动 Metro bundler
- `pnpm example:ios:device` / `pnpm ios:device`：构建并安装 iOS development build 到真机
- `pnpm example:ios:simulator` / `pnpm ios:simulator`：构建并运行 iOS 模拟器
- `pnpm example:android` / `pnpm android`：构建并运行 Android development build
- `pnpm example:android:device` / `pnpm android:device`：构建并安装 Android development build 到真机

## 常用流程

首次装到 iPhone：

```bash
pnpm example:ios:device
```

后续只改 JS / TS 时，通常保持 Metro 开着即可：

```bash
pnpm example:start
```
