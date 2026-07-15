# NativeImagePreview

`NativeImagePreview` 是强调真实缩略图锚点与共享转场体验的图片预览组件。它和普通 `ImagePreview` 服务分工不同：`ImagePreview` 适合命令式打开图片；`NativeImagePreview` 适合从真实缩略图自然过渡到全屏 viewer，并在 iOS / Android 上走原生手势、缩放、滑动和拖拽关闭路径，在 Web 上走 H5 共享转场 viewer。

## 适用场景

- 相册九宫格、瀑布流、商品图集这类有真实缩略图锚点的页面。
- 需要从缩略图拾取到全屏 viewer，再从 viewer 顺滑回到原缩略图的位置。
- 需要原生 pinch / pan / swipe / drag-to-close 手势链路，而不是普通 Modal 图片预览。

如果只是从富文本、消息流或按钮命令式打开图片，用 `ImagePreview` 或 `imagePreview.open()` 更合适。

## 基础用法

```tsx
import { Image, type ImageSourcePropType } from 'react-native';
import { NativeImagePreview, type NativeImagePreviewItemDescriptor } from 'zkit-ui/native-image-preview';

const items: NativeImagePreviewItemDescriptor[] = [
  { id: 'photo-a', source: require('./photo-a.png') },
  { id: 'photo-b', source: require('./photo-b.png'), width: 1200, height: 900 },
  { id: 'clip', type: 'video', url: videoUrl, poster: require('./poster.png') },
];

function getThumbnailSource(item: NativeImagePreviewItemDescriptor): ImageSourcePropType | undefined {
  const source = item.poster ?? item.source;
  return typeof source === 'string' ? { uri: source } : source;
}

export function Demo() {
  return (
    <NativeImagePreview items={items} colorScheme="dark">
      {items.map((item, index) => {
        const thumbnailSource = getThumbnailSource(item);
        if (!thumbnailSource) return null;

        return (
          <NativeImagePreview.Item index={index} key={item.id ?? index}>
            <Image source={thumbnailSource} />
          </NativeImagePreview.Item>
        );
      })}
    </NativeImagePreview>
  );
}
```

`NativeImagePreview.Item` 必须包住真实图片节点，原生层会从内部找到 `UIImageView` / `ImageView` 作为转场锚点。不要用普通 `View` 替代缩略图，否则共享转场会退化。

## 推荐数据模型

```ts
type NativeImagePreviewItem =
  | string
  | ImageSourcePropType
  | {
      id?: string;
      type?: 'image' | 'video';
      source?: string | ImageSourcePropType;
      url?: string;
      poster?: string | ImageSourcePropType;
      width?: number;
      height?: number;
    };
```

- 图片可以只传 `source`，也可以用字符串 URL。
- 视频必须传 `type: 'video'` 和 `url`，`poster` 用于缩略图和过渡封面。
- `id` 用于稳定媒体身份；不传时会回退为索引字符串。
- `width / height` 是媒体元信息，帮助 viewer 更稳定地计算布局。

## Props

### NativeImagePreview

- `items`：图片或媒体集合，顺序必须和 `NativeImagePreview.Item index` 对齐。
- `colorScheme`：viewer 明暗外观，支持 `dark / light / system`，默认 `dark`。
- `disabled`：禁用所有锚点预览。
- `edgeToEdge`：Android edge-to-edge 预览，默认关闭；系统已处于 edge-to-edge 时会自动启用。
- `nativeProps.iosCloseIconName`：iOS 关闭按钮 SF Symbol 名称。
- `onChange(value, meta)`：viewer 滑动到新索引时触发。

### NativeImagePreview.Item

- `index`：当前缩略图在 `items` 中的索引。
- `disabled`：禁用当前锚点。
- `style`：锚点容器样式，常用 `StyleSheet.absoluteFill` 覆盖图片卡片。
- `onChange(value, meta)`：仅当前锚点打开的 viewer 发生索引变化时触发。

## 与 ImagePreview 的区别

```tsx
import { imagePreview } from 'zkit-ui/image-preview';

imagePreview.open({ images, index: 0 });
```

`ImagePreview` 是普通全屏预览服务，适合没有稳定缩略图锚点的命令式场景。`NativeImagePreview` 是声明式共享转场组件，必须就地包住真实图片节点。两者不要混成同一个封装，否则很容易把共享转场退化成普通弹层。

## 平台行为

- iOS / Android：使用原生 viewer 和真实图片锚点，主打共享转场、缩放、滑动和拖拽关闭。
- Web：使用 H5 viewer 和真实 DOM 图片锚点，支持共享转场、缩放、滑动、视频播放和拖拽关闭。
- 首次接入或变更原生依赖后需要重新构建 native app；仅刷新 JS bundle 不会注册新的原生 ViewManager。
- 原生模块未注册时不会降级到 `ImagePreview`。这是 native 接入或构建错误，需要重新安装依赖并重建 native app。

## 手动确认点

- iOS：缩略图拾取和回落位置、快速左右滑、视频封面、横竖屏、安全区、关闭按钮。
- Android：edge-to-edge、返回键、快速滑动、列表复用、视频页、普通机型掉帧情况。
- 列表场景：确保 `items` 顺序、`Item index` 和缩略图渲染顺序稳定一致。
