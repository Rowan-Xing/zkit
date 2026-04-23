import * as React from 'react';
import { areaList } from '@vant/area-data';
import { useI18n } from '../../i18n/useI18n';
import { Picker, type PickerHandle, type PickerModelValue, type PickerTreeNode } from '../Picker';

export type AddressCascaderHandle = PickerHandle;

// 懒加载转换省市区数据
let cachedAreaData: PickerTreeNode[] | null = null;

function getAreaData(): PickerTreeNode[] {
  if (cachedAreaData) return cachedAreaData;

  const { province_list, city_list, county_list } = areaList;
  const provinces: PickerTreeNode[] = [];

  for (const [pCode, pName] of Object.entries(province_list)) {
    const cities: PickerTreeNode[] = [];
    const pPrefix = pCode.slice(0, 2);

    for (const [cCode, cName] of Object.entries(city_list)) {
      if (!cCode.startsWith(pPrefix)) continue;
      const counties: PickerTreeNode[] = [];
      const cPrefix = cCode.slice(0, 4);

      for (const [dCode, dName] of Object.entries(county_list)) {
        if (!dCode.startsWith(cPrefix)) continue;
        counties.push({ value: dCode, text: dName as string });
      }

      cities.push({ value: cCode, text: cName as string, children: counties });
    }

    provinces.push({ value: pCode, text: pName as string, children: cities });
  }

  cachedAreaData = provinces;
  return provinces;
}

export type AddressCascaderValue = string[];

export type AddressCascaderConfirmPayload = {
  value: AddressCascaderValue;
  values: string[];
  label: string;
  labels: string[];
  items: PickerTreeNode[];
};

export type AddressCascaderChangePayload = AddressCascaderConfirmPayload;

export type AddressCascaderProps = {
  list?: PickerTreeNode[];

  value?: AddressCascaderValue;
  defaultValue?: AddressCascaderValue;
  onValueChange?: (next: AddressCascaderValue) => void;

  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (next: boolean) => void;
  onDismissComplete?: () => void;

  label?: string;
  defaultLabel?: string;
  onLabelChange?: (next: string) => void;

  title?: string;
  separator?: string;

  lazyContent?: boolean;
  drawerSize?: string | number;
  disabled?: boolean;

  onCancel?: () => void;
  onConfirm?: (payload: AddressCascaderConfirmPayload) => void;
  onChange?: (payload: AddressCascaderChangePayload) => void;

  children?: React.ComponentProps<typeof Picker>['children'];
};

function normalizeToStringArray(v: PickerModelValue): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string' || typeof v === 'number') return [String(v)];
  return [];
}

export const AddressCascader = React.forwardRef<AddressCascaderHandle, AddressCascaderProps>(function AddressCascader({
  list,
  value,
  defaultValue,
  onValueChange,
  open,
  defaultOpen,
  onOpenChange,
  onDismissComplete,
  label,
  defaultLabel,
  onLabelChange,
  title,
  separator = '-',
  lazyContent,
  drawerSize,
  disabled,
  onCancel,
  onConfirm,
  onChange,
  children,
}, ref) {
  const { t } = useI18n();

  const handleValueChange = React.useCallback(
    (next: PickerModelValue) => {
      onValueChange?.(normalizeToStringArray(next));
    },
    [onValueChange]
  );

  const handleConfirm = React.useCallback(
    (payload: any) => {
      onConfirm?.({
        value: normalizeToStringArray(payload?.value),
        values: Array.isArray(payload?.values) ? payload.values.map(String) : [],
        label: String(payload?.label ?? ''),
        labels: Array.isArray(payload?.labels) ? payload.labels.map(String) : [],
        items: Array.isArray(payload?.items) ? payload.items : [],
      });
    },
    [onConfirm]
  );

  const handleChange = React.useCallback(
    (payload: any) => {
      onChange?.({
        value: normalizeToStringArray(payload?.value),
        values: Array.isArray(payload?.values) ? payload.values.map(String) : [],
        label: String(payload?.label ?? ''),
        labels: Array.isArray(payload?.labels) ? payload.labels.map(String) : [],
        items: Array.isArray(payload?.items) ? payload.items : [],
      });
    },
    [onChange]
  );

  const areaData = React.useMemo(() => list ?? getAreaData(), [list]);

  return (
    <Picker
      ref={ref}
      list={areaData}
      value={value}
      defaultValue={defaultValue}
      onValueChange={handleValueChange}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      onDismissComplete={onDismissComplete}
      label={label}
      defaultLabel={defaultLabel}
      onLabelChange={onLabelChange}
      title={title ?? t('addressCascader.title')}
      rangKey="value"
      rangText="text"
      modelStrSeparator={separator}
      lazyContent={lazyContent}
      drawerSize={drawerSize}
      disabled={disabled}
      onCancel={onCancel}
      onConfirm={handleConfirm}
      onChange={handleChange}
    >
      {children}
    </Picker>
  );
});
