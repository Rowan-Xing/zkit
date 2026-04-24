# y2kit AI Context

这份文档给 AI 编码代理、自动化重构工具、脚本化维护流程使用。

目标不是介绍愿景，而是降低误改概率，让自动化改动更贴近项目真实边界。

## 1. 仓库快照

- Monorepo 管理工具：`pnpm workspace`
- 公开包：`y2kit-ui`、`y2kit-tools`
- 示例 App：`apps/example`
- 当前主语言：TypeScript
- 当前主要平台：React Native / Expo 生态

## 2. 目录职责

### 2.1 `packages/ui`

职责：共享 UI 系统。

包含：

- 组件：`Button`、`Text`、`TextInput`、`Checkbox`、`Radio`、`Switch`、`Picker`、`DatePicker`、`AddressCascader`、`SliderCaptcha` 等
- Provider：`ThemeProvider`、`I18nProvider`、`ComponentLibProvider`
- 全局配置：`configureComponentLib`
- Service：`PickerService`、`ActionDialogService`、`LoadingService`、`CardToastService`、`ImagePreviewService`、`ImageCropperService`、`PermissionPurposeDialogService`、`OTAUpdateService`
- Debug：`ErrorBoundary`、`FloatingDebugger`、`debugLogManager`
- 系统能力：主题、i18n、内部资源、原生桥接组件

### 2.2 `packages/tools`

职责：共享工具能力。

当前公开导出主要包括：

- 屏幕/字号：`wp`、`sp`、`applyGlobalFontScale`、`configureFontScaling`
- 设备：`getPhoneBrand`
- 导航：`initRouterGuard`
- 运行时配置：`getExtra`、`getEnv`、`getRequiredEnv`、`runtimeConfig`

注意：`packages/tools` 的目标是“尽量通用”，但当前仍包含 React Native / Expo 运行时相关能力，修改时不要假设它已完全脱离 RN 环境。

### 2.3 `apps/example`

职责：

- 本地联调
- 组件演示
- 最小验证场

不要把它当成公共逻辑的唯一真实来源。公共能力的源头应留在 `packages/*/src`。

## 3. 源码与生成物

源码真相在：

- `packages/ui/src`
- `packages/tools/src`

以下路径通常不是手工改动目标：

- `node_modules`
- `dist`
- `Pods`
- `build`
- `.expo`

如果改动了公开源码，`dist` 应来自构建产物，而不是手工同步编辑。

## 4. 当前架构约束

### 4.1 公开导出是稳定契约

以下文件定义了主要公开入口：

- `packages/ui/src/index.ts`
- `packages/tools/src/index.ts`

规则：

- 不要随意删除或重命名已有公开导出
- 需要演进时优先兼容新增，而不是直接破坏旧用法
- 公共 API 一旦变化，必须同步更新文档与示例

### 4.2 主题与文案是系统能力

共享 UI 组件默认应满足：

- 颜色来自 `useTheme()` 或主题注入，而不是写死品牌色
- 用户可见文案优先走 i18n，而不是直接硬编码
- 默认值应在无 Provider 时仍可工作，必要时通过 `configureComponentLib()` 提供全局默认

### 4.3 组件交互必须可预测

交互组件应尽量具备：

- 明确的受控 / 非受控边界
- 明确的禁用态、加载态、错误态
- `accessibilityRole` 与必要的 `accessibilityState`
- `testID` 或等价测试入口

### 4.4 高频交互优先低抖动实现

当前组件库大量使用 `react-native-reanimated` 处理交互与状态动画。

改动这类组件时：

- 优先避免高频状态导致整树重渲染
- 优先复用 `sharedValue` / `useAnimatedStyle` / `useMemo` / `useCallback`
- 不要为了“代码统一”把热路径退化成明显更重的 JS 线程方案

## 5. 新增代码时的归属判断

### 5.1 何时放进 `packages/ui`

满足以下大部分条件才应进入 UI 包：

- 是可复用 UI / 交互 / Provider / Service
- 与真实业务域无强绑定
- 可以通过主题、文案、状态模型解释清楚
- API 可以长期稳定维护

### 5.2 何时放进 `packages/tools`

满足以下大部分条件才应进入工具包：

- 不依赖具体业务页面
- 与 UI 展示无强耦合
- 可以被多个场景复用
- 行为可以用纯函数或小型 runtime helper 清晰描述

### 5.3 不该进入公共包的内容

- 登录态、支付态、业务权限流
- 请求封装、接口协议映射
- 埋点策略
- 强业务语义常量
- 仅服务单一页面的一次性逻辑

## 6. 新增/修改能力的工作方式

### 6.1 新增组件

至少同时检查：

- 是否应该进入公共库，而不是业务层
- 是否已有相近能力，能否扩展而不是再造一个
- 是否接入主题、i18n、无障碍、测试入口
- 是否在 `packages/ui/src/index.ts` 导出
- 是否需要 README 或示例补充

### 6.2 新增主题 token

按顺序改动：

1. `packages/ui/src/theme/types.ts`
2. `packages/ui/src/theme/defaultTheme.ts`
3. 实际消费该 token 的组件

不要在组件内部偷偷引入新的“隐形 token”。

### 6.3 新增 i18n 文案

优先保证：

- key 命名稳定
- 默认 locale 有合理回退
- 缺失 key 行为与当前 `missingKeyPolicy` 兼容

### 6.4 新增工具函数

优先保证：

- 名称直接表达用途
- 输入输出边界清楚
- 错误处理可预测
- 没有偷偷夹带业务假设

## 7. API 设计建议

`y2kit` 当前代码并非所有组件都完全统一，但今后的改动应尽量收敛，而不是继续发散。

建议遵守：

- 同一组件家族，状态字段与回调命名保持一致
- 有状态组件明确受控 / 非受控对应关系
- 优先暴露语义化字段，如 `variant`、`tone`、`sizePreset`、`disabled`、`loading`
- 允许样式 escape hatch，但不要让 escape hatch 成为主接口
- 需要兼容历史 API 时，先加兼容层与弃用说明

## 8. 文档联动规则

以下变化通常需要同步文档：

- 新公开导出
- 公开 props 变化
- 默认行为变化
- 兼容性策略变化
- 发布/迁移策略变化

优先更新这些文件：

- `README.md`
- `CONTRIBUTING.md`
- `packages/ui/README.md`
- `packages/tools/README.md`
- `docs/api-review-checklist.md`
- `docs/project-principles.md`
- `docs/package-boundaries.md`
- `docs/release.md`

## 9. 最小验证命令

仓库级：

```bash
pnpm build
pnpm typecheck
```

按包验证：

```bash
pnpm --filter y2kit-tools build
pnpm --filter y2kit-tools typecheck
pnpm --filter y2kit-ui build
pnpm --filter y2kit-ui typecheck
```

## 10. 修改时应避免的事

- 把业务逻辑塞进公共包
- 在共享 UI 中写死品牌色或可见文案
- 直接手改生成产物代替修改源码
- 在没有迁移说明的前提下破坏公开 API
- 因“看起来更统一”而牺牲热路径性能
- 只改代码，不改 README / 文档 / 示例
