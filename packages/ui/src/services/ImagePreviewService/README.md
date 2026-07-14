# ImagePreview

`ImagePreview` 是全屏图片预览基础件，支持 iOS / Android / Web 的统一声明式使用，也提供 `imagePreview.open()` 作为全局命令式入口。

如果需要从真实缩略图原生共享转场到全屏 viewer，请使用 `NativeImagePreview`。`ImagePreview` 适合普通命令式预览，`NativeImagePreview` 适合相册九宫格、瀑布流和商品图集这类有稳定图片锚点的场景。

## 设计取舍

- 核心是声明式组件：`open/defaultOpen` 控制显隐，`value/defaultValue/onChange` 控制当前图片索引。
- 命令式服务只做全局调度：适合富文本、相册九宫格、动态列表等不方便就地挂组件的场景。
- 浮层使用 `Modal` 承载，避免被业务父容器的布局、`overflow` 或 `zIndex` 截断。
- 手势热路径保持在 Reanimated / gesture-handler：缩放、拖拽、切换、下滑关闭不依赖 JS 连续重渲染。
- Android 缩放使用固定 pinch 起点、saved scale / translate 和单层 transform；pinch 后 pan 通过 offset 接续，避免松手瞬间由 pan 接管造成闪移。
- 默认渲染当前页和邻近页（`renderAhead=1`），让左右滑动和来回切换保持连续；网络预取仍默认关闭，避免额外抢占弱网带宽。
- 图片页使用 `expo-image` 的 memory-disk 缓存策略，当前页使用高优先级加载，邻近页低优先级加载。
- Android 的 Modal 内容会重新包 `GestureHandlerRootView`，保证 pinch / pan / swipe 在新 root 中正常接收事件。
- 默认单击不隐藏工具栏，翻页也不改变工具栏显隐；需要单击隐藏或关闭时显式配置 `interactions.tapBehavior`。

## 声明式用法

```tsx
import { ImagePreview } from 'zkit-ui/image-preview';

<ImagePreview
  images={[
    { uri: 'https://example.com/a.jpg', alt: '客厅照片' },
    { uri: 'https://example.com/b.jpg', alt: '卧室照片' },
  ]}
  open={open}
  value={index}
  onChange={setIndex}
  onOpenChange={setOpen}
/>;
```

## 命令式用法

`ZKitProvider` 已内置 `ImagePreviewProvider`。如果没有使用统一 Provider，需要在应用根部单独挂载。

```tsx
import { imagePreview } from 'zkit-ui/image-preview';

const handle = imagePreview.open({
  images,
  index: 1,
  onChange(value) {
    console.log('current image', value);
  },
});

const result = await handle.result;
console.log(result.reason, result.value);
```

## 关键 API

- `images`：图片列表，支持 URL 字符串、`expo-image` source、或带 `id/alt/accessibilityLabel/source` 的描述对象。
- `open/defaultOpen/onOpenChange`：显隐状态，关闭原因通过 `ImagePreviewOpenChangeMeta.reason` 返回。
- `value/defaultValue/onChange`：当前图片索引，切换原因通过 `ImagePreviewChangeMeta.reason` 返回。
- `interactions`：控制 `tapBehavior`、双击缩放、双指缩放、左右切换、下滑关闭和 Android 返回键关闭；`tapBehavior` 默认 `'none'`。
- `prefetch`：默认 `false`；如图片源稳定且希望切换更快，可设为 `'adjacent'` 或 `'all'`。
- `renderHeader/renderFooter/renderOverlay`：自定义顶部、底部和覆盖层内容。
- `onClose`：关闭动画结束后触发，返回最终索引、图片和关闭原因。

## NativeImagePreview 关系

```tsx
import { NativeImagePreview } from 'zkit-ui/native-image-preview';

<NativeImagePreview items={items} colorScheme="dark">
  <NativeImagePreview.Item index={0}>
    <Image source={thumbnailSource} />
  </NativeImagePreview.Item>
</NativeImagePreview>;
```

两者不要混用成同一个本地封装：

- `ImagePreview`：普通全屏预览，支持声明式 `open/value` 和命令式 `imagePreview.open()`。
- `NativeImagePreview`：原生共享转场预览，需要包住真实缩略图节点，iOS / Android 走原生 viewer。

## 手动确认点

- Android：Modal 返回键、下滑关闭后的状态回收、超长图/大图内存表现。
- iOS：安全区、横竖屏切换、双指缩放焦点和 Accessibility escape。
- Web：Modal 层级、触控板/鼠标拖拽、图片跨域加载失败态。
