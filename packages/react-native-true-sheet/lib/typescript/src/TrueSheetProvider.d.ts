import type { ReactNode } from 'react';
import { TrueSheet } from './TrueSheet';
export type TrueSheetStaticMethods = Pick<typeof TrueSheet, 'present' | 'dismiss' | 'dismissStack' | 'resize' | 'dismissAll'>;
export interface TrueSheetProviderProps {
    children: ReactNode;
}
/**
 * Provider for TrueSheet on native platforms.
 * This is a pass-through component - no context is needed on native
 * since TrueSheet uses static instance methods internally.
 */
export declare function TrueSheetProvider({ children }: TrueSheetProviderProps): ReactNode;
/**
 * Hook to control TrueSheet instances by name.
 * On native, this maps directly to TrueSheet static methods.
 */
export declare function useTrueSheet(): TrueSheetStaticMethods;
//# sourceMappingURL=TrueSheetProvider.d.ts.map