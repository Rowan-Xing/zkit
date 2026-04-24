# AGENTS.md

本仓库希望达到顶级开源项目的质量标准。任何自动化改动都必须优先保证：正确性、稳定性、兼容性、可维护性，然后再优化性能与视觉表达。

## 开始前先看

1. `docs/project-principles.md`
2. `docs/ai-context.md`
3. `docs/api-review-checklist.md`
4. `docs/package-boundaries.md`
5. `docs/release.md`（仅当改动版本/发布策略时）

## 仓库边界

- `packages/ui`：共享 React Native UI、主题、i18n、服务组件、调试工具
- `packages/tools`：共享工具能力
- `apps/example`：联调与演示，不是公共逻辑的最终归属

## 必须遵守

- 公开入口 `packages/ui/src/index.ts` 与 `packages/tools/src/index.ts` 视为稳定契约
- 优先修改 `src`，不要手工编辑 `dist`、`Pods`、`build`、`.expo`、`node_modules`
- 共享 UI 不要写死品牌色和用户可见文案；优先走主题与 i18n
- 有状态组件要明确受控 / 非受控边界
- 交互组件应具备必要的无障碍属性与测试入口
- 公共 API 或默认行为变化时，必须同步更新相关文档
- 新 API 进入公共层前，先过 `docs/api-review-checklist.md`

## 新增代码时

### 新增 UI 组件

- 先判断是否真的是公共能力
- 接入主题、i18n、状态、无障碍、测试入口
- 在 `packages/ui/src/index.ts` 导出
- 需要时补 README / 示例

### 新增工具函数

- 先判断是否与 UI 解耦
- 输入输出边界必须清晰
- 不要夹带业务语义
- 在 `packages/tools/src/index.ts` 导出

### 新增主题 token

按顺序修改：

1. `packages/ui/src/theme/types.ts`
2. `packages/ui/src/theme/defaultTheme.ts`
3. 实际消费组件

## 验证

优先运行：

```bash
pnpm build
pnpm typecheck
```

按包运行：

```bash
pnpm --filter y2kit-tools build
pnpm --filter y2kit-tools typecheck
pnpm --filter y2kit-ui build
pnpm --filter y2kit-ui typecheck
```
