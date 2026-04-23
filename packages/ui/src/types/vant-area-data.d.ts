declare module '@vant/area-data' {
  export type AreaList = {
    province_list: Record<string, string>;
    city_list: Record<string, string>;
    county_list: Record<string, string>;
  };

  export const areaList: AreaList;

  export type CascaderNode = {
    text: string;
    value: string;
    children?: CascaderNode[];
    disabled?: boolean;
  };

  export function useCascaderAreaData(): CascaderNode[];
}

