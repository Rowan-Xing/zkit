# CardToastService

命令式调用卡片式 Toast 提示服务，支持成功、错误、警告和信息四种类型。

## 前置条件

确保应用根组件已包裹 `ComponentLibProvider`（已内置 `CardToastProvider`）：

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
import { cardToast } from 'y2kit-ui';
```

### 成功提示

```tsx
cardToast.showSuccess('操作成功');
cardToast.showSuccess('保存成功', 2000); // 自定义显示时长
```

### 错误提示

```tsx
cardToast.showError('操作失败');
cardToast.showError(new Error('网络错误')); // 支持 Error 对象
```

### 警告提示

```tsx
cardToast.showWarning('请注意检查');
```

### 信息提示

```tsx
cardToast.showInfo('这是一条提示信息');
```

### 通用方法

```tsx
const toastId = cardToast.show({
  type: 'success',
  message: '自定义消息',
  duration: 3000,
});
```

### 关闭提示

```tsx
// 关闭指定 Toast
cardToast.dismiss(toastId);

// 关闭所有 Toast
cardToast.dismissAll();
```

## API

### cardToast.show(options)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | - | Toast 唯一标识，不传则自动生成 |
| type | 'success' \| 'error' \| 'warning' \| 'info' | - | 提示类型，默认 'info' |
| message | unknown | - | 提示内容，支持字符串、数字、Error 对象 |
| duration | number | - | 显示时长（毫秒），默认 1000 |

返回 `string`，Toast 的唯一标识。

### cardToast.showSuccess(message, duration?)

显示成功提示。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | unknown | ✓ | 提示内容 |
| duration | number | - | 显示时长（毫秒） |

### cardToast.showError(message, duration?)

显示错误提示。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | unknown | ✓ | 提示内容 |
| duration | number | - | 显示时长（毫秒） |

### cardToast.showWarning(message, duration?)

显示警告提示。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | unknown | ✓ | 提示内容 |
| duration | number | - | 显示时长（毫秒） |

### cardToast.showInfo(message, duration?)

显示信息提示。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | unknown | ✓ | 提示内容 |
| duration | number | - | 显示时长（毫秒） |

### cardToast.dismiss(id)

关闭指定 Toast。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✓ | Toast 唯一标识 |

### cardToast.dismissAll()

关闭所有 Toast。
