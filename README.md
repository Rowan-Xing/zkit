# y2kit

`y2kit` 是一个面向 React Native 的组件库 + 工具库 Monorepo。

核心目标只有几个：

- 架构先进：包边界清晰，公共能力可长期演进
- API 统一：同类问题尽量只有一种推荐写法
- 极致稳定：iOS / Android 都要稳，少闪退、少异常、少行为分裂
- 极致性能：高频交互低抖动、低重渲染、低额外开销
- 现代化：视觉、动效、状态反馈简洁而统一，不堆复杂度

## Workspace

- `packages/ui`：React Native UI 组件库，发布名 `y2kit-ui`
- `packages/tools`：共享工具库，发布名 `y2kit-tools`
- `apps/example`：本地联调与演示应用

## 开发原则

- 先保证正确性、稳定性，再追求极致性能
- API 先统一，再扩展；不接受每个组件一套风格
- 优先兼容演进，不轻易破坏公开 API
- 共享层只收真正可复用的能力，不收业务杂物
- 文档保持最小，但必须准确

详细原则见 `docs/project-principles.md`。

## 快速开始

```bash
pnpm install
pnpm validate
pnpm example:start
```

## 示例应用

```bash
pnpm example:start
pnpm example:ios:simulator
pnpm example:android
```

更完整说明见 `apps/example/README.md`。

## 核心文档

- `docs/project-principles.md`：代码与架构设计原则
- `docs/package-boundaries.md`：包边界规则
- `packages/ui/README.md`：UI 包说明
- `packages/tools/README.md`：工具包说明
- `AGENTS.md`：给 AI/自动化代理的最小工作约束

## 验证

```bash
pnpm validate
```
