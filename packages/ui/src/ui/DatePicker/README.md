# DatePicker

DatePicker 是日期语义组件，底层复用 Picker 的三端滚轮与 Sheet 生命周期，但公共 API 不暴露滚轮细节。它支持空值、受控/非受控值、受控/非受控弹层、年/月/日精度、边界限制、提交事件和草稿事件。

## 设计取舍

- `value/defaultValue/onChange` 表示已提交日期；滚轮移动使用 `onDraftChange`，避免把临时草稿误当成表单值。
- `value={null}` 表示受控空值；未提供 `defaultValue` 时组件默认不选中日期，打开后定位到 `defaultPickerValue` 或今天。
- `min/max` 使用日期语义边界；`max="2026-02"` 表示可选到 2026 年 2 月末。
- 输出值始终跟随 `precision`：`year => YYYY`、`month => YYYY-MM`、`day => YYYY-MM-DD`。

## 基础用法

```tsx
import * as React from 'react';
import { Button, DatePicker } from 'zkit-ui';

export function Demo() {
  const [value, setValue] = React.useState<string | null>(null);

  return (
    <DatePicker value={value} onChange={setValue}>
      {({ label, placeholder }) => (
        <Button>{label || placeholder}</Button>
      )}
    </DatePicker>
  );
}
```

## 限制范围

```tsx
<DatePicker
  value={value}
  onChange={setValue}
  min="2020-01-01"
  max="2035-12-31"
/>
```

## 月份选择

```tsx
<DatePicker
  precision="month"
  value="2026-04"
  min="2020-01"
  max="2035-12"
  labelFormat="YYYY 年 MM 月"
  onChange={(next) => {
    // next: '2026-04'
  }}
/>
```

## 禁用部分日期

```tsx
<DatePicker
  min="2026-01-01"
  max="2026-12-31"
  isDateDisabled={(date) => date.day() === 0 || date.day() === 6}
  onChange={(next, selection) => {
    console.log(next, selection.date);
  }}
/>
```

## Props

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| value | `string \| null` | - | 受控已提交值；`null` 表示空值 |
| defaultValue | `string \| null` | `null` | 非受控初始已提交值 |
| onChange | `(value, payload) => void` | - | 用户确认后触发 |
| open | `boolean` | - | 受控弹层开关 |
| defaultOpen | `boolean` | `false` | 非受控初始弹层状态 |
| onOpenChange | `(open: boolean) => void` | - | 弹层开关变化 |
| precision | `'year' \| 'month' \| 'day'` | `'day'` | 选择精度与输出格式 |
| min | `string \| Date \| Dayjs` | `1900-01-01` | 最小可选日期 |
| max | `string \| Date \| Dayjs` | `2100-12-31` | 最大可选日期 |
| defaultPickerValue | `string \| Date \| Dayjs` | 今天 | 空值打开时滚轮定位 |
| isDateDisabled | `(date, context) => boolean` | - | 禁用某个可选日期、月份或年份 |
| title | `string` | i18n | 弹层标题 |
| placeholder | `string` | i18n | 空值触发器占位文本 |
| cancelText / confirmText / emptyText | `string` | i18n | 弹层文案 |
| labelFormat | `string \| (selection) => string` | 同 `value` | 触发器和 payload 的展示文案 |
| columnLabels | `Partial<Record<'year' \| 'month' \| 'day', string>>` | i18n | 列头文案 |
| renderColumnHeader | `(context) => ReactNode` | - | 自定义列头 |
| lazyContent | `boolean` | `true` | 延迟挂载滚轮内容 |
| sheetHeight | `number \| 'auto'` | `'auto'` | 弹层高度 |
| disabled | `boolean` | `false` | 禁用打开和交互 |
| onCancel | `() => void` | - | 取消事件 |
| onConfirm | `(payload) => void` | - | 确认事件 |
| onDraftChange | `(payload) => void` | - | 滚轮草稿变化事件 |
| children | `ReactNode \| (context) => ReactNode` | - | 触发器 |

## Payload

```ts
type DatePickerSelection = {
  value: string;
  date: Dayjs;
  precision: 'year' | 'month' | 'day';
  parts: { year: number; month?: number; day?: number };
  values: number[];
  label: string;
  labels: string[];
  items: DatePickerOption[];
  columns: DatePickerOption[][];
  indices: number[];
  isComplete: boolean;
};
```

`date` 会归一到当前精度的起点：年为 1 月 1 日，月为 1 日，日为当天零点。
