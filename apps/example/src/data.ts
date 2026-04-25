import type {
  LinkedScrollItem as UILinkedScrollItem,
  SliderCaptchaChallenge,
} from 'y2kit-ui';

export type Density = 'compact' | 'comfortable' | 'spacious';

export type LinkedDemoData = {
  kind: 'overview' | 'metrics' | 'media';
  summary: string;
  accent: string;
  height: number;
  chips: string[];
};

export type LinkedScrollItem = UILinkedScrollItem<string, LinkedDemoData>;

export const languageOptions = [
  { id: 'en', title: 'English' },
  { id: 'zh', title: 'Chinese' },
  { id: 'ja', title: 'Japanese' },
];

export const workflowOptions = [
  {
    id: 'design',
    title: 'Design',
    children: [
      { id: 'tokens', title: 'Tokens' },
      { id: 'motion', title: 'Motion' },
    ],
  },
  {
    id: 'ship',
    title: 'Ship',
    children: [
      { id: 'review', title: 'Review' },
      { id: 'release', title: 'Release' },
    ],
  },
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
  summary: 'Fallback section data for custom item sources.',
  accent: '#EAF1FF',
  height: 208,
  chips: ['Fallback', 'metrics', '0 items'],
};

export const linkedScrollItems: LinkedScrollItem[] = Array.from({ length: 28 }, (_, index) => {
  const order = index + 1;
  const kind: LinkedDemoData['kind'] =
    index % 5 === 0 ? 'overview' : index % 3 === 0 ? 'media' : 'metrics';
  const palette = ['#EAF1FF', '#ECFDF3', '#FFF7ED', '#F4F3FF'];

  return {
    value: `section-${order}`,
    label: `Section ${order}`,
    data: {
      kind,
      summary:
        kind === 'overview'
          ? 'Overview block with denser content and a taller viewport target.'
          : kind === 'media'
            ? 'Media-like section with mixed copy, chips, and uneven height.'
            : 'Metric section with compact rows and predictable recycling type.',
      accent: palette[index % palette.length],
      height: kind === 'overview' ? 280 : kind === 'media' ? 236 : 208,
      chips: [`Batch ${Math.ceil(order / 4)}`, kind, `${24 + index * 3} items`],
    },
  };
});
