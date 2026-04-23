# Picker

Picker 是一个高性能的级联选择器组件：

- 支持单列/多列级联选择（最多 3 列）
- 交互与过渡动画基于 `react-native-reanimated`
- 支持受控/非受控模式
- 支持自定义触发器（children）

## 基础用法

```tsx
import { Picker } from 'y2kit-ui';
import * as React from 'react';

const list = [
  { id: 1, title: '选项一' },
  { id: 2, title: '选项二' },
  { id: 3, title: '选项三' },
];

export function Demo() {
  const [value, setValue] = React.useState<number>();
  return (
    <Picker list={list} value={value} onValueChange={setValue}>
      <Text>{value ?? '请选择'}</Text>
    </Picker>
  );
}
```

## 级联选择

```tsx
import { Picker } from 'y2kit-ui';

const cascadeList = [
  {
    id: 1,
    title: '浙江省',
    children: [
      { id: 11, title: '杭州市' },
      { id: 12, title: '宁波市' },
    ],
  },
  {
    id: 2,
    title: '江苏省',
    children: [
      { id: 21, title: '南京市' },
      { id: 22, title: '苏州市' },
    ],
  },
];

export function Demo() {
  const [value, setValue] = React.useState<number[]>([]);
  return (
    <Picker list={cascadeList} value={value} onValueChange={setValue}>
      <Text>选择地区</Text>
    </Picker>
  );
}
```

## 自定义触发器

```tsx
import { Picker, Button } from 'y2kit-ui';

export function Demo() {
  return (
    <Picker list={list}>
      {({ label, value }) => (
        <Button>{label || '请选择'}</Button>
      )}
    </Picker>
  );
}
```

## 自定义列标题

```tsx
import { Picker, Text } from 'y2kit-ui';

export function Demo() {
  return (
    <Picker
      list={cascadeList}
      renderColumnHeader={(columnIndex, columnCount) => (
        <Text>{['省份', '城市', '区县'][columnIndex]}</Text>
      )}
    >
      <Text>选择地区</Text>
    </Picker>
  );
}
```

## 禁用状态

```tsx
import { Picker } from 'y2kit-ui';

export function Demo() {
  return (
    <Picker list={list} disabled>
      <Text>已禁用</Text>
    </Picker>
  );
}
```

## 禁用某个选项

```tsx
import { Picker } from 'y2kit-ui';

const list = [
  { id: 1, title: '选项一' },
  { id: 2, title: '选项二', disabled: true },
  { id: 3, title: '选项三' },
];

export function Demo() {
  return (
    <Picker list={list}>
      <Text>请选择</Text>
    </Picker>
  );
}
```

## Types

### PickerTreeNode

选项节点类型定义：

```typescript
type PickerTreeNode = {
  [key: string]: any;      // 支持任意字段
  disabled?: boolean;      // 是否禁用该选项
  children?: PickerTreeNode[]; // 子级选项（用于级联）
};
```

### PickerModelValue

值类型定义：

```typescript
type Primitive = string | number;
type PickerModelValue = Primitive | Primitive[];
```

- 单列选择时，值为 `string | number`
- 多列级联选择时，值为 `(string | number)[]`

### PickerConfirmPayload / PickerChangePayload

事件回调参数类型：

```typescript
type PickerConfirmPayload = {
  value: PickerModelValue;    // 当前选中值
  values: Primitive[];        // 各列选中值数组
  label: string;              // 拼接后的标签文本
  labels: string[];           // 各列标签数组
  items: PickerTreeNode[];    // 各列选中的节点对象
};

type PickerChangePayload = PickerConfirmPayload;
```

## Props

### 数据源

- `list: PickerTreeNode[]`
  - **必填**
  - 说明：选项数据源，支持树形结构（通过 `children` 字段实现级联）。

### 值与状态

- `value?: PickerModelValue`
  - 默认值：`undefined`
  - 说明：当前选中值（受控模式）。单列时为 `string | number`，多列时为数组。
- `defaultValue?: PickerModelValue`
  - 默认值：`undefined`
  - 说明：非受控模式下的初始值。
- `onValueChange?: (next: PickerModelValue) => void`
  - 说明：值变更回调（受控模式下用于更新 `value`）。

### 弹窗控制

- `open?: boolean`
  - 默认值：`undefined`
  - 说明：弹窗是否打开（受控模式）。
- `defaultOpen?: boolean`
  - 默认值：`false`
  - 说明：非受控模式下弹窗的初始状态。
- `onOpenChange?: (next: boolean) => void`
  - 说明：弹窗状态变更回调。

### 标签

- `label?: string`
  - 默认值：`undefined`
  - 说明：显示的标签文本（受控模式）。
- `defaultLabel?: string`
  - 默认值：`''`
  - 说明：非受控模式下的初始标签。
- `onLabelChange?: (next: string) => void`
  - 说明：标签变更回调。

### 配置

- `title?: string`
  - 默认值：`'请选择'`
  - 说明：弹窗标题。
- `rangKey?: string`
  - 默认值：`'id'`
  - 说明：选项值的字段名。从 `PickerTreeNode` 中取值时使用此字段。
- `rangText?: string`
  - 默认值：`'title'`
  - 说明：选项显示文本的字段名。从 `PickerTreeNode` 中取文本时使用此字段。
- `modelStrSeparator?: string`
  - 默认值：`'-'`
  - 说明：多列标签拼接时的分隔符。例如 `'浙江省-杭州市'`。
- `renderColumnHeader?: (columnIndex: number, columnCount: number) => React.ReactNode`
  - 默认值：`undefined`
  - 说明：自定义列标题渲染函数。
  - 参数：
    - `columnIndex`：当前列索引（从 0 开始）
    - `columnCount`：总列数
- `lazyContent?: boolean`
  - 默认值：`true`
  - 说明：是否延迟渲染选择器内容。开启时，弹窗首次打开才渲染滚轮。
- `drawerSize?: string | number`
  - 默认值：`undefined`（自动计算）
  - 说明：弹窗高度。
  - 取值：
    - `number`：按像素解释
    - `string`：支持 `'400'` 或 `'400px'`
- `disabled?: boolean`
  - 默认值：`false`
  - 说明：是否禁用整个选择器。禁用后无法打开弹窗。

### 事件

- `onCancel?: () => void`
  - 说明：点击取消按钮时触发。
- `onConfirm?: (payload: PickerConfirmPayload) => void`
  - 说明：点击确认按钮时触发。
  - 参数：`payload` 包含 `value`、`values`、`label`、`labels`、`items`。
- `onChange?: (payload: PickerChangePayload) => void`
  - 说明：滚轮滚动选中项变更时触发（确认前的实时变更）。
  - 参数：`payload` 包含 `value`、`values`、`label`、`labels`、`items`。

### 触发器

- `children?: React.ReactNode | ((ctx: { label: string; value: PickerModelValue }) => React.ReactNode)`
  - 说明：触发器内容。
  - 取值：
    - `React.ReactNode`：直接渲染，点击时打开弹窗
    - `函数`：接收 `{ label, value }` 上下文，返回渲染内容

## 完整示例

```tsx
import { Picker, Text, Button } from 'y2kit-ui';
import * as React from 'react';

const provinceList = [
  {
    id: 'zj',
    title: '浙江省',
    children: [
      {
        id: 'hz',
        title: '杭州市',
        children: [
          { id: 'xs', title: '西湖区' },
          { id: 'sc', title: '上城区' },
        ],
      },
      {
        id: 'nb',
        title: '宁波市',
        children: [
          { id: 'hq', title: '海曙区' },
          { id: 'jb', title: '江北区' },
        ],
      },
    ],
  },
  {
    id: 'js',
    title: '江苏省',
    children: [
      {
        id: 'nj',
        title: '南京市',
        children: [
          { id: 'xw', title: '玄武区' },
          { id: 'qh', title: '秦淮区' },
        ],
      },
    ],
  },
];

export function AddressPickerDemo() {
  const [value, setValue] = React.useState<string[]>([]);
  const [label, setLabel] = React.useState('');

  return (
    <Picker
      list={provinceList}
      value={value}
      onValueChange={setValue}
      label={label}
      onLabelChange={setLabel}
      title="选择地区"
      rangKey="id"
      rangText="title"
      modelStrSeparator=" / "
      renderColumnHeader={(idx) => (
        <Text style={{ fontWeight: '600' }}>
          {['省份', '城市', '区县'][idx]}
        </Text>
      )}
      onConfirm={(payload) => {
        console.log('确认选择:', payload);
      }}
      onChange={(payload) => {
        console.log('滚动变更:', payload);
      }}
      onCancel={() => {
        console.log('取消选择');
      }}
    >
      {({ label }) => (
        <Button skin="thin">{label || '请选择地区'}</Button>
      )}
    </Picker>
  );
}
