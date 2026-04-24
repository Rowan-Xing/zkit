# Checkbox

Checkbox 提供两种用法：

1) 单个复选框：`checked/defaultChecked` + `onChange/onCheckedChange`
2) 复选框组：`CheckboxGroup` 管理选中值数组，单个 `Checkbox` 通过 `value` 参与组内选择

## 单个 Checkbox（最常用）

```tsx
import { Checkbox } from 'y2kit-ui';

export function Demo() {
  const [checked, setChecked] = React.useState(false);

  return (
    <Checkbox
      label="我已阅读并同意"
      checked={checked}
      onChange={setChecked}
      shape="circle"
    />
  );
}
```

## 半选 indeterminate（全选场景）

```tsx
import { Checkbox } from 'y2kit-ui';

export function Demo() {
  return <Checkbox label="全部" indeterminate />;
}
```

`onCheckedChange` 使用三态类型：`false | true | 'indeterminate'`。  
用户点击半选态时会切换到 `true`；`onChange` 只会收到二态：`false | true`。

## CheckboxGroup（选中集合）

```tsx
import { Checkbox, CheckboxGroup } from 'y2kit-ui';

const list = [
  { id: '1', label: '苹果' },
  { id: '2', label: '香蕉' },
  { id: '3', label: '豆腐' },
];

export function Demo() {
  const [values, setValues] = React.useState(['2']);

  return (
    <CheckboxGroup value={values} onValueChange={setValues} direction="column" gap={12}>
      {list.map((it) => (
        <Checkbox key={it.id} value={it.id} label={it.label} />
      ))}
    </CheckboxGroup>
  );
}
```

## 自定义内容（slot / render-prop）

当你需要根据选中态切换样式、或需要拿到 `toggle()` 做更复杂的组合时，使用函数 children：

```tsx
import { Checkbox } from 'y2kit-ui';

export function Demo() {
  return (
    <Checkbox hiddenCheckbox>
      {({ checked, toggle }) => (
        <YourRow onPress={toggle} selected={checked}>
          <Checkbox checked={checked} onCheckedChange={() => {}} />
          <YourText>点击整行切换</YourText>
        </YourRow>
      )}
    </Checkbox>
  );
}
```

## 常用 Props

- `checked` / `defaultChecked`：受控/非受控
- `onChange(checked:boolean)`：二态回调
- `onCheckedChange(checked:boolean|'indeterminate')`：三态回调
- `indeterminate`：强制半选态
- `color`：选中态主色（背景/边框）
- `unCheckColor`：未选中边框色
- `icon`：自定义选中图标（默认使用组件库内置 `check.svg`）
- `size` / `borderWidth` / `radius` / `shape`：尺寸与形状
- `label` / `labelSpace`：快捷文案与间距
- `hiddenCheckbox`：隐藏方块，仅复用交互/状态

## Props（完整清单）

Checkbox 继承 React Native `Pressable` 的所有 props，并额外提供以下扩展 props。  
注意：为了保证交互与动画一致，Checkbox 不支持传入 `Pressable` 的 `onPressIn/onPressOut`（已在类型层面剔除），并将 `style/children` 作为自定义 props 重新定义。

### Checkbox

- `value?: string | number`
  - 默认：`undefined`
  - 说明：配合 `CheckboxGroup` 使用的唯一值；同组内不可重复。组内勾选由 `value` 决定。

- `checked?: boolean | 'indeterminate'`
  - 默认：`undefined`
  - 说明：受控选中态。传入后组件不再维护内部选中状态。
  - 取值：
    - `false`：未选中
    - `true`：选中
    - `'indeterminate'`：半选（mixed）

- `defaultChecked?: boolean | 'indeterminate'`
  - 默认：`false`
  - 说明：非受控初始化值；仅在 `checked` 未传入时生效。

- `onCheckedChange?: (checked: boolean | 'indeterminate') => void`
  - 默认：`undefined`
  - 说明：三态回调；用于需要区分 `indeterminate` 的场景。

- `onChange?: (checked: boolean) => void`
  - 默认：`undefined`
  - 说明：二态回调；适合普通勾选场景。

- `disabled?: boolean`
  - 默认：`false`
  - 说明：禁用交互；在 `CheckboxGroup` 内会与 group 的 `disabled` 叠加。

- `label?: string`
  - 默认：`undefined`
  - 说明：快捷文案；当 `children` 未提供时渲染。

- `children?: ReactNode | ((slot) => ReactNode)`
  - 默认：`undefined`
  - 说明：自定义内容：
    - 传入 `ReactNode`：纯展示内容
    - 传入函数：render-prop（slot）模式，可拿到状态与 `toggle()`
  - `slot` 结构：
    - `checked: boolean`：当前是否选中（当为半选时为 `false`）
    - `indeterminate: boolean`：当前是否半选
    - `value?: string | number`
    - `disabled: boolean`
    - `toggle: () => void`：手动切换（等价于点击 Checkbox）

- `style?: StyleProp<ViewStyle>`
  - 默认：`undefined`
  - 说明：外层布局样式（作用于整行容器）。

- `boxStyle?: StyleProp<ViewStyle>`
  - 默认：`undefined`
  - 说明：仅作用于“方块/圆形勾选区”的样式，不影响外层布局。

- `labelSpace?: number`
  - 默认：`wp(10)`
  - 说明：方块与 label 之间的间距（仅当同时渲染方块与 label 时生效）。

- `hiddenCheckbox?: boolean`
  - 默认：`false`
  - 说明：隐藏方块区域，仅复用交互/状态；你可以在 `children(slot)` 里完全自定义 UI。

- `icon?: ReactNode | string`
  - 默认：内置 `check.svg`
  - 说明：自定义选中图标节点。传入字符串不会被解析为图标名，会回退到默认图标。

- `unCheckColor?: string`
  - 默认：`theme.colors.border`
  - 说明：未选中时的边框色。

- `indeterminate?: boolean`
  - 默认：`undefined`
  - 说明：强制半选态（mixed）。传入后会覆盖 `checked/defaultChecked` 的结果。

- `duration?: number`
  - 默认：`180`
  - 说明：动画时长（ms），用于按压/勾选/半选的过渡。

- `size?: number`
  - 默认：`wp(20)`
  - 说明：方块区域的边长。

- `borderWidth?: number`
  - 默认：`wp(1.5)`
  - 说明：方块区域边框宽度。

- `radius?: number`
  - 默认：
    - `shape === 'circle'`：`size / 2`
    - 否则：`wp(4)`
  - 说明：方块区域圆角半径；传入后会覆盖 `shape` 的默认逻辑。

- `color?: string`
  - 默认：`theme.colors.primary`
  - 说明：选中态主色（背景/边框）。

- `shape?: 'square' | 'circle'`
  - 默认：`'square'`
  - 说明：方块区域形状。
  - 取值：
    - `'square'`：方形
    - `'circle'`：圆形

- `testID?: string`
  - 默认：`undefined`
  - 说明：测试标识。

### CheckboxIndicator

Checkbox 内置的勾选指示器（对外导出，便于替换内部内容）。

- `children?: ReactNode`
  - 默认：`undefined`
  - 说明：自定义指示器内容；不传时使用 Checkbox 的 `icon`（默认 check.svg）。

- `style?: StyleProp<ViewStyle>`
  - 默认：`undefined`
  - 说明：指示器容器样式。

### CheckboxGroup

CheckboxGroup 继承 React Native `View` 的所有 props，并额外提供以下 props：

- `value?: Array<string | number>`
  - 默认：`undefined`
  - 说明：受控选中值数组；传入后由外部完全接管选中集合。

- `defaultValue?: Array<string | number>`
  - 默认：`[]`
  - 说明：非受控初始化选中值数组；仅在 `value` 未传入时生效。

- `onValueChange?: (value: Array<string | number>) => void`
  - 默认：`undefined`
  - 说明：选中集合变化回调（推荐使用）。

- `disabled?: boolean`
  - 默认：`false`
  - 说明：组禁用；组内所有 Checkbox 会被禁用。

- `direction?: 'row' | 'column'`
  - 默认：`'row'`
  - 说明：组内布局方向。

- `align?: 'left' | 'center' | 'right'`
  - 默认：`'left'`
  - 说明：组内容对齐方式。

- `gap?: number | string | [number | string, number | string]`
  - 默认：`0`
  - 说明：组内间距；数组时分别表示 `columnGap` 与 `rowGap`。
