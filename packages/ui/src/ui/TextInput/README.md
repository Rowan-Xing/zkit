# TextInput

`TextInput` 是组件库统一的文本输入入口。它不是 React Native `TextInput` 的换名导出，而是一个完整 Field 组件：负责标签、描述、错误、计数、清除按钮、主题色、尺寸、禁用/只读和跨端输入默认值。

同目录同时导出 `TextInputPrimitive`：它接近 React Native 原生 `TextInput`，只统一字体缩放、选区/光标颜色和 Android 光标颜色稳定性。高级 `TextInput` 底层基于 `TextInputPrimitive` 渲染。

设计取舍：

- 对外统一使用 `value / defaultValue / onChange`，`onChange` 直接返回字符串
- 非受控输入默认不在每次键入时触发内部 re-render；只有 `clearable / showCount / renderCount` 需要同步 UI 时才追踪值
- `disabled` 与 `readOnly` 分离：禁用会进入禁用视觉，只读保持普通信息层级但不可编辑
- 原生键盘能力继续作为顶层 props 透传，例如 `keyboardType / inputMode / autoComplete / enterKeyHint / submitBehavior`
- 焦点态不额外高亮边框；边框颜色只表达默认、禁用和显式状态反馈
- `style` 作用于根容器，原生输入样式使用 `inputStyle`

## 基础用法

```tsx
import * as React from 'react';
import { TextInput } from 'zkit-ui/text-input';

export function Demo() {
  const [value, setValue] = React.useState('');

  return (
    <TextInput
      label="备注"
      value={value}
      onChange={setValue}
      placeholder="请输入备注"
    />
  );
}
```

## 原生薄封装

```tsx
import { TextInputPrimitive } from 'zkit-ui/text-input';
import { wp } from 'zkit-tools';

export function Demo() {
  return (
    <TextInputPrimitive
      placeholder="接近原生 TextInput"
      style={{ minHeight: wp(44) }}
    />
  );
}
```

`TextInputPrimitive` 的 props 基本等同 React Native `TextInputProps`。它适合动画文本、特殊原生测量、完全自定义输入框外观，或需要最大限度保持 RN 原生行为的场景。

## 非受控

```tsx
import { TextInput } from 'zkit-ui/text-input';

export function Demo() {
  return (
    <TextInput
      defaultValue="初始内容"
      label="昵称"
      onChange={(value) => {
        console.log(value);
      }}
    />
  );
}
```

## 描述、错误和计数

```tsx
import { TextInput } from 'zkit-ui/text-input';

export function Demo() {
  return (
    <TextInput
      label="简介"
      description="最多 120 个字符"
      error="简介不能包含联系方式"
      maxLength={120}
      showCount
      multiline
      minRows={3}
      maxRows={6}
    />
  );
}
```

`error` 存在时会自动进入错误状态；只有需要无文案错误态时才单独传 `invalid`。

## 前后缀与清除按钮

```tsx
import { TextInput } from 'zkit-ui/text-input';

export function Demo() {
  return (
    <TextInput
      label="金额"
      prefix="$"
      suffix="USD"
      clearable
      keyboardType="decimal-pad"
      inputMode="decimal"
    />
  );
}
```

`prefix / suffix` 可以是字符串、数字、图标或任意 ReactNode。字符串会自动使用组件库文字样式，图标颜色由调用侧控制。

## 外观

```tsx
import { TextInput } from 'zkit-ui/text-input';
import { wp } from 'zkit-tools';

export function Demo() {
  return (
    <>
      <TextInput variant="outline" tone="primary" />
      <TextInput variant="filled" tone="success" />
      <TextInput variant="plain" status="warning" />
      <TextInput
        layout={{
          minHeight: wp(52),
          radius: wp(14),
          paddingHorizontal: wp(16),
        }}
      />
    </>
  );
}
```

内置尺寸、圆角、间距和字号都通过 `wp(...)` 计算。调用侧传入自定义像素值时也应使用 `wp(...)`。

## 常用 Props

- `value?: string`
- `defaultValue?: string`
- `onChange?: (value: string) => void`
- `onSubmit?: (value: string, event) => void`
- `disabled?: boolean`
- `readOnly?: boolean`
- `required?: boolean`
- `invalid?: boolean`
- `variant?: 'outline' | 'filled' | 'plain'`
- `tone?: 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info'`
- `status?: 'default' | 'success' | 'warning' | 'error'`
- `size?: 'sm' | 'md' | 'lg'`
- `label / labelAction / description / error`
- `prefix / suffix`
- `clearable / clearIcon / onClear`
- `minRows / maxRows / showCount / renderCount`
- `layout?: TextInputLayout`
- `colors?: TextInputColors`
- `style / fieldStyle / inputStyle / labelStyle / descriptionStyle / errorStyle / countStyle / prefixStyle / suffixStyle / clearButtonStyle`

## 原生能力

除 `value / defaultValue / onChange / onChangeText / editable / readOnly / style` 这类被组件接管的字段外，`TextInput` 会透传 React Native `TextInput` 的原生 props，例如：

- `keyboardType`
- `inputMode`
- `autoComplete`
- `secureTextEntry`
- `returnKeyType`
- `enterKeyHint`
- `submitBehavior`
- `maxLength`
- `selection`
- `selectionColor`
- `cursorColor`
- `selectionHandleColor`
- `onFocus / onBlur / onSubmitEditing`
- `testID`

需要原生 change event 时使用 `onNativeChange`；普通业务值变化使用 `onChange`。

## 可访问性

- 当 `label` 是字符串或数字时，会自动作为 `accessibilityLabel`
- `description` 或 `error` 是字符串时，会自动作为 `accessibilityHint`
- `disabled` 会同步到 `accessibilityState.disabled`
- `clearable` 的清除按钮使用内置 i18n 文案，也可以通过 `clearAccessibilityLabel` 覆盖

## 平台默认值

- Android 默认设置 `underlineColorAndroid="transparent"`，避免系统下划线破坏组件视觉
- 高级 `TextInput` 会清零原生输入层 padding，由外层 Field 统一管理间距，避免 Android 默认输入内边距被圆角容器裁切
- 光标、选区和选择手柄默认使用主题强调色；Android 会按光标色设置稳定 key，规避部分 OEM/Fabric 下光标颜色首次提交不稳定的问题
- Web 会移除输入框默认 outline，焦点态不额外改变组件边框颜色
