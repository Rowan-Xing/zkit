import * as React from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { wp } from 'zkit-tools';

import { styles as sharedStyles } from '../styles';
import { exampleBackgroundColor } from '../theme';

type TabScreenShellProps = {
  children: React.ReactNode;
  withTopInset?: boolean;
};

export const TabScreenShell = React.memo(function TabScreenShell({
  children,
  withTopInset = true,
}: TabScreenShellProps) {
  const insets = useSafeAreaInsets();
  useWindowDimensions();
  const topChromeHeight = insets.top + wp(66);

  return (
    <View style={[styles.screen, { backgroundColor: exampleBackgroundColor }]}>
      <ScrollView
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          sharedStyles.content,
          {
            paddingTop: withTopInset ? 0 : topChromeHeight,
            paddingBottom: insets.bottom + wp(28),
          },
        ]}
      >
        {children}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
