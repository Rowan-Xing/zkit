export const exampleBackgroundColor = '#F5F7FB';

export type ExampleThemePresetKey = 'blue' | 'emerald' | 'rose' | 'violet';

type ExampleTheme = {
  colors: {
    primary: string;
    onPrimary: string;
    secondary: string;
    onSecondary: string;
    surface: string;
    onSurface: string;
    border: string;
    muted: string;
    disabled: string;
  };
};

const baseThemeColors = {
  onPrimary: '#FFFFFF',
  surface: '#FFFFFF',
  onSurface: '#111827',
  border: '#E4EAF2',
  muted: '#667085',
  disabled: '#94A3B8',
};

export const exampleThemePresets: Record<
  ExampleThemePresetKey,
  {
    color: string;
    theme: ExampleTheme;
  }
> = {
  blue: {
    color: '#1F5EFF',
    theme: {
      colors: {
        ...baseThemeColors,
        primary: '#1F5EFF',
        secondary: '#EAF1FF',
        onSecondary: '#0F2D72',
      },
    },
  },
  emerald: {
    color: '#0F9F6E',
    theme: {
      colors: {
        ...baseThemeColors,
        primary: '#0F9F6E',
        secondary: '#E8F7F1',
        onSecondary: '#064E3B',
      },
    },
  },
  rose: {
    color: '#DB2777',
    theme: {
      colors: {
        ...baseThemeColors,
        primary: '#DB2777',
        secondary: '#FCE7F3',
        onSecondary: '#831843',
      },
    },
  },
  violet: {
    color: '#7C3AED',
    theme: {
      colors: {
        ...baseThemeColors,
        primary: '#7C3AED',
        secondary: '#F3E8FF',
        onSecondary: '#4C1D95',
      },
    },
  },
};

export const defaultExampleThemePreset: ExampleThemePresetKey = 'blue';

export const exampleTheme = exampleThemePresets[defaultExampleThemePreset].theme;
