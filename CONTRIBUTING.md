# Contributing to y2kit

感谢你愿意为 `y2kit` 贡献代码。

这个仓库不是“功能越多越好”的方向，而是强调：API 稳定、交互直觉、边界清晰、性能与兼容性都成立。

在提交改动前，请先读：

- `docs/project-principles.md`
- `docs/ai-context.md`
- `docs/package-boundaries.md`
- `AGENTS.md`

## 本地开发

### 环境要求

- Node.js 20+
- `pnpm@9.12.3`
- React Native / Expo 常规开发环境（如果要运行示例应用）

### 安装

```bash
pnpm install
```

### 常用命令

```bash
pnpm validate
pnpm example:start
pnpm example:ios:simulator
pnpm example:android
```

## 提交改动前先判断归属

### 应该放进 `packages/ui`

- 共享 UI 组件
- 共享 Provider / Service / 主题 / i18n 能力
- 与具体业务域无强绑定的交互能力

### 应该放进 `packages/tools`

- 非 UI 通用工具
- 小型 runtime helper
- 可被多个项目复用的基础能力

### 不应该进入公共包

- 登录态 / 支付态 / 业务权限流
- 请求封装 / 接口协议映射
- 埋点策略
- 强业务语义常量
- 单页面一次性逻辑

## 改动标准

### API 改动

公共 API 改动必须遵守：

- 优先兼容演进，不随意破坏旧用法
- 同类概念使用同类命名
- 受控 / 非受控边界清楚
- 默认行为清楚且可预测

新增或修改公开 API 前，先检查：

- `docs/api-review-checklist.md`

### UI 改动

共享 UI 默认要求：

- 颜色走主题系统
- 文案走 i18n 通道
- 交互状态包含禁用态 / 加载态 / 必要错误态
- 具备必要无障碍属性
- 支持 `testID` 或等价测试入口

### 文档改动

以下变化通常必须同步更新文档：

- 新公开导出
- 公开 props 变化
- 默认行为变化
- 兼容性或迁移策略变化

至少检查：

- `README.md`
- `packages/ui/README.md`
- `packages/tools/README.md`
- `docs/project-principles.md`
- `docs/ai-context.md`

## Pull Request 要求

请尽量让一个 PR 只解决一个主题。

提交 PR 前：

```bash
pnpm validate
```

如果改动了公开包，请额外确认：

- 是否需要 `changeset`
- 是否修改了 README / 迁移说明
- 是否有示例帮助 reviewers 理解变更

如果是 UI 改动，PR 描述建议附上：

- 使用场景
- 预期交互
- 截图 / 录屏（如果适用）

## Changeset

当公共包行为或公开 API 变化时，通常需要添加 changeset：

```bash
pnpm changeset
```

版本约定：

- `patch`：修 bug，不影响既有用法
- `minor`：新增兼容能力
- `major`：破坏性变化，需要迁移

发布相关流程见：`docs/release.md`

## Review 关注点

维护者主要会看：

- 问题是否真的属于公共层
- API 是否符合现有设计语言
- 是否引入了未来维护负担
- 是否兼顾性能、兼容性、稳定性
- 文档、导出、版本策略是否同步
