# zkit-galeria

Shared-transition image and video gallery for Web/H5 and React Native iOS/Android.

[中文文档](./README.md)

## Platform entries

| Target | Import | Runtime |
| --- | --- | --- |
| Web/H5 | `zkit-galeria` + `zkit-galeria/styles.css` | Pure browser DOM/CSS |
| React Native iOS | `zkit-galeria/react-native` | Expo native module |
| React Native Android | `zkit-galeria/react-native` | Expo native module |

## Install

```bash
pnpm add zkit-galeria
```

React Native projects must rebuild the native app after installing or updating this package. Expo Go cannot load the bundled native module.

## Web/H5 usage

Import the CSS once at the application entry. Create one controller for the page, pass the clicked DOM element as the transition source, and provide `getSourceElement` so swiping to another item can still close back to the current thumbnail.

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

For React/Vue/UniApp-H5, keep the same protocol: save the thumbnail DOM refs, call `open` on click, and call `galeria.destroy()` when the page unmounts.

### Web item contract

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

### Web integration notes

- `sourceElement` is the thumbnail that was tapped.
- `getSourceElement` should return the latest thumbnail element for the requested index. This is important after horizontal swiping.
- `sourceObjectFit` should match the thumbnail CSS, usually `cover`.
- `width` and `height` on each item make the shared geometry stable before the browser has decoded the full media.
- `sourceVisibility: 'hidden'` gives the native-style pickup/put-back feel. Use `'visible'` only when the host page cannot safely hide the source node.
- Prefer fixed thumbnail dimensions and avoid hover/tap transforms on the source card while opening. Geometry changes during the transition will look like a jump.

## React Native usage

Use the React Native entry only from a native-built Expo/React Native app. The root `zkit-galeria` entry is for H5 and should not be imported by RN screens.

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

### React Native item contract

```ts
type GaleriaNativeItem = {
  id?: string
  type?: 'image' | 'video'
  url: string
  poster?: string
}
```

`items` is preferred because it supports images and videos. `urls` is still supported for legacy image-only integrations.

### React Native integration notes

- Keep `items` order and `Galeria.Image index` in sync.
- Wrap the real native thumbnail image with `Galeria.Image`. Do not replace it with a placeholder view if you want a true shared transition.
- Use stable thumbnail dimensions. For chat/media feeds, compute the rendered thumbnail size before render and keep it unchanged during the transition.
- `expo-image` is recommended for production lists. `transition={0}` avoids source-image fade effects competing with the shared transition.
- Pass `edgeToEdge` on Android source images, or run the whole Android app edge-to-edge, so the overlay can cover system bars cleanly.
- Rebuild iOS/Android after native package changes: for example `expo run:ios`, `expo run:android`, EAS build, or the project's equivalent native build command.

## Recommended RN wrapper

For an existing app, hide the package behind local wrappers. Then migration from a previous Galeria package only changes the wrapper import, not every business screen.

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

## Validation checklist

- Open from image and video thumbnails.
- Swipe horizontally, then close back to the current thumbnail.
- Drag vertically without releasing: the source area should not visually duplicate unless `sourceVisibility` is intentionally set to `'visible'`.
- Pinch to zoom, pan while zoomed, then verify paging is disabled until the image returns to normal scale.
- On Android, check status bar and bottom navigation/safe-area colors during open and close.
- On mobile H5, test Safari/Chrome/embedded WebView because pointer and viewport behavior differs across engines.
