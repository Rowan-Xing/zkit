# PermissionPurposeDialogService

权限用途说明 TopSheet。在系统权限申请框弹出前后，于屏幕顶部展示一条非阻塞说明，告知用户该权限的使用目的。纯展示、不拦截交互、无按钮。

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
const purpose = permissionPurposeDialog.show({
  permission: 'location',
  message: '该权限仅用于考勤打卡定位，不会用于其他目的。',
});

// ... 发起系统权限请求 ...

// 请求完成后关闭说明条
purpose.hide();
```

## 内置权限类型

| permission | 默认标题 | 默认描述 |
|---|---|---|
| `location` | 需要使用位置 | 用于定位、附近内容或位置相关服务... |
| `camera` | 需要使用相机 | 用于拍照、扫码或上传现场图片... |
| `microphone` | 需要使用麦克风 | 用于录音、语音输入或通话相关功能... |
| `photos` | 需要访问相册 | 用于选择图片或视频，并完成上传、预览等操作 |
| `notification` | 需要发送通知 | 用于接收重要提醒和状态更新... |
| `contacts` | 需要访问通讯录 | 用于联系人选择、邀请或信息补全... |
| `calendar` | 需要访问日历 | 用于创建、读取或同步日程提醒... |
| `bluetooth` | 需要使用蓝牙 | 用于发现、连接或管理附近设备... |
| `motion` | 需要访问运动数据 | 用于识别运动状态或完成健康相关功能... |
| `custom` | 权限申请说明 | (需自行传入 title / message) |

## API

### permissionPurposeDialog.show(options)

返回 `PermissionPurposeDialogHandle`，可用于只关闭或更新本次说明，避免旧异步权限流程误关新的说明条。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| permission | PermissionPurpose | - | 权限用途，自动填充默认文案 |
| title | string | - | 自定义标题（优先于默认文案） |
| message | string | - | 自定义描述（优先于默认文案） |
| scopeKey | string | - | 作用域标识 |
| duration | number | - | 自动关闭时长（毫秒）。不传则手动关闭 |
| topOffset | number | - | 顶部安全区下方额外偏移 |

```tsx
const purpose = permissionPurposeDialog.show({ permission: 'camera' });
purpose.update({ message: '仅用于本次扫码。' });
purpose.hide();
```

### permissionPurposeDialog.hide()

关闭当前说明条。

### permissionPurposeDialog.hideByScope(scopeKey)

按 scopeKey 关闭特定说明条。
