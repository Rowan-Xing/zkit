# BottomSheet

`BottomSheet` 是组件库的底部浮层基础件。它用统一的 `open/defaultOpen/onOpenChange` 状态模型封装底层原生 sheet：iOS / Android 走 `@lodev09/react-native-true-sheet` 的原生实现，Web 走同包内的 `@gorhom/bottom-sheet` 适配层，避免把平台差异泄漏给业务组件。

## 基础用法

```tsx
import * as React from 'react';
import { BottomSheet, Button, Text } from 'y2kit-ui';

export function Demo() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button onPress={() => setOpen(true)}>打开</Button>

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="筛选条件"
        description="选择后点击确认应用到列表"
        detents={['content', '90%']}
      >
        <BottomSheet.Content>
          <Text>这里放表单、选择器或操作项。</Text>
        </BottomSheet.Content>
      </BottomSheet>
    </>
  );
}
```

## 状态模型

- `open/defaultOpen/onOpenChange` 表示展示状态，支持受控和非受控。
- `onOpenChange(open, meta)` 的 `meta.reason` 会标记来源：`api`、`backdrop`、`back`、`gesture`、`system`。
- `onDismissComplete` 在原生关闭动画完成后触发，适合清理草稿或卸载重内容。
- ref 提供 `open()`、`close()`、`snapTo(index)`、`dismissStack()`，命名面向组件语义，不暴露底层 `present/dismiss`。

## Detents

`detents` 最多 3 个，按从小到大传入：

```tsx
<BottomSheet detents={['content', '50%', 0.9]} />
```

- `content` / `auto`：按内容高度自适应。
- `medium`：50% 高度。
- `large`：90% 高度。
- `full`：100% 高度。
- 百分比字符串或 `0-1` 数字：按可用高度比例。

## 外观与跨端行为

- 默认使用主题 `surface` 作为背景；iOS 26+ 未显式传 `cornerRadius` 时保留系统 sheet 默认圆角，其它平台默认半径通过 `wp(...)` 计算。
- iOS 的遮罩点击由组件层统一处理，Android/Web 使用底层 sheet 遮罩能力，业务侧不需要自己包 `Modal`。
- `mountStrategy="unmountOnExit"` 可在关闭完成后卸载内容；默认 `lazy` 会首次打开后保留内容。
- `nativeProps` 是底层 TrueSheet 的 escape hatch，只用于 `scrollable`、`backgroundBlur`、`stackBehavior` 等高级平台能力。

## Provider

`ComponentLibProvider` 已内置 `BottomSheetProvider`。如果单独使用 `ThemeProvider`，Web 端需要手动包裹：

```tsx
import { BottomSheetProvider } from 'y2kit-ui';

<BottomSheetProvider>
  <App />
</BottomSheetProvider>;
```
