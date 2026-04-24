# AGENTS.md

本仓库当前优先级只有四个：架构、API 一致性、稳定性、性能。

## 开始前先看

1. `README.md`
2. `docs/project-principles.md`
3. `docs/package-boundaries.md`

## 必须遵守

- 公开入口 `packages/ui/src/index.ts` 与 `packages/tools/src/index.ts` 视为稳定契约
- 优先修改 `src`，不要手工编辑 `dist`、`Pods`、`build`、`.expo`、`node_modules`
- `packages/ui` 不收业务逻辑；`packages/tools` 不收 UI 逻辑
- 改动优先保证 iOS / Android 稳定性，其次再追求写法“更优雅”
- API 命名与状态模型优先统一，不继续发散
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
