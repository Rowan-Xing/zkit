# LoadingService

全局 Loading 服务，提供命令式 API 来显示/隐藏加载状态、成功/失败提示。

## 特性

- ✅ 命令式调用，无需传递 props
- ✅ 支持 loading、success、error 三种状态
- ✅ 支持阻塞/非阻塞模式
- ✅ 支持自动关闭
- ✅ 支持 Promise 生命周期绑定
- ✅ 15秒看门狗保护，防止 loading 卡死
- ✅ 平滑的淡入淡出动画

## 快速开始

```tsx
import { loading } from 'y2kit-ui';

// 显示 loading
loading.show('正在加载');

// 隐藏 loading
loading.hide();

// 显示成功（自动关闭）
loading.success('操作成功');

// 显示失败（自动关闭）
loading.error('操作失败');
```

## API

### loading.show(textOrOptions)

显示 loading 状态。

```tsx
// 简单用法
loading.show('正在加载');

// 完整配置
loading.show({
  text: '正在加载',
  blocking: true, // 是否阻塞用户交互，默认 true
});
```

### loading.hide()

隐藏 loading。

```tsx
loading.hide();
```

### loading.success(textOrOptions)

显示成功状态，默认 1.2 秒后自动关闭。

```tsx
// 简单用法
loading.success('保存成功');

// 完整配置
loading.success({
  text: '保存成功',
  autoHide: true,      // 是否自动关闭，默认 true
  hideDelay: 1200,     // 自动关闭延迟，默认 1200ms
  blocking: false,     // 是否阻塞用户交互，默认 false
});
```

### loading.error(textOrOptions)

显示失败状态，默认 1.4 秒后自动关闭。

```tsx
// 简单用法
loading.error('保存失败');

// 完整配置
loading.error({
  text: '保存失败',
  autoHide: true,      // 是否自动关闭，默认 true
  hideDelay: 1400,     // 自动关闭延迟，默认 1400ms
  blocking: false,     // 是否阻塞用户交互，默认 false
});
```

### loading.withPromise(promise, options)

绑定 Promise 的生命周期，自动显示 loading、成功、失败状态。

```tsx
// 基础用法
const result = await loading.withPromise(fetchData());

// 完整配置
const result = await loading.withPromise(fetchData(), {
  loadingText: '加载中',
  successText: '加载成功',
  errorText: '加载失败',
  autoHide: true,
  hideDelay: 1200,
  blockingDuringLoading: true,  // 加载时是否阻塞
  blockingOnResult: false,       // 结果展示时是否阻塞
  
  // 自定义成功判断
  isSuccess: (result) => result.code === 0,
  
  // 自定义成功文案
  successTextResolver: (result) => result.message,
  
  // 自定义失败文案
  errorTextResolver: (result, error) => error?.message || result?.message || '操作失败',
});
```

## 类型定义

```typescript
// show 方法选项
type LoadingShowOptions = {
  text?: string;
  blocking?: boolean;
};

// success/error 方法选项
type LoadingResultOptions = {
  text?: string;
  autoHide?: boolean;
  hideDelay?: number;
  blocking?: boolean;
};

// withPromise 方法选项
type LoadingWithPromiseOptions<T> = {
  loadingText?: string;
  successText?: string;
  errorText?: string;
  autoHide?: boolean;
  hideDelay?: number;
  blockingDuringLoading?: boolean;
  blockingOnResult?: boolean;
  isSuccess?: (result: T) => boolean;
  successTextResolver?: (result: T) => string | undefined;
  errorTextResolver?: (result: T | undefined, error?: unknown) => string | undefined;
};

// 状态类型
type LoadingStatus = 'loading' | 'success' | 'error';
```

## 实际场景示例

### 表单提交

```tsx
const handleSubmit = async () => {
  try {
    loading.show('正在提交');
    await submitForm(formData);
    loading.success('提交成功');
  } catch (error) {
    loading.error(error.message || '提交失败');
  }
};
```

### 使用 withPromise 简化

```tsx
const handleSubmit = async () => {
  await loading.withPromise(submitForm(formData), {
    loadingText: '正在提交',
    successText: '提交成功',
    errorText: '提交失败',
  });
};
```

### 非阻塞 Loading

```tsx
// 用户可以继续操作其他区域
loading.show({
  text: '后台同步中',
  blocking: false,
});
```

### 自定义业务判断

```tsx
await loading.withPromise(api.createOrder(), {
  loadingText: '创建订单中',
  isSuccess: (res) => res.code === 0,
  successTextResolver: (res) => `订单 ${res.data.orderId} 创建成功`,
  errorTextResolver: (res) => res.message || '创建订单失败',
});
```

## 注意事项

1. **Provider 已集成**：`LoadingProvider` 已内置于 `ComponentLibProvider`，无需额外配置
2. **看门狗保护**：loading 状态超过 15 秒会自动关闭，防止卡死
3. **唯一实例**：全局只有一个 loading 实例，后调用会覆盖前一个；较早的 `withPromise` 结果不会覆盖较新的状态
4. **动画性能**：使用 `useNativeDriver` 确保动画流畅
