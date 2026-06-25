# Accordion

组合式手风琴/折叠面板，适合设置项、FAQ、表单分组和信息分层。组件默认使用 `value/defaultValue/onChange` 状态模型，支持受控与非受控；动画由 Reanimated shared value 驱动，展开内容、指示器和按压反馈共享同一节奏。

## 基础用法

```tsx
import * as React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Text,
} from 'y2kit-ui';

export function DemoAccordion() {
  const [value, setValue] = React.useState<string | null>('profile');

  return (
    <Accordion value={value} onChange={setValue} variant="card" size="md">
      <AccordionItem value="profile">
        <AccordionTrigger title="账户资料" description="姓名、头像和公开信息" />
        <AccordionContent>
          <Text>这里放账户资料表单。</Text>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="security">
        <AccordionTrigger title="安全设置" />
        <AccordionContent>
          <Text>这里放密码、多因素认证和设备管理。</Text>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
```

## 状态模型

- `type="single"` 是默认模式，`value` 为当前打开项或 `null`；默认 `collapsible=true`，再次点击已打开项会收起。
- `type="multiple"` 时 `value` 为数组，任意项都可独立展开/收起。
- 受控模式只由外部 `value` 驱动视觉状态；非受控模式使用 `defaultValue` 初始化内部 store。

## 组合插槽

`AccordionTrigger` 提供 `title`、`description`、`leading`、`trailing`、`indicator` 和 `children`。这些插槽都可以传普通节点，也可以传 render prop：

```tsx
<AccordionTrigger
  title={({ open }) => (open ? '收起详情' : '展开详情')}
  indicator={({ open }) => <YourIcon rotate={open ? 180 : 0} />}
/>
```

传入 `children` 时会完全接管 trigger 主体内容；`indicator={false}` 可隐藏默认箭头。

## 外观与动画

- `variant`：`card`、`filled`、`plain`
- `tone`：`neutral`、`primary`、`success`、`warning`、`danger`、`info`
- `size`：`sm`、`md`、`lg`
- `animation`：传 `{ duration, easing, reduceMotion }` 覆盖默认动画；传 `false` 关闭动画。
- `mountStrategy`：`eager` 默认保持内容挂载，`lazy` 首次展开后保持挂载，`unmountOnExit` 收起动画结束后卸载。

所有内置像素尺寸都通过 `wp(...)` 计算。业务侧传入 `itemGap`、`AccordionIndicator size`、`strokeWidth`、自定义 padding 等像素值时也应使用 `wp(...)`。
