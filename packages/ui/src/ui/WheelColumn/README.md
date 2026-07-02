# WheelColumn

`WheelColumn` 是单列滚轮选择组件，适合组成 Picker、日期时间选择器，也可以独立用于少量选项的纵向滚轮选择。

组件使用 `value / defaultValue / onChange` 状态模型：`onChange` 只在滚轮稳定停靠后触发，不会在滚动经过每一项时连续提交业务值。

## 设计

- iOS 使用原生 `UIPickerView`，保留系统惯性、停靠和无障碍行为。
- Android 使用自绘滚轮路径，核心动画只维护整列一个 `translateY` shared value，减少多列同时滚动时的重渲染和 JS 抖动。
- Web 复用自绘路径，至少保证拖拽、键盘无障碍动作和视觉停靠语义一致。
- 禁用选项不会被用户滚动最终选中；如果外部受控值指向禁用项，组件会展示该值，但用户下一次交互会停靠到最近可用项。

## 基础用法

```tsx
import { WheelColumn, type WheelColumnOption } from 'zkit-ui/wheel-column';
import { wp } from 'zkit-tools';

const options: WheelColumnOption[] = [
  { value: 1, label: '选项一' },
  { value: 2, label: '选项二' },
  { value: 3, label: '选项三', disabled: true },
];

export function Demo() {
  const [value, setValue] = React.useState<number | null>(1);

  return (
    <WheelColumn
      options={options}
      value={value}
      onChange={(payload) => setValue(payload.value)}
      width={wp(120)}
      accessibilityLabel="选择选项"
    />
  );
}
```

## Props

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| options | `WheelColumnOption[]` | 必填 | 选项数据 |
| value | `string \| number \| null` | - | 受控值 |
| defaultValue | `string \| number \| null` | 首个可用项 | 非受控初始值 |
| onChange | `(payload) => void` | - | 停靠到新可用项后触发 |
| disabled | `boolean` | `false` | 禁用整列交互 |
| width | `number` | - | 列宽；也可以通过 `style` 控制 |
| style | `StyleProp<ViewStyle>` | - | 根节点样式 |
| itemTextStyle | `StyleProp<TextStyle>` | - | 选项文字样式 |
| selectedItemTextStyle | `StyleProp<TextStyle>` | - | 当前项文字样式 |
| disabledItemTextStyle | `StyleProp<TextStyle>` | - | 禁用项文字样式 |
| numberOfLines | `number` | `1` | 单项文本行数 |

`WheelColumn` 还会透传常用 `ViewProps`，但不接收 `children`。

## Types

```ts
type WheelColumnValue = string | number;

type WheelColumnOption<TValue extends WheelColumnValue = WheelColumnValue> = {
  value: TValue;
  label: string;
  disabled?: boolean;
  key?: React.Key;
  testID?: string;
  accessibilityLabel?: string;
};

type WheelColumnChangePayload<TValue extends WheelColumnValue = WheelColumnValue> = {
  value: TValue;
  index: number;
  option: WheelColumnOption<TValue>;
  source: 'user' | 'accessibility';
};
```

## Ref

```tsx
const ref = React.useRef<WheelColumnHandle>(null);

ref.current?.scrollToIndex(2, true);
ref.current?.scrollToValue(2026, true);
const index = ref.current?.settleToNearest(false);
const syncedIndex = await ref.current?.syncCurrentSelection();
```

`syncCurrentSelection()` 主要给弹层确认按钮使用：当 iOS 原生滚轮仍在减速时，它会主动读取当前中心项，避免提交值和视觉停靠项错位。

## 常量

```ts
export const WHEEL_VISIBLE_ITEMS = 5;
export const WHEEL_ITEM_HEIGHT: number;
export const WHEEL_VIEWPORT_HEIGHT: number;
export const WHEEL_AREA_HEIGHT: number;
export const WHEEL_AREA_VERTICAL_INSET: number;
```

`Picker`、`BetweenTime` 等复合组件会使用这些常量对齐高亮区和上下渐隐遮罩。
