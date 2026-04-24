# Radio

Radio 与 RadioGroup 提供单选能力：

- 单个 Radio：`value/defaultValue/onValueChange`（boolean）
- RadioGroup：管理一个“选中值”（`string | number | boolean | null`），组内 Radio 通过 `itemValue` 参与选择
- 交互与过渡动画基于 `react-native-reanimated`

## 基础用法（单个）

```tsx
import * as React from 'react';
import { View } from 'react-native';
import { Radio, Text } from 'y2kit-ui';

export function Demo() {
  const [checked, setChecked] = React.useState(false);

  return (
    <View style={{ gap: 12 }}>
      <Radio value={checked} onValueChange={setChecked} label="我已阅读并同意" />
      <Text>当前：{String(checked)}</Text>
    </View>
  );
}
```

## RadioGroup（最常用）

```tsx
import * as React from 'react';
import { View } from 'react-native';
import { Radio, RadioGroup, Text } from 'y2kit-ui';

export function Demo() {
  const [value, setValue] = React.useState<string | null>(null);
  const list = ['苹果', '梨子', '香蕉', '地瓜', '花生'];

  return (
    <View style={{ gap: 12 }}>
      <RadioGroup value={value} onValueChange={setValue} gap={12}>
        {list.map((it) => (
          <Radio key={it} itemValue={it} label={it} />
        ))}
      </RadioGroup>
      <Text>当前：{value ?? '未选择'}</Text>
    </View>
  );
}
```

## 竖向排列 + 自定义外观（render-prop）

`children` 支持 render-prop，可以拿到 `checked/toggle` 以便做整行可点的组合；同时配合 `hiddenIndicator` 隐藏默认圆点。

```tsx
import * as React from 'react';
import { View } from 'react-native';
import { Radio, RadioGroup, Text } from 'y2kit-ui';

export function Demo() {
  const [value, setValue] = React.useState<number>(1);
  const list = [
    { text: '科技创新引领制造业高质量发展', id: 1 },
    { text: '建立保持制造业合理比重投入机制', id: 2 },
    { text: '完善现代化产业体系', id: 3 },
  ];

  return (
    <RadioGroup value={value} onValueChange={setValue} direction="column" gap={12} align="left">
      {list.map((item) => (
        <Radio key={item.id} itemValue={item.id} hiddenIndicator>
          {({ checked, toggle }) => (
            <View
              onTouchEnd={toggle}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: checked ? '#111827' : '#E5E7EB',
                backgroundColor: checked ? '#111827' : '#FFFFFF',
              }}
            >
              <Text style={{ color: checked ? '#FFFFFF' : '#111827' }}>{item.text}</Text>
            </View>
          )}
        </Radio>
      ))}
    </RadioGroup>
  );
}
```

## Props

Radio 基于 React Native 的 `Pressable`，除下述 props 外，也支持 `Pressable` 的其它属性（例如 `hitSlop`、`accessibilityLabel`、`testID` 等）。

### Radio

#### 值与事件

- `value?: boolean`
  - 说明：受控选中态。传入后由外部完全接管选中状态。
- `defaultValue?: boolean`
  - 默认值：`false`
  - 说明：非受控模式下的初始选中态（仅在未传 `value` 时生效）。
- `onValueChange?: (checked: boolean) => void`
  - 说明：选中态变化回调。

#### 组内选择（配合 RadioGroup）

- `itemValue?: string | number | boolean`
  - 说明：组内唯一值标识。将 Radio 放入 RadioGroup 时，通过 `itemValue` 决定它对应哪个选项。
  - 注意：组内请保证 `itemValue` 唯一。

#### 状态

- `disabled?: boolean`
  - 默认值：`false`
  - 说明：禁用交互；在 RadioGroup 内会与 group 的 `disabled` 叠加。

#### 文案与布局

- `label?: string`
  - 说明：快捷文案；当 `children` 未提供时渲染。
- `showLabel?: boolean`
  - 默认值：`true`
  - 说明：是否渲染 label 区域（同时会移除 label 间距）。
- `labelDirection?: 'left' | 'right'`
  - 默认值：`'left'`
  - 说明：圆点在文字左侧还是右侧。
- `labelFontSize?: number`
  - 默认值：跟随组件内部默认字号
  - 说明：label 的字号。
- `labelSpace?: number`
  - 默认值：内部默认间距
  - 说明：圆点与 label 的间距。

#### 指示器（圆点）样式

- `hiddenIndicator?: boolean`
  - 默认值：`false`
  - 说明：隐藏默认圆点；用于完全自定义外观，只复用交互/状态。
- `size?: number`
  - 说明：圆点外圈尺寸（宽高相同）。
- `borderWidth?: number`
  - 说明：圆点外圈边框宽度。
- `color?: string`
  - 说明：选中态主色（外圈边框色 + 内部实心点颜色）。
- `unCheckColor?: string`
  - 说明：未选中时边框色（浅色模式）。
- `darkUnCheckColor?: string`
  - 说明：未选中时边框色（暗色模式优先使用）。
- `indicatorStyle?: StyleProp<ViewStyle>`
  - 说明：仅作用于圆点外圈的样式（不影响整行布局）。

#### 自定义内容

- `children?: ReactNode | ((slot) => ReactNode)`
  - 说明：
    - 传入 `ReactNode`：纯展示内容
    - 传入函数：render-prop，可拿到状态与 `toggle()`
  - `slot` 结构：
    - `checked: boolean`
    - `itemValue?: string | number | boolean`
    - `disabled: boolean`
    - `toggle: () => void`

### RadioIndicator

Radio 内置的选中指示器（对外导出，便于替换内部内容）。

- `children?: ReactNode`
  - 说明：自定义内部“实心点”；不传时渲染默认圆点。
- `style?: StyleProp<ViewStyle>`
  - 说明：指示器容器样式。

### RadioGroup

RadioGroup 继承 React Native `View` 的所有 props，并额外提供以下 props：

- `value?: string | number | boolean | null`
  - 说明：受控选中值；传入后由外部完全接管选中项。
- `defaultValue?: string | number | boolean | null`
  - 默认值：`null`
  - 说明：非受控初始选中值（仅在未传 `value` 时生效）。
- `onValueChange?: (value: string | number | boolean | null) => void`
  - 说明：选中值变化回调。
- `disabled?: boolean`
  - 默认值：`false`
  - 说明：组禁用；组内所有 Radio 都会被禁用。
- `direction?: 'row' | 'column'`
  - 默认值：`'row'`
  - 说明：组内排列方向。
- `align?: 'left' | 'center' | 'right'`
  - 默认值：`'left'`
  - 说明：组内对齐方式。
- `gap?: number | string | [number | string, number | string]`
  - 默认值：`20`
  - 说明：排列间距。
  - 取值：
    - `number`：按 RN 数值像素解释
    - `string`：支持 `'12px'` / `'12'`
    - `[columnGap, rowGap]`：分别控制列/行间距

