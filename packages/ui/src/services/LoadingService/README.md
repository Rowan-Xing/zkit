# LoadingService

全局加载 HUD 服务，用于短时阻塞、Promise 生命周期反馈和轻量结果态。`ZKitProvider` 已内置 `LoadingProvider`，普通业务入口只需要导入 `loading`。

## 设计要点

- `loading.show()` 返回 `LoadingHandle`，同一次异步流程后续用 handle 更新或收尾，避免旧请求覆盖新请求
- 全局只展示一个 HUD；新请求默认替换旧请求，并向旧请求派发 `replace`
- `loading.promise()` 绑定异步任务，成功/失败结果只会更新当前仍活跃的 handle
- `loading` 默认 15s 超时自动关闭，`success/error` 默认短暂停留后关闭
- Android 不使用 `elevation` 或额外阴影层；iOS/Web 阴影跟随同一动画层，退出完成后卸载，避免残影
- 默认文案来自 i18n，可通过 `ZKitProvider loading` 或 `LoadingProvider defaults` 覆盖

## 基础用法

```tsx
import { loading } from 'zkit-ui/loading';

const handle = loading.show('正在保存');

try {
  await save();
  handle.success('保存成功');
} catch (error) {
  handle.error('保存失败');
}
```

## Promise 绑定

```tsx
await loading.promise(save(), {
  loading: '正在保存',
  success: '保存成功',
  error: '保存失败',
});
```

`success` 和 `error` 可以返回配置对象，也可以返回 `false` 跳过结果态：

```tsx
await loading.promise(api.createOrder(), {
  loading: { title: '创建订单中', blocking: true },
  success: (res) => ({ title: `订单 ${res.id} 已创建`, duration: 1200 }),
  error: (error) => ({ title: error instanceof Error ? error.message : '创建失败' }),
  isSuccess: (res) => res.code === 0,
});
```

## API

### loading.show(options)

```tsx
const handle = loading.show({
  title: '同步中',
  description: '请稍候',
  blocking: true,
  timeout: 15000,
});
```

`options` 也可以直接传 ReactNode，作为 `title`。`show` 默认 `status="loading"`、`blocking=true`、`duration=0`。

### handle.update(patch)

```tsx
const handle = loading.show('上传中');
handle.update({ title: '处理中', description: '马上完成' });
```

### handle.success(options) / handle.error(options)

```tsx
handle.success({ title: '上传完成', duration: 1000 });
handle.error({ title: '上传失败', description: '请稍后重试', duration: 1600 });
```

结果态默认不阻塞交互；需要阻塞时传 `blocking: true`。

### loading.hide(idOrHandle?)

```tsx
loading.hide(handle);
loading.hide(); // 隐藏当前 HUD
```

## Provider 配置

```tsx
<ZKitProvider
  loading={{
    loadingTimeout: 20000,
    successDuration: 1000,
    errorDuration: 1800,
    labels: {
      loading: '处理中',
      success: '完成',
      error: '失败',
    },
    colors: {
      card: '#4d4d4d',
    },
  }}
>
  <App />
</ZKitProvider>
```

## 关键类型

```ts
type LoadingStatus = 'loading' | 'success' | 'error';
type LoadingDismissReason = 'api' | 'timeout' | 'replace' | 'provider-unmount';

type LoadingShowOptions = {
  id?: string;
  status?: LoadingStatus;
  title?: React.ReactNode;
  description?: React.ReactNode;
  blocking?: boolean;
  duration?: number;
  timeout?: number;
  icon?: React.ReactNode | false | ((context: LoadingIconRenderContext) => React.ReactNode);
  render?: (context: LoadingRenderContext) => React.ReactNode;
  colors?: LoadingColors;
};
```
