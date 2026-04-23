# DatePicker

DatePicker 是一个“年月日”选择组件，基于 [Picker](src/ui/Picker/index.tsx) 封装，默认输出标准日期字符串 `YYYY-MM-DD`。

## 基础用法

```tsx
import { DatePicker, Button } from 'y2kit-ui';

export function Demo() {
  const [value, setValue] = React.useState('2026-01-12');
  const [label, setLabel] = React.useState('');

  return (
    <DatePicker value={value} onValueChange={setValue} label={label} onLabelChange={setLabel}>
      {({ label }) => <Button>{label || '选择日期'}</Button>}
    </DatePicker>
  );
}
```

## 限制可选范围（start / end）

```tsx
import { DatePicker, Button } from 'y2kit-ui';

export function Demo() {
  const [value, setValue] = React.useState('2026-01-12');

  return (
    <DatePicker value={value} onValueChange={setValue} start="2020-01-01" end="2035-12-31">
      {({ label }) => <Button>{label || '选择日期'}</Button>}
    </DatePicker>
  );
}
```

说明：

- `start/end` 需要是“标准日期格式”的字符串；不合法会直接抛错（fail-fast）
- 支持格式：`YYYY`、`YYYY-MM`、`YYYY-MM-DD`（也兼容 `YYYY-M`、`YYYY-M-D`）

## Props

### 值与状态

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| value | string | - | - | 当前日期值（受控），格式 `YYYY-MM-DD` |
| defaultValue | string | - | 当天日期 | 非受控模式下的初始值 |
| onValueChange | (next: string) => void | - | - | 值变更回调 |

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
| title | string | - | '选择日期' | 弹窗标题 |
| separator | string | - | '-' | 标签拼接分隔符 |
| start | string | - | - | 可选范围最小日期，格式 `YYYY`/`YYYY-MM`/`YYYY-MM-DD` |
| end | string | - | - | 可选范围最大日期，格式同上 |
| lazyContent | boolean | - | true | 是否延迟渲染选择器内容 |
| drawerSize | string \| number | - | 自动计算 | 弹窗高度 |
| disabled | boolean | - | false | 是否禁用 |

### 事件

| 参数 | 类型 | 说明 |
|------|------|------|
| onCancel | () => void | 点击取消按钮时触发 |
| onConfirm | (payload: DatePickerConfirmPayload) => void | 点击确认按钮时触发 |
| onChange | (payload: DatePickerChangePayload) => void | 滚轮滚动选中项变更时触发 |

### 触发器

| 参数 | 类型 | 说明 |
|------|------|------|
| children | ReactNode \| ((ctx: { label: string; value: string }) => ReactNode) | 触发器内容 |

## onConfirm / onChange Payload

```ts
type DatePickerConfirmPayload = {
  value: string; // YYYY-MM-DD
  values: string[]; // ['YYYY','MM','DD']
  label: string; // 'YYYY-MM-DD'（受 separator 影响）
  labels: string[]; // ['YYYY','MM','DD']
  items: PickerTreeNode[];
  date: Dayjs; // dayjs('YYYY-MM-DD')
};
```
