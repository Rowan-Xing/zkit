# zkit-ui

## 2.0.16

### Patch Changes

- Make ActionDialog footer actions use Button's immediate opacity press feedback so quick confirm and dismiss actions remain visibly responsive.

## 2.0.15

### Patch Changes

- Restore the React Native 0.86-compatible ActionDialog backdrop and Worklets closure handling from 2.0.12 after both regressed in later package output.

## 2.0.14

### Patch Changes

- Prevent ActionDialog's Reanimated close callback from capturing the non-serializable Worklets CommonJS namespace.

## 2.0.13

### Patch Changes

- Hide the high-level TextInput placeholder while focused by default so Android cursors no longer overlap native hint text. Preserve the placeholder-derived accessibility label and allow native behavior with `hidePlaceholderOnFocus={false}`.

## 2.0.11

### Patch Changes

- Fix Android wheel gestures inside native sheets and reduce large-wheel opening latency with native virtualized scrolling, while keeping rows clipped to the wheel viewport.

## 2.0.10

### Patch Changes

- Fix Checkbox indicator animations so Reanimated worklets only capture serializable shared values.

## 2.0.6

### Patch Changes

- Rename the native image preview implementation to NativeImagePreview terminology and add the H5 shared-transition preview bridge.

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
