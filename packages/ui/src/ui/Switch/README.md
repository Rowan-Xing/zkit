# Switch

Switch 是布尔开关组件，适合“立即启用/停用某项设置”的场景。它使用自绘 Pressable + Reanimated 路径，而不是 React Native 原生 `Switch`，以保证 iOS / Android / Web 的尺寸、动效、状态文案和主题覆盖保持一致。

## 设计约定

- 状态模型：`checked/defaultChecked/onCheckedChange`
- 受控模式完全跟随外部 `checked`，不会乐观切换 UI
- 非受控模式先在 UI 线程推进动画，再同步内部状态
- `loading` 会阻止交互并设置 `accessibilityState.busy`
- 默认触控热区至少补到 `wp(44)`，小尺寸也不牺牲可点性

## 基础用法

```tsx
import * as React from 'react';
import { Switch } from 'zkit-ui';

export function Demo() {
  const [checked, setChecked] = React.useState(false);
  return <Switch checked={checked} onCheckedChange={setChecked} />;
}
```

## 带设置项文案

简单设置项可以直接使用 `label/description`。如果外层已经有完整行布局，也可以只渲染 Switch 本体。

```tsx
<Switch
  label="通知提醒"
  description="开启后会接收订单和系统消息"
  checked={enabled}
  onCheckedChange={setEnabled}
/>
```

## 轨道内状态文案

常规设置项优先使用外部 label 描述功能，用开关位置和颜色表达状态。只有在空间独立、文案极短且不会和外部状态文案重复时，才使用 `stateText`。

```tsx
<Switch
  defaultChecked
  stateText={{ checked: 'On', unchecked: 'Off' }}
/>
```

## 语义色、尺寸和覆盖

```tsx
<Switch tone="primary" />
<Switch tone="success" size="sm" />
<Switch tone="danger" size="lg" />
<Switch color="#0EA5E9" />
<Switch colors={{ uncheckedTrack: '#E5E7EB', thumb: '#FFFFFF' }} />
```

像素类自定义值应在调用侧用 `wp(...)` 计算后传入：

```tsx
<Switch layout={{ width: wp(58), height: wp(34), thumbInset: wp(3) }} />
```

## 自定义内容

`children` 支持 render-prop，用于完全自定义 label 区域。根节点本身就是可点击区域，子节点通常只读取状态做视觉变化，不需要再绑定一次点击。

```tsx
<Switch checked={checked} onCheckedChange={setChecked}>
  {({ checked }) => (
    <Text tone={checked ? 'primary' : 'muted'}>
      {checked ? '已启用' : '已停用'}
    </Text>
  )}
</Switch>
```

## Props

Switch 透传 React Native `Pressable` 的常用属性和事件；组件自身固定使用 `accessibilityRole="switch"`，并维护 `checked/disabled/busy` 状态。

### 状态

- `checked?: boolean`：受控开关状态。
- `defaultChecked?: boolean`：非受控初始状态，默认 `false`。
- `onCheckedChange?: (checked: boolean) => void`：状态变化回调。
- `disabled?: boolean`：禁用，默认 `false`。
- `loading?: boolean`：加载中，默认 `false`；加载中不可切换，并在 thumb 内显示 spinner。
- `loadingIndicator?: ReactNode`：自定义加载指示器。

### 外观

- `size?: 'sm' | 'md' | 'lg'`：尺寸，默认 `'md'`。
- `tone?: 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info'`：选中态语义色，默认 `'primary'`。
- `color?: string`：选中轨道主色覆盖，支持主题 token、语义色或颜色字符串。
- `colors?: SwitchColors`：结构化颜色覆盖。
- `layout?: SwitchLayout`：结构化尺寸覆盖。
- `stateText?: { checked?: string; unchecked?: string }`：轨道内短状态文案。

### 内容

- `label?: ReactNode`：快捷主文案；字符串会使用组件库 `Text` 渲染，并可推导 `accessibilityLabel`。
- `description?: ReactNode`：快捷辅助文案。
- `labelPlacement?: 'start' | 'end'`：文案位于开关前还是后，默认 `'start'`。
- `children?: ReactNode | ((slot: SwitchSlotProps) => ReactNode)`：自定义内容区域。

### 样式 escape hatch

- `style?: Pressable['style']`：根 Pressable 样式。
- `contentStyle?: StyleProp<ViewStyle>`：内容行样式。
- `trackStyle?: StyleProp<ViewStyle>`：轨道样式。
- `thumbStyle?: StyleProp<ViewStyle>`：thumb 样式。
- `labelStyle?: StyleProp<TextStyle>`：快捷主文案样式。
- `descriptionStyle?: StyleProp<TextStyle>`：快捷辅助文案样式。
- `stateTextStyle?: StyleProp<TextStyle>`：轨道内状态文案样式。

## 类型

```ts
type SwitchColors = {
  checkedTrack?: string;
  uncheckedTrack?: string;
  thumb?: string;
  checkedThumb?: string;
  uncheckedThumb?: string;
  checkedText?: string;
  uncheckedText?: string;
  focusRing?: string;
  loading?: string;
};

type SwitchLayout = {
  width?: number;
  height?: number;
  thumbInset?: number;
  radius?: number;
  labelGap?: number;
  textInset?: number;
  textSize?: number;
  textLineHeight?: number;
};
```
