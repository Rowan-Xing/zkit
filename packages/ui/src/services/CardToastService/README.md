# CardToastService

全局卡片 Toast 服务，适合保存成功、网络失败、轻量操作反馈这类不应打断用户流程的提示。

`ComponentLibProvider` 已内置 `ToastProvider`。如果单独接入，需要把 `ToastProvider` 放在应用根部。

```tsx
import { ToastProvider } from 'zkit-ui';

export function App() {
  return <ToastProvider>{/* app */}</ToastProvider>;
}
```

## 默认行为

- 默认视觉保持原卡片 Toast：语义 webp 图标、淡色背景、细边框、`wp(320)` 宽度、`wp(10)` 圆角和 iOS sheen 动效不变。
- 默认 `placement: 'top'`，位置会叠加 safe area，额外偏移保持原来的 `35` 设计像素。
- 默认 `strategy: 'replace'`，新提示替换当前提示，避免连续操作时堆积。
- 默认 `duration: 2400`，传 `duration: 0` 时不会自动关闭，并会自动显示关闭按钮。
- 动画只使用 opacity / transform，避免布局动画和 JS 高频驱动。

## 使用方式

```ts
import { toast } from 'zkit-ui';

toast.success('保存成功');
toast.error('网络错误', {
  description: '请检查网络后重试',
  duration: 3200,
});
toast.info('已刷新', { placement: 'bottom' });
```

完整配置入口：

```ts
const handle = toast.show({
  tone: 'warning',
  title: '资料未完整',
  description: '请补充手机号后继续',
  action: {
    label: '去补充',
    onPress: () => {
      // navigate(...)
    },
  },
});

handle.update({ tone: 'success', title: '已补充', description: undefined });
handle.dismiss();
```

## 队列策略

```ts
toast.info('按顺序展示', { strategy: 'queue' });
toast.success('可堆叠提示', { strategy: 'stack', maxVisible: 3 });
```

| strategy | 行为 |
| --- | --- |
| `replace` | 关闭当前可见 Toast，展示最新一条。默认值 |
| `queue` | 当前 Toast 完整退出后，再展示下一条 |
| `stack` | 同位置最多展示 `maxVisible` 条，超出时关闭最旧一条 |

## 全局默认值

```ts
toast.configure({
  placement: 'top',
  offset: 35,
  duration: 2400,
  strategy: 'replace',
  maxVisible: 3,
  closeButton: false,
});
```

单条 Toast 的 options 优先级高于 `configure`。

## 自定义渲染

```tsx
toast.custom(
  ({ dismiss }) => (
    <Pressable onPress={() => dismiss()}>
      <Text>自定义 Toast</Text>
    </Pressable>
  ),
  {
    accessibilityLabel: '自定义 Toast',
    duration: 0,
  }
);
```

自定义渲染仍由 `ToastProvider` 管理生命周期、队列、safe area 和退出清理。自定义内容里的像素尺寸仍应使用 `wp(...)`。

## API 摘要

| API | 说明 |
| --- | --- |
| `toast.show(options)` | 展示完整配置的 Toast，返回 `ToastHandle` |
| `toast.success/error/warning/info/neutral(title, options?)` | 语义快捷入口 |
| `toast.custom(render, options?)` | 自定义内容入口 |
| `toast.update(idOrHandle, patch)` | 更新可见或排队中的 Toast |
| `toast.dismiss(idOrHandle?)` | 关闭指定 Toast；不传时关闭最新可见 Toast |
| `toast.dismissAll()` | 关闭所有可见和排队 Toast |
| `toast.configure(defaults)` | 设置全局默认值 |

常用 options：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `tone` | `'success' \| 'error' \| 'warning' \| 'info' \| 'neutral'` | 语义色 |
| `title` | `ReactNode` | 主文案 |
| `description` | `ReactNode` | 辅助文案 |
| `duration` | `number` | 自动关闭时长，`0` 表示常驻 |
| `placement` | `'top' \| 'bottom'` | 出现位置 |
| `offset` | `number` | 相对 safe area 的设计像素偏移 |
| `strategy` | `'replace' \| 'queue' \| 'stack'` | 连续触发策略 |
| `action` | `ToastAction` | 可点击动作 |
| `closeButton` | `boolean` | 是否展示关闭按钮 |
| `icon` | `ReactNode \| false \| render` | 自定义图标或隐藏图标 |
| `render` | `(context) => ReactNode` | 完全自定义内容 |
