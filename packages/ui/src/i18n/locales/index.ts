import { zhCN } from './zh-CN';
import { zhTW } from './zh-TW';
import { enUS } from './en-US';
import { ja } from './ja';
import type { I18nMessages } from '../types';

export const locales: Record<string, I18nMessages> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'en-US': enUS,
  ja,
  // 别名
  zh: zhCN,
  en: enUS,
};

export { zhCN, zhTW, enUS, ja };
