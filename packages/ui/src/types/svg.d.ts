// 让 TypeScript 认识 `import Icon from './icon.svg'` 这种写法。
// 在 React Native + react-native-svg-transformer 的组合下，svg 会被转换成一个 React 组件。
declare module '*.svg' {
  import * as React from 'react';
  import type { SvgProps } from 'react-native-svg';
  const SvgComponent: React.FC<SvgProps>;
  export default SvgComponent;
}

