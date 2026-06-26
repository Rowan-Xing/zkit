import type {
  LinkedScrollItem as UILinkedScrollItem,
  SliderCaptchaChallenge,
} from 'zkit-ui';

export type Density = 'compact' | 'comfortable' | 'spacious';

export type ShowcaseMetric = {
  value: string;
  labelKey: string;
};

export type ShowcaseNavKey =
  | 'foundation'
  | 'actions'
  | 'forms'
  | 'choice'
  | 'surfaces'
  | 'pickers'
  | 'services'
  | 'tools';

export type ShowcaseNavItem = {
  key: ShowcaseNavKey;
  titleKey: string;
  captionKey: string;
};

export type LinkedDemoData = {
  kind: 'overview' | 'metrics' | 'media';
  summary: string;
  accent: string;
  height: number;
  chips: string[];
};

export type LinkedScrollItem = UILinkedScrollItem<string, LinkedDemoData>;

export const showcaseMetrics: ShowcaseMetric[] = [
  { value: '16+', labelKey: 'example.metric.uiModules' },
  { value: '8', labelKey: 'example.metric.toolExports' },
  { value: '120Hz', labelKey: 'example.metric.motionTarget' },
];

export const showcaseNavItems: ShowcaseNavItem[] = [
  { key: 'foundation', titleKey: 'example.nav.foundation.title', captionKey: 'example.nav.foundation.caption' },
  { key: 'actions', titleKey: 'example.nav.actions.title', captionKey: 'example.nav.actions.caption' },
  { key: 'forms', titleKey: 'example.nav.forms.title', captionKey: 'example.nav.forms.caption' },
  { key: 'choice', titleKey: 'example.nav.choice.title', captionKey: 'example.nav.choice.caption' },
  { key: 'surfaces', titleKey: 'example.nav.surfaces.title', captionKey: 'example.nav.surfaces.caption' },
  { key: 'pickers', titleKey: 'example.nav.pickers.title', captionKey: 'example.nav.pickers.caption' },
  { key: 'services', titleKey: 'example.nav.services.title', captionKey: 'example.nav.services.caption' },
  { key: 'tools', titleKey: 'example.nav.tools.title', captionKey: 'example.nav.tools.caption' },
];

export const previewImages = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
];

export const captchaChallenge: SliderCaptchaChallenge = {
  backgroundImage:
    'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=640&q=80',
  blockImage:
    'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=120&q=80',
  blockY: 92,
  originalWidth: 640,
  originalHeight: 360,
  blockWidth: 72,
  blockHeight: 72,
};

export const linkedFallbackData: LinkedDemoData = {
  kind: 'metrics',
  summary: '',
  accent: '#EAF1FF',
  height: 208,
  chips: [],
};

export const linkedScrollItems: LinkedScrollItem[] = Array.from({ length: 28 }, (_, index) => {
  const order = index + 1;
  const kind: LinkedDemoData['kind'] =
    index % 5 === 0 ? 'overview' : index % 3 === 0 ? 'media' : 'metrics';
  const palette = ['#EAF1FF', '#ECFDF3', '#FFF7ED', '#F4F3FF'];

  return {
    value: `section-${order}`,
    label: '',
    data: {
      kind,
      summary: '',
      accent: palette[index % palette.length],
      height: kind === 'overview' ? 280 : kind === 'media' ? 236 : 208,
      chips: [],
    },
  };
});
