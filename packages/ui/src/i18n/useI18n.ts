import * as React from 'react';
import { I18nContext } from './I18nProvider';

export function useI18n() {
  return React.useContext(I18nContext);
}

