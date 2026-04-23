# Switch

Switch 是一个高性能的开关组件

- 交互与过渡动画基于 `react-native-reanimated`
- 支持 `value/onValueChange`（React 习惯）
- 支持 `change/click` 事件语义：`onChange`（变更后）与 `onClick`（变更前）

## 基础用法

```tsx
import { Switch } from 'y2kit-ui';
import * as React from 'react';

export function Demo() {
  const [open, setOpen] = React.useState(false);
  return <Switch value={open} onValueChange={setOpen} />;
}
```

## 显示内文字

```tsx
import { Switch } from 'y2kit-ui';

export function Demo() {
  return (
    <>
      <Switch label={['开', '关']} />
      <Switch label={['ON', 'OFF']} />
    </>
  );
}
```

## 修改颜色

```tsx
import { Switch } from 'y2kit-ui';

export function Demo() {
  return (
    <>
      <Switch value color="danger" />
      <Switch value color="success" />
      <Switch value color="error" />
    </>
  );
}
```

## 状态：disabled / loading

```tsx
import { Switch } from 'y2kit-ui';

export function Demo() {
  return (
    <>
      <Switch value disabled />
      <Switch value loading />
    </>
  );
}
```

## 圆角与间隙

```tsx
import { Switch } from 'y2kit-ui';

export function Demo() {
  return (
    <>
      <Switch round={4} space="6px" />
      <Switch round={6} />
    </>
  );
}
```

## Props

Switch 基于 React Native 的 `Pressable`，除下述 props 外，也支持 `Pressable` 的其它属性（例如 `hitSlop`、`accessibilityLabel`、`testID` 等）。

### 值与状态

- `value?: boolean`
  - 默认值：`false`
  - 说明：当前开关状态（受控）。
- `defaultValue?: boolean`
  - 默认值：`false`
  - 说明：非受控模式下的初始开关状态（仅在未传 `value` 时生效）。
- `disabled?: boolean`
  - 默认值：`false`
  - 说明：是否禁用。禁用后无法点击切换，并降低整体不透明度。
- `loading?: boolean`
  - 默认值：`false`
  - 说明：是否加载中。加载中无法点击切换，并在圆点内显示旋转动效。

### 样式

- `size?: 'small' | 'normal' | 'large'`
  - 默认值：`'normal'`
  - 说明：尺寸规格。
- `space?: number | string`
  - 默认值：`'2px'`
  - 说明：轨道内边距（圆点与轨道的“间隙”）。
  - 取值：
    - `number`：按 RN 数值像素解释
    - `string`：支持 `'6px'` 或 `'6'`（会解析为数值）
- `round?: string | number`
  - 默认值：`''`（表现为胶囊圆角）
  - 说明：轨道圆角。
  - 取值：
    - 空值：圆角 = `height / 2`
    - `number`：按 RN 数值像素解释
    - `string`：支持 `'6px'` 或 `'6'`（会解析为数值）

### 颜色

颜色 props 支持两种写法：

- 语义色 token：`'primary' | 'danger' | 'success' | 'error' | 'info'`
- 任意颜色字符串：例如 `'#FF0000'`、`'rgba(0,0,0,0.5)'`

具体 props：

- `color?: string`
  - 默认值：`''`（空值时使用主题 `theme.colors.primary`）
  - 说明：打开（激活）状态的轨道背景色。
- `bgColor?: string`
  - 默认值：`'info'`
  - 说明：关闭（未激活）状态的轨道背景色（亮色模式）。
- `darkBgColor?: string`
  - 默认值：`''`
  - 说明：关闭（未激活）状态的轨道背景色（暗黑模式）；空值时沿用 `bgColor` 的语义色/颜色解析逻辑。
- `btnColor?: string`
  - 默认值：`'white'`
  - 说明：圆点（按钮）的背景色。

### 文案

- `label?: [string, string] | string[]`
  - 默认值：`[]`
  - 说明：轨道内的开关文字数组。
  - 约定：
    - `label[0]`：打开文案
    - `label[1]`：关闭文案

### 事件

- `onValueChange?: (next: boolean) => void`
  - 说明：状态更新回调（受控场景下用于更新 `value`）。
- `onChange?: (status: boolean) => void`
  - 说明：状态变更时触发，参数为变更后的状态。
- `onClick?: (status: boolean) => void`
  - 说明：组件被点击时触发，参数为变更前的状态。

## 兼容映射

为兼容 tmui 的命名，也支持：

- `modelValue`：等价 `value`
- `defaultModelValue`：等价 `defaultValue`
- `onUpdateModelValue`：等价 `onValueChange`
