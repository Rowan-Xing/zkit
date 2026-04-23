# WheelColumn

WheelColumn 是一个滚轮选择列组件，基于 `react-native-reanimated` 实现平滑的滚动动画效果。

> **注意**：这是一个内部组件，主要供 [Picker](../Picker/README.md) 使用，通常不需要直接使用。

## 基础用法

```tsx
import { WheelColumn, type WheelOption } from 'y2kit-ui';

const options: WheelOption[] = [
  { key: 1, label: '选项一' },
  { key: 2, label: '选项二' },
  { key: 3, label: '选项三' },
];

export function Demo() {
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  return (
    <WheelColumn
      data={options}
      selectedIndex={selectedIndex}
      onSelectedIndexChange={setSelectedIndex}
      width={120}
    />
  );
}
```

## 常量

```typescript
export const WHEEL_ITEM_HEIGHT = wp(44);  // 每项高度
export const WHEEL_VISIBLE_ITEMS = 5;     // 可见项数
```

## Types

### WheelOption

```typescript
type WheelOption = {
  key: string | number;  // 唯一标识
  label: string;         // 显示文本
};
```

### WheelColumnHandle

```typescript
type WheelColumnHandle = {
  scrollToIndex: (index: number, animated?: boolean) => void;
};
```

## Props

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| data | WheelOption[] | ✓ | - | 选项数据 |
| selectedIndex | number | ✓ | - | 当前选中索引 |
| onSelectedIndexChange | (index: number) => void | ✓ | - | 选中索引变更回调 |
| width | number | ✓ | - | 列宽度 |
| disabled | boolean | - | false | 是否禁用滚动 |

## Ref 方法

通过 `ref` 可以调用以下方法：

```tsx
const wheelRef = React.useRef<WheelColumnHandle>(null);

// 滚动到指定索引
wheelRef.current?.scrollToIndex(2, true);
