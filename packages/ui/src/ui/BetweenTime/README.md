# BetweenTime

BetweenTime 是一个高性能的时间区间选择器组件：

- 基于 `react-native-reanimated` 实现流畅的弹窗动画和滚轮交互
- 支持年/月/日/时/分/秒多级精度选择
- 内置快捷时间选择（今天、本周、本月等）
- 双端统一的滚轮选择器体验（iOS/Android）
- 支持受控和非受控两种使用模式

## 基础用法

```tsx
import { BetweenTime } from 'y2kit-ui';
import { Text } from 'react-native';

export function Demo() {
  const [value, setValue] = React.useState<string[]>([]);

  return (
    <BetweenTime
      value={value}
      onValueChange={setValue}
    >
      <Text>{value.length ? value.join(' 至 ') : '请选择时间范围'}</Text>
    </BetweenTime>
  );
}
```

## 精度控制：type

```tsx
import { BetweenTime } from 'y2kit-ui';

export function Demo() {
  return (
    <>
      {/* 只选年份 */}
      <BetweenTime type="year">
        <Text>选择年份</Text>
      </BetweenTime>

      {/* 选择到月份 */}
      <BetweenTime type="month">
        <Text>选择月份</Text>
      </BetweenTime>

      {/* 选择到日期（默认） */}
      <BetweenTime type="day">
        <Text>选择日期</Text>
      </BetweenTime>

      {/* 选择到小时 */}
      <BetweenTime type="hour">
        <Text>选择小时</Text>
      </BetweenTime>

      {/* 选择到分钟 */}
      <BetweenTime type="minute">
        <Text>选择分钟</Text>
      </BetweenTime>

      {/* 选择到秒 */}
      <BetweenTime type="second">
        <Text>选择秒</Text>
      </BetweenTime>
    </>
  );
}
```

说明：

- `type` 决定滚轮列数和输出格式精度
- `year`：1 列（年）
- `month`：2 列（年、月）
- `day`：3 列（年、月、日）- 默认值
- `hour`：4 列（年、月、日、时）
- `minute`：5 列（年、月、日、时、分）
- `second`：6 列（年、月、日、时、分、秒）

## 时间范围限制：start / end

```tsx
import { BetweenTime } from 'y2kit-ui';

export function Demo() {
  return (
    <BetweenTime
      start="2020-01-01"
      end="2025-12-31"
    >
      <Text>限制 2020-2025 年</Text>
    </BetweenTime>
  );
}
```

说明：

- `start`：可选时间的最小值（标准时间格式字符串）
- `end`：可选时间的最大值（标准时间格式字符串）
- 支持的格式：`YYYY`、`YYYY-MM`、`YYYY-MM-DD`、`YYYY-MM-DD HH`、`YYYY-MM-DD HH:mm`、`YYYY-MM-DD HH:mm:ss`

## 快捷选择：quickDate

```tsx
import { BetweenTime } from 'y2kit-ui';

export function Demo() {
  return (
    <BetweenTime
      quickDate={['d', 'w', 'm', 'y', 'q', '7', '30']}
    >
      <Text>带快捷选择</Text>
    </BetweenTime>
  );
}
```

说明：

- `d`：今天
- `w`：本周
- `m`：本月
- `y`：本年
- `q`：本季度
- 数字字符串（如 `'7'`、`'30'`）：最近 N 天

## 自定义格式：format

```tsx
import { BetweenTime } from 'y2kit-ui';

export function Demo() {
  return (
    <>
      {/* 默认格式 */}
      <BetweenTime format="YYYY-MM-DD">
        <Text>2024-01-01 至 2024-12-31</Text>
      </BetweenTime>

      {/* 中文格式 */}
      <BetweenTime format="YYYY年MM月DD日">
        <Text>2024年01月01日 至 2024年12月31日</Text>
      </BetweenTime>

      {/* 带时间格式 */}
      <BetweenTime type="minute" format="YYYY-MM-DD HH:mm">
        <Text>2024-01-01 08:00 至 2024-01-01 18:00</Text>
      </BetweenTime>
    </>
  );
}
```

说明：

- `format` 用于格式化 `modelStr` 的输出以及弹窗内的时间显示
- 支持 dayjs 的所有格式化 token

## 受控模式

```tsx
import { BetweenTime } from 'y2kit-ui';

export function Demo() {
  const [value, setValue] = React.useState<string[]>(['2024-01-01', '2024-12-31']);
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <BetweenTime
        value={value}
        onValueChange={setValue}
        open={open}
        onOpenChange={setOpen}
        onConfirm={({ value }) => console.log('确认:', value)}
        onCancel={() => console.log('取消')}
      >
        <Text>{value.length ? value.join(' 至 ') : '请选择'}</Text>
      </BetweenTime>

      {/* 外部控制打开 */}
      <Button onPress={() => setOpen(true)}>打开选择器</Button>
    </>
  );
}
```

## 非受控模式

```tsx
import { BetweenTime } from 'y2kit-ui';

export function Demo() {
  return (
    <BetweenTime
      defaultValue={['2024-01-01', '2024-12-31']}
      onConfirm={({ value }) => console.log('确认:', value)}
    >
      <Text>点击选择时间</Text>
    </BetweenTime>
  );
}
```

## 懒加载：lazyContent

```tsx
import { BetweenTime } from 'y2kit-ui';

export function Demo() {
  return (
    // lazyContent 默认为 true，无需显式设置
    <BetweenTime>
      <Text>默认懒加载</Text>
    </BetweenTime>
  );
}
```

说明：

- `lazyContent` 默认为 `true`，滚轮内容会在弹窗动画完成后才挂载
- 可以避免弹窗打开时的卡顿，提升动画流畅度
- 如需立即渲染，可设置 `lazyContent={false}`

## 自定义弹窗高度：drawerSize

```tsx
import { BetweenTime } from 'y2kit-ui';
import { wp } from 'y2kit-tools';

export function Demo() {
  return (
    <BetweenTime drawerSize={wp(500)}>
      <Text>自定义高度</Text>
    </BetweenTime>
  );
}
```

## 自定义单位名称：cellUnits

```tsx
import { BetweenTime } from 'y2kit-ui';

export function Demo() {
  return (
    <BetweenTime
      type="day"
      cellUnits={['Year', 'Month', 'Day']}
    >
      <Text>英文单位</Text>
    </BetweenTime>
  );
}
```

说明：

- 默认值：`['年', '月', '日', '时', '分', '秒']`
- 数组长度应与 `type` 对应的列数一致

## 禁用状态：disabled

```tsx
import { BetweenTime } from 'y2kit-ui';

export function Demo() {
  return (
    <BetweenTime disabled>
      <Text>禁用状态</Text>
    </BetweenTime>
  );
}
```

## 格式同步到值：formatSyncValue

```tsx
import { BetweenTime } from 'y2kit-ui';

export function Demo() {
  const [value, setValue] = React.useState<string[]>([]);

  return (
    <BetweenTime
      value={value}
      onValueChange={setValue}
      format="YYYY年MM月DD日"
      formatSyncValue
    >
      <Text>格式同步到值</Text>
    </BetweenTime>
  );
  // value 将是 ['2024年01月01日', '2024年12月31日'] 而不是 ['2024-01-01', '2024-12-31']
}
```

说明：

- 默认情况下，`modelValue` 输出标准格式（如 `YYYY-MM-DD`）
- 开启 `formatSyncValue` 后，`modelValue` 会使用 `format` 指定的格式
- 注意：开启后必须保证 `format` 输出仍是可解析的时间格式

---

## Props（完整清单）

### 值相关

#### value

- **类型**：`string[]`
- **说明**：当前选中的时间区间值（受控模式）
- **示例**：`['2024-01-01', '2024-12-31']`

#### defaultValue

- **类型**：`string[]`
- **说明**：默认时间区间值（非受控模式）
- **示例**：`['2024-01-01', '2024-12-31']`

#### onValueChange

- **类型**：`(next: string[]) => void`
- **说明**：时间值变化时的回调函数

### 弹窗控制

#### open

- **类型**：`boolean`
- **说明**：弹窗显示状态（受控模式）

#### defaultOpen

- **类型**：`boolean`
- **默认值**：`false`
- **说明**：默认弹窗显示状态（非受控模式）

#### onOpenChange

- **类型**：`(next: boolean) => void`
- **说明**：弹窗状态变化时的回调函数

#### title

- **类型**：`string`
- **默认值**：`'请选择时间'`
- **说明**：弹窗顶部标题

#### drawerSize

- **类型**：`string | number`
- **说明**：弹窗高度（数字或可解析为数字的字符串）
- **示例**：`500`、`'500'`

#### lazyContent

- **类型**：`boolean`
- **默认值**：`true`
- **说明**：是否懒加载弹窗内容（避免复杂内容影响开启动画）

### 时间配置

#### type

- **类型**：`'year' | 'month' | 'day' | 'hour' | 'minute' | 'second'`
- **默认值**：`'day'`
- **说明**：时间精度级别，决定滚轮列数和输出格式
- **对应列数**：
  - `year`：1 列
  - `month`：2 列
  - `day`：3 列
  - `hour`：4 列
  - `minute`：5 列
  - `second`：6 列

#### start

- **类型**：`string`
- **说明**：可选时间范围的最小值（标准时间格式）
- **示例**：`'2020-01-01'`、`'2020-01-01 00:00:00'`

#### end

- **类型**：`string`
- **说明**：可选时间范围的最大值（标准时间格式）
- **示例**：`'2025-12-31'`、`'2025-12-31 23:59:59'`

#### format

- **类型**：`string`
- **默认值**：`'YYYY-MM-DD'`
- **说明**：时间格式化模板（用于 `modelStr` 输出和弹窗内显示）
- **示例**：`'YYYY-MM-DD'`、`'YYYY年MM月DD日'`、`'YYYY-MM-DD HH:mm:ss'`

#### formatSyncValue

- **类型**：`boolean`
- **默认值**：`false`
- **说明**：是否将 `format` 格式化后的值同步到 `modelValue`
- **注意**：开启后必须保证 `format` 输出仍是可解析的标准时间格式

#### cellUnits

- **类型**：`string[]`
- **默认值**：`['年', '月', '日', '时', '分', '秒']`
- **说明**：滚轮列头的单位名称

#### quickDate

- **类型**：`string[]`
- **说明**：快捷时间选择按钮配置
- **可选值**：
  - `'d'`：今天
  - `'w'`：本周
  - `'m'`：本月
  - `'y'`：本年
  - `'q'`：本季度
  - 数字字符串（如 `'7'`）：最近 N 天
- **示例**：`['d', 'w', 'm', '7', '30']`

### 状态

#### disabled

- **类型**：`boolean`
- **默认值**：`false`
- **说明**：禁用打开弹窗

### 回调函数

#### onConfirm

- **类型**：`(payload: { value: string[] }) => void`
- **说明**：点击确认按钮时的回调
- **参数**：`payload.value` 为选中的时间区间数组

#### onCancel

- **类型**：`() => void`
- **说明**：点击取消按钮或遮罩关闭时的回调

### 触发器

#### children

- **类型**：`React.ReactNode`
- **说明**：触发打开选择器的子节点
- **行为**：
  - 如果 `children` 是带有 `onPress` 的组件，会自动合并点击事件
  - 否则会包裹在 `Pressable` 中

---

## 标准时间格式

组件内部支持以下标准输入格式：

| 格式 | 示例 |
|------|------|
| `YYYY` | `2024` |
| `YYYY-M` | `2024-1` |
| `YYYY-MM` | `2024-01` |
| `YYYY-M-D` | `2024-1-1` |
| `YYYY-MM-DD` | `2024-01-01` |
| `YYYY-MM-DDHH` | `2024-01-0108` |
| `YYYY-MM-DD HH` | `2024-01-01 08` |
| `YYYY-MM-DDHH:mm` | `2024-01-0108:30` |
| `YYYY-MM-DD HH:mm` | `2024-01-01 08:30` |
| `YYYY-MM-DDHH:mm:ss` | `2024-01-0108:30:00` |
| `YYYY-MM-DD HH:mm:ss` | `2024-01-01 08:30:00` |

---

## 性能优化说明

BetweenTime 组件已针对性能进行了以下优化：

1. **延迟挂载**：使用 `InteractionManager.runAfterInteractions` 延迟挂载滚轮内容，避免弹窗动画卡顿
2. **渐变遮罩**：使用静态 `LinearGradient` 替代逐项动画，减少动画计算开销
3. **ScrollView 替代 FlatList**：对于数量有限的选项，直接渲染比虚拟化更高效
4. **数据缓存**：缓存常用的选项数组，避免重复创建

建议在低端设备上开启 `lazyContent` 以获得最佳体验。
