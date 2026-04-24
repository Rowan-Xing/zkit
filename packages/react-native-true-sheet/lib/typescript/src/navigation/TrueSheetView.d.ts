import type { ParamListBase } from '@react-navigation/native';
import type { TrueSheetDescriptorMap, TrueSheetNavigationHelpers, TrueSheetNavigationState } from './types';
interface TrueSheetViewProps {
    state: TrueSheetNavigationState<ParamListBase>;
    navigation: TrueSheetNavigationHelpers;
    descriptors: TrueSheetDescriptorMap;
}
export declare const TrueSheetView: ({ state, navigation, descriptors }: TrueSheetViewProps) => import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=TrueSheetView.d.ts.map