import * as React from 'react';
import { BackHandler, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  SliderCaptcha,
  loading,
  permissionPurposeDialog,
  pickerService,
  toast,
  useI18n,
  type PickerValue,
} from 'zkit-ui';
import { createRouterGuard } from 'zkit-tools';

import { LinkedScrollDemo } from '../LinkedScrollDemo';
import { UsageGuide, type UsageGuideProps } from '../components/UsageGuide';
import { captchaChallenge } from '../data';
import type { Density } from '../data';
import { wait } from '../demoUtils';
import {
  ButtonsSection,
  CheckboxSection,
  FoundationSection,
  PickersSection,
  RadioSection,
  ServicesSection,
  SwitchSection,
  SurfacesSection,
  TextInputSection,
  ToolsSection,
} from '../sections/PlaygroundSections';
import { styles as sharedStyles } from '../styles';
import { HomeScreen } from './HomeScreen';
import { TabScreenShell } from './TabScreenShell';

const ROUTE_PUSH_DURATION = 280;
const ROUTE_POP_DURATION = 220;

type GuideKey =
  | 'foundation'
  | 'button'
  | 'textInput'
  | 'switch'
  | 'checkbox'
  | 'radio'
  | 'surfaces'
  | 'pickers'
  | 'services'
  | 'tools';

const zhGuides: Record<GuideKey, UsageGuideProps> = {
  foundation: {
    title: 'Text / LoadingSpinner',
    description:
      '基础层负责文字、字号、语义色、截断和加载反馈，业务页面与组件内部都应复用这套原语，避免每个页面单独处理字体缩放和跨端高度差异。',
    blocks: [
      {
        title: 'Text 覆盖用法',
        items: [
          'variant / size / weight / tone 组合出标题、正文、标签、说明、代码等排版层级。',
          'truncate / numberOfLines / align / transform 处理截断、对齐和大小写转换。',
          '默认接入字体缩放上限，Android 关闭 includeFontPadding，三端文字高度更稳定。',
        ],
      },
      {
        title: 'LoadingSpinner 覆盖用法',
        items: [
          'size / color 直接控制加载反馈，可放在按钮、列表、空状态和全局服务中。',
          '尺寸进入业务样式时继续通过 wp(...) 计算，避免不同屏幕上视觉密度漂移。',
        ],
      },
    ],
    api: ['Text', 'variant', 'size', 'weight', 'tone', 'truncate', 'LoadingSpinner', 'size', 'color'],
    snippet: `import { Text, LoadingSpinner } from 'zkit-ui';\nimport { wp } from 'zkit-tools';\n\n<Text variant="title" weight="bold">Title</Text>\n<Text tone="muted" truncate={2}>Body copy</Text>\n<LoadingSpinner size={wp(24)} color="#1F5EFF" />`,
  },
  button: {
    title: 'Button',
    description:
      'Button 是主操作入口，长期 API 收敛在 variant / tone / size / shape 上；精确覆盖统一放进 layout、colors、border、gradient、shadow。',
    blocks: [
      {
        title: '视觉与语义',
        items: [
          'variant 覆盖 solid / soft / outline / ghost / link，tone 覆盖 primary / neutral / success / warning / danger / info。',
          'size 覆盖 xs 到 xl，shape 覆盖 rounded / pill / square，block 适合整行主按钮。',
          'colors / border / layout 是必要 escape hatch，不把零碎样式 props 扩散成长期契约。',
        ],
      },
      {
        title: '交互状态',
        items: [
          'loading 支持 inline 与 overlay，禁用交互但不强制置灰，避免提交中宽度跳动。',
          'icon / iconPlacement / iconOnly 覆盖图标按钮；iconOnly 必须有 accessibilityLabel。',
          'pressEffect、gradient、shadow 都保留在组件内部处理，减少业务层重复动画和样式分叉。',
        ],
      },
    ],
    api: ['variant', 'tone', 'size', 'shape', 'block', 'loading', 'icon', 'iconOnly', 'layout', 'colors'],
    snippet: `import { Button } from 'zkit-ui';\n\n<Button variant="solid" tone="primary">Primary</Button>\n<Button variant="outline" tone="danger">Danger</Button>\n<Button loading loadingMode="overlay">Saving</Button>`,
  },
  textInput: {
    title: 'TextInput',
    description:
      'TextInput 是统一的文本输入 Field：负责标签、说明、反馈、字数、清除按钮、前后缀、主题色和跨端输入默认值，状态模型保持 value / defaultValue / onChange 单一入口。',
    blocks: [
      {
        title: '状态模型与原生输入',
        items: [
          'value / defaultValue / onChange 分别覆盖受控、非受控和业务值变化；onNativeChange 保留原生事件入口。',
          'onSubmit 基于当前值触发提交，keyboardType / inputMode / returnKeyType / autoCapitalize 等原生能力继续透传。',
          'clearable / onClear / clearIcon 与 showCount / renderCount 会同步内部值，Android、iOS、Web 保持同一清空语义。',
        ],
      },
      {
        title: 'Field 结构与反馈',
        items: [
          'label / labelAction / required / description / error 组成完整表单语义；error 存在时自动进入错误状态，invalid 适合无文案错误态。',
          'prefix / suffix 可放字符串、数字、图标或节点；readOnly 与 disabled 分离，分别表达只读和不可用。',
          'maxLength、showCount、renderCount、multiline、minRows、maxRows 覆盖短文本、长文本和计数展示。',
        ],
      },
      {
        title: '外观、尺寸与平台',
        items: [
          'variant 覆盖 outline / filled / plain，tone 与 status 覆盖 primary、success、warning、danger、info 等语义反馈。',
          'size 覆盖 sm / md / lg；layout、colors、color 与各类 style prop 是必要 escape hatch，像素值继续通过 wp(...) 传入。',
          'selectionColor / cursorColor / selectionHandleColor 统一光标、选区和手柄；Web 会把 cursorColor 同步到 caretColor。',
        ],
      },
    ],
    api: ['value', 'defaultValue', 'onChange', 'onSubmit', 'label', 'error', 'clearable', 'showCount', 'variant', 'layout'],
    snippet: `const [note, setNote] = React.useState('');\n\n<TextInput\n  label="备注"\n  value={note}\n  onChange={setNote}\n  clearable\n  showCount\n  maxLength={120}\n/>`,
  },
  switch: {
    title: 'Switch',
    description:
      'Switch 是独立的布尔开关组件，适合立即启用或停用设置。它使用 checked / defaultChecked / onCheckedChange 状态模型，并通过自绘 Pressable + Reanimated 路径统一三端动效。',
    blocks: [
      {
        title: '状态、交互与可访问性',
        items: [
          'checked / defaultChecked 同时支持受控和非受控；受控模式完全跟随外部 checked，非受控模式先推进行为动画再同步状态。',
          'disabled 与 loading 都会阻止切换；loading 会设置 accessibilityState.busy，并在 thumb 内展示默认或自定义 loadingIndicator。',
          '根节点固定 accessibilityRole="switch"，label 可自动推导 accessibilityLabel，stateText 会同步 accessibilityValue。',
        ],
      },
      {
        title: '内容、尺寸与语义色',
        items: [
          'label / description / labelPlacement 覆盖设置项文案位置；children 和 render-prop 支持完全自定义内容区域。',
          'size 覆盖 sm / md / lg，tone 覆盖 primary / neutral / success / warning / danger / info。',
          'stateText 适合极短轨道内状态文案，组件会估算文案宽度并保护 thumb 滑动空间。',
        ],
      },
      {
        title: '覆盖与动画',
        items: [
          'color、colors、layout 分别覆盖主色、结构化色值和轨道/拇指尺寸；所有像素类值继续通过 wp(...) 传入。',
          'trackStyle / thumbStyle / contentStyle / labelStyle / descriptionStyle / stateTextStyle 作为最后的样式 escape hatch。',
          'duration 控制开关值动画时长，按压和焦点反馈由组件内部保持一致节奏。',
        ],
      },
    ],
    api: ['checked', 'defaultChecked', 'onCheckedChange', 'loading', 'stateText', 'labelPlacement', 'children', 'colors', 'layout'],
    snippet: `const [enabled, setEnabled] = React.useState(true);\n\n<Switch\n  checked={enabled}\n  onCheckedChange={setEnabled}\n  label="通知"\n  description="开启后接收系统消息"\n  stateText={{ checked: '开', unchecked: '关' }}\n/>`,
  },
  checkbox: {
    title: 'Checkbox',
    description:
      'Checkbox 是独立的多选控件，适合协议确认、批量选择和三态全选。单项使用 checked / defaultChecked / onChange，组合使用 CheckboxGroup 的 value 数组。',
    blocks: [
      {
        title: '状态模型',
        items: [
          'checked 支持 boolean 与 indeterminate；受控模式由外部状态驱动，非受控模式用 defaultChecked 初始化。',
          'disabled 阻止交互但保留当前状态；label / description / labelPlacement 组成可读触控行。',
          'showIndicator=false 与 children render-prop 可把 Checkbox 变成完整自定义卡片。',
        ],
      },
      {
        title: 'CheckboxGroup',
        items: [
          'value / defaultValue / onChange 管理选中集合，适合多选表单和批量操作。',
          'orientation / wrap / align / gap / rowGap / columnGap 控制排列；组级 size / tone / variant / shape 可被单项覆盖。',
          '全选入口可用 checked="indeterminate" 表达部分选中。',
        ],
      },
      {
        title: '外观与覆盖',
        items: [
          'size 覆盖 sm / md / lg，variant 覆盖 solid / soft / outline，shape 覆盖 rounded / square / circle。',
          'tone、color、colors、layout、duration 覆盖语义色、结构色、尺寸与动效时长。',
          'indicator、contentStyle、indicatorStyle、labelStyle、descriptionStyle 与 accessibilityState 是必要 escape hatch。',
        ],
      },
    ],
    api: ['checked', 'defaultChecked', 'onChange', 'CheckboxGroup', 'value', 'variant', 'shape', 'indicator', 'layout', 'colors'],
    snippet: `const [items, setItems] = React.useState(['motion']);\n\n<CheckboxGroup value={items} onChange={setItems}>\n  <Checkbox value="motion" label="动效令牌" />\n  <Checkbox value="forms" label="表单控件" />\n</CheckboxGroup>`,
  },
  radio: {
    title: 'Radio',
    description:
      'Radio 是独立的互斥选择控件，适合单选设置和方案选择。单项支持 checked / defaultChecked / allowDeselect，组合使用 RadioGroup 的单一 value。',
    blocks: [
      {
        title: '状态模型',
        items: [
          'RadioGroup 使用 value / defaultValue / onChange 管理单一选中值，onChange 可返回 null 表示清空。',
          'allowDeselect 允许再次点击取消选中；disabled 阻止交互但保留当前视觉状态。',
          '独立 Radio 可直接用 checked / onChange，也可以交给 RadioGroup 统一注入状态。',
        ],
      },
      {
        title: '内容与排列',
        items: [
          'label / description / labelPlacement 覆盖选项文案位置；children render-prop 支持自定义选项卡。',
          'orientation / wrap / align / gap / rowGap / columnGap 管理组内排列。',
          '组级 size / tone / variant / color / colors / layout 提供默认外观，单项可以覆盖。',
        ],
      },
      {
        title: '外观与覆盖',
        items: [
          'size 覆盖 sm / md / lg，variant 覆盖 outline / soft / solid，tone 覆盖 primary / neutral / success / warning / danger / info。',
          'indicator 可替换选中标记；showIndicator=false 适合卡片式单选。',
          'contentStyle、indicatorStyle、labelStyle、descriptionStyle、accessibilityState 与 duration 覆盖最终细节。',
        ],
      },
    ],
    api: ['value', 'defaultValue', 'onChange', 'allowDeselect', 'RadioGroup', 'variant', 'indicator', 'layout', 'colors'],
    snippet: `const [density, setDensity] = React.useState('comfortable');\n\n<RadioGroup value={density} onChange={setDensity}>\n  <Radio value="compact" label="紧凑" />\n  <Radio value="comfortable" label="舒适" />\n</RadioGroup>`,
  },
  surfaces: {
    title: 'Accordion / BottomSheet / LinkedScroll',
    description:
      '界面层组件负责展开收起、底部浮层和菜单内容联动。动画、手势和滚动关键帧优先走原生或 Reanimated 路径，不把平台差异暴露给业务。',
    blocks: [
      {
        title: 'Accordion 覆盖用法',
        items: [
          '支持 single / multiple，open 状态可受控或非受控，itemGap / size / variant 管理布局。',
          'AccordionTrigger / AccordionContent / AccordionIndicator 保持组合式 API，适合复杂内容。',
        ],
      },
      {
        title: 'BottomSheet 与 LinkedScroll',
        items: [
          'BottomSheet 使用 open / defaultOpen / onOpenChange，也支持 ref.open() / ref.close() 命令式入口。',
          'detents / maxHeight / backdrop / handle 覆盖常见浮层规格，iOS / Android / Web 由组件层适配。',
          'LinkedScroll 适合左侧菜单和右侧内容同步滚动，页面内 demo 展示独立路由式进入。',
        ],
      },
    ],
    api: ['Accordion', 'open', 'defaultOpen', 'BottomSheet', 'detents', 'ref.open()', 'LinkedScroll', 'value'],
    snippet: `<Accordion defaultValue="state" variant="card">\n  <AccordionItem value="state">\n    <AccordionTrigger title="State" />\n    <AccordionContent>...</AccordionContent>\n  </AccordionItem>\n</Accordion>\n\n<BottomSheet ref={sheetRef} detents={['content', 0.72]} />`,
  },
  pickers: {
    title: 'Picker / DatePicker / AddressCascader / BetweenTime',
    description:
      '选择器负责单列、级联、日期、地址和时间范围。触发器、弹层生命周期和确认提交语义统一，滚轮关键帧不塞额外 JS 工作。',
    blocks: [
      {
        title: 'Picker 覆盖用法',
        items: [
          'options 支持平铺和树形 children，value 可为单值或路径数组。',
          'onChange 返回 value 与 selection，separator / title / children render prop 覆盖展示。',
        ],
      },
      {
        title: '日期与地址',
        items: [
          'DatePicker 支持 min / max / precision / labelFormat / isDateDisabled。',
          'AddressCascader 使用省市区数据，value 与 label 可分别受控。',
          'BetweenTime 支持 start / end / quickDate，用于日期区间确认。',
        ],
      },
    ],
    api: ['Picker', 'options', 'value', 'onChange', 'DatePicker', 'AddressCascader', 'BetweenTime', 'quickDate'],
    snippet: `<Picker options={options} value={value} onChange={handleChange}>\n  {({ label }) => <FieldTrigger label="Language" value={label} />}\n</Picker>\n\n<DatePicker value={date} onChange={setDate} min="2024-01-01" />`,
  },
  services: {
    title: 'Provider Services',
    description:
      '服务层把 Toast、Loading、Picker、权限说明、图片预览和滑块验证挂到 ComponentLibProvider，业务用命令式 API 发起一次性流程。',
    blocks: [
      {
        title: '全局服务',
        items: [
          'toast.success / warning / error / info 覆盖轻反馈。',
          'loading.promise 绑定异步任务状态，成功、失败、加载文案集中配置。',
          'pickerService.pick 复用 Picker 弹层能力，适合无需声明式挂载的选择流程。',
        ],
      },
      {
        title: '高阶交互',
        items: [
          'permissionPurposeDialog 在系统权限前解释用途，并支持 scopeKey 控制频次。',
          'imagePreview.open 支持图片预览、缩放、拖拽和滑动切换。',
          'SliderCaptcha 使用 visible / loadChallenge / verifyChallenge / onVerified 管理验证闭环。',
        ],
      },
    ],
    api: ['toast', 'loading.promise', 'pickerService', 'permissionPurposeDialog', 'imagePreview', 'SliderCaptcha'],
    snippet: `await loading.promise(save(), {\n  loading: 'Saving',\n  success: 'Saved',\n  error: 'Failed',\n});\n\ntoast.success('Done');`,
  },
  tools: {
    title: 'zkit-tools',
    description:
      '工具库只放 UI 无关的基础能力，用来统一屏幕缩放、字体缩放、设备品牌、运行时配置和路由重复跳转守卫。',
    blocks: [
      {
        title: '尺寸与无障碍',
        items: [
          'wp / sp / scaleSize / scaleFont 统一屏幕与字体缩放。',
          'getMaxFontSizeMultiplier 与组件库文字原语配合，限制极端系统字体导致的布局失控。',
        ],
      },
      {
        title: '运行时与路由',
        items: [
          'getDeviceBrand 归一化设备品牌，Web 或未知运行时稳定返回 unknown。',
          'tryGetRuntimeString 读取运行时配置，缺少 provider 时可给 fallback。',
          'createRouterGuard 拦截短时间重复跳转，减少业务页面误触造成的导航抖动。',
        ],
      },
    ],
    api: ['wp', 'sp', 'getDeviceBrand', 'getMaxFontSizeMultiplier', 'tryGetRuntimeString', 'createRouterGuard'],
    snippet: `import { wp, sp, createRouterGuard } from 'zkit-tools';\n\nconst gap = wp(12);\nconst titleSize = sp(18);\nconst guard = createRouterGuard({ router, lockMs: 700 });`,
  },
};

const enGuides: Record<GuideKey, UsageGuideProps> = {
  foundation: {
    title: 'Text / LoadingSpinner',
    description:
      'The foundation layer standardizes typography, semantic color, truncation, and loading feedback so app screens and library internals share the same cross-platform primitives.',
    blocks: [
      {
        title: 'Text coverage',
        items: [
          'variant / size / weight / tone compose headings, body copy, labels, captions, and code-like text.',
          'truncate / numberOfLines / align / transform cover clipping, alignment, and casing.',
          'Font scaling caps and Android font padding defaults keep visual height stable across platforms.',
        ],
      },
      {
        title: 'LoadingSpinner coverage',
        items: [
          'size / color control lightweight progress feedback for buttons, lists, empty states, and services.',
          'Custom visual sizes should still use wp(...) to keep density predictable.',
        ],
      },
    ],
    api: ['Text', 'variant', 'size', 'weight', 'tone', 'truncate', 'LoadingSpinner', 'size', 'color'],
    snippet: `import { Text, LoadingSpinner } from 'zkit-ui';\nimport { wp } from 'zkit-tools';\n\n<Text variant="title" weight="bold">Title</Text>\n<Text tone="muted" truncate={2}>Body copy</Text>\n<LoadingSpinner size={wp(24)} color="#1F5EFF" />`,
  },
  button: {
    title: 'Button',
    description:
      'Button is the primary action primitive. The long-term API stays centered on variant / tone / size / shape, with precise overrides grouped under layout, colors, border, gradient, and shadow.',
    blocks: [
      {
        title: 'Visual model',
        items: [
          'variant covers solid / soft / outline / ghost / link, while tone covers primary / neutral / success / warning / danger / info.',
          'size runs from xs to xl, shape covers rounded / pill / square, and block creates full-width actions.',
          'colors / border / layout are escape hatches without expanding one-off style props.',
        ],
      },
      {
        title: 'Interaction states',
        items: [
          'loading supports inline and overlay modes, disabling interaction without forcing disabled styling.',
          'icon / iconPlacement / iconOnly cover icon buttons; iconOnly needs an accessibilityLabel.',
          'pressEffect, gradient, and shadow stay inside the component to avoid app-level animation drift.',
        ],
      },
    ],
    api: ['variant', 'tone', 'size', 'shape', 'block', 'loading', 'icon', 'iconOnly', 'layout', 'colors'],
    snippet: `import { Button } from 'zkit-ui';\n\n<Button variant="solid" tone="primary">Primary</Button>\n<Button variant="outline" tone="danger">Danger</Button>\n<Button loading loadingMode="overlay">Saving</Button>`,
  },
  textInput: {
    title: 'TextInput',
    description:
      'TextInput is the unified text field entry point: it owns labels, helper copy, feedback, count, clear actions, affixes, theme color, and cross-platform input defaults while keeping value / defaultValue / onChange as the state model.',
    blocks: [
      {
        title: 'State model and native input',
        items: [
          'value / defaultValue / onChange cover controlled, uncontrolled, and business value changes; onNativeChange keeps access to the native event.',
          'onSubmit receives the current value, while keyboardType / inputMode / returnKeyType / autoCapitalize and related native props continue to pass through.',
          'clearable / onClear / clearIcon and showCount / renderCount synchronize the internal value so Android, iOS, and Web keep the same clear semantics.',
        ],
      },
      {
        title: 'Field structure and feedback',
        items: [
          'label / labelAction / required / description / error compose a full form field; error automatically enters the error state, while invalid covers no-copy error states.',
          'prefix / suffix accept strings, numbers, icons, or custom nodes; readOnly and disabled stay separate.',
          'maxLength, showCount, renderCount, multiline, minRows, and maxRows cover short text, long text, and counter display.',
        ],
      },
      {
        title: 'Visuals, sizing, and platforms',
        items: [
          'variant covers outline / filled / plain, while tone and status cover primary, success, warning, danger, info, and related feedback.',
          'size covers sm / md / lg; layout, colors, color, and style props are escape hatches, with visual pixels still passed through wp(...).',
          'selectionColor / cursorColor / selectionHandleColor align the cursor, selection, and handles; Web maps cursorColor to caretColor.',
        ],
      },
    ],
    api: ['value', 'defaultValue', 'onChange', 'onSubmit', 'label', 'error', 'clearable', 'showCount', 'variant', 'layout'],
    snippet: `const [note, setNote] = React.useState('');\n\n<TextInput\n  label="Note"\n  value={note}\n  onChange={setNote}\n  clearable\n  showCount\n  maxLength={120}\n/>`,
  },
  switch: {
    title: 'Switch',
    description:
      'Switch is an independent boolean control for immediately enabling or disabling settings. It uses checked / defaultChecked / onCheckedChange and a drawn Pressable + Reanimated path for consistent cross-platform motion.',
    blocks: [
      {
        title: 'State, interaction, and accessibility',
        items: [
          'checked / defaultChecked support controlled and uncontrolled usage; controlled mode follows checked exactly, while uncontrolled mode advances the UI animation before syncing state.',
          'disabled and loading both block toggling; loading sets accessibilityState.busy and renders a default or custom loadingIndicator in the thumb.',
          'The root always uses accessibilityRole="switch"; label can infer accessibilityLabel, and stateText feeds accessibilityValue.',
        ],
      },
      {
        title: 'Content, size, and tone',
        items: [
          'label / description / labelPlacement cover setting-row copy; children and render-prop children support fully custom content.',
          'size covers sm / md / lg, while tone covers primary / neutral / success / warning / danger / info.',
          'stateText is for very short track labels; the component estimates text width and preserves thumb travel space.',
        ],
      },
      {
        title: 'Overrides and motion',
        items: [
          'color, colors, and layout override the main color, structured colors, and track/thumb geometry; pixel values should still be passed through wp(...).',
          'trackStyle / thumbStyle / contentStyle / labelStyle / descriptionStyle / stateTextStyle are final escape hatches.',
          'duration controls value transition timing, while pressed and focus feedback keep a consistent internal rhythm.',
        ],
      },
    ],
    api: ['checked', 'defaultChecked', 'onCheckedChange', 'loading', 'stateText', 'labelPlacement', 'children', 'colors', 'layout'],
    snippet: `const [enabled, setEnabled] = React.useState(true);\n\n<Switch\n  checked={enabled}\n  onCheckedChange={setEnabled}\n  label="Notifications"\n  description="Receive system messages when enabled"\n  stateText={{ checked: 'On', unchecked: 'Off' }}\n/>`,
  },
  checkbox: {
    title: 'Checkbox',
    description:
      'Checkbox is the independent multi-select control for agreements, batch selection, and tri-state select-all. Single items use checked / defaultChecked / onChange, while CheckboxGroup manages a value array.',
    blocks: [
      {
        title: 'State model',
        items: [
          'checked supports boolean and indeterminate values; controlled mode follows external state, while defaultChecked initializes uncontrolled state.',
          'disabled blocks interaction without losing current state; label / description / labelPlacement compose readable touch rows.',
          'showIndicator=false and render-prop children can turn Checkbox into a fully custom card.',
        ],
      },
      {
        title: 'CheckboxGroup',
        items: [
          'value / defaultValue / onChange manage selected values for multi-select forms and batch actions.',
          'orientation / wrap / align / gap / rowGap / columnGap control layout; group-level size / tone / variant / shape can be overridden per item.',
          'A select-all entry can use checked="indeterminate" for partially selected state.',
        ],
      },
      {
        title: 'Visuals and overrides',
        items: [
          'size covers sm / md / lg, variant covers solid / soft / outline, and shape covers rounded / square / circle.',
          'tone, color, colors, layout, and duration override semantic color, structured colors, geometry, and motion timing.',
          'indicator, contentStyle, indicatorStyle, labelStyle, descriptionStyle, and accessibilityState are final escape hatches.',
        ],
      },
    ],
    api: ['checked', 'defaultChecked', 'onChange', 'CheckboxGroup', 'value', 'variant', 'shape', 'indicator', 'layout', 'colors'],
    snippet: `const [items, setItems] = React.useState(['motion']);\n\n<CheckboxGroup value={items} onChange={setItems}>\n  <Checkbox value="motion" label="Motion tokens" />\n  <Checkbox value="forms" label="Form controls" />\n</CheckboxGroup>`,
  },
  radio: {
    title: 'Radio',
    description:
      'Radio is the independent mutually exclusive choice control for settings and plan selection. Single items support checked / defaultChecked / allowDeselect, while RadioGroup manages one value.',
    blocks: [
      {
        title: 'State model',
        items: [
          'RadioGroup uses value / defaultValue / onChange for one selected value, and onChange can return null when selection is cleared.',
          'allowDeselect lets a selected radio clear itself; disabled blocks interaction without losing visual state.',
          'Standalone Radio can use checked / onChange directly or receive state from RadioGroup.',
        ],
      },
      {
        title: 'Content and layout',
        items: [
          'label / description / labelPlacement cover option copy; render-prop children support custom option cards.',
          'orientation / wrap / align / gap / rowGap / columnGap control group layout.',
          'Group-level size / tone / variant / color / colors / layout provide defaults that each item can override.',
        ],
      },
      {
        title: 'Visuals and overrides',
        items: [
          'size covers sm / md / lg, variant covers outline / soft / solid, and tone covers primary / neutral / success / warning / danger / info.',
          'indicator replaces the selected mark; showIndicator=false is for card-style radio options.',
          'contentStyle, indicatorStyle, labelStyle, descriptionStyle, accessibilityState, and duration cover final details.',
        ],
      },
    ],
    api: ['value', 'defaultValue', 'onChange', 'allowDeselect', 'RadioGroup', 'variant', 'indicator', 'layout', 'colors'],
    snippet: `const [density, setDensity] = React.useState('comfortable');\n\n<RadioGroup value={density} onChange={setDensity}>\n  <Radio value="compact" label="Compact" />\n  <Radio value="comfortable" label="Comfortable" />\n</RadioGroup>`,
  },
  surfaces: {
    title: 'Accordion / BottomSheet / LinkedScroll',
    description:
      'Surface components handle expansion, sheet presentation, and scroll-linked navigation. Motion, gestures, and scroll frames prefer native or Reanimated paths.',
    blocks: [
      {
        title: 'Accordion coverage',
        items: [
          'Supports single / multiple state, controlled or uncontrolled open values, plus itemGap / size / variant layout.',
          'AccordionTrigger / AccordionContent / AccordionIndicator keep a composable API for rich content.',
        ],
      },
      {
        title: 'BottomSheet and LinkedScroll',
        items: [
          'BottomSheet exposes open / defaultOpen / onOpenChange and ref.open() / ref.close().',
          'detents / maxHeight / backdrop / handle cover common sheet specifications across iOS, Android, and Web.',
          'LinkedScroll synchronizes a side menu and content panes; the live demo opens as an independent route-like page.',
        ],
      },
    ],
    api: ['Accordion', 'open', 'defaultOpen', 'BottomSheet', 'detents', 'ref.open()', 'LinkedScroll', 'value'],
    snippet: `<Accordion defaultValue="state" variant="card">\n  <AccordionItem value="state">\n    <AccordionTrigger title="State" />\n    <AccordionContent>...</AccordionContent>\n  </AccordionItem>\n</Accordion>\n\n<BottomSheet ref={sheetRef} detents={['content', 0.72]} />`,
  },
  pickers: {
    title: 'Picker / DatePicker / AddressCascader / BetweenTime',
    description:
      'Picker flows cover single-column, cascaded, date, address, and date-range selection with one trigger, sheet lifecycle, and commit model.',
    blocks: [
      {
        title: 'Picker coverage',
        items: [
          'options support flat lists and tree children, while value can be a primitive or path array.',
          'onChange returns both value and selection; separator / title / children render prop customize display.',
        ],
      },
      {
        title: 'Date and address',
        items: [
          'DatePicker supports min / max / precision / labelFormat / isDateDisabled.',
          'AddressCascader separates value and label control for province / city / district flows.',
          'BetweenTime supports start / end / quickDate for date-range confirmation.',
        ],
      },
    ],
    api: ['Picker', 'options', 'value', 'onChange', 'DatePicker', 'AddressCascader', 'BetweenTime', 'quickDate'],
    snippet: `<Picker options={options} value={value} onChange={handleChange}>\n  {({ label }) => <FieldTrigger label="Language" value={label} />}\n</Picker>\n\n<DatePicker value={date} onChange={setDate} min="2024-01-01" />`,
  },
  services: {
    title: 'Provider Services',
    description:
      'Provider services mount toast, loading, picker, permission purpose, image preview, and captcha flows under ComponentLibProvider for command-style app usage.',
    blocks: [
      {
        title: 'Global services',
        items: [
          'toast.success / warning / error / info cover lightweight feedback.',
          'loading.promise binds async task status to loading, success, and error copy.',
          'pickerService.pick reuses Picker sheet behavior without declarative mounting.',
        ],
      },
      {
        title: 'Advanced interactions',
        items: [
          'permissionPurposeDialog explains permission usage before the system prompt and supports scopeKey frequency control.',
          'imagePreview.open supports zoom, pan, and swipe image preview.',
          'SliderCaptcha uses visible / loadChallenge / verifyChallenge / onVerified to close the verification loop.',
        ],
      },
    ],
    api: ['toast', 'loading.promise', 'pickerService', 'permissionPurposeDialog', 'imagePreview', 'SliderCaptcha'],
    snippet: `await loading.promise(save(), {\n  loading: 'Saving',\n  success: 'Saved',\n  error: 'Failed',\n});\n\ntoast.success('Done');`,
  },
  tools: {
    title: 'zkit-tools',
    description:
      'The tools package stays UI-free and standardizes screen scaling, font scaling, device brand, runtime config, and duplicate navigation guarding.',
    blocks: [
      {
        title: 'Scale and accessibility',
        items: [
          'wp / sp / scaleSize / scaleFont unify screen and font scaling.',
          'getMaxFontSizeMultiplier works with text primitives to avoid extreme system font layout breakage.',
        ],
      },
      {
        title: 'Runtime and routing',
        items: [
          'getDeviceBrand normalizes brand values and falls back predictably on Web or unknown runtimes.',
          'tryGetRuntimeString reads runtime config with an optional fallback.',
          'createRouterGuard blocks rapid duplicate navigation to reduce accidental route jitter.',
        ],
      },
    ],
    api: ['wp', 'sp', 'getDeviceBrand', 'getMaxFontSizeMultiplier', 'tryGetRuntimeString', 'createRouterGuard'],
    snippet: `import { wp, sp, createRouterGuard } from 'zkit-tools';\n\nconst gap = wp(12);\nconst titleSize = sp(18);\nconst guard = createRouterGuard({ router, lockMs: 700 });`,
  },
};

function useGuideCopy(key: GuideKey) {
  const { locale } = useI18n();
  return locale.toLowerCase().startsWith('zh') ? zhGuides[key] : enGuides[key];
}

function GuideIntro({ guideKey }: { guideKey: GuideKey }) {
  const guide = useGuideCopy(guideKey);
  return <UsageGuide {...guide} />;
}

export const OverviewGuidePage = HomeScreen;

export const FoundationGuidePage = React.memo(function FoundationGuidePage() {
  return (
    <TabScreenShell withTopInset={false}>
      <FoundationSection />
      <GuideIntro guideKey="foundation" />
    </TabScreenShell>
  );
});

export const ButtonGuidePage = React.memo(function ButtonGuidePage() {
  const [busy, setBusy] = React.useState(false);
  const [centerBusy, setCenterBusy] = React.useState(false);

  const handleBusyDemo = React.useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await wait(1200);
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const handleCenterBusyDemo = React.useCallback(async () => {
    if (centerBusy) return;
    setCenterBusy(true);
    try {
      await wait(1200);
    } finally {
      setCenterBusy(false);
    }
  }, [centerBusy]);

  return (
    <TabScreenShell withTopInset={false}>
      <ButtonsSection
        busy={busy}
        centerBusy={centerBusy}
        onBusyDemo={handleBusyDemo}
        onCenterBusyDemo={handleCenterBusyDemo}
      />
      <GuideIntro guideKey="button" />
    </TabScreenShell>
  );
});

export const TextInputGuidePage = React.memo(function TextInputGuidePage() {
  const { t } = useI18n();
  const [note, setNote] = React.useState(() => t('example.defaultNote'));

  return (
    <TabScreenShell withTopInset={false}>
      <TextInputSection
        note={note}
        onNoteChange={setNote}
      />
      <GuideIntro guideKey="textInput" />
    </TabScreenShell>
  );
});

export const SwitchGuidePage = React.memo(function SwitchGuidePage() {
  const [enabled, setEnabled] = React.useState(true);

  return (
    <TabScreenShell withTopInset={false}>
      <SwitchSection
        enabled={enabled}
        onEnabledChange={setEnabled}
      />
      <GuideIntro guideKey="switch" />
    </TabScreenShell>
  );
});

export const CheckboxGuidePage = React.memo(function CheckboxGuidePage() {
  const [checkedItems, setCheckedItems] = React.useState<string[]>(['motion']);

  return (
    <TabScreenShell withTopInset={false}>
      <CheckboxSection
        checkedItems={checkedItems}
        onCheckedItemsChange={setCheckedItems}
      />
      <GuideIntro guideKey="checkbox" />
    </TabScreenShell>
  );
});

export const RadioGuidePage = React.memo(function RadioGuidePage() {
  const [density, setDensity] = React.useState<Density>('comfortable');

  return (
    <TabScreenShell withTopInset={false}>
      <RadioSection
        density={density}
        onDensityChange={setDensity}
      />
      <GuideIntro guideKey="radio" />
    </TabScreenShell>
  );
});

export const PickersGuidePage = React.memo(function PickersGuidePage() {
  const { t } = useI18n();
  const [language, setLanguage] = React.useState('en');
  const [languageLabel, setLanguageLabel] = React.useState(() => t('example.language.en'));
  const [workflow, setWorkflow] = React.useState<PickerValue>(['design', 'tokens']);
  const [workflowLabel, setWorkflowLabel] = React.useState(() => t('example.workflow.designTokens'));
  const [date, setDate] = React.useState('2026-04-23');
  const [dateLabel, setDateLabel] = React.useState('2026-04-23');
  const [address, setAddress] = React.useState<string[]>(['110000', '110100', '110101']);
  const [addressLabel, setAddressLabel] = React.useState(() => t('example.address.default'));
  const [range, setRange] = React.useState<string[]>(['2026-04-01', '2026-04-23']);

  const rangeLabel = React.useMemo(
    () => (range.length === 2 ? `${range[0]} ${t('example.common.to')} ${range[1]}` : t('example.range.select')),
    [range, t]
  );

  return (
    <TabScreenShell withTopInset={false}>
      <PickersSection
        address={address}
        addressLabel={addressLabel}
        date={date}
        dateLabel={dateLabel}
        language={language}
        languageLabel={languageLabel}
        range={range}
        rangeLabel={rangeLabel}
        workflow={workflow}
        workflowLabel={workflowLabel}
        onAddressChange={setAddress}
        onAddressLabelChange={setAddressLabel}
        onDateChange={setDate}
        onDateLabelChange={setDateLabel}
        onLanguageChange={setLanguage}
        onLanguageLabelChange={setLanguageLabel}
        onRangeChange={setRange}
        onWorkflowChange={setWorkflow}
        onWorkflowLabelChange={setWorkflowLabel}
      />
      <GuideIntro guideKey="pickers" />
    </TabScreenShell>
  );
});

export const SurfacesGuidePage = React.memo(function SurfacesGuidePage() {
  const { width: screenWidth } = useWindowDimensions();
  const [linkedScrollMounted, setLinkedScrollMounted] = React.useState(false);
  const linkedRouteProgress = useSharedValue(0);

  const completeLinkedScrollClose = React.useCallback(() => {
    setLinkedScrollMounted(false);
  }, []);

  const openLinkedScrollDemo = React.useCallback(() => {
    linkedRouteProgress.value = 0;
    setLinkedScrollMounted(true);
    requestAnimationFrame(() => {
      linkedRouteProgress.value = withTiming(1, {
        duration: ROUTE_PUSH_DURATION,
        easing: Easing.out(Easing.cubic),
      });
    });
  }, [linkedRouteProgress]);

  const closeLinkedScrollDemo = React.useCallback(() => {
    linkedRouteProgress.value = withTiming(
      0,
      {
        duration: ROUTE_POP_DURATION,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) runOnJS(completeLinkedScrollClose)();
      }
    );
  }, [completeLinkedScrollClose, linkedRouteProgress]);

  React.useEffect(() => {
    if (!linkedScrollMounted) return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeLinkedScrollDemo();
      return true;
    });

    return () => subscription.remove();
  }, [closeLinkedScrollDemo, linkedScrollMounted]);

  const linkedRouteAnimatedStyle = useAnimatedStyle(
    () => ({
      opacity: linkedRouteProgress.value,
      transform: [{ translateX: (1 - linkedRouteProgress.value) * screenWidth }],
    }),
    [screenWidth]
  );

  return (
    <View
      style={[
        sharedStyles.linkedRouteHost,
        linkedScrollMounted ? sharedStyles.linkedRouteHostActive : null,
      ]}
    >
      <TabScreenShell withTopInset={false}>
        <SurfacesSection onOpenLinkedScroll={openLinkedScrollDemo} />
        <GuideIntro guideKey="surfaces" />
      </TabScreenShell>
      {linkedScrollMounted ? (
        <Animated.View style={[sharedStyles.linkedRouteLayer, linkedRouteAnimatedStyle]}>
          <LinkedScrollDemo onBack={closeLinkedScrollDemo} />
        </Animated.View>
      ) : null}
    </View>
  );
});

export const ServicesGuidePage = React.memo(function ServicesGuidePage() {
  const { t } = useI18n();

  const [serviceChoice, setServiceChoice] = React.useState('tokens');
  const [captchaVisible, setCaptchaVisible] = React.useState(false);

  const handleGlobalPicker = React.useCallback(async () => {
    const result = await pickerService.pick({
      options: [
        { value: 'tokens', label: t('example.area.tokens') },
        { value: 'forms', label: t('example.area.forms') },
        { value: 'overlays', label: t('example.area.overlays') },
      ],
      value: serviceChoice,
      title: t('example.globalPicker.title'),
    });

    if (!result) return;
    setServiceChoice(String(result.value));
    toast.info(t('example.toast.selected', { label: result.label }), { duration: 1200 });
  }, [serviceChoice, t]);

  const handleLoading = React.useCallback(async () => {
    await loading.promise(wait(900), {
      loading: t('example.loading.loading'),
      success: t('example.loading.success'),
      error: t('example.loading.error'),
    });
  }, [t]);

  const handlePermissionPurpose = React.useCallback(() => {
    const purpose = permissionPurposeDialog.show({
      permission: 'camera',
      title: t('example.permission.title'),
      message: t('example.permission.message'),
      scopeKey: 'example-camera',
    });

    setTimeout(() => {
      purpose.hide();
    }, 2600);
  }, [t]);

  const openCaptcha = React.useCallback(() => {
    setCaptchaVisible(true);
  }, []);

  const closeCaptcha = React.useCallback(() => {
    setCaptchaVisible(false);
  }, []);

  const verifyCaptcha = React.useCallback(
    async (payload: { progress: number }) => {
      await wait(240);
      return payload.progress > 0.24
        ? { success: true }
        : { success: false, message: t('example.captcha.slideFarther') };
    },
    [t]
  );

  const handleCaptchaVerified = React.useCallback(() => {
    setCaptchaVisible(false);
    toast.success(t('example.captcha.verifiedToast'), { duration: 1200 });
  }, [t]);

  return (
    <>
      <TabScreenShell withTopInset={false}>
        <ServicesSection
          serviceChoice={t(`example.area.${serviceChoice}`)}
          onCaptchaOpen={openCaptcha}
          onGlobalPicker={handleGlobalPicker}
          onLoading={handleLoading}
          onPermissionPurpose={handlePermissionPurpose}
        />
        <GuideIntro guideKey="services" />
      </TabScreenShell>

      <SliderCaptcha
        visible={captchaVisible}
        onClose={closeCaptcha}
        loadChallenge={() => captchaChallenge}
        verifyChallenge={verifyCaptcha}
        onVerified={handleCaptchaVerified}
        texts={{
          title: t('example.captcha.title'),
          verifyFailed: t('example.captcha.failed'),
          verifySuccess: t('example.captcha.success'),
        }}
      />
    </>
  );
});

export const ToolsGuidePage = React.memo(function ToolsGuidePage() {
  const { t } = useI18n();
  const [routerGuardStatus, setRouterGuardStatus] = React.useState(() => t('example.router.ready'));

  const handleRouterGuardDemo = React.useCallback(() => {
    const events: string[] = [];
    const router = {
      push: (path: string) => {
        events.push(`push ${path}`);
      },
      replace: (path: string) => {
        events.push(`replace ${path}`);
      },
      navigate: (path: string) => {
        events.push(`navigate ${path}`);
      },
      back: () => {
        events.push('back');
      },
    };

    const guard = createRouterGuard({ router, lockMs: 700 });
    router.push('/components');
    router.push('/components');
    router.back();
    guard.destroy();

    setRouterGuardStatus(events.length === 2 ? t('example.router.blocked') : events.join(' -> '));
    toast.info(t('example.router.tested'), { duration: 1200 });
  }, [t]);

  return (
    <TabScreenShell withTopInset={false}>
      <ToolsSection
        routerGuardStatus={routerGuardStatus}
        onRouterGuardDemo={handleRouterGuardDemo}
      />
      <GuideIntro guideKey="tools" />
    </TabScreenShell>
  );
});
