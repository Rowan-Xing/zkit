# zkit-ui

私有 React Native 组件库（Monorepo workspace 包），用于沉淀可复用 UI / 交互 / tokens。

## 目标

- 组件“可沉淀”：通用、可组合、可测试、可维护
- 主题可配置：默认主题 + 应用侧覆盖 + 局部覆盖
- 国际化可注入：默认字典 + 应用侧覆盖 + 缺失策略
- API 可控：一致的 props 设计与导出方式，避免“每个组件一个风格”

## 安装与使用

在 workspace 内通过 `workspace:*` 引用即可（本仓库已采用 pnpm workspace）。

```ts
import { Button } from 'zkit-ui';
```

## 主题（Theme）

### 主题模型

主题类型定义在 [types.ts](src/theme/types.ts)：

- `Theme`：完整主题对象（组件内部使用）
- `ThemeOverride`：应用侧覆盖对象（Partial + 深层 colors Partial）

默认主题在 [defaultTheme.ts](src/theme/defaultTheme.ts)。

### 推荐用法：统一 Provider（主题 + i18n + 全局浮层）

```tsx
import { ComponentLibProvider } from 'zkit-ui';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ComponentLibProvider
      theme={{ colors: { primary: '#2563EB' } }}
      messages={{ 'button.ok': '确定' }}
      missingKeyPolicy="throw"
    >
      {children}
    </ComponentLibProvider>
  );
}
```

### 单独使用 ThemeProvider

```tsx
import { ThemeProvider } from 'zkit-ui';

<ThemeProvider theme={{ colors: { primary: '#16A34A' } }}>
  {/* ... */}
</ThemeProvider>;
```

### 全局默认配置（不依赖 Provider）

如果你的项目希望“即便没包 Provider，也要有一致默认值”，可以在应用启动时配置：

```ts
import { configureComponentLib } from 'zkit-ui';

configureComponentLib({
  theme: { colors: { primary: '#0F172A' } },
  i18n: {
    locale: 'zh-CN',
    messages: { 'checkbox.label': '勾选' },
    missingKeyPolicy: 'throw',
  },
});
```

## 国际化（i18n）

### 核心概念

- 默认 locale 会读取系统语言；不支持的语言回退到 `zh-CN`
- `messages`：扁平字典 `Record<string, string>`
- `t(key, params?)`：取文案；支持 `{name}` 这种占位符插值
- `missingKeyPolicy`：
  - `throw`：缺失 key 直接抛错（更适合开发/测试，及时暴露漏配）
  - `key`：缺失 key 回显 key（更适合线上，避免崩溃）

### 使用

```tsx
import { I18nProvider, Text, useI18n } from 'zkit-ui';

function Demo() {
  const { t } = useI18n();
  return <Text>{t('greeting.hello', { name: 'Alice' })}</Text>;
}

<I18nProvider messages={{ 'greeting.hello': '你好，{name}' }} missingKeyPolicy="throw">
  <Demo />
</I18nProvider>;
```

## 组件编写规范（沉淀收纳标准）

## 组件清单

- Accordion：手风琴/折叠面板（Reanimated 高度与指示器动画）
- Checkbox：三端一致的复选框/复选框组（受控/非受控、三态、Reanimated 指示器动画）
- Radio：三端一致的单选框/单选组（受控/非受控、可清空组、Reanimated 指示器动画）
- Switch：三端一致的布尔开关（受控/非受控、Reanimated 轨道与 thumb 动画）
- TextInput / TextInputPrimitive：统一文本输入 Field 与接近 RN 原生能力的薄封装
- Sheet：通用方向弹层（H5 bottom/top/left/right 自绘，iOS/Android bottom 内部走原生 TrueSheet）
- LoadingService：全局加载 HUD 服务（handle 状态模型、Promise 绑定、Android 无 elevation 残影路径）
- ImagePreview：全屏图片预览（声明式 open/value 状态模型 + 全局 imagePreview.open 服务）
- Picker：底部滚轮选择器（单列/级联、确认提交、iOS 原生 wheel）
- AddressCascader：省市区级联选择（内置中国数据）
- DatePicker：年/月/日日期选择（空值、范围、精度与确认提交语义）
- WheelColumn：单列滚轮选择（iOS 原生 wheel，Android/Web 自绘高性能路径）

### Accordion 用法

```tsx
import * as React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Text,
} from 'zkit-ui';

export function DemoAccordion() {
  const [openItem, setOpenItem] = React.useState<string | null>('item-1');

  return (
    <Accordion value={openItem} onChange={setOpenItem} variant="card" size="md">
      <AccordionItem value="item-1">
        <AccordionTrigger title="第一项" description="支持标题、副标题和自定义插槽" />
        <AccordionContent>
          <Text>内容 1</Text>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-2">
        <AccordionTrigger title="第二项" />
        <AccordionContent>
          <Text>内容 2</Text>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
```

`Accordion` 使用 `value/defaultValue/onChange` 状态模型。默认 `type="single"` 且可折叠，空值为 `null`；`type="multiple"` 时值为数组。内容默认 `mountStrategy="eager"` 以保留内部状态，可按需切到 `lazy` 或 `unmountOnExit`。

### Sheet 用法

```tsx
import * as React from 'react';
import { Button, Sheet, Text } from 'zkit-ui';

export function DemoSheet() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button onPress={() => setOpen(true)}>打开筛选</Button>

      <Sheet placement="right" open={open} onOpenChange={setOpen} size="md">
        <Sheet.Header title="筛选" description="支持上下左右方向" />
        <Sheet.Content>
          <Text>右侧弹层内容</Text>
        </Sheet.Content>
      </Sheet>
    </>
  );
}
```

`Sheet` 使用 `open/defaultOpen/onOpenChange` 状态模型。iOS / Android 的 `placement="bottom"` 会使用原生 TrueSheet；H5 bottom 与 `top/left/right` 一样使用 Reanimated 自绘路径。底部档位通过根级 `detents/detentIndex/defaultDetentIndex/onDetentChange` 管理，`nativeProps` 只作为原生底部的高级逃生口。

### ImagePreview 用法

```tsx
import { ImagePreview, imagePreview } from 'zkit-ui';

<ImagePreview
  images={images}
  open={previewOpen}
  value={previewIndex}
  onChange={setPreviewIndex}
  onOpenChange={setPreviewOpen}
/>;

imagePreview.open({ images, index: 0 });
```

`ImagePreview` 使用 `open/defaultOpen/onOpenChange` 管理显隐，使用 `value/defaultValue/onChange` 管理当前图片索引。全局 `imagePreview.open()` 返回 handle，可通过 `handle.result` 获取关闭原因和最终索引；`ComponentLibProvider` 已内置 `ImagePreviewProvider`。

### 目录与导出

- 组件放在 `src/ui/`（一组件一文件为主；复杂组件可拆同名子文件）
- 业务无关的工具放在 `src/`（例如 `theme/`、`i18n/`）
- 所有对外导出集中在 [src/index.ts](src/index.ts)
  - 新增组件必须同时导出组件与 props type
  - 不对外导出内部私有工具（除非确定是稳定 API）

### Props 设计

- 语义优先：优先用 `variant`/`size` 等语义字段；最终样式从 Theme 派生
- 兜底能力：保留 `style`（容器）与必要的 `*Style`（子元素）作为 escape hatch
- 默认值规则：
  - 能安全默认的（例如 `variant="primary"`、`shape="square"`）可以给默认值
  - 与业务强相关/配置缺失会导致误用的，不要做“看起来能跑”的兜底
- 受控/非受控：
  - 交互组件优先支持 `value/checked` + `onChange` 受控
  - 同时支持 `defaultValue/defaultChecked` 非受控
  - 明确 `isControlled` 分支，避免受控/非受控混用导致状态错乱
- 事件命名：
  - 值变化：`onChange`（对外一般用最终 primitive 值）
  - 语义更强的变化：可以补充 `onCheckedChange` 这类（但要解释差异）

### 样式与 tokens

- 组件内部禁止写死品牌色，必须来自 `useTheme()`（允许通过 props 单次覆盖）
- 尺寸类 props 直接接收 number（业务侧可自行传 `wp/sp` 计算后的值）
- 文字组件统一使用组件库 [Text](src/ui/Text/index.tsx)，优先用 `variant` / `size` / `weight` / `tone` 表达语义，`style` 只作为最终 escape hatch
- 新增 tokens 流程：
  - 先扩展 [Theme](src/theme/types.ts) 的字段
  - 同步补齐 [defaultTheme](src/theme/defaultTheme.ts)
  - 再在组件里通过 `useTheme()` 消费，避免散落常量

### i18n key 规范

- 统一前缀：`component.<ComponentName>.*`，避免与业务侧 key 冲突
- key 示例：
  - `component.Button.ok`
  - `component.Checkbox.indeterminate`
- 默认策略建议：
  - 开发/测试：`missingKeyPolicy="throw"`（及时暴露漏 key）
  - 线上：`missingKeyPolicy="key"`（缺失时不崩溃）

### 可访问性（A11y）

- 交互组件必须设置 `accessibilityRole`
- 对应状态必须设置 `accessibilityState`（disabled/checked/selected 等）
- 必要时补充 `accessibilityLabel`（当 UI 上无可读 label 时）

### 测试与可调试性

- 交互组件提供 `testID`（或透传 RN 原生 props）
- 避免在组件内部吞掉错误；配置缺失要更“fail-fast”（尤其是 i18n key）

### 新增组件检查清单

- 在 `src/ui/<Component>.tsx` 实现组件与 `export type <Component>Props`
- 使用 `useTheme()` 获取颜色/样式 tokens（不要写死品牌色）
- 文案通过 `useI18n().t()` 获取（不要写死可见文本）
- 补齐 `accessibilityRole` 与 `accessibilityState`
- 需要时提供 `testID`（或透传 RN props）
- 在 [src/index.ts](src/index.ts) 导出组件与 props type

### 组件收纳门槛（什么时候该进组件库）

- 至少被 2 个页面/模块复用，且不存在明显业务耦合
- 视觉/交互有稳定设计来源（设计稿或明确规范），不是临时方案
- props 可解释、可组合，且对主题/i18n 有清晰依赖边界
