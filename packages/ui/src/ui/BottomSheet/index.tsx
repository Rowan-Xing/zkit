import * as React from 'react';
import {
  TrueSheet,
  type SheetDetent,
  type TrueSheetProps,
} from '@lodev09/react-native-true-sheet';

export type BottomSheetProps = TrueSheetProps;
export type BottomSheetRef = TrueSheet;
export type BottomSheetDetent = SheetDetent;

type BottomSheetStaticMethods = Pick<
  typeof TrueSheet,
  'present' | 'dismiss' | 'dismissStack' | 'resize' | 'dismissAll'
>;

type BottomSheetComponent = React.ForwardRefExoticComponent<
  BottomSheetProps & React.RefAttributes<BottomSheetRef>
> &
  BottomSheetStaticMethods;

const BottomSheetBase = React.forwardRef<BottomSheetRef, BottomSheetProps>(
  function BottomSheet(props, ref) {
    return <TrueSheet ref={ref} {...props} />;
  }
);

export const BottomSheet = Object.assign(BottomSheetBase, {
  present: TrueSheet.present,
  dismiss: TrueSheet.dismiss,
  dismissStack: TrueSheet.dismissStack,
  resize: TrueSheet.resize,
  dismissAll: TrueSheet.dismissAll,
}) as BottomSheetComponent;
