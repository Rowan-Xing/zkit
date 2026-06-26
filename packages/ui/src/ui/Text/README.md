# Text

`Text` 是 zkit 的统一文字原语。它集中处理排版 token、主题色、字体缩放、截断和跨端字重差异，让业务和公共组件都走同一套文字规则。

## 设计取舍

- `Text` 是无状态组件，没有受控/非受控语义。
- `variant` 表达排版语义，`tone` 表达颜色意图，`style` 只作为最终 escape hatch。
- 内置字号和行高按设计像素声明，组件内部统一通过 `wp(...)` 计算。
- 默认使用 `getMaxFontSizeMultiplier()` 限制字体缩放上限，单次可用 `maxFontSizeMultiplier` 覆盖。
- Android 默认关闭 `includeFontPadding`，用明确 lineHeight 保证 iOS / Android / Web 视觉高度更一致。
- `color` 支持主题 token、语义色 token 和原生可解析颜色；无效颜色会回落到 `tone`。
- 屏幕宽度变化时会重新计算排版尺寸，横竖屏和分屏场景不会卡在初始化尺寸。

## 基础用法

```tsx
import { Text } from 'zkit-ui';

export function Demo() {
  return <Text>默认正文</Text>;
}
```

默认等价于：

- `variant="body"`
- `tone="default"`
- `size="md"`
- `weight="regular"`
- `maxFontSizeMultiplier={getMaxFontSizeMultiplier()}`

## 排版语义

```tsx
import { Text } from 'zkit-ui';

export function Demo() {
  return (
    <>
      <Text variant="display">页面主标题</Text>
      <Text variant="heading">分区标题</Text>
      <Text variant="title">列表标题</Text>
      <Text variant="body">正文内容</Text>
      <Text variant="label">表单标签</Text>
      <Text variant="caption" tone="muted">
        辅助说明
      </Text>
      <Text variant="code">const ready = true;</Text>
    </>
  );
}
```

`variant` 只决定默认 `size / weight / fontFamily`，显式传入 `size`、`weight` 或 `style` 时会覆盖对应值。

## 尺寸

```tsx
<>
  <Text size="2xs">2xs</Text>
  <Text size="xs">xs</Text>
  <Text size="sm">sm</Text>
  <Text size="md">md</Text>
  <Text size="lg">lg</Text>
  <Text size="xl">xl</Text>
  <Text size="2xl">2xl</Text>
  <Text size="3xl">3xl</Text>
  <Text size="4xl">4xl</Text>
  <Text size={18} lineHeight={26}>
    自定义设计尺寸
  </Text>
</>
```

内置尺寸：

| size | fontSize | lineHeight |
| --- | ---: | ---: |
| `2xs` | `wp(11)` | `wp(14)` |
| `xs` | `wp(12)` | `wp(16)` |
| `sm` | `wp(13)` | `wp(18)` |
| `md` | `wp(15)` | `wp(21)` |
| `lg` | `wp(17)` | `wp(24)` |
| `xl` | `wp(20)` | `wp(28)` |
| `2xl` | `wp(24)` | `wp(32)` |
| `3xl` | `wp(30)` | `wp(38)` |
| `4xl` | `wp(36)` | `wp(44)` |

传入数字 `size` 或 `lineHeight` 时，数字代表未缩放的设计像素，组件内部会统一转换。

## 颜色

```tsx
<>
  <Text tone="default">默认文字</Text>
  <Text tone="muted">弱化文字</Text>
  <Text tone="primary">强调文字</Text>
  <Text tone="success">成功状态</Text>
  <Text tone="warning">警示状态</Text>
  <Text tone="danger">危险状态</Text>
  <Text tone="disabled">禁用说明</Text>
  <Text color="onPrimary">主题 token</Text>
  <Text color="#DC2626">一次性颜色</Text>
</>
```

常用 `tone`：

- `default` / `neutral`：`theme.colors.onSurface`
- `muted`：`theme.colors.muted`
- `subtle` / `disabled`：`theme.colors.disabled`
- `primary`：`theme.colors.primary`
- `success` / `warning` / `danger` / `info`：内置语义状态色
- `inverse` / `onPrimary`：`theme.colors.onPrimary`
- `onSecondary`：`theme.colors.onSecondary`
- `inherit`：不设置颜色，用于嵌套文字继承父级颜色

```tsx
<Text tone="primary">
  已选择 <Text tone="inherit" weight="bold">3</Text> 项
</Text>
```

## 截断、字重和数字

```tsx
<>
  <Text truncate>单行省略</Text>
  <Text truncate={2}>最多两行</Text>
  <Text weight="semibold">语义字重</Text>
  <Text weight="850">自定义字重会归一化到 100-900</Text>
  <Text tabularNumbers>12:08 / 98%</Text>
</>
```

- `truncate` 是 `numberOfLines` 和默认 `ellipsizeMode="tail"` 的语义化快捷方式。
- `weight` 支持 `regular / medium / semibold / bold / heavy / black`，也支持 React Native 原生 `fontWeight`。
- Web 常见字重名会被映射到稳定数字权重；Android API 28 以下会降级到 `normal / bold`。
- `tabularNumbers` 用于计时器、金额、百分比等需要数字等宽的场景。

## 原生能力

`Text` 继承 React Native `Text` 的原生能力，包括：

- `numberOfLines`
- `ellipsizeMode`
- `allowFontScaling`
- `maxFontSizeMultiplier`
- `selectable`
- `onPress`
- `onLongPress`
- `accessibilityRole`
- `accessibilityLabel`
- `testID`

公共组件内部应优先使用 `variant / tone / size / weight / truncate`。只有确实需要局部覆盖布局、颜色或字体细节时再使用 `style`。
