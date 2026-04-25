# CardToastService

命令式卡片 Toast 服务。默认只展示当前最新的一条提示，适合轻量结果反馈。

## 前置条件

确保应用根组件已包裹 `ComponentLibProvider`（已内置 `CardToastProvider`）：

```tsx
import { ComponentLibProvider } from 'y2kit-ui';

export default function App() {
  return (
    <ComponentLibProvider>
      {/* app */}
    </ComponentLibProvider>
  );
}
```

## 使用方式

```tsx
import { toast } from 'y2kit-ui';

toast.success('保存成功');
toast.error('网络错误');
toast.warning('请检查输入');
toast.info('已刷新');
```

带标题或自定义时长：

```tsx
toast.success('资料已同步', {
  title: '保存成功',
  duration: 2400,
});
```

通用入口：

```tsx
const toastId = toast.show({
  tone: 'success',
  title: '保存成功',
  message: '资料已同步',
  duration: 2400,
});

toast.dismiss(toastId);
toast.dismissAll();
```

`duration: 0` 表示不自动关闭，需要手动调用 `dismiss` / `dismissAll`。

## API

### toast.show(options)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | - | Toast 唯一标识，不传则自动生成 |
| tone | 'success' \| 'error' \| 'warning' \| 'info' | - | Toast 语义色，默认 'info' |
| title | unknown | - | 标题 |
| message | unknown | - | 提示内容，支持字符串、数字、boolean、Error 对象 |
| duration | number | - | 显示时长（毫秒），默认 1000；传 0 时不自动关闭 |

### toast.success/error/warning/info(message, options?)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | unknown | ✓ | 提示内容 |
| options | number \| ToastShortcutOptions | - | 传数字时表示 duration；传对象时可配置 id、title、duration |

### toast.dismiss(id?)

关闭当前或指定 Toast。

### toast.dismissAll()

关闭当前 Toast。
