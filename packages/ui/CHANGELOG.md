# zkit-ui

## 2.0.2

### Patch Changes

- 4b418f2: Optimize large-range date picker rendering, add an Android native wheel, and retain the service date host only after its first real use to reduce repeat-open, interaction, and close latency without application-start prewarming. The patched `@lodev09/react-native-true-sheet@3.10.0` native host is bundled inside `zkit-ui`; consumers should remove any direct TrueSheet dependency and do not need to publish a separate TrueSheet package.

## 2.0.1

### Patch Changes

- Lazily build DatePicker month and day options to avoid blocking the UI thread when opening large date ranges.

## 2.0.0

### Major Changes

- 3c90764: Refactor Accordion state management and replace `onValueChange` with the `value/defaultValue/onChange` API.
- Redesign zkit-ui entrypoints around explicit dependency boundaries.

  - `zkit-ui` now exports only lightweight core APIs: theme, i18n, config, and `ZKitCoreProvider`.
  - Full service mounting stays available from `zkit-ui/provider`.
  - Component and service APIs are exposed through stable short subpath entrypoints such as `zkit-ui/text`, `zkit-ui/button`, and `zkit-ui/toast`.
  - The previous full barrel is available explicitly as `zkit-ui/all` for showcase and migration-only scenarios.

### Minor Changes

- c864ec0: Refactor Button internals, add `loadingMode`, and add typed `onPressIn` / `onPressOut` passthrough alongside the built-in press feedback.

## 1.0.6

### Patch Changes

- Rename the unified app provider/configuration API to `ZKitProvider` and `configureZKit`.

## 1.0.5

### Patch Changes

- Increase ActionDialog's default minimum body height for short confirmation prompts.

## 1.0.4

### Patch Changes

- Add a default minimum body height for ActionDialog so short confirmation copy keeps a balanced layout.

## 1.0.3

### Patch Changes

- Refine Button runtime paths for loading transitions and explicit press animations.

## 1.0.2

### Patch Changes

- Make Button default press feedback use the lightweight Pressable path.

## 1.0.1

### Patch Changes

- Optimize Button rendering cost for dense React Native list cells.

## 1.0.0

### Major Changes

- Prepare zkit-ui for public npm package publishing with built dist entrypoints and packaged runtime assets.
