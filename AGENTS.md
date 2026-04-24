# AGENTS.md

本仓库当前优先级只有七个：架构、API 一致性、稳定性、性能、动画满帧、现代化审美、朴素直觉。

## 开始前先看

1. `README.md`
2. `docs/project-principles.md`
3. `docs/package-boundaries.md`

## 必须遵守

- 公开入口集中在 `packages/ui/src/index.ts` 与 `packages/tools/src/index.ts`
- 优先修改 `src`，不要手工编辑 `dist`、`Pods`、`build`、`.expo`、`node_modules`
- `packages/ui` 不收业务逻辑；`packages/tools` 不收 UI 逻辑
- 当前阶段允许破坏性重构，不为历史 API 和历史实现保留坏设计
- 改动优先保证 iOS / Android 稳定性，其次再追求写法“更优雅”
- 需要动画的地方，目标是匹配设备刷新率稳定输出，不默认按 60fps 思考
- API 命名与状态模型优先统一，不继续发散
- 外观要符合现代化审美，不做杂乱、廉价、过时的呈现
- 交互符合用户朴素直觉，API 符合开发者朴素直觉
- 文档保持最小，只更新真正影响代码理解的内容

## 当前工作方式

- 先判断问题属于架构、API、稳定性还是性能
- 先修根因，不做表面补丁
- 热路径改动要特别谨慎
- 公共 API 变化时，同步更新最少必要文档

## 验证

```bash
pnpm validate
```
