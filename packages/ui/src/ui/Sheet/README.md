# Sheet

`Sheet` 是唯一弹层组件，支持 `top` / `right` / `bottom` / `left`。H5 的所有方向使用 `Modal + Reanimated + Gesture Handler` 自绘；iOS / Android 的 `placement="bottom"` 内部使用原生 TrueSheet，保留系统 detents、手势、滚动嵌套和键盘处理。

## 基础用法

```tsx
import * as React from 'react';
import { Button, Sheet, Text } from 'zkit-ui';

export function Demo() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button onPress={() => setOpen(true)}>打开</Button>

      <Sheet placement="right" open={open} onOpenChange={setOpen} size="md">
        <Sheet.Header title="筛选条件" description="从右侧进入，不打断底部操作区。" />
        <Sheet.Content>
          <Text>这里放表单、菜单或详情内容。</Text>
        </Sheet.Content>
      </Sheet>
    </>
  );
}
```

## 状态模型

- `open/defaultOpen/onOpenChange` 是唯一展示状态来源，支持受控和非受控。
- `onOpenChange(open, details)` 返回 `reason`、`placement` 和 `detentIndex`；非底部方向的 `detentIndex` 为 `null`。
- `onOpenComplete(details)` / `onCloseComplete(details)` 描述动画或原生展示生命周期完成。
- ref 使用 options object：`open({ detentIndex, animated })`、`close({ animated })`、`snapTo(index)`、`getState()`。

## 底部档位

`detents`、`detentIndex`、`defaultDetentIndex` 和 `onDetentChange` 只在 `placement="bottom"` 时有意义。iOS / Android 会映射到 TrueSheet detents；H5 bottom 使用同一语义计算自绘高度，避免 gorhom Web 动态高度和 snap point 差异。

```tsx
<Sheet
  placement="bottom"
  open={open}
  onOpenChange={setOpen}
  detents={['content', 'medium', 'large']}
  detentIndex={detentIndex}
  onDetentChange={setDetentIndex}
>
  <Sheet.Content>
    <Text>底部 sheet 内容</Text>
  </Sheet.Content>
</Sheet>
```

需要透传原生 TrueSheet 的少量高级能力时，使用 `nativeProps`。这个 escape hatch 只会在 iOS / Android 的底部方向生效。

## 自绘方向

- H5 的 `bottom` 和所有平台的 `top` / `left` / `right` 使用 `Modal + Reanimated + Gesture Handler`，位移、遮罩和拖拽回弹都在 UI 线程路径上。
- 拖拽关闭默认绑定在 handle 上，减少与内容滚动、表单输入和内部手势的冲突。
- Web 会在打开时监听 `Escape` 并走与 Android back 一致的关闭原因。

## 尺寸与安全区

`size` 用于非底部方向：左/右表示宽度，顶部表示高度。`auto` 适合顶部内容自适应；底部复杂尺寸使用 `detents`。

```tsx
import { wp } from 'zkit-tools';

<Sheet placement="left" size={wp(320)} />
<Sheet placement="right" size="84%" />
<Sheet placement="top" size="auto" maxHeight={wp(480)} />
```

`safeArea` 默认按方向处理贴边安全区，也可传 `{ top, right, bottom, left }` 精确控制。

## 外观与交互

- `backdrop` 支持 `visible`、`dismissOnPress`、`color`、`opacity`。
- `handle` 支持 `width`、`height`、`topMargin`、`radius`、`color`；`topMargin` 主要服务 bottom native grabber。
- `animation={false}` 可关闭非底部方向动画；`animation.duration/openDuration/closeDuration/easing/reduceMotion` 可调整节奏。
- 自绘方向的关闭态基础布局始终在屏幕外，打开动画会等当前 surface 完成 layout 后再启动，避免 Modal / Reanimated 首帧提交时露出未动画内容。
