# AddressCascader

AddressCascader 是一个省/市/区（县）三级联动选择组件。

默认内置中国省市区数据（来自 `@vant/area-data` 的原始数据转换），也可以通过 `list` 自定义级联数据。

交互采用“步骤路径 + 单列列表”：用户先选省份，再进入城市，再进入区县。每一层都使用全宽列表展示，长地名最多两行显示，不再被三列滚轮挤压截断。

## 基础用法

```tsx
import { AddressCascader, Button } from 'zkit-ui';

export function Demo() {
  const [value, setValue] = React.useState(['110000', '110100', '110101']);
  const [label, setLabel] = React.useState('');

  return (
    <AddressCascader value={value} onValueChange={setValue} label={label} onLabelChange={setLabel}>
      {({ label }) => <Button>{label || '选择地址'}</Button>}
    </AddressCascader>
  );
}
```

## 自定义数据（list）

`list` 的数据结构沿用 Picker 的树结构：每个节点包含 `value/text/children`。

```tsx
import { AddressCascader, Button } from 'zkit-ui';

const list = [
  {
    value: 'p1',
    text: '省 A',
    children: [
      { value: 'c1', text: '市 A-1', children: [{ value: 'd1', text: '区 A-1-1' }] },
    ],
  },
];

export function Demo() {
  const [value, setValue] = React.useState(['p1', 'c1', 'd1']);

  return (
    <AddressCascader list={list} value={value} onValueChange={setValue}>
      {({ label }) => <Button>{label || '选择地址'}</Button>}
    </AddressCascader>
  );
}
```

## 长文本触发器

弹层内部会完整展示长地名。触发器由业务自己渲染，如果表单行空间较窄，可以用 `labels` 自己决定展示层级：

```tsx
<AddressCascader value={value} onValueChange={setValue}>
  {({ labels }) => (
    <Button>{labels.slice(-2).join(' / ') || '选择地址'}</Button>
  )}
</AddressCascader>
```

## Props

### 数据源

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| list | PickerTreeNode[] | - | 内置省市区数据 | 自定义级联数据，每个节点包含 `value/text/children` |

### 值与状态

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| value | string[] | - | - | 当前地址码数组（受控） |
| defaultValue | string[] | - | - | 非受控模式下的初始值 |
| onValueChange | (next: string[]) => void | - | - | 值变更回调 |

### 弹窗控制

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| open | boolean | - | - | 弹窗是否打开（受控） |
| defaultOpen | boolean | - | false | 非受控模式下弹窗初始状态 |
| onOpenChange | (next: boolean) => void | - | - | 弹窗状态变更回调 |

### 标签

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| label | string | - | - | 显示的标签文本（受控） |
| defaultLabel | string | - | '' | 非受控模式下的初始标签 |
| onLabelChange | (next: string) => void | - | - | 标签变更回调 |

### 配置

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| title | string | - | '选择地址' | 弹窗标题 |
| separator | string | - | ' / ' | 标签拼接分隔符 |
| levelLabels | string[] | - | ['省份', '城市', '区县'] | 步骤路径占位文案 |
| lazyContent | boolean | - | true | 是否仅在弹层打开期间渲染选择器内容 |
| drawerSize | string \| number | - | 自动计算 | 弹窗高度 |
| disabled | boolean | - | false | 是否禁用 |

### 事件

| 参数 | 类型 | 说明 |
|------|------|------|
| onCancel | () => void | 点击取消按钮时触发 |
| onConfirm | (payload: AddressCascaderConfirmPayload) => void | 点击确认按钮时触发 |
| onChange | (payload: AddressCascaderChangePayload) => void | 步骤路径选中项变更时触发 |

### 触发器

| 参数 | 类型 | 说明 |
|------|------|------|
| children | ReactNode \| ((ctx: AddressCascaderRenderContext) => ReactNode) | 触发器内容 |

## onConfirm / onChange Payload

```ts
type AddressCascaderConfirmPayload = {
  value: string[];
  values: string[];
  label: string;
  labels: string[];
  items: PickerTreeNode[];
};
```

`onChange` 会在步骤选择过程中触发，可能返回未完成的部分路径；`onConfirm` 只会在当前路径已经选到末级时触发。

```ts
type AddressCascaderRenderContext = {
  value: string[];
  label: string;
  labels: string[];
  items: PickerTreeNode[];
};
```
