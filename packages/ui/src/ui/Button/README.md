# Button

`Button` 只保留语义化 API：`variant / tone / shape / size / pressEffect / iconOnly / loadingMode`。

设计原则：

- 优先用语义化 props 组织按钮风格
- `size` 控制默认尺寸，显式数值仍可覆盖
- 默认尺寸会随窗口宽度变化重新计算，适配横竖屏和分屏
- 小尺寸按钮会补足默认触控热区，不放大视觉尺寸
- 旧 API 已移除，不再保留 deprecated 兼容层

## 基础用法

```tsx
import { Button } from 'y2kit-ui';

export function Demo() {
  return <Button onPress={() => {}}>确定</Button>;
}
```

## 外观

```tsx
import { Button } from 'y2kit-ui';

export function Demo() {
  return (
    <>
      <Button variant="solid" tone="primary">Primary</Button>
      <Button variant="soft" tone="warning">Warning</Button>
      <Button variant="outline" tone="danger">Danger</Button>
      <Button variant="ghost" tone="neutral">Ghost</Button>
      <Button variant="link" tone="info">Link</Button>
    </>
  );
}
```

## 尺寸

```tsx
import { Button } from 'y2kit-ui';

export function Demo() {
  return (
    <>
      <Button size="sm">小号</Button>
      <Button size="lg">大号</Button>
      <Button size="sm" height={44} paddingHorizontal={20} fontSize={16}>
        显式尺寸覆盖
      </Button>
    </>
  );
}
```

优先级规则：

- `width / height / minHeight`
- `paddingHorizontal / paddingVertical`
- `fontSize / iconSize / loadingSize / radius`
- `size`
- 组件默认值

## 图标按钮

```tsx
import { Button } from 'y2kit-ui';
import { wp } from 'y2kit-tools';

export function Demo() {
  return (
    <>
      <Button icon={<YourIcon size={wp(18)} color="#fff" />}>收藏</Button>
      <Button icon={<YourIcon size={wp(18)} color="#fff" />} iconPosition="end">
        下一步
      </Button>
      <Button
        iconOnly
        shape="pill"
        width={wp(48)}
        height={wp(48)}
        icon={<YourIcon size={wp(20)} color="#fff" />}
        accessibilityLabel="刷新"
      />
    </>
  );
}
```

## 加载状态

```tsx
import { Button } from 'y2kit-ui';

export function Demo() {
  return (
    <>
      <Button loading loadingMode="inline">保存</Button>
      <Button loading loadingMode="replace">保存</Button>
      <Button loading loadingMode="overlay">保存</Button>
    </>
  );
}
```

- `inline`：默认模式，spinner 从左侧进入，文字保持可见
- `replace`：加载时隐藏原内容，spinner 在按钮内水平垂直居中
- `overlay`：原内容保留占位但淡出透明，spinner 在按钮内水平垂直居中

## 渐变与阴影

```tsx
import { Button } from 'y2kit-ui';

export function Demo() {
  return (
    <>
      <Button gradient={{ direction: 'to right', colors: ['#FFEB3A', '#4DEF8E'] }}>
        渐变按钮
      </Button>
      <Button shadow="md">带阴影</Button>
    </>
  );
}
```

## 常用 Props

- `variant?: 'solid' | 'soft' | 'outline' | 'ghost' | 'link'`
- `tone?: 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info'`
- `shape?: 'rounded' | 'pill' | 'square'`
- `size?: 'sm' | 'md' | 'lg'`
- `pressEffect?: 'auto' | 'none' | 'opacity' | 'scale' | 'darken' | 'scale-darken' | 'scale-opacity'`
- `iconOnly?: boolean`
- `iconPosition?: 'start' | 'end'`
- `block?: boolean`
- `disabled?: boolean`
- `loading?: boolean`
- `loadingMode?: 'inline' | 'replace' | 'overlay'`
- `gradient?: ButtonGradient`
- `shadow?: 'none' | 'sm' | 'md' | 'lg' | ButtonShadowConfig`
- `style?: ViewStyle`
- `contentStyle?: ViewStyle`
- `textStyle?: TextStyle`

## 覆盖 Props

- `color?: string`
- `backgroundColor?: string`
- `textColor?: string`
- `disabledBackgroundColor?: string`
- `disabledTextColor?: string`
- `disabledBorderColor?: string`
- `borderWidth?: number`
- `borderStyle?: 'solid' | 'dashed'`
- `width?: number | string`
- `height?: number | string`
- `minHeight?: number`
- `paddingHorizontal?: number`
- `paddingVertical?: number`
- `fontSize?: number`
- `iconSize?: number`
- `loadingSize?: number`
- `gap?: number`
- `radius?: number`

## 行为说明

- `loading` 会禁用点击，但不强制置灰
- `disabled` 会禁用点击，并进入禁用视觉
- 显式传入 `hitSlop` 时以业务侧为准
- `iconSize` 影响 icon 的占位布局尺寸，不强改传入 icon 节点自身大小
