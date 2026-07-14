import * as React from 'react';
import { View } from 'react-native';
import type {
  NativeImagePreviewComponent,
  NativeImagePreviewItemProps,
  NativeImagePreviewProps,
} from './types';

let didWarnUnsupportedWeb = false;

function warnUnsupportedWeb() {
  if (!__DEV__ || didWarnUnsupportedWeb) return;

  didWarnUnsupportedWeb = true;
  console.warn(
    '[zkit-ui][NativeImagePreview] Native shared-transition preview is only available in iOS and Android native builds.'
  );
}

const NativeImagePreviewRoot = React.memo(function NativeImagePreview({
  children,
}: NativeImagePreviewProps) {
  React.useEffect(warnUnsupportedWeb, []);

  return <>{children}</>;
});

const NativeImagePreviewItem = React.memo(function NativeImagePreviewItem({
  children,
  style,
}: NativeImagePreviewItemProps) {
  return <View style={style}>{children}</View>;
});

export const NativeImagePreview = Object.assign(NativeImagePreviewRoot, {
  Item: NativeImagePreviewItem,
}) as NativeImagePreviewComponent;
