# zkit-galeria

Shared-transition image and video gallery for web/H5 and React Native surfaces.

## Install

```bash
pnpm add zkit-galeria
```

## Usage

### Web/H5

```ts
import { createGaleria, type GaleriaMediaItem } from 'zkit-galeria';
import 'zkit-galeria/styles.css';

const galeria = createGaleria();

const items: GaleriaMediaItem[] = [
  {
    id: 'cover',
    type: 'image',
    src: '/cover.jpg',
    width: 1200,
    height: 900,
    alt: 'Cover',
  },
];

const sourceElement = document.querySelector<HTMLElement>('[data-galeria-index="0"]');

if (sourceElement) {
  await galeria.open({
    items,
    index: 0,
    sourceElement,
    getSourceElement: (index) =>
      document.querySelector<HTMLElement>(`[data-galeria-index="${index}"]`),
    objectFit: 'cover',
  });
}
```

### React Native

```tsx
import { Galeria } from 'zkit-galeria/react-native';
import { Image } from 'react-native';

export function Screen() {
  return (
    <Galeria urls={['https://example.com/cover.jpg']}>
      <Galeria.Image index={0}>
        <Image source={{ uri: 'https://example.com/cover.jpg' }} />
      </Galeria.Image>
    </Galeria>
  );
}
```

## Notes

- Import `zkit-galeria/styles.css` once in the application.
- Pass a real DOM source element for the shared transition. `getSourceElement` lets the viewer return to the current item after swiping.
- The web implementation supports image/video items, shared open/close transitions, horizontal swiping, vertical drag-to-close, zoom, and panning.
- The React Native entry is `zkit-galeria/react-native` and includes the Expo module native code for iOS and Android.
