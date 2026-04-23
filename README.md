# y2kit

React Native component system monorepo.

## Packages

- `packages/ui`: public React Native UI package, published as `y2kit-ui`.
- `packages/tools`: public framework-agnostic utility package, published as `y2kit-tools`.
- `apps/example`: Expo playground for local component development.

## Commands

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm example:start
```

## Example App

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

更完整的示例应用说明见 [apps/example/README.md](apps/example/README.md)。

## Release

```bash
pnpm changeset
pnpm version:packages
pnpm build
pnpm release:packages
```

`y2kit-ui` and `y2kit-tools` are the package names for this repository.
