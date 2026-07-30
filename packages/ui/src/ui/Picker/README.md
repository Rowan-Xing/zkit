# Picker

`Picker` 是底部弹出的滚轮选择器，负责普通单列选择和树形级联选择。它的核心语义是：

- `value/defaultValue/onChange` 表示“已确认值”，只在点击确认后提交。
- 打开弹层后使用内部 draft，滚轮滚动不会污染外部表单值。
- 需要实时联动时监听 `onDraftChange`。
- 默认数据结构是 `{ value, label, children, disabled }`，其它数据结构用 accessor 适配。

## 基础用法

```tsx
import * as React from 'react';
import { Text } from 'zkit-ui/text';
import { Picker } from 'zkit-ui/picker';

const options = [
  { value: 'design', label: 'Design' },
  { value: 'motion', label: 'Motion' },
  { value: 'release', label: 'Release' },
];

export function Demo() {
  const [value, setValue] = React.useState<string | number>();

  return (
    <Picker
      options={options}
      value={value}
      valueMode="single"
      onChange={(next) => setValue(Array.isArray(next) ? next[0] : next)}
      placeholder="请选择"
    >
      {({ label, placeholder }) => <Text>{label || placeholder}</Text>}
    </Picker>
  );
}
```

## 级联选择

```tsx
const options = [
  {
    value: 'zj',
    label: '浙江省',
    children: [
      { value: 'hz', label: '杭州市' },
      { value: 'nb', label: '宁波市' },
    ],
  },
  {
    value: 'js',
    label: '江苏省',
    children: [
      { value: 'nj', label: '南京市' },
      { value: 'sz', label: '苏州市' },
    ],
  },
];

export function Demo() {
  const [value, setValue] = React.useState<string[]>();

  return (
    <Picker
      options={options}
      value={value}
      valueMode="path"
      separator=" / "
      onChange={(next) => setValue(Array.isArray(next) ? next.map(String) : [String(next)])}
    >
      {({ label }) => <Text>{label || '选择地区'}</Text>}
    </Picker>
  );
}
```

## 适配外部数据

主 API 不再暴露 `valueKey/labelKey` 这类字符串配置。外部数据字段不一致时，用 accessor 明确适配：

```tsx
const rawOptions = [
  { id: 1, title: '选项一' },
  { id: 2, title: '选项二', children: [{ id: 21, title: '子项' }] },
];

<Picker
  options={rawOptions}
  getOptionValue={(item) => item.id}
  getOptionLabel={(item) => item.title}
  getOptionChildren={(item) => item.children}
/>;
```

## 自定义列标题

```tsx
<Picker
  options={options}
  renderColumnHeader={({ columnIndex }) => (
    <Text>{['省份', '城市', '区县'][columnIndex]}</Text>
  )}
/>;
```

## 命令式打开

```tsx
const ref = React.useRef<PickerHandle>(null);

<Picker ref={ref} options={options} />;

ref.current?.open();
ref.current?.close();
```

## Types

```ts
type PickerPrimitiveValue = string | number;
type PickerValue = PickerPrimitiveValue | PickerPrimitiveValue[];
type PickerValueMode = 'auto' | 'single' | 'path';

type PickerOption = {
  value: PickerPrimitiveValue;
  label: string;
  disabled?: boolean;
  children?: PickerOption[];
  key?: React.Key;
  testID?: string;
  accessibilityLabel?: string;
};

type PickerSelection<TOption = PickerOption> = {
  value: PickerValue;
  values: PickerPrimitiveValue[];
  label: string;
  labels: string[];
  items: TOption[];
  columns: TOption[][];
  indices: number[];
  isComplete: boolean;
};
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `options` | `readonly TOption[]` | required | 数据源，默认读取 `value/label/children/disabled` |
| `value` | `PickerValue` | - | 受控的已确认值 |
| `defaultValue` | `PickerValue` | - | 非受控初始值 |
| `onChange` | `(value, selection) => void` | - | 点击确认后提交已确认值 |
| `valueMode` | `'auto' \| 'single' \| 'path'` | `'auto'` | 输出单值还是路径数组；级联建议显式用 `path` |
| `open` | `boolean` | - | 受控打开状态 |
| `defaultOpen` | `boolean` | `false` | 非受控初始打开状态 |
| `onOpenChange` | `(open: boolean) => void` | - | 打开状态变化 |
| `onDismissComplete` | `() => void` | - | Sheet 完全关闭后触发 |
| `title` | `string` | i18n `picker.title` | 弹层标题 |
| `placeholder` | `string` | `''` | 无已确认值时给 trigger 使用 |
| `cancelText` | `string` | i18n `picker.cancel` | 取消按钮文案 |
| `confirmText` | `string` | i18n `picker.confirm` | 确认按钮文案 |
| `emptyText` | `string` | i18n `picker.empty` | 空数据文案 |
| `separator` | `string` | `'-'` | 多列 label 拼接分隔符 |
| `formatLabel` | `(selection) => string` | - | 自定义最终 label |
| `renderColumnHeader` | `(context) => ReactNode` | - | 自定义列标题 |
| `maxColumns` | `number` | `5` | 最多渲染列数，内部限制 1-8 |
| `lazyContent` | `boolean` | `true` | 打开时再挂载滚轮内容，关闭后卸载 |
| `sheetHeight` | `number \| 'auto'` | `'auto'` | 底部弹层高度；数字按 RN dp 解释 |
| `disabled` | `boolean` | `false` | 禁用打开、滚动和按钮 |
| `onCancel` | `() => void` | - | 取消或点背景关闭时触发 |
| `onConfirm` | `(selection) => void` | - | 点击确认后触发，晚于 `onChange` |
| `onDraftChange` | `(selection) => void` | - | 滚轮草稿变化时触发，不提交外部值 |
| `children` | `ReactNode \| (context) => ReactNode` | - | 触发器内容 |

Accessor props:

| Prop | Type |
| --- | --- |
| `getOptionValue` | `(option, index, path) => PickerPrimitiveValue \| undefined` |
| `getOptionLabel` | `(option, index, path) => string \| number \| undefined` |
| `getOptionChildren` | `(option, index, path) => readonly TOption[] \| undefined` |
| `isOptionDisabled` | `(option, index, path) => boolean` |

## 设计取舍

- `label/defaultLabel/onLabelChange` 不再作为 Picker 状态。label 是由已确认 `value + options` 推导出的展示结果，业务需要自定义显示时使用 `formatLabel` 或 trigger render context。
- `onChange` 表示最终表单值变化，和 TextInput、Radio、CheckboxGroup 的状态事件保持一致。
- iOS 保留原生 `UIPickerView`，Android 使用原生虚拟化滚动，Web 使用自绘 wheel。Picker 层只处理级联状态和弹层生命周期，不把额外 JS 工作塞进滚轮关键帧。
