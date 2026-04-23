# ActionDialogService

命令式对话框服务，`y2kit-ui` 内只保留新 API：

- `open(options)`：底层主入口
- `confirm(options)`：语义化确认框，返回 `Promise<boolean>`
- `alert(options)`：语义化提示框，返回 `Promise<boolean>`

## 前置条件

确保应用根组件已包裹 `ComponentLibProvider`（已内置 `ActionDialogProvider`）：

```tsx
import { ComponentLibProvider } from 'y2kit-ui';

export default function App() {
  return (
    <ComponentLibProvider>
      {/* 你的应用内容 */}
    </ComponentLibProvider>
  );
}
```

## 使用方式

```tsx
import { actionDialog } from 'y2kit-ui';
```

## 分层约定

- `y2kit-ui`：只提供新的、语义清晰的 dialog API
- `apps/*/dialogService`：负责兼容历史项目里的 `buttons / onConfirm / closeOnConfirm` 等旧参数

也就是说：

- 新项目或新代码，应该直接面向 `actionDialog.open / confirm / alert`
- 不再在 `y2kit-ui` 中保留 `show / custom` 这类同能力别名
- 老项目迁移时，不要再把 legacy 能力加回 `y2kit-ui`，而是在项目自己的 wrapper 里做参数转译

### 确认框

```tsx
const confirmed = await actionDialog.confirm({
  title: '删除确认',
  content: '确定要删除这条记录吗？',
  intent: 'danger',
  confirmText: '删除',
  footer: { layout: 'row' },
});
```

### 提示框

```tsx
await actionDialog.alert({
  content: '操作成功！',
  confirmText: '知道了',
});
```

### 自定义 actions

```tsx
const handle = actionDialog.open({
  title: '发布确认',
  content: '确认立即发布当前内容？',
  footer: { layout: 'row' },
  actions: [
    { key: 'cancel', role: 'cancel', label: '取消' },
    { key: 'publish', role: 'confirm', label: '发布', variant: 'primary' },
  ],
});

const result = await handle.result;
console.log(result);
```

### 自定义 footer render

```tsx
actionDialog.open({
  title: '高级操作',
  content: '这里可以完全接管底部区域',
  actions: [
    { key: 'cancel', role: 'cancel', label: '取消' },
    { key: 'save', role: 'confirm', label: '保存', variant: 'primary' },
  ],
  footer: {
    render: ({ pressAction, close }) => (
      <MyFooter onCancel={close} onSave={() => pressAction('save')} />
    ),
  },
});
```

### 项目侧兼容层示例

如果项目里已有历史调用：

```tsx
dialogService.confirm({
  content: '确定删除？',
  buttons: ['取消', '删除'],
  onConfirm: handleDelete,
  closeOnConfirm: true,
});
```

推荐做法是：

- 保留项目自己的 `dialogService.confirm(...)` 老签名
- 在 wrapper 内部把它转换成 `actionDialog.open(...)` 或 `actionDialog.confirm(...)`
- 不再把这些 legacy 参数透回 `y2kit-ui`

## API

### actionDialog.open(options)

核心入口，返回 `ActionDialogHandle`：

- `id`：当前对话框 id
- `result`：`Promise<ActionDialogResult>`
- `close()`：主动关闭当前对话框
- `update(patch)`：更新当前对话框配置

常用字段：

| 参数 | 类型 | 说明 |
|------|------|------|
| title | ReactNode | 标题区域 |
| content | string \| ReactNode | 内容区域 |
| actions | ActionDialogAction[] | 底部动作数组 |
| footer.layout | `'bar' \| 'row' \| 'stacked'` | 底部布局 |
| footer.render | `(ctx) => ReactNode` | 完全自定义 footer |
| dismiss.overlayPress | boolean | 点击蒙层是否关闭 |
| dismiss.backPress | boolean | Android 返回键是否关闭 |
| keyboard.dismissOnOverlayPress | boolean | 点击蒙层是否先收起键盘 |
| keyboard.dismissOnClose | boolean | 关闭时是否收起键盘 |
| layout.width | number | 对话框宽度 |
| layout.contentPadding | number | 内容区内边距 |
| layer.zIndex | number | 浮层层级，默认 `2000` |

### actionDialog.confirm(options)

语义化确认框，返回 `Promise<boolean>`。

| 参数 | 类型 | 说明 |
|------|------|------|
| title | ReactNode | 标题区域 |
| content | string \| ReactNode | 对话框内容 |
| confirmText | string | 确认按钮文案，默认 `'确定'` |
| cancelText | string | 取消按钮文案，默认 `'取消'` |
| confirmAction | Partial<ActionDialogAction> | 自定义确认按钮样式与行为 |
| cancelAction | Partial<ActionDialogAction> | 自定义取消按钮样式与行为 |
| intent | `'default' \| 'danger'` | 快速切换确认按钮语义 |
| footer.layout | `'bar' \| 'row' \| 'stacked'` | 底部布局 |

### actionDialog.alert(options)

语义化提示框，返回 `Promise<boolean>`。

| 参数 | 类型 | 说明 |
|------|------|------|
| title | ReactNode | 标题区域 |
| content | string \| ReactNode | 对话框内容 |
| confirmText | string | 确认按钮文案，默认 `'确定'` |
| confirmAction | Partial<ActionDialogAction> | 自定义确认按钮样式与行为 |
| intent | `'default' \| 'danger'` | 快速切换确认按钮语义 |
| footer.layout | `'bar' \| 'row' \| 'stacked'` | 底部布局 |

## 设计说明

- `y2kit-ui` 只保留新模型，不再内置 legacy `buttons / onConfirm / closeOnConfirm` 兼容。
- `open` 是唯一底层入口，避免 `open / show / custom` 多个同能力名字并存。
- 语义和视觉解耦：`role` 决定结果语义，`variant` 决定按钮样式，`footer.layout` 决定布局。
- 项目级兼容建议放在各自的 `dialogService` 中做参数转译。
- 长期演进建议优先补 `Provider defaults/presets` 与语义化 theme tokens，而不是继续扩展 legacy 参数。
