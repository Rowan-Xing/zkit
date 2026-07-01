import { requireNativeView } from 'expo'

import * as React from 'react'
import { type FC, type ReactNode, useContext, useRef } from 'react'
import { Image } from 'react-native'
import type { SFSymbol } from 'sf-symbols-typescript'
import { GaleriaContext } from './context'
import { GaleriaIndexChangedEvent, GaleriaViewProps } from './Galeria.types'

const NativeImage = requireNativeView<
  GaleriaViewProps & {
    galleryId: string
    urls?: string[]
    items?: any[]
    closeIconName?: SFSymbol
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
    closeIconName,
    urls,
    items,
    theme = 'dark',
    ids,
  }: {
    children: ReactNode
  } & Partial<
    Pick<GaleriaContext, 'theme' | 'ids' | 'urls' | 'items' | 'closeIconName'>
  >) {
    const galleryIdRef = useRef<string | null>(null)
    if (galleryIdRef.current == null) {
      galleryIdRef.current = createGalleryId()
    }
    const galleryId = galleryIdRef.current!

    return (
      <GaleriaContext.Provider
        value={{
          galleryId,
          closeIconName,
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
    Image(props: GaleriaViewProps) {
      const { theme, urls, items, initialIndex, closeIconName, galleryId } =
        useContext(GaleriaContext)
      return (
        <NativeImage
          onIndexChange={props.onIndexChange}
          closeIconName={closeIconName}
          galleryId={galleryId}
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
