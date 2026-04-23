# PermissionPurposeDialogService

权限用途说明 TopSheet。在系统权限申请框弹出的同时，在屏幕顶部展示一条白底黑字的说明条，告知用户该权限的使用目的。纯展示、不阻塞、无按钮。

## 前置条件

确保应用根组件已包裹 `ComponentLibProvider`（已内置 `PermissionPurposeDialogProvider`）：

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
import { permissionPurposeDialog } from 'y2kit-ui';

// 展示说明（与系统权限框同时出现）
permissionPurposeDialog.show({
  permissionType: 'location',
  message: '该权限仅用于考勤打卡定位，不会用于其他目的。',
});

// ... 发起系统权限请求 ...

// 请求完成后关闭说明条
permissionPurposeDialog.hide();
```

## 内置权限类型

| permissionType | 默认标题 | 默认描述 |
|---|---|---|
| `location` | 位置信息权限说明 | 我们需要获取您的位置信息以提供定位相关功能... |
| `camera` | 相机权限说明 | 我们需要使用相机以提供拍照或扫描功能... |
| `microphone` | 麦克风权限说明 | 我们需要使用麦克风以提供语音录制或通话功能... |
| `photos` | 相册权限说明 | 我们需要访问相册以选择并上传图片... |
| `notification` | 通知权限说明 | 我们需要发送通知以便及时推送业务提醒... |
| `custom` | 权限申请说明 | (需自行传入 title / message) |

## API

### permissionPurposeDialog.show(options)

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| permissionType | PermissionPurposeType | - | 权限类型，自动填充默认文案 |
| title | string | - | 自定义标题（优先于默认文案） |
| message | string | - | 自定义描述（优先于默认文案） |
| scopeKey | string | - | 作用域标识 |

### permissionPurposeDialog.hide()

关闭当前说明条。

### permissionPurposeDialog.hideByScope(scopeKey)

按 scopeKey 关闭特定说明条。
