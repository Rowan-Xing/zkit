# Switch

Switch 是布尔开关组件，状态模型与 Checkbox 这类选择控件保持一致：

- `checked/defaultChecked/onChange`
- 受控模式只跟随外部 `checked`
- 非受控模式会先更新 UI 线程动画，再同步内部状态
- 交互与过渡动画基于 `react-native-reanimated`

## 基础用法

```tsx
import * as React from 'react';
import { Switch } from 'y2kit-ui';

export function Demo() {
  const [checked, setChecked] = React.useState(false);
  return <Switch checked={checked} onChange={setChecked} />;
}
```

## 内置文案

```tsx
import { Switch } from 'y2kit-ui';

export function Demo() {
  return <Switch checkedLabel="开" uncheckedLabel="关" />;
}
```

## 语义色与尺寸

```tsx
import { Switch } from 'y2kit-ui';

export function Demo() {
  return (
    <>
      <Switch tone="primary" />
      <Switch tone="success" size="sm" />
      <Switch tone="danger" size="lg" />
      <Switch color="#0EA5E9" />
    </>
  );
}
```

## 状态

```tsx
import { Switch } from 'y2kit-ui';

export function Demo() {
  return (
    <>
      <Switch checked disabled />
      <Switch checked loading />
    </>
  );
}
```

## Props

Switch 基于 React Native `Pressable`，会透传常用 Pressable 属性和事件；组件自身固定使用 `accessibilityRole="switch"`，并维护 `checked/disabled/busy` 状态。

### 状态

- `checked?: boolean`：受控开关状态。
- `defaultChecked?: boolean`：非受控初始状态，默认 `false`。
- `onChange?: (checked: boolean) => void`：开关状态变更回调。
- `disabled?: boolean`：禁用，默认 `false`。
- `loading?: boolean`：加载中，默认 `false`；加载中不可切换，并在 thumb 内显示 spinner。

### 外观

- `size?: 'sm' | 'md' | 'lg'`：尺寸，默认 `'md'`。
- `tone?: 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info'`：语义色，默认 `'primary'`。
- `color?: string`：选中轨道颜色覆盖，支持语义色 token 或颜色字符串。
- `uncheckedColor?: string`：未选中轨道颜色覆盖。
- `darkUncheckedColor?: string`：暗色模式下未选中轨道颜色覆盖。
- `thumbColor?: string`：thumb 背景色覆盖。
- `checkedLabelColor?: string`：选中文案颜色覆盖。
- `uncheckedLabelColor?: string`：未选中文案颜色覆盖。
- `checkedLabel?: string`：选中态轨道内文案。
- `uncheckedLabel?: string`：未选中态轨道内文案。
- `duration?: number`：状态切换动画时长，默认 `180`。
- `thumbInset?: number`：thumb 与轨道边缘间距。
- `radius?: number`：轨道圆角。
- `style?: Pressable['style']`：外层 Pressable 样式。
- `trackStyle?: StyleProp<ViewStyle>`：轨道样式覆盖。
- `thumbStyle?: StyleProp<ViewStyle>`：thumb 样式覆盖。
