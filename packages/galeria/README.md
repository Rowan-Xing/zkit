# zkit-galeria

支持 Web/H5 和 React Native iOS/Android 的共享转场图片/视频画廊。

[English README](./README-EN.md)

## 平台入口

| 目标平台 | 引入方式 | 运行时 |
| --- | --- | --- |
| Web/H5 | `zkit-galeria` + `zkit-galeria/styles.css` | 纯浏览器 DOM/CSS |
| React Native iOS | `zkit-galeria/react-native` | Expo 原生模块 |
| React Native Android | `zkit-galeria/react-native` | Expo 原生模块 |

## 安装

```bash
pnpm add zkit-galeria
```

React Native 项目安装或升级后需要重新构建原生 App。Expo Go 不能加载这个包内置的原生模块。

## Web/H5 使用方式

在应用入口引入一次 CSS。页面内创建一个画廊 controller，点击缩略图时把真实 DOM 节点作为 `sourceElement` 传入；同时提供 `getSourceElement`，这样用户横滑到其他图片后，关闭时仍然能回到当前图片对应的缩略图位置。

```ts
import { createGaleria, type GaleriaMediaItem } from 'zkit-galeria'
import 'zkit-galeria/styles.css'

const galeria = createGaleria()

const items: GaleriaMediaItem[] = [
  {
    id: 'cover',
    type: 'image',
    src: '/cover.jpg',
    width: 1200,
    height: 900,
    alt: 'Cover',
  },
  {
    id: 'clip',
    type: 'video',
    src: '/clip.mp4',
    poster: '/clip-poster.jpg',
    width: 1280,
    height: 720,
  },
]

const sourceElement = document.querySelector<HTMLElement>('[data-galeria-index="0"]')

if (sourceElement) {
  await galeria.open({
    items,
    index: 0,
    sourceElement,
    getSourceElement: (index) =>
      document.querySelector<HTMLElement>(`[data-galeria-index="${index}"]`),
    sourceObjectFit: 'cover',
    sourceVisibility: 'hidden',
    theme: 'dark',
  })
}
```

React、Vue、UniApp-H5 等 H5 场景都遵循同一套协议：保存缩略图 DOM refs，点击时调用 `open`，页面卸载时调用 `galeria.destroy()`。

### Web 数据协议

```ts
type GaleriaMediaItem = {
  id?: string
  type?: 'image' | 'video'
  src?: string
  url?: string
  poster?: string
  width?: number
  height?: number
  alt?: string
}
```

### Web 接入要点

- `sourceElement` 是本次点击的真实缩略图元素。
- `getSourceElement` 应该按 index 返回最新的缩略图元素。横滑后关闭回当前图片时会用到它。
- `sourceObjectFit` 要和缩略图 CSS 的 `object-fit` 对齐，通常是 `cover`。
- 每个 item 的 `width`、`height` 能让浏览器解码完整媒体前就获得稳定的共享转场几何信息。
- `sourceVisibility: 'hidden'` 会得到更接近原生的“拿起/放回”手感。只有宿主页面不能安全隐藏源节点时，才建议改成 `'visible'`。
- 缩略图建议使用稳定尺寸。打开过程中不要让源卡片发生 hover/tap transform，否则共享转场会表现为跳动。

## React Native 使用方式

React Native 侧只在原生构建的 Expo/React Native App 中使用 `zkit-galeria/react-native`。根入口 `zkit-galeria` 是 H5 入口，不应该在 RN 页面里引入。

```tsx
import { Image as ExpoImage } from 'expo-image'
import { Galeria } from 'zkit-galeria/react-native'

const items = [
  {
    id: 'cover',
    type: 'image',
    url: 'https://example.com/cover.jpg',
  },
  {
    id: 'clip',
    type: 'video',
    url: 'https://example.com/clip.mp4',
    poster: 'https://example.com/clip-poster.jpg',
  },
]

export function Screen() {
  return (
    <Galeria items={items} theme="dark">
      {items.map((item, index) => (
        <Galeria.Image edgeToEdge index={index} key={item.id}>
          <ExpoImage
            cachePolicy="memory-disk"
            contentFit="cover"
            source={{ uri: item.poster ?? item.url }}
            style={{ width: 224, height: 168, borderRadius: 8 }}
            transition={0}
          />
        </Galeria.Image>
      ))}
    </Galeria>
  )
}
```

### React Native 数据协议

```ts
type GaleriaNativeItem = {
  id?: string
  type?: 'image' | 'video'
  url: string
  poster?: string
}
```

推荐使用 `items`，因为它同时支持图片和视频。`urls` 仍然保留给旧的纯图片接入。

### React Native 接入要点

- `items` 的顺序必须和 `Galeria.Image index` 保持一致。
- 用 `Galeria.Image` 包住真实的原生缩略图组件。如果想要真正共享转场，不要用占位 View 替代真实图片。
- 缩略图尺寸要稳定。聊天、动态、媒体流这类场景建议先计算展示尺寸，再渲染图片，转场期间不要改变尺寸。
- 生产列表推荐使用 `expo-image`。`transition={0}` 可以避免图片组件自己的淡入动画和共享转场互相干扰。
- Android 上建议给源图传 `edgeToEdge`，或者让整个 Android App 从壳层开始就是 edge-to-edge，这样查看器黑底能完整覆盖状态栏和底部导航区域。
- 原生包变更后要重新构建 iOS/Android，例如 `expo run:ios`、`expo run:android`、EAS Build，或项目自己的原生构建命令。

## 推荐的 RN 包装层

已有业务项目建议保留一层本地包装。这样从旧 Galeria 包迁移到 zkit 时，只需要改包装层 import，不需要每个业务页面都改一遍。

```tsx
import { Galeria } from 'zkit-galeria/react-native'

export function CustomGallery({
  children,
  items,
}: {
  children: React.ReactNode
  items: Array<{ id?: string; type?: 'image' | 'video'; url: string; poster?: string }>
}) {
  return (
    <Galeria items={items} theme="dark">
      {children}
    </Galeria>
  )
}

export function CustomGalleryImage({
  children,
  index,
}: {
  children: React.ReactElement
  index: number
}) {
  return (
    <Galeria.Image edgeToEdge index={index}>
      {children}
    </Galeria.Image>
  )
}
```

## 验收清单

- 从图片缩略图、视频缩略图分别打开查看器。
- 横滑到上一张/下一张后关闭，确认能回到当前图片对应的缩略图。
- 竖拖不松手时，源区域不应该出现重复图片；除非你刻意把 `sourceVisibility` 设置成 `'visible'`。
- 双指缩放、放大后平移、恢复正常比例后再横滑，都应该符合预期。
- Android 上检查打开/关闭时状态栏、底部导航栏、安全区颜色是否被完整覆盖。
- 移动端 H5 建议分别验证 Safari、Chrome、微信/内嵌 WebView，因为 pointer 和 viewport 行为存在差异。
