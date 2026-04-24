import { type ReactNode, type RefObject } from 'react';
import type { TrueSheetStaticMethods } from './TrueSheetProvider';
import type { TrueSheet } from './TrueSheet';
export type TrueSheetRefMethods = Pick<TrueSheet, 'present' | 'dismiss' | 'resize' | 'dismissStack'>;
interface BottomSheetContextValue extends TrueSheetStaticMethods {
    register: (name: string, methods: RefObject<TrueSheetRefMethods>) => void;
    unregister: (name: string) => void;
    pushToStack: (name: string) => void;
    removeFromStack: (name: string) => void;
    getSheetsAbove: (name: string) => string[];
}
export declare const BottomSheetContext: import("react").Context<BottomSheetContextValue | null>;
export interface TrueSheetProviderProps {
    children: ReactNode;
}
/**
 * Provider for TrueSheet on web.
 * Required to wrap your app for sheet management via useTrueSheet hook.
 */
export declare function TrueSheetProvider({ children }: TrueSheetProviderProps): import("react/jsx-runtime").JSX.Element;
export declare function useTrueSheet(): TrueSheetStaticMethods;
export {};
//# sourceMappingURL=TrueSheetProvider.web.d.ts.map