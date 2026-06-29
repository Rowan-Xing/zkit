import { zhCN } from './zh-CN';
import { zhTW } from './zh-TW';
import { ja } from './ja';
import { enUS } from './en-US';
import { de } from './de';
import type { I18nMessages } from '../types';

export const locales: Record<string, I18nMessages> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  ja,
  'en-US': enUS,
  de,
  // 别名
  zh: zhCN,
  en: enUS,
};

export { zhCN, zhTW, ja, enUS, de };
