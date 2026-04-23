import 'react-native';

declare module 'react-native' {
  export const Dimensions: {
    get: (
      dim: 'window' | 'screen'
    ) => {
      width: number;
      height: number;
      scale?: number;
      fontScale?: number;
    };
  };
}
