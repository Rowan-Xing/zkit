import './styles.web.css';

import { useI18n } from 'zkit-ui';

import { galeriaDemoItems } from './data';

const itemLabelKeys: Record<string, string> = {
  bunny: 'example.galeria.item.video',
  mountain: 'example.galeria.item.mountain',
  portrait: 'example.galeria.item.portrait',
  river: 'example.galeria.item.river',
  waterfall: 'example.galeria.item.waterfall',
  wide: 'example.galeria.item.wide',
};

export function GaleriaGuidePage() {
  const { t } = useI18n();

  return (
    <main className="galeria-guide-scroll">
      <div className="galeria-guide-shell">
        <section className="galeria-guide-hero">
          <p className="galeria-guide-eyebrow">{t('example.galeria.eyebrow')}</p>
          <h1>{t('example.galeria.title')}</h1>
          <p className="galeria-guide-subtitle">
            {t('example.galeria.webSubtitle')}
          </p>
        </section>

        <section className="galeria-guide-grid" aria-label={t('example.galeria.galleryA11y')}>
          {galeriaDemoItems.map((item) => {
            const label = t(itemLabelKeys[item.id] ?? 'example.galeria.apiFallback');

            return (
              <article
                key={item.id}
                aria-label={label}
                className={`galeria-guide-card${item.tall ? ' galeria-guide-card-tall' : ''}`}
              >
                <img
                  alt={label}
                  draggable={false}
                  loading="eager"
                  src={item.previewUri}
                />
                <span className="galeria-guide-badge">
                  {item.type === 'video' ? t('example.galeria.videoBadge') : label}
                </span>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
