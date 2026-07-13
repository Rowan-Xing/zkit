---
"zkit-ui": patch
---

Optimize large-range date picker rendering, add an Android native wheel, and retain the service date host only after its first real use to reduce repeat-open, interaction, and close latency without application-start prewarming. The patched `@lodev09/react-native-true-sheet@3.10.0` native host is bundled inside `zkit-ui`; consumers should remove any direct TrueSheet dependency and do not need to publish a separate TrueSheet package.
