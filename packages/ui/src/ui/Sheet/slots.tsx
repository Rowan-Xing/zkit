import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { wp } from 'zkit-tools';
import { useTheme } from '../../theme/useTheme';
import { Text } from '../Text';
import type {
  SheetContentProps,
  SheetFooterProps,
  SheetHeaderProps,
} from './types';

export function SheetHeader({
  title,
  description,
  children,
  style,
  ...props
}: SheetHeaderProps) {
  const theme = useTheme();

  return (
    <View {...props} style={[styles.header, style]}>
      {children ?? (
        <>
          {title != null ? (
            <Text
              accessibilityRole="header"
              numberOfLines={2}
              size="lg"
              weight="semibold"
              style={{ color: theme.colors.onSurface }}
            >
              {title}
            </Text>
          ) : null}
          {description != null ? (
            <Text numberOfLines={3} size="sm" style={{ color: theme.colors.muted }}>
              {description}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

export function SheetContent({ style, ...props }: SheetContentProps) {
  return <View {...props} style={[styles.content, style]} />;
}

export function SheetFooter({ safeArea = true, style, ...props }: SheetFooterProps) {
  const insets = useSafeAreaInsets();
  const paddingBottom = safeArea ? Math.max(insets.bottom, wp(12)) : undefined;

  return <View {...props} style={[styles.footer, paddingBottom != null && { paddingBottom }, style]} />;
}

const styles = StyleSheet.create({
  header: {
    gap: wp(4),
    paddingHorizontal: wp(20),
    paddingTop: wp(20),
    paddingBottom: wp(12),
  },
  content: {
    paddingHorizontal: wp(20),
    paddingVertical: wp(16),
  },
  footer: {
    gap: wp(10),
    paddingHorizontal: wp(20),
    paddingTop: wp(12),
  },
});
