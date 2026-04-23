import type { ComponentType } from 'react';

export type ComponentId =
  | 'button'
  | 'text'
  | 'text-input'
  | 'loading-spinner'
  | 'switch'
  | 'checkbox'
  | 'radio'
  | 'accordion'
  | 'picker'
  | 'date-picker'
  | 'address-cascader'
  | 'between-time'
  | 'slider-captcha';

export type ComponentCategory =
  | 'foundation'
  | 'input'
  | 'selection'
  | 'picker'
  | 'feedback';

export type CatalogEntry = {
  id: ComponentId;
  title: string;
  category: ComponentCategory;
  summary: string;
  icon: string;
  accent: [string, string];
  tags: string[];
  exampleCount: number;
};

export type PageSection = {
  title: string;
  description: string;
  code: string;
  Demo: ComponentType;
};

export type PageDefinition = {
  intro: string;
  highlights: string[];
  sections: PageSection[];
};

export type AppRoute =
  | { kind: 'home' }
  | { kind: 'component'; id: ComponentId };
