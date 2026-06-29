import * as React from 'react';
import type {
  SheetCloseOptions,
  SheetOpenOptions,
  SheetState,
} from './types';

export type NativeBottomSheetOpenChangeDetails = {
  reason: 'api' | 'backdrop' | 'back' | 'gesture' | 'system';
  detentIndex: number;
};

export type NativeBottomSheetCloseCompleteDetails = {
  reason: 'api' | 'backdrop' | 'back' | 'gesture' | 'system';
  detentIndex: number;
};

export type NativeBottomSheetRef = {
  open: (options?: SheetOpenOptions) => Promise<void>;
  close: (options?: SheetCloseOptions) => Promise<void>;
  snapTo: (detentIndex: number) => Promise<void>;
  getState: () => SheetState;
};

export const NativeBottomSheet = React.forwardRef<NativeBottomSheetRef, Record<string, unknown>>(
  function NativeBottomSheet(_, ref) {
    React.useImperativeHandle(
      ref,
      () => ({
        open: async () => {},
        close: async () => {},
        snapTo: async () => {},
        getState: () => 'closed',
      }),
      []
    );

    return null;
  }
);
