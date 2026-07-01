# ActionDialog

顶层操作对话框，提供两种入口：

- `ActionDialog`：声明式组件，支持 `open/defaultOpen/onOpenChange`
- `actionDialog`：全局命令式服务，适合路由守卫、请求确认、跨组件业务流程

`ZKitProvider` 已内置 `ActionDialogProvider`；只有单独使用 `actionDialog` 服务时才需要确认 Provider 已挂载。

## 设计取舍

- 声明式组件拥有状态模型；service 只调度宿主实例，避免半受控状态竞争。
- `message` 承载简单正文，`children` 承载复杂内容；不再使用含糊的 `content`。
- action 的 `role` 决定结果语义，`tone/variant` 决定视觉，不把业务结果和样式绑死。
- ActionDialog 只确认用户意图，不承接业务异步；确认后直接关闭，异步进度与结果态交给 `loading.promise()`。
- `footer.layout="auto"` 默认横排；3 个短标签也保持横排，长标签、自定义节点或更多动作才自动堆叠。需要固定样式时显式传 `row/stack/bar`。
- 默认同一时刻只显示一个全局 dialog；新调用会替换旧调用并以 `replace` 结算。需要串行展示时传 `collisionStrategy: 'queue'`。
- 默认不点蒙层关闭，Android back / iOS accessibility escape 可关闭；这是确认类弹窗更稳妥的默认行为。
- `actionDialog` 全局服务默认使用顶层 `inline` 宿主，避开 Android 触发时创建原生 Modal 窗口的延迟；声明式组件默认仍用 `modal`，也可按场景切到 `hostMode="inline"`。
- 默认过渡是低成本 `motion="fade"`，只做遮罩与卡片透明度变化；需要更明显的中心弹出感时再显式使用 `motion="scale"`。

## 声明式使用

```tsx
import { ActionDialog } from 'zkit-ui';

<ActionDialog
  open={open}
  onOpenChange={setOpen}
  title="删除确认"
  message="确定要删除这条记录吗？"
  actions={[
    { key: 'cancel', role: 'cancel' },
    { key: 'delete', role: 'confirm', label: '删除', tone: 'danger' },
  ]}
/>;
```

## 命令式确认

```tsx
import { actionDialog, loading } from 'zkit-ui';

const confirmed = await actionDialog.confirm({
  title: '删除确认',
  message: '确定要删除这条记录吗？',
  tone: 'danger',
  confirmLabel: '删除',
});

if (confirmed) {
  await loading.promise(remove(), {
    loading: '删除中',
    success: '已删除',
    error: '删除失败',
  });
}
```

## 自定义动作

```tsx
const handle = actionDialog.open({
  title: '离开页面',
  message: '还有未保存内容，确认离开？',
  actions: [
    { key: 'cancel', role: 'cancel' },
    {
      key: 'stay',
      role: 'neutral',
      label: '继续编辑',
      closeOnPress: false,
      onPress: ({ dismiss }) => {
        dismiss();
        return false;
      },
    },
    {
      key: 'leave',
      role: 'confirm',
      label: '离开',
    },
  ],
});

const result = await handle.result;
```

`onPress` 是同步拦截钩子；同步返回 `false` 会阻止默认关闭。业务异步不要放进 `onPress`，应在弹窗关闭并得到确认结果后用 `loading.promise()` 展示 loading / success / error。

## 自定义 Footer

```tsx
actionDialog.open({
  title: '高级操作',
  message: '底部区域可以完全接管，但仍复用 action 语义。',
  actions: [
    { key: 'cancel', role: 'cancel' },
    { key: 'save', role: 'confirm', label: '保存' },
  ],
  footer: {
    render: ({ pressAction, close }) => (
      <MyFooter onCancel={close} onSave={() => pressAction('save')} />
    ),
  },
});
```

## 常用 API

### `ActionDialog`

| 参数 | 说明 |
| --- | --- |
| `open/defaultOpen/onOpenChange` | 标准受控/非受控打开状态 |
| `title` | 标题区域 |
| `message` | 简单正文 |
| `children` | 复杂内容 |
| `actions` | 底部动作列表 |
| `footer.layout` | `'auto' \| 'row' \| 'stack' \| 'bar'`，默认 `auto` |
| `dismiss.overlayPress` | 点击蒙层关闭，默认 `false` |
| `dismiss.backPress` | Android back / accessibility escape 关闭，默认 `true` |
| `keyboard.avoid` | 键盘出现时避让，默认 `true` |
| `hostMode` | `'modal' \| 'inline'`，声明式默认 `modal` |
| `motion` | `'none' \| 'fade' \| 'scale'`，默认 `fade` |
| `layout` | `width/maxWidth/contentPadding/contentMinHeight/radius`，设计尺寸会通过 `wp(...)` 换算 |
| `colors/labels` | 颜色与文案 escape hatch |

### `actionDialog`

| 方法 | 说明 |
| --- | --- |
| `open(options)` | 打开自定义对话框，返回 `ActionDialogHandle` |
| `confirm(options)` | 打开确认框，确认返回 `true`，其它关闭返回 `false` |
| `alert(options)` | 打开提示框，关闭后 resolve |
| `close()` | 关闭当前对话框 |
| `closeByScope(scopeKey)` | 关闭命中 scope 的当前或排队对话框 |
| `closeAll()` | 关闭当前并清空队列 |
| `getSnapshot()` | 读取当前打开态、active id 与队列数量 |

`ActionDialogHandle` 包含：

- `id`
- `result: Promise<ActionDialogResult>`
- `close()`
- `update(patch)`
