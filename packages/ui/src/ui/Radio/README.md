# Radio

Radio 是三端一致的单选组件，适合互斥选项、设置项模式选择和表单中的单一值选择。组件使用自绘 Pressable + Reanimated 路径，而不是依赖平台原生 radio，以保证 iOS / Android / Web 的尺寸、动效、主题和禁用态表现一致。

## 设计约定

- `RadioGroup` 使用 `value/defaultValue/onChange` 管理单一选中值
- 组内 Radio 使用 `value` 作为身份标识，类型为 `string | number`
- 受控模式完全跟随外部 `value/checked`，不会乐观漂移
- 非受控模式先在 UI 线程推进动画，再同步内部状态
- 已选项默认再次点击不取消；筛选类场景需要清空时显式开启 `allowDeselect`
- `size/tone/variant` 提供语义化外观，`colors/layout` 作为集中 escape hatch
- 默认触控热区至少补到 `wp(44)`，小尺寸也保持可点性

## RadioGroup

```tsx
import * as React from 'react';
import { Radio, RadioGroup, Text } from 'zkit-ui';
import { wp } from 'zkit-tools';

type Density = 'compact' | 'comfortable' | 'spacious';

export function Demo() {
  const [value, setValue] = React.useState<Density | null>('comfortable');

  return (
    <>
      <RadioGroup<Density>
        value={value}
        onChange={setValue}
        orientation="vertical"
        gap={wp(10)}
      >
        <Radio value="compact" label="紧凑" />
        <Radio value="comfortable" label="舒适" />
        <Radio value="spacious" label="宽松" />
      </RadioGroup>
      <Text>当前：{value ?? '未选择'}</Text>
    </>
  );
}
```

## 可清空选择

Radio 默认遵循单选控件直觉：点击已选项不会取消。需要筛选器这类“可回到未选择”的场景时，在组上开启 `allowDeselect`，再次点击当前项会触发 `onChange(null)`。

```tsx
<RadioGroup
  value={sort}
  onChange={setSort}
  allowDeselect
  gap={wp(10)}
>
  <Radio value="latest" label="最新" />
  <Radio value="popular" label="最热" />
</RadioGroup>
```

## 外观与主题

```tsx
<Radio label="默认" />
<Radio label="柔和" variant="soft" />
<Radio label="实心" variant="solid" />
<Radio label="成功色" tone="success" />
<Radio label="自定义主色" color="#0EA5E9" />
<Radio colors={{ uncheckedBorder: '#CBD5E1' }} label="自定义颜色" />
```

像素类自定义值应在调用侧用 `wp(...)` 计算后传入：

```tsx
<Radio
  label="大尺寸"
  layout={{
    indicatorSize: wp(24),
    indicatorDotSize: wp(11),
    gap: wp(12),
  }}
/>
```

## 自定义内容

`children` 支持 render-prop。根节点本身就是可点击区域，子节点通常只读取状态做视觉变化，不需要再绑定一次点击。

```tsx
<RadioGroup value={plan} onChange={setPlan} orientation="vertical" gap={wp(10)}>
  {plans.map((item) => (
    <Radio key={item.id} value={item.id} showIndicator={false}>
      {({ checked }) => (
        <View
          style={{
            paddingHorizontal: wp(12),
            paddingVertical: wp(12),
            borderRadius: wp(8),
            borderWidth: wp(1),
            borderColor: checked ? '#111827' : '#E5E7EB',
            backgroundColor: checked ? '#111827' : '#FFFFFF',
          }}
        >
          <Text tone={checked ? 'inverse' : 'default'}>{item.label}</Text>
        </View>
      )}
    </Radio>
  ))}
</RadioGroup>
```

需要完全替换圆点内容时使用 `indicator`，或在自定义内容中放置 `RadioIndicator`：

```tsx
<Radio
  checked={checked}
  onChange={setChecked}
  indicator={({ checked }) => <YourIcon name={checked ? 'dot' : 'circle'} />}
  label="自定义指示器"
/>
```

## 单个 Radio

单个 Radio 支持 `checked/defaultChecked/onChange`，但它仍然遵循 radio 语义：点击已选中项默认不取消。协议勾选、开关设置这类布尔交互应优先使用 Checkbox 或 Switch。

```tsx
<Radio checked={checked} onChange={setChecked} allowDeselect label="可取消的单个选项" />
```

## Props

Radio 透传 React Native `Pressable` 的常用属性和事件；组件自身固定使用 `accessibilityRole="radio"`，并维护 `checked/disabled` 状态。

### 状态

- `value?: string | number`：在 `RadioGroup` 内参与单选值匹配。
- `checked?: boolean`：单个 Radio 的受控选中态。
- `defaultChecked?: boolean`：单个 Radio 的非受控初始状态，默认 `false`。
- `onChange?: (checked: boolean) => void`：单个 Radio 状态变化回调；组内 Radio 被用户点击选中或清空时也会触发。
- `allowDeselect?: boolean`：是否允许点击已选项后清空，默认跟随组配置或 `false`。
- `disabled?: boolean`：禁用，默认 `false`；组禁用会叠加到组内所有 Radio。

### 外观

- `size?: 'sm' | 'md' | 'lg'`：尺寸，默认 `'md'`。
- `tone?: 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info'`：语义色，默认 `'primary'`。
- `variant?: 'outline' | 'soft' | 'solid'`：选中态视觉样式，默认 `'outline'`。
- `color?: string`：主色覆盖，支持主题 token、语义色或颜色字符串。
- `colors?: RadioColors`：结构化颜色覆盖。
- `layout?: RadioLayout`：结构化尺寸覆盖。
- `duration?: number`：状态切换动画时长，默认 `170`。

### 内容

- `label?: ReactNode`：快捷主文案；字符串会使用组件库 `Text` 渲染，并可推导 `accessibilityLabel`。
- `description?: ReactNode`：快捷辅助文案。
- `labelPlacement?: 'start' | 'end'`：文案位于指示器的逻辑起点或终点，默认 `'end'`，RTL 下会自动调整视觉顺序。
- `children?: ReactNode | ((slot: RadioSlotProps) => ReactNode)`：自定义内容区域。
- `showIndicator?: boolean`：是否渲染内置指示器，默认 `true`。
- `indicator?: ReactNode | ((slot: RadioSlotProps) => ReactNode)`：自定义指示器内容。

### 样式 escape hatch

- `style?: Pressable['style']`：根 Pressable 样式。
- `contentStyle?: StyleProp<ViewStyle>`：内容行样式。
- `indicatorStyle?: StyleProp<ViewStyle>`：指示器样式。
- `labelStyle?: StyleProp<TextStyle>`：快捷主文案样式。
- `descriptionStyle?: StyleProp<TextStyle>`：快捷辅助文案样式。

### RadioGroup

- `value?: string | number | null`：受控选中值。
- `defaultValue?: string | number | null`：非受控初始选中值。
- `onChange?: (value: string | number | null) => void`：选中值变化回调。
- `disabled?: boolean`：组禁用。
- `allowDeselect?: boolean`：是否允许点击已选项后清空为 `null`，默认 `false`。
- `orientation?: 'horizontal' | 'vertical'`：布局方向，默认 `'horizontal'`。
- `align?: 'start' | 'center' | 'end' | 'stretch'`：交叉轴对齐，默认 `'start'`。
- `wrap?: boolean`：横向布局是否换行，默认 `false`。
- `gap?: number` / `rowGap?: number` / `columnGap?: number`：组内间距，默认 `wp(12)`。
- `size` / `tone` / `variant` / `color` / `colors` / `layout`：作为组内 Radio 的默认外观配置，单个 Radio 传入同名 props 时优先生效。

## 类型

```ts
type RadioValue = string | number;

type RadioColors = {
  checkedBackground?: string;
  checkedBorder?: string;
  checkedIndicator?: string;
  uncheckedBackground?: string;
  uncheckedBorder?: string;
  focusRing?: string;
};

type RadioLayout = {
  indicatorSize?: number;
  indicatorDotSize?: number;
  indicatorBorderWidth?: number;
  gap?: number;
  minTouchTarget?: number;
  focusRingWidth?: number;
  focusRingOffset?: number;
};
```
