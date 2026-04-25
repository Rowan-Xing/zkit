# 包边界

## packages/ui

只放 React Native UI 组件、服务组件、主题系统和组件需要的轻量内部工具。

适合放在这里：

- Button、Switch、TextInput、Picker、Dialog、Toast
- ThemeProvider、tokens、颜色、尺寸
- 组件内部专用 hook 和类型

不适合放在这里：

- 登录态
- 请求封装
- 业务常量
- 埋点
- 加密签名
- 文件上传业务逻辑

## packages/tools

只放和 UI 无关的通用工具。它应该可以被 RN、Web 或 Node 复用。

适合放在这里：

- 字符串、数字、对象、数组处理
- 日期格式化纯函数
- async helper
- 类型 helper

## 依赖原则

- app 可以同时依赖 `y2kit-ui` 和 `y2kit-tools`。
- `y2kit-ui` 不默认强依赖一个大型业务工具库。
- 如果 UI 包确实需要某个工具，优先复制成 UI 内部 helper；只有稳定、通用、轻量的工具才考虑从 `y2kit-tools` 引入。
- UI 热路径、动画、过渡、手势相关依赖必须优先考虑性能、丝滑和稳定可靠；不为兼容过低系统版本引入拖慢公共路径的依赖或降级实现。
