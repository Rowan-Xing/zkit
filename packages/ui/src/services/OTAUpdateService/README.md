# OTAUpdateService

Expo OTA 热更新服务，提供完整的更新 UI + 逻辑。

## 功能

- 自动检查更新（启动时、前台恢复时）
- 下载进度条 + 圆形进度悬浮球
- 安装/校验阶段 Lottie 动画
- 可拖拽、自动贴边的悬浮球
- 弹窗 ↔ 悬浮球切换
- 错误重试 + 取消
- 下载/安装看门狗超时保护
- 国际化支持（zh-CN / zh-TW / en-US / ja）
- 主题色集成
- 开发模式模拟

## 用法

**叶子组件，直接放在根布局中并列即可，无需包裹 children。**

### 基础用法

```tsx
// 在根布局中与其他组件并列
<Stack>...</Stack>
<StatusBar />
<OTAUpdateManager />
```

### 传递 Extra Params（服务端定向推送）

```tsx
import { OTAUpdateManager } from 'y2kit-ui';

function MyOTAManager() {
  const phone = useAuthStore((s) => s.user?.TelNum);
  const extraParams = useMemo(
    () => phone ? { phone } : undefined,
    [phone],
  );

  return <OTAUpdateManager extraParams={extraParams} />;
}

// 在根布局中
{sensitiveReady && <MyOTAManager />}
```

`extraParams` 会在每次检查更新前通过 `Updates.setExtraParamAsync()` 设置，
当值变化时自动触发一次新的检查。

### 开发模拟

```tsx
<OTAUpdateManager
  devSimulation={{
    enabled: true,           // 启用模拟（仅 __DEV__ 下生效）
    delayMs: 3000,           // 启动后延迟（默认 3000ms）
    downloadDurationMs: 5000, // 下载阶段时长（默认 5000ms）
    installDurationMs: 4000,  // 安装阶段时长（默认 4000ms）
    endState: 'ready',       // 结束状态：'ready' | 'error'
  }}
/>
```

## Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `extraParams` | `Record<string, string>` | `undefined` | 更新检查前设置的 extra params |
| `devSimulation` | `OTADevSimulationConfig` | `undefined` | 开发模拟配置 |

## 阶段流转

```
idle → downloading → installing → ready
            ↓            ↓
          error ←────────┘
            ↓
     retry → downloading
     dismiss → idle
```

## 依赖

需要安装以下 peer dependencies：

- `expo-updates`
- `expo-network`
- `@expo/vector-icons`
- `lottie-react-native`
- `react-native-reanimated`
- `react-native-svg`

## i18n Keys

所有文案通过 `useI18n().t()` 获取，key 前缀为 `ota.`：

| Key | zh-CN | en-US |
|-----|-------|-------|
| `ota.downloading.title` | 正在下载更新 | Downloading |
| `ota.downloading.subtitle` | 正在获取最新版本资源，请稍候 | Getting latest version… |
| `ota.downloading.progressLabel` | 更新进度 | Progress |
| `ota.installing.title` | 正在安装更新 | Installing |
| `ota.installing.subtitle` | 正在校验并写入资源文件，已耗时 {time} | Writing files, {time} elapsed |
| `ota.ready.title` | 更新已准备就绪 | Update Ready |
| `ota.ready.subtitle` | 已准备重启以应用最新版本 | Restart to apply update |
| `ota.ready.hint` | 点击下方按钮立即生效 | Tap below to apply |
| `ota.error.title` | 更新失败 | Update Failed |
| `ota.error.subtitle` | 下载或安装过程中出现问题，请重试 | Something went wrong, retry? |
| `ota.warning` | 请勿退出或切到后台，否则可能导致更新失败 | Stay in app, or update may fail |
| `ota.button.retry` | 重试 | Retry |
| `ota.button.dismiss` | 稍后再说 | Later |
| `ota.button.reload` | 立即重启 | Restart |
| `ota.time.minutesSeconds` | {min}分{sec}秒 | {min}m {sec}s |
| `ota.time.seconds` | {sec}秒 | {sec}s |
