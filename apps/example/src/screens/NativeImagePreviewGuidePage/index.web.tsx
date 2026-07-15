import './styles.web.css';

import { useI18n } from 'zkit-ui';
import { NativeImagePreview, type NativeImagePreviewItem } from 'zkit-ui/native-image-preview';

import { nativeImagePreviewDemoItems } from './data';

const itemLabelKeys: Record<string, string> = {
  bunny: 'example.nativeImagePreview.item.video',
  mountain: 'example.nativeImagePreview.item.mountain',
  portrait: 'example.nativeImagePreview.item.portrait',
  river: 'example.nativeImagePreview.item.river',
  waterfall: 'example.nativeImagePreview.item.waterfall',
  wide: 'example.nativeImagePreview.item.wide',
};

const previewItems: NativeImagePreviewItem[] = nativeImagePreviewDemoItems.map((item) => ({
  alt: item.alt,
  height: item.height,
  id: item.id,
  poster: item.posterUri,
  type: item.type,
  url: item.uri,
  width: item.width,
}));

export function NativeImagePreviewGuidePage() {
  const { t } = useI18n();

  return (
    <main className="native-image-preview-guide-scroll">
      <div className="native-image-preview-guide-shell">
        <section className="native-image-preview-guide-hero">
          <p className="native-image-preview-guide-eyebrow">{t('example.nativeImagePreview.eyebrow')}</p>
          <h1>{t('example.nativeImagePreview.title')}</h1>
          <p className="native-image-preview-guide-subtitle">
            {t('example.nativeImagePreview.webSubtitle')}
          </p>
        </section>

        <NativeImagePreview colorScheme="dark" items={previewItems}>
          <section className="native-image-preview-guide-grid" aria-label={t('example.nativeImagePreview.previewGridA11y')}>
            {nativeImagePreviewDemoItems.map((item, index) => {
              const label = t(itemLabelKeys[item.id] ?? 'example.nativeImagePreview.apiFallback');

              return (
                <article
                  key={item.id}
                  aria-label={label}
                  className={`native-image-preview-guide-card${item.tall ? ' native-image-preview-guide-card-tall' : ''}`}
                >
                  <NativeImagePreview.Item index={index} style={{ height: '100%' }}>
                    <img
                      alt={label}
                      draggable={false}
                      loading="eager"
                      src={item.previewUri}
                    />
                  </NativeImagePreview.Item>
                  <span className="native-image-preview-guide-badge">
                    {item.type === 'video' ? t('example.nativeImagePreview.videoBadge') : label}
                  </span>
                </article>
              );
            })}
          </section>
        </NativeImagePreview>
      </div>
    </main>
  );
}
