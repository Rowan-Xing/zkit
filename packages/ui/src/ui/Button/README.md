# Button

`Button` 现在同时支持两套使用方式：

- 语义化新 API：`variant / tone / shape / sizePreset / pressEffect / iconOnly`
- 兼容旧 API：`skin / round / rounded / btnIcon / disableHover`

设计原则：

- 优先用语义化 props 组织按钮风格
- 尺寸仍然支持明确数值控制
- 当显式传入数值时，显式数值优先级高于 `sizePreset`
- 按压反馈支持多种模式，不再只有缩放一种

## 基础用法

```tsx
import { Button } from 'y2kit-ui';

export function Demo() {
  return <Button onPress={() => {}}>确定</Button>;
}
```

## 语义化外观

```tsx
import { Button } from 'y2kit-ui';

export function Demo() {
  return (
    <>
      <Button variant="solid" tone="primary">
        Primary
      </Button>
      <Button variant="soft" tone="warning">
        Warning
      </Button>
      <Button variant="outline" tone="danger">
        Danger
      </Button>
      <Button variant="ghost" tone="neutral">
        Ghost
      </Button>
      <Button variant="link" tone="info">
        Link
      </Button>
    </>
  );
}
```

## 尺寸：preset + 明确数值

```tsx
import { Button } from 'y2kit-ui';

export function Demo() {
  return (
    <>
      <Button sizePreset="sm">小号</Button>
      <Button sizePreset="lg">大号</Button>

      {/* 明确数值优先级更高 */}
      <Button sizePreset="sm" height={44} paddingHorizontal={20} fontSize={16}>
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
- `sizePreset`
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

说明：

- `iconOnly` 是新版语义化写法
- `btnIcon` 仍可用，但更推荐改为 `iconOnly`
- `iconPosition` 支持 `start | end`
- `iconOnly` 场景建议显式传 `accessibilityLabel`
- 普通按钮默认按高度推导图标与 loading 尺寸，不会因为 `width` 较大而放大

## 按压反馈

```tsx
import { Button } from 'y2kit-ui';

export function Demo() {
  return (
    <>
      <Button pressEffect="darken">按下变深</Button>
      <Button pressEffect="scale">按下缩放</Button>
      <Button pressEffect="opacity">按下透明度变化</Button>
      <Button pressEffect="scale-darken" iconOnly accessibilityLabel="点赞" icon={<HeartIcon />} />
      <Button pressEffect="none">无按压反馈</Button>
    </>
  );
}
```

`pressEffect` 支持：

- `auto`
- `none`
- `opacity`
- `scale`
- `darken`
- `scale-darken`
- `scale-opacity`

默认规则：

- `auto` 默认保持旧版按压手感：`scale-opacity`
- 如果希望按钮按下时背景加深，请显式传 `pressEffect="darken"` 或 `pressEffect="scale-darken"`
- `disabled / loading`：强制 `none`

## loading / disabled

```tsx
import { Button } from 'y2kit-ui';

export function Demo() {
  return (
    <>
      <Button loading>提交中</Button>
      <Button disabled>不可用</Button>
    </>
  );
}
```

说明：

- `loading` 会禁用点击，但不强制置灰
- `disabled` 会禁用点击，并进入禁用视觉

## 渐变

需要宿主安装 `expo-linear-gradient`。

```tsx
import { Button } from 'y2kit-ui';

export function Demo() {
  return (
    <>
      <Button linear={['to right', '#FFEB3A', '#4DEF8E']}>按钮</Button>
      <Button linear={['45deg', '#A531DC', '#4300B1']} pressEffect="darken">
        渐变按钮
      </Button>
    </>
  );
}
```

说明：

- 如果能加载 `expo-linear-gradient`，会渲染真实渐变
- 如果宿主没装该依赖，会退化为使用首个渐变色的纯色按钮

## 常用 Props

- `variant?: 'solid' | 'soft' | 'outline' | 'ghost' | 'link'`
- `tone?: 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info'`
- `shape?: 'default' | 'pill' | 'square'`
- `sizePreset?: 'sm' | 'md' | 'lg'`
- `pressEffect?: 'auto' | 'none' | 'opacity' | 'scale' | 'darken' | 'scale-darken' | 'scale-opacity'`
- `iconOnly?: boolean`
- `iconPosition?: 'start' | 'end'`
- `block?: boolean`
- `disabled?: boolean`
- `loading?: boolean`
- `style?: ViewStyle`
- `contentStyle?: ViewStyle`
- `textStyle?: TextStyle`

## 尺寸相关 Props

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

## 颜色相关 Props

推荐优先用 `tone`。

仍支持更细粒度覆盖：

- `color?: string`
- `bgColor?: string`
- `darkBgColor?: string`
- `fontColor?: string`
- `darkFontColor?: string`
- `disabledBgColor?: string`
- `disabledDarkBgColor?: string`
- `disabledFontColor?: string`
- `disabledDarkFontColor?: string`
- `disabledBorderColor?: string`
- `disabledDarkBorderColor?: string`

## 兼容旧 API

以下旧 props 仍然可用：

- `skin`
- `round`
- `rounded`
- `btnIcon`
- `disableHover`
- `darkFontColorColor`

说明：

- 这些旧 props 已在类型层通过 `@deprecated` 标记
- IDE / TypeScript 会提示“已弃用”，但不会阻止继续使用

映射关系：

- `skin="normal"` -> `variant="solid"`
- `skin="thin"` -> `variant="soft"`
- `skin="outlined"` -> `variant="outline"`
- `skin="dashed"` -> `variant="outline"` + 虚线边框
- `skin="text"` -> `variant="ghost"`
- `btnIcon` -> `iconOnly`
- `disableHover` -> `pressEffect="none"`

## 完整说明

- `style` 控制按钮外层布局
- `contentStyle` 控制按钮内容层
- `textStyle` 仅在 `children` 为字符串或数字时生效
- `onPressIn / onPressOut` 会与内置按压反馈组合执行
- `iconSize` 影响 icon 的占位布局尺寸，不会强改传入 icon 节点自身大小
- `shadow` 仍支持旧版能力
- `borderWidth` 和 `round` 仍支持旧版精细化控制
