# Button

`Button` 是组件库的主操作入口。默认 API 只需要 `variant / tone / size / shape`，精确覆盖统一放进 `layout / colors / border`，避免把零散样式 props 扩散成长期公共契约。

## 基础用法

```tsx
import { Button } from 'zkit-ui';

export function Demo() {
  return <Button onPress={() => {}}>确定</Button>;
}
```

## 外观语义

```tsx
import { Button } from 'zkit-ui';

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

- `variant` 控制层级：`solid / soft / outline / ghost / link`
- `tone` 控制语义色：`primary / neutral / success / warning / danger / info`
- `color` 可直接覆盖语义主色，`colors` 用于覆盖背景、文字、边框和禁用态

## 尺寸与布局

```tsx
import { Button } from 'zkit-ui';
import { sp, wp } from 'zkit-tools';

export function Demo() {
  return (
    <>
      <Button size="xs">XS</Button>
      <Button size="md">MD</Button>
      <Button size="xl">XL</Button>
      <Button
        size="sm"
        layout={{
          minHeight: wp(44),
          paddingHorizontal: wp(20),
          radius: wp(14),
          textSize: sp(16),
        }}
      >
        自定义尺寸
      </Button>
    </>
  );
}
```

内置尺寸、圆角、间距、图标占位和默认触控热区都通过 `wp(...)` 计算。业务侧传入自定义像素值时也应使用 `wp(...)` 或 `sp(...)`。

## 图标

```tsx
import { Button } from 'zkit-ui';
import { wp } from 'zkit-tools';

export function Demo() {
  return (
    <>
      <Button icon={<YourIcon size={wp(18)} color="#fff" />}>收藏</Button>
      <Button icon={<YourIcon size={wp(18)} color="#fff" />} iconPlacement="end">
        下一步
      </Button>
      <Button
        iconOnly
        shape="pill"
        icon={<YourIcon size={wp(20)} color="#fff" />}
        layout={{ width: wp(48), height: wp(48) }}
        accessibilityLabel="刷新"
      />
    </>
  );
}
```

`iconSize` 在 `layout` 中只控制图标槽位，不会强改传入 icon 节点自身的绘制尺寸。

## 加载状态

```tsx
import { Button } from 'zkit-ui';

export function Demo() {
  return (
    <>
      <Button loading loadingMode="inline">保存</Button>
      <Button loading loadingMode="overlay">保存</Button>
    </>
  );
}
```

- `loading` 会禁用交互并设置 `accessibilityState.busy`
- `inline`：spinner 从内容起点进入，文字保持可见
- `overlay`：spinner 居中，原内容保留布局并淡出，避免按钮宽度跳动
- 默认 spinner 尺寸会按图标槽位做视觉补偿并受内容高度约束；需要精确控制时使用 `layout.loadingSize`

## 精确覆盖

```tsx
import { Button } from 'zkit-ui';
import { wp } from 'zkit-tools';

export function Demo() {
  return (
    <Button
      variant="solid"
      colors={{
        background: '#111827',
        text: '#FFFFFF',
        disabledBackground: '#E5E7EB',
        disabledText: '#9CA3AF',
      }}
      border={{ width: wp(1), color: '#111827' }}
      layout={{ minHeight: wp(44), radius: wp(12) }}
    >
      精确按钮
    </Button>
  );
}
```

## 渐变、阴影与按压反馈

```tsx
import { Button } from 'zkit-ui';

export function Demo() {
  return (
    <>
      <Button gradient={{ direction: 'to right', colors: ['#2563EB', '#0F9F6E'] }}>
        渐变按钮
      </Button>
      <Button shadow="md">带阴影</Button>
      <Button pressEffect="highlight">高亮反馈</Button>
    </>
  );
}
```

渐变依赖 `expo-linear-gradient`，缺失时会使用第一段颜色作为稳定兜底。默认 `pressEffect="auto"` 走普通 `Pressable` 静态路径，并用原生 pressed style 做轻量透明度反馈；只有 `scale`、`scale-opacity`、`highlight`、`scale-highlight` 和 loading 过渡会升级到 Reanimated 动画路径。

## 列表高频渲染

在 `FlatList` / `FlashList` cell 中批量渲染普通按钮时，默认 `pressEffect="auto"` 已命中轻量 `Pressable + View` 路径，不会为每个 cell 挂载 Reanimated press/loading 动画结构。列表内需要更强反馈时优先使用 `pressEffect="opacity"`；只有确实需要缩放、高亮遮罩或 loading 动画时再使用对应动画配置。

## 常用 Props

- `variant?: 'solid' | 'soft' | 'outline' | 'ghost' | 'link'`
- `tone?: 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info'`
- `size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'`
- `shape?: 'rounded' | 'pill' | 'square'`
- `block?: boolean`
- `disabled?: boolean`
- `loading?: boolean`
- `loadingMode?: 'inline' | 'overlay'`
- `pressEffect?: 'auto' | 'none' | 'opacity' | 'scale' | 'highlight' | 'scale-highlight' | 'scale-opacity'`
- `icon?: ReactNode`
- `iconPlacement?: 'start' | 'end'`
- `iconOnly?: boolean`
- `color?: string`
- `colors?: ButtonColors`
- `border?: ButtonBorder`
- `layout?: ButtonLayout`
- `gradient?: ButtonGradient`
- `shadow?: 'none' | 'sm' | 'md' | 'lg' | ButtonShadowConfig`
- `style / contentStyle / textStyle`：最后级 escape hatch

## 行为说明

- `disabled` 会禁用交互并进入禁用视觉；`loading` 只禁用交互，不强制置灰
- 显式传入 `hitSlop` 时以调用侧为准；否则小尺寸和 `link` 会自动补足触控热区
- `accessibilityRole` 固定为 `button`
- `iconOnly` 必须提供可读的 `accessibilityLabel`，除非 children 是可作为标签的文本
