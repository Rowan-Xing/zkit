# LinkedScroll

`LinkedScroll` 是一个通用的菜单/内容滚动联动容器，适合分类、锚点导航、分区内容浏览等无业务语义场景。

组件内部基于 `@shopify/flash-list`，应用侧需要安装并满足该 peer dependency。

## 基础用法

```tsx
import { View } from 'react-native';
import { Text } from 'zkit-ui/text';
import { LinkedScroll } from 'zkit-ui/linked-scroll';
import { wp } from 'zkit-tools';

const items = [
  { value: 'jiangxi', label: '江西省9' },
  { value: 'anhui', label: '安徽10' },
  { value: 'fujian', label: '福建11' },
];

<LinkedScroll
  items={items}
  defaultValue="jiangxi"
  onChange={(value, item, meta) => {
    console.log(value, item.label, meta.source);
  }}
  renderSection={({ item }) => (
    <View
      style={{
        minHeight: wp(260),
        borderRadius: wp(18),
        backgroundColor: '#F4F5FA',
        padding: wp(18),
      }}
    >
      <Text>{item.label}</Text>
    </View>
  )}
/>
```

## API 设计

- `items`：菜单和内容分区的数据源，`value` 必须在列表内唯一。
- `value` / `defaultValue`：当前选中分区，支持受控和非受控模式。
- `onChange(value, item, meta)`：选中分区变化；`meta.source` 为 `menu` 或 `content`。
- `renderSection`：必填，渲染右侧内容分区。
- `renderMenuItem`：可选，完全自定义菜单项；回调参数内的 `press` 用于触发联动滚动。
- `getMenuItemType` / `getSectionType`：为不同形态的菜单项或内容分区提供回收类型，语义与 `FlashList.getItemType` 一致。
- `menuListProps` / `contentListProps`：列表 escape hatch，核心联动 props 由组件内部接管。

## 性能说明

- 两侧均基于 `FlashList`，避免长列表一次性渲染，并优先保证复杂内容块的回收性能。
- 内容联动依赖 `onViewableItemsChanged`，只在可见分区变化时更新选中态，不做每帧 `onScroll` 计算。
- 菜单项默认固定高度；复杂内容类型差异较大时建议传入 `getSectionType`，提升回收稳定性。
