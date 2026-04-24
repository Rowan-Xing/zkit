import { type TrueSheetRefMethods } from './TrueSheetProvider.web';
import type { TrueSheetProps } from './TrueSheet.types';
declare const TrueSheetComponent: import("react").ForwardRefExoticComponent<TrueSheetProps & import("react").RefAttributes<TrueSheetRefMethods>>;
interface TrueSheetStatic {
    present: (name: string, index?: number) => Promise<void>;
    dismiss: (name: string) => Promise<void>;
    dismissStack: (name: string) => Promise<void>;
    resize: (name: string, index: number) => Promise<void>;
    dismissAll: () => Promise<void>;
}
export declare const TrueSheet: typeof TrueSheetComponent & TrueSheetStatic;
export {};
//# sourceMappingURL=TrueSheet.web.d.ts.map