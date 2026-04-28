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

## 全局配置

应用启动时可通过 `toast.configure(...)` 设定全局默认行为，每条 toast 的同名字段未传时会回落到这里。单条 toast 的 options 优先级更高。

```ts
import { toast } from 'y2kit-ui';

toast.configure({
  position: 'top',   // 'top' | 'bottom'，默认 'top'
  offset: 35,        // 设计尺寸，相对 safeArea 的额外偏移，默认 35
  duration: 1500,    // 默认显示时长（毫秒），传 0 时不自动关闭，默认 1000
});
```

## 使用方式

```tsx
import { toast } from 'y2kit-ui';

toast.success('保存成功');
toast.error('网络错误');
toast.warning('请检查输入');
toast.info('已刷新');
```

带标题、自定义位置或时长（单条配置覆盖全局）：

```tsx
toast.success('资料已同步', {
  title: '保存成功',
  duration: 2400,
});

toast.error('上传失败', {
  position: 'bottom',
  offset: 48,
});
```

通用入口：

```tsx
const toastId = toast.show({
  tone: 'success',
  title: '保存成功',
  message: '资料已同步',
  duration: 2400,
  position: 'bottom',
  offset: 24,
});

toast.dismiss(toastId);
toast.dismissAll();
```

`duration: 0` 表示不自动关闭，需要手动调用 `dismiss` / `dismissAll`。

## API

### toast.configure(defaults)

设置全局默认配置，未传字段保留当前值。优先级：`单条 options` > `configure 设定` > 内置默认值。

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| position | 'top' \| 'bottom' | 'top' | Toast 出现位置 |
| offset | number | 35 | 相对 safeArea 的额外偏移（设计尺寸） |
| duration | number | 1000 | 默认显示时长（毫秒），传 0 不自动关闭 |

### toast.show(options)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | - | Toast 唯一标识，不传则自动生成 |
| tone | 'success' \| 'error' \| 'warning' \| 'info' | - | Toast 语义色，默认 'info' |
| title | unknown | - | 标题 |
| message | unknown | - | 提示内容，支持字符串、数字、boolean、Error 对象 |
| duration | number | - | 显示时长（毫秒），未传继承全局配置 |
| position | 'top' \| 'bottom' | - | 位置，未传继承全局配置 |
| offset | number | - | 偏移（设计尺寸），未传继承全局配置 |

### toast.success/error/warning/info(message, options?)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | unknown | ✓ | 提示内容 |
| options | number \| ToastShortcutOptions | - | 传数字时表示 duration；传对象时可配置 id、title、duration、position、offset |

### toast.dismiss(id?)

关闭当前或指定 Toast。

### toast.dismissAll()

关闭当前 Toast。
