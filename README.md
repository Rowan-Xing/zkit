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

## Release

```bash
pnpm changeset
pnpm version:packages
pnpm build
pnpm release:packages
```

`y2kit-ui` and `y2kit-tools` are the package names for this repository.
