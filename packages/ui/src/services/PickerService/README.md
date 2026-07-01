# PickerService

命令式调用选择器服务，支持通用选择器、日期选择器、地址选择器和时间区间选择器。

## 前置条件

确保应用根组件已包裹 `ZKitProvider`（已内置 `PickerServiceProvider`）：

```tsx
import { ZKitProvider } from 'zkit-ui';

export default function App() {
  return (
    <ZKitProvider>
      {/* 你的应用内容 */}
    </ZKitProvider>
  );
}
```

## 使用方式

```tsx
import { pickerService } from 'zkit-ui';
```

### 通用选择器

```tsx
const result = await pickerService.pick({
  options: [
    { value: 'zh', label: '中文' },
    { value: 'en', label: 'English' },
  ],
  value: 'zh',
  title: '选择语言',
});

if (result) {
  console.log(result.value);  // 'zh' | 'en'
  console.log(result.label);  // '中文' | 'English'
}
```

### 日期选择器

```tsx
const result = await pickerService.pickDate({
  value: '2024-01-15',
  title: '选择日期',
  min: '2020-01-01',
  max: '2030-12-31',
});

if (result) {
  console.log(result.value);  // '2024-01-15'
  console.log(result.label);  // '2024-01-15'
}
```

### 地址选择器

```tsx
const result = await pickerService.pickAddress({
  value: ['110000', '110100', '110101'],
  title: '选择地址',
});

if (result) {
  console.log(result.value);   // ['110000', '110100', '110101']
  console.log(result.label);   // '北京市-市辖区-东城区'
  console.log(result.labels);  // ['北京市', '市辖区', '东城区']
}
```

### 时间区间选择器

```tsx
const result = await pickerService.pickBetweenTime({
  value: ['2024-01-01', '2024-01-31'],
  title: '选择时间范围',
  type: 'day',
  quickDate: ['d', 'w', 'm', '7', '30'],
});

if (result) {
  console.log(result.value);  // ['2024-01-01', '2024-01-31']
}
```

## API

### pickerService.pick(options)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| options | PickerOption[] | ✓ | 选项列表，默认字段为 `value/label/children/disabled` |
| value | PickerValue | - | 当前值 |
| defaultValue | PickerValue | - | 默认值 |
| title | string | - | 标题 |
| valueMode | `'auto' \| 'single' \| 'path'` | - | 输出值模式 |
| getOptionValue | function | - | 自定义取值 |
| getOptionLabel | function | - | 自定义文案 |
| disabled | boolean | - | 是否禁用 |

返回 `Promise<PickerResult>`，取消时返回 `null`。

### pickerService.pickDate(options)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| value | string | - | 当前日期，格式 YYYY-MM-DD |
| defaultValue | string | - | 默认日期 |
| title | string | - | 标题 |
| precision | 'year' \| 'month' \| 'day' | - | 精度，默认 'day' |
| min | string \| Date \| Dayjs | - | 最小日期 |
| max | string \| Date \| Dayjs | - | 最大日期 |
| labelFormat | string \| function | - | 展示格式 |
| disabled | boolean | - | 是否禁用 |

返回 `Promise<DatePickerResult>`，取消时返回 `null`。

### pickerService.pickAddress(options)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| list | AddressCascaderOption[] | - | 自定义地址数据，默认使用内置省市区 |
| value | string[] | - | 当前地址码数组 |
| defaultValue | string[] | - | 默认地址码数组 |
| title | string | - | 标题 |
| separator | string | - | 分隔符，默认 '-' |
| disabled | boolean | - | 是否禁用 |

返回 `Promise<AddressPickerResult>`，取消时返回 `null`。

### pickerService.pickBetweenTime(options)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| value | string[] | - | 当前时间区间 [开始, 结束] |
| defaultValue | string[] | - | 默认时间区间 |
| title | string | - | 标题 |
| type | 'year' \| 'month' \| 'day' \| 'hour' \| 'minute' \| 'second' | - | 精度，默认 'day' |
| format | string | - | 显示格式，默认 'YYYY-MM-DD' |
| start | string | - | 最小时间 |
| end | string | - | 最大时间 |
| quickDate | string[] | - | 快捷选项：'d'今天/'w'本周/'m'本月/'y'本年/'q'本季度/数字表示最近N天 |
| disabled | boolean | - | 是否禁用 |

返回 `Promise<BetweenTimePickerResult>`，取消时返回 `null`。

### pickerService.close()

手动关闭当前打开的选择器。
