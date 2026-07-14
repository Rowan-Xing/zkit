import type { ImageSourcePropType } from 'react-native';

export type GaleriaDemoItem = {
  alt: string;
  height: number;
  id: string;
  label: string;
  posterUri?: string;
  previewSource: ImageSourcePropType;
  previewUri: string;
  tall?: boolean;
  type: 'image' | 'video';
  uri: string;
  width: number;
};

const portraitSource = require('../../../assets/galeria/portrait.png') as ImageSourcePropType;
const mountainSource = require('../../../assets/galeria/mountain.png') as ImageSourcePropType;
const wideSource = require('../../../assets/galeria/wide.png') as ImageSourcePropType;
const valleySource = require('../../../assets/galeria/valley.png') as ImageSourcePropType;
const flowerSource = require('../../../assets/galeria/flower.png') as ImageSourcePropType;
const riverSource = require('../../../assets/galeria/river.png') as ImageSourcePropType;

const flowerVideoUri = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

function webAssetUri(source: ImageSourcePropType): string {
  if (typeof source === 'string') return source;
  if (source && typeof source === 'object') {
    const candidate = source as { default?: string; uri?: string };
    if (typeof candidate.uri === 'string') return candidate.uri;
    if (typeof candidate.default === 'string') return candidate.default;
  }
  return String(source);
}

function imageItem(
  id: string,
  label: string,
  source: ImageSourcePropType,
  width: number,
  height: number,
  tall = false
): GaleriaDemoItem {
  const uri = webAssetUri(source);

  return {
    alt: label,
    height,
    id,
    label,
    previewSource: source,
    previewUri: uri,
    tall,
    type: 'image',
    uri,
    width,
  };
}

const flowerUri = webAssetUri(flowerSource);

export const galeriaDemoItems: GaleriaDemoItem[] = [
  imageItem('portrait', 'Portrait', portraitSource, 900, 1200, true),
  imageItem('mountain', 'Mountain Lake', mountainSource, 1400, 920),
  imageItem('wide', 'Wide Scene', wideSource, 1600, 900),
  imageItem('waterfall', 'Green Valley', valleySource, 1300, 900, true),
  {
    alt: 'Flower video',
    height: 930,
    id: 'bunny',
    label: 'Video',
    posterUri: flowerUri,
    previewSource: flowerSource,
    previewUri: flowerUri,
    type: 'video',
    uri: flowerVideoUri,
    width: 1400,
  },
  imageItem('river', 'River', riverSource, 1400, 980),
];
