# Checkbox

Checkbox 是三端一致的复选框组件，适合协议勾选、多选列表、批量选择和“全选/部分选中”入口。组件使用自绘 Pressable + Reanimated 路径，而不是依赖平台原生 checkbox，以保证 iOS / Android / Web 的尺寸、动效、主题和三态表现一致。

## 设计约定

- 状态模型统一为 `checked/defaultChecked/onChange`
- 三态只通过 `checked="indeterminate"` 表达，不再提供独立 `indeterminate` 覆盖字段
- 受控模式完全跟随外部 `checked`，不会乐观漂移
- 非受控模式先在 UI 线程推进动画，再同步内部状态
- `CheckboxGroup` 使用 `value/defaultValue/onChange` 管理选中集合
- 默认触控热区至少补到 `wp(44)`，小尺寸也保持可点性
- 自定义 `layout.indicatorSize` 但未传 `layout.indicatorIconSize` 时，默认勾号会按最终指示器尺寸等比缩放并取整

## 基础用法

```tsx
import * as React from 'react';
import { Checkbox } from 'zkit-ui/checkbox';

export function Demo() {
  const [checked, setChecked] = React.useState(false);

  return (
    <Checkbox
      checked={checked}
      onChange={setChecked}
      label="我已阅读并同意"
    />
  );
}
```

## 三态与全选

`checked` 支持 `false | true | 'indeterminate'`。用户点击半选态时会切换到 `true`，适合“部分选中 -> 全选”的直觉路径。

```tsx
const allChecked = selected.length === items.length;
const partiallyChecked = selected.length > 0 && !allChecked;

<Checkbox
  checked={partiallyChecked ? 'indeterminate' : allChecked}
  onChange={(next) => {
    setSelected(next ? items.map((item) => item.id) : []);
  }}
  label="全部"
/>;
```

## CheckboxGroup

```tsx
import { Checkbox, CheckboxGroup } from 'zkit-ui/checkbox';
import { wp } from 'zkit-tools';

const options = [
  { id: 'motion', label: '动画 tokens' },
  { id: 'forms', label: '表单控件' },
  { id: 'overlays', label: '浮层服务' },
];

export function Demo() {
  const [value, setValue] = React.useState<string[]>(['motion']);

  return (
    <CheckboxGroup
      value={value}
      onChange={setValue}
      orientation="vertical"
      gap={wp(10)}
      tone="success"
    >
      {options.map((option) => (
        <Checkbox key={option.id} value={option.id} label={option.label} />
      ))}
    </CheckboxGroup>
  );
}
```

## 外观与主题

```tsx
<Checkbox label="默认" />
<Checkbox label="柔和" variant="soft" />
<Checkbox label="描边" variant="outline" />
<Checkbox label="成功色" tone="success" />
<Checkbox label="圆形" shape="circle" />
<Checkbox label="自定义主色" color="#0EA5E9" />
```

像素类自定义值应在调用侧用 `wp(...)` 计算后传入：

```tsx
<Checkbox
  label="大尺寸"
  layout={{
    indicatorSize: wp(24),
    indicatorRadius: wp(7),
    gap: wp(12),
  }}
/>
```

只覆盖 `indicatorSize` 时，内置勾号尺寸会随最终指示器尺寸按比例取整；显式传入 `indicatorIconSize` 或 `indicatorRadius` 时仍以调用侧配置为准。`shape="circle"` 且未传 `indicatorRadius` 时，默认圆角会对 `indicatorSize / 2` 取整，减少 17、18 等小尺寸下的半像素圆角毛边。

## 自定义内容

`children` 支持 render-prop。根节点本身就是可点击区域，子节点通常只读取状态做视觉变化，不需要再绑定一次点击。

```tsx
<Checkbox checked={checked} onChange={setChecked} showIndicator={false}>
  {({ checked }) => (
    <Text tone={checked ? 'primary' : 'muted'}>
      {checked ? '已选择' : '未选择'}
    </Text>
  )}
</Checkbox>
```

需要完全替换指示器时使用 `indicator`，或在自定义内容中放置 `CheckboxIndicator`：

```tsx
<Checkbox
  checked={checked}
  onChange={setChecked}
  indicator={({ indeterminate }) => (
    <YourIcon name={indeterminate ? 'minus' : 'check'} />
  )}
  label="自定义指示器"
/>
```

## Props

Checkbox 透传 React Native `Pressable` 的常用属性和事件；组件自身固定使用 `accessibilityRole="checkbox"`，并维护 `checked/disabled` 状态。

### 状态

- `checked?: boolean | 'indeterminate'`：受控选中态。
- `defaultChecked?: boolean | 'indeterminate'`：非受控初始状态，默认 `false`。
- `onChange?: (checked: boolean | 'indeterminate') => void`：状态变化回调。
- `disabled?: boolean`：禁用，默认 `false`。
- `value?: string | number`：在 `CheckboxGroup` 内参与选中集合。

### 外观

- `size?: 'sm' | 'md' | 'lg'`：尺寸，默认 `'md'`。
- `tone?: 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info'`：语义色，默认 `'primary'`。
- `variant?: 'solid' | 'soft' | 'outline'`：选中态视觉样式，默认 `'solid'`。
- `shape?: 'rounded' | 'square' | 'circle'`：指示器形状，默认 `'rounded'`。
- `color?: string`：主色覆盖，支持主题 token、语义色或颜色字符串。
- `colors?: CheckboxColors`：结构化颜色覆盖。
- `layout?: CheckboxLayout`：结构化尺寸覆盖；自定义 `indicatorSize` 且未显式传 `indicatorIconSize` 时，勾号默认随最终尺寸缩放。
- `duration?: number`：状态切换动画时长，默认 `170`。

### 内容

- `label?: ReactNode`：快捷主文案；字符串会使用组件库 `Text` 渲染，并可推导 `accessibilityLabel`。
- `description?: ReactNode`：快捷辅助文案。
- `labelPlacement?: 'start' | 'end'`：文案位于指示器的逻辑起点或终点，默认 `'end'`，RTL 下会自动调整视觉顺序。
- `children?: ReactNode | ((slot: CheckboxSlotProps) => ReactNode)`：自定义内容区域。
- `showIndicator?: boolean`：是否渲染内置指示器，默认 `true`。
- `indicator?: ReactNode | ((slot: CheckboxSlotProps) => ReactNode)`：自定义指示器内容。

### 样式 escape hatch

- `style?: Pressable['style']`：根 Pressable 样式。
- `contentStyle?: StyleProp<ViewStyle>`：内容行样式。
- `indicatorStyle?: StyleProp<ViewStyle>`：指示器样式。
- `labelStyle?: StyleProp<TextStyle>`：快捷主文案样式。
- `descriptionStyle?: StyleProp<TextStyle>`：快捷辅助文案样式。

### CheckboxGroup

- `value?: readonly Array<string | number>`：受控选中值数组。
- `defaultValue?: readonly Array<string | number>`：非受控初始选中值数组。
- `onChange?: (value: Array<string | number>) => void`：选中集合变化回调。
- `disabled?: boolean`：组禁用。
- `orientation?: 'horizontal' | 'vertical'`：布局方向，默认 `'horizontal'`。
- `align?: 'start' | 'center' | 'end' | 'stretch'`：交叉轴对齐，默认 `'start'`。
- `wrap?: boolean`：横向布局是否换行，默认 `false`。
- `gap?: number` / `rowGap?: number` / `columnGap?: number`：组内间距，默认 `wp(12)`。
- `size` / `tone` / `variant` / `shape` / `color` / `colors` / `layout`：作为组内 Checkbox 的默认外观配置，单个 Checkbox 传入同名 props 时优先生效。

## 类型

```ts
type CheckboxCheckedState = boolean | 'indeterminate';

type CheckboxColors = {
  checkedBackground?: string;
  checkedBorder?: string;
  checkedIndicator?: string;
  indeterminateBackground?: string;
  indeterminateBorder?: string;
  indeterminateIndicator?: string;
  uncheckedBackground?: string;
  uncheckedBorder?: string;
  focusRing?: string;
};

type CheckboxLayout = {
  indicatorSize?: number;
  indicatorRadius?: number;
  indicatorBorderWidth?: number;
  indicatorIconSize?: number;
  gap?: number;
  minTouchTarget?: number;
  focusRingWidth?: number;
  focusRingOffset?: number;
};
```
