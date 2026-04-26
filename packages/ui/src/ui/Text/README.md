# Text

`Text` 是组件库统一文字入口，用来集中处理字号、行高、主题色、字体缩放和跨平台字重表现。

设计原则：

- 优先使用 `variant / size / weight / tone` 表达文字语义
- 默认接入主题色，避免业务里散落固定颜色
- 所有内置字号与行高都通过 `wp(...)` 计算
- 保留 React Native `Text` 的原生能力，`style` 作为最终 escape hatch
- 统一 `maxFontSizeMultiplier` 与 `fontWeight`，减少 iOS / Android 表现差异

## 基础用法

```tsx
import { Text } from 'y2kit-ui';

export function Demo() {
  return <Text>默认正文</Text>;
}
```

默认等价于：

- `variant="body"`
- `tone="default"`
- 颜色使用 `theme.colors.onSurface`
- 字体缩放上限使用 `getMaxFontScale()`

## 语义预设

```tsx
import { Text } from 'y2kit-ui';

export function Demo() {
  return (
    <>
      <Text variant="display">页面主标题</Text>
      <Text variant="heading">分区标题</Text>
      <Text variant="title">列表标题</Text>
      <Text variant="subtitle" tone="muted">
        辅助说明
      </Text>
      <Text variant="body">正文内容</Text>
      <Text variant="label">表单标签</Text>
      <Text variant="caption" tone="muted">
        弱提示
      </Text>
    </>
  );
}
```

`variant` 只提供默认的 `size` 与 `weight`。如果传入 `size` 或 `weight`，会覆盖对应的预设值。

## 尺寸

```tsx
import { Text } from 'y2kit-ui';

export function Demo() {
  return (
    <>
      <Text size="xs">xs</Text>
      <Text size="sm">sm</Text>
      <Text size="md">md</Text>
      <Text size="lg">lg</Text>
      <Text size="xl">xl</Text>
      <Text size="2xl">2xl</Text>
      <Text size="3xl">3xl</Text>
    </>
  );
}
```

内置尺寸：

- `xs`：`fontSize: wp(12)`，`lineHeight: wp(16)`
- `sm`：`fontSize: wp(13)`，`lineHeight: wp(18)`
- `md`：`fontSize: wp(15)`，`lineHeight: wp(21)`
- `lg`：`fontSize: wp(17)`，`lineHeight: wp(24)`
- `xl`：`fontSize: wp(20)`，`lineHeight: wp(28)`
- `2xl`：`fontSize: wp(24)`，`lineHeight: wp(32)`
- `3xl`：`fontSize: wp(30)`，`lineHeight: wp(38)`

## 颜色

```tsx
import { Text } from 'y2kit-ui';

export function Demo() {
  return (
    <>
      <Text tone="default">默认文字</Text>
      <Text tone="muted">弱化文字</Text>
      <Text tone="primary">强调文字</Text>
      <Text tone="disabled">禁用说明</Text>
      <Text color="#DC2626">一次性自定义颜色</Text>
    </>
  );
}
```

`tone` 与主题色的关系：

- `default` / `neutral`：`theme.colors.onSurface`
- `muted`：`theme.colors.muted`
- `primary`：`theme.colors.primary`
- `secondary`：`theme.colors.onSecondary`
- `disabled`：`theme.colors.disabled`
- `onPrimary`：`theme.colors.onPrimary`
- `onSecondary`：`theme.colors.onSecondary`
- `inherit`：不设置颜色，让文字继承父级 `Text` 的颜色

当需要嵌套文字继承父级颜色时，给子级显式传 `tone="inherit"`：

```tsx
import { Text } from 'y2kit-ui';

export function Demo() {
  return (
    <Text tone="primary">
      已选择 <Text tone="inherit" weight="bold">3</Text> 项
    </Text>
  );
}
```

## 字重与对齐

```tsx
import { Text } from 'y2kit-ui';

export function Demo() {
  return (
    <>
      <Text weight="regular">Regular</Text>
      <Text weight="medium">Medium</Text>
      <Text weight="semibold">Semibold</Text>
      <Text weight="bold">Bold</Text>
      <Text weight="900" align="center">
        居中重字重
      </Text>
    </>
  );
}
```

`weight` 支持语义值，也支持 React Native `fontWeight` 原生值。组件会统一归一化字重：

- Web 常见命名如 `regular / semibold / black` 会映射到稳定数字权重
- Android API 28 以下会降级为 `normal / bold`
- `style.fontWeight` 也会参与归一化

## 与 style 配合

```tsx
import { StyleSheet } from 'react-native';
import { Text } from 'y2kit-ui';
import { wp } from 'y2kit-tools';

export function Demo() {
  return (
    <Text variant="label" tone="muted" style={styles.note}>
      自定义细节
    </Text>
  );
}

const styles = StyleSheet.create({
  note: {
    marginTop: wp(8),
    letterSpacing: 0,
  },
});
```

样式优先级从低到高：

1. `variant` 推导出的默认 `size / weight`
2. 显式 `size / weight / tone / color / align`
3. `style`

因此 `style` 可以覆盖 `fontSize / lineHeight / color / fontWeight / textAlign`。公共组件内部优先使用语义 props，只有局部特殊样式才使用 `style`。

## 字体缩放

`Text` 默认使用 `getMaxFontScale()` 作为 `maxFontSizeMultiplier`，保证组件库内文字缩放规则一致。

```tsx
import { Text } from 'y2kit-ui';

export function Demo() {
  return (
    <Text maxFontSizeMultiplier={1.1}>
      单次覆盖缩放上限
    </Text>
  );
}
```

如果传入 `allowFontScaling={false}`，会沿用 React Native 原生行为。

## 常用 Props

- `variant?: 'body' | 'label' | 'caption' | 'title' | 'subtitle' | 'heading' | 'display'`
- `size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'`
- `weight?: 'regular' | 'medium' | 'semibold' | 'heavy' | 'black' | TextStyle['fontWeight']`
- `tone?: 'default' | 'neutral' | 'muted' | 'primary' | 'secondary' | 'disabled' | 'onPrimary' | 'onSecondary' | 'inherit'`
- `color?: string`
- `align?: TextStyle['textAlign']`
- `style?: StyleProp<TextStyle>`
- `children?: React.ReactNode`

## 继承的 React Native Text Props

`Text` 继承 React Native `Text` 的原生 props，例如：

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

## 使用建议

- 页面标题优先用 `variant="heading"` 或 `variant="display"`
- 表单标签、按钮内部文字、列表元信息优先用 `variant="label"`
- 辅助说明优先用 `variant="caption"` 或 `tone="muted"`
- 需要继承父级文字颜色时使用 `tone="inherit"`
- 不要在业务里直接使用 React Native `Text`，避免缩放、字重和主题色规则分裂
