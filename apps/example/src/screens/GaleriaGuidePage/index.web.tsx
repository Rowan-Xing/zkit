import 'zkit-galeria/styles.css';
import './styles.web.css';

import * as React from 'react';

import { galeriaDemoItems, galeriaWebItems } from './data';

const { createGaleria } = require('zkit-galeria') as {
  createGaleria: () => {
    destroy: () => void;
    open: (options: {
      getSourceElement?: (index: number) => HTMLElement | null;
      index: number;
      items: typeof galeriaWebItems;
      objectFit?: 'cover' | 'contain' | 'fill';
      sourceElement?: HTMLElement | null;
      sourceObjectFit?: 'cover' | 'contain' | 'fill';
      sourceVisibility?: 'hidden' | 'visible';
      theme?: 'dark' | 'light';
    }) => Promise<void>;
  };
};

export function GaleriaGuidePage() {
  const controllerRef = React.useRef<ReturnType<typeof createGaleria> | null>(null);
  const sourceRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  React.useEffect(() => {
    const controller = createGaleria();
    controllerRef.current = controller;

    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, []);

  const open = React.useCallback((index: number) => {
    const controller = controllerRef.current;
    if (!controller) return;

    void controller.open({
      getSourceElement: (nextIndex) => sourceRefs.current[nextIndex] ?? null,
      index,
      items: galeriaWebItems,
      objectFit: 'cover',
      sourceElement: sourceRefs.current[index] ?? null,
      sourceObjectFit: 'cover',
      sourceVisibility: 'hidden',
      theme: 'dark',
    });
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autoOpen') !== '1') return undefined;

    const timer = window.setTimeout(() => {
      open(0);
    }, 600);

    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <main className="galeria-guide-scroll">
      <div className="galeria-guide-shell">
        <section className="galeria-guide-hero">
          <p className="galeria-guide-eyebrow">Galeria Web</p>
          <h1>Shared transition gallery</h1>
          <p className="galeria-guide-subtitle">
            A pure H5 validation surface for image and video collections.
          </p>
        </section>

        <section className="galeria-guide-grid" aria-label="Galeria demo gallery">
          {galeriaDemoItems.map((item, index) => (
            <button
              key={item.id}
              ref={(node) => {
                sourceRefs.current[index] = node;
              }}
              aria-label={`Open ${item.alt}`}
              className={`galeria-guide-card${item.tall ? ' galeria-guide-card-tall' : ''}`}
              data-galeria-index={index}
              onClick={() => open(index)}
              type="button"
            >
              <img
                alt={item.alt}
                draggable={false}
                loading="eager"
                src={item.previewUri}
              />
              <span className="galeria-guide-badge">{item.type === 'video' ? 'VIDEO' : item.label}</span>
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}
