import { requireNativeView } from 'expo'

import * as React from 'react'
import { type FC, type ReactNode, useContext, useRef } from 'react'
import { Image } from 'react-native'
import {
  controlEdgeToEdgeValues,
  isEdgeToEdge,
} from 'react-native-is-edge-to-edge'
import { GaleriaContext } from './context'
import { GaleriaIndexChangedEvent, GaleriaViewProps } from './Galeria.types'

const EDGE_TO_EDGE = isEdgeToEdge()

const NativeImage = requireNativeView<
  GaleriaViewProps & {
    galleryId: string
    edgeToEdge: boolean
    urls?: string[]
    items?: any[]
    theme: 'dark' | 'light'
    onIndexChange?: (event: GaleriaIndexChangedEvent) => void
  }
>('Galeria')

const array = []
const noop = () => {}
const createGalleryId = () =>
  `galeria-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

const Galeria = Object.assign(
  function Galeria({
    children,
    urls,
    items,
    theme = 'dark',
    ids,
  }: {
    children: ReactNode
  } & Partial<Pick<GaleriaContext, 'theme' | 'ids' | 'urls' | 'items'>>) {
    const galleryIdRef = useRef<string | null>(null)
    if (galleryIdRef.current == null) {
      galleryIdRef.current = createGalleryId()
    }
    const galleryId = galleryIdRef.current!

    return (
      <GaleriaContext.Provider
        value={{
          galleryId,
          closeIconName: undefined,
          urls,
          items,
          theme,
          initialIndex: 0,
          open: false,
          src: '',
          setOpen: noop,
          ids,
        }}
      >
        {children}
      </GaleriaContext.Provider>
    )
  },
  {
    Image({ edgeToEdge, ...props }: GaleriaViewProps) {
      const { theme, urls, items, initialIndex, galleryId } =
        useContext(GaleriaContext)

      if (__DEV__) {
        controlEdgeToEdgeValues({ edgeToEdge })
      }

      return (
        <NativeImage
          onIndexChange={props.onIndexChange}
          galleryId={galleryId}
          edgeToEdge={EDGE_TO_EDGE || (edgeToEdge ?? false)}
          theme={theme}
          urls={urls?.map((url) => {
            if (typeof url === 'string') {
              return url
            }

            return Image.resolveAssetSource(url).uri
          })}
          items={items}
          index={initialIndex}
          {...props}
        />
      )
    },
    Popup: (() => null) as FC<{
      disableTransition?: 'web'
    }>,
  },
)

export default Galeria
