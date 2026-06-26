# zkit

`zkit` 是一个面向 React Native 的组件库 + 工具库 Monorepo。

核心目标只有几个：

- 性能、丝滑、稳定可靠并列第一：任何实现都不能为了局部方便牺牲这三件事
- 架构先进：包边界清晰，公共能力可长期演进
- API 统一：同类问题尽量只有一种推荐写法
- 极致稳定：iOS / Android 都要稳，少闪退、少异常、少行为分裂
- 极致性能：高频交互低抖动、低重渲染、低额外开销
- 动画与过渡稳定满帧：以设备刷新率为准，60 / 90 / 120Hz 设备上都尽量保持顺滑稳定
- 现代化审美：视觉、动效、状态反馈简洁、克制、精致，不堆复杂度
- 用户朴素直觉：看起来怎么用，就应该怎么用，不制造学习成本
- 开发者朴素直觉：API 命名、状态模型、默认行为都应当“看一眼就能猜对”

## Workspace

- `packages/ui`：React Native UI 组件库，发布名 `zkit-ui`
- `packages/tools`：共享工具库，发布名 `zkit-tools`
- `apps/example`：本地联调与演示应用

## 开发原则

- 性能、丝滑、稳定可靠并列第一，不能把其中一个当成另一个的代价
- 动画和过渡不是装饰，凡是涉及运动、显隐、布局切换、手势跟随的地方都要优先保证稳定帧节奏
- 优先采用 React Native、iOS、Android 官方当前推荐的现代实践；不为了兼容过低系统版本把公共实现拖进低性能路径
- API 先统一，再扩展；不接受每个组件一套风格
- 视觉与交互要符合现代化审美，不做土、不做乱、不做过度设计
- 使用体验符合用户朴素直觉，接入体验符合开发者朴素直觉
- 当前阶段允许破坏性重构，不为历史 API 形态背包袱
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
- `docs/ai-component-prompts.md`：给外部 AI 的组件优化与新建提示词
- `packages/ui/README.md`：UI 包说明
- `packages/tools/README.md`：工具包说明
- `AGENTS.md`：给 AI/自动化代理的最小工作约束

## 验证

```bash
pnpm validate
```
