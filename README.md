# y2kit

`y2kit` 是一个面向 React Native 的组件库 + 工具库 Monorepo。

目标不是“能用”，而是把它做成一个长期可维护、公开发布后依然稳定可信的顶级开源项目：

- 极致性能：高频交互优先保证低抖动、低重渲染、低额外分配
- 强兼容性：优先考虑真实项目接入成本、升级成本、平台差异
- 强稳定性：公开 API 视为长期契约，谨慎引入破坏性变化
- 现代且精美：视觉、动效、状态反馈、主题能力都要成体系
- 统一设计语言：同一类问题尽量只有一种推荐写法
- 符合直觉：用户操作自然，开发接入自然

## Workspace

- `packages/ui`：公开 React Native UI 包，发布名为 `y2kit-ui`
- `packages/tools`：公开通用工具包，发布名为 `y2kit-tools`
- `apps/example`：Expo 示例应用，用于本地联调与组件演示

## 设计原则

- 公开 API 优先稳定，而不是追求一时“更优雅”的重写
- 语义化 props 优先于样式堆砌，必要时再提供 escape hatch
- 主题、文案、可访问性、加载态、禁用态都算组件定义的一部分
- 包边界清晰：UI 留在 `packages/ui`，非 UI 通用能力留在 `packages/tools`
- 文档与示例跟随代码一起演进，不接受“代码先行、文档以后再补”

完整原则见 `docs/project-principles.md`。

## 快速开始

```bash
pnpm install
pnpm validate
pnpm example:start
```

## 示例应用

示例应用位于 `apps/example`。

- 仅启动 Metro：

```bash
pnpm example:start
```

- 运行 iOS development build：

```bash
pnpm example:ios:device
```

- 运行 iOS 模拟器：

```bash
pnpm example:ios:simulator
```

- 运行 Android development build：

```bash
pnpm example:android
```

更完整说明见 `apps/example/README.md`。

## 文档索引

- `docs/project-principles.md`：项目北极星、API 语言、开源质量标准
- `docs/api-review-checklist.md`：公共 API / 组件 API 评审清单
- `docs/ai-context.md`：给 AI/自动化代理阅读的仓库上下文与改动规则
- `docs/package-boundaries.md`：包边界与依赖原则
- `docs/release.md`：版本与发布流程
- `packages/ui/README.md`：UI 包说明
- `packages/tools/README.md`：工具包说明
- `CONTRIBUTING.md`：贡献流程与 PR 要求
- `CODE_OF_CONDUCT.md`：协作行为准则
- `SECURITY.md`：安全问题报告方式
- `AGENTS.md`：面向编码代理的工作约束与入口文档

## 开源协作

提交贡献前建议先读：

- `CONTRIBUTING.md`
- `docs/api-review-checklist.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`

## 发布

```bash
pnpm changeset
pnpm version:packages
pnpm build
pnpm release:packages
```

当前仓库对外发布的包名为 `y2kit-ui` 与 `y2kit-tools`。
