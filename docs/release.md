# zkit 发布流程

## 版本策略

- `zkit-ui`：React Native UI 组件库主包。
- `zkit-tools`：和 UI 无关的通用工具库。
- app 默认使用精确版本，不使用 `^`：

```json
{
  "component-lib": "npm:zkit-ui@1.0.0"
}
```

## 日常开发

公共 API 有变化时添加 changeset：

```bash
pnpm changeset
```

版本类型：

- `patch`：修 bug，不影响旧用法。
- `minor`：新增兼容能力。
- `major`：破坏性更新，需要 app 主动迁移。

## 发布

```bash
pnpm version:packages
pnpm build
pnpm release:packages
```

发布前可以 dry-run：

```bash
cd packages/ui
pnpm publish --dry-run --no-git-checks
```

## 旧版本维护线

不要回滚主线。需要给旧版本修 bug 时，从旧 tag 拉维护分支：

```bash
git fetch --tags
git switch -c release/zkit-ui-1.x zkit-ui@1.0.9
```

修复后发 patch，例如 `1.0.10`。旧 major 的补丁不要覆盖 `latest`：

```bash
pnpm release:packages --tag v1
```

app 只升级到目标补丁版本：

```json
{
  "component-lib": "npm:zkit-ui@1.0.10"
}
```
