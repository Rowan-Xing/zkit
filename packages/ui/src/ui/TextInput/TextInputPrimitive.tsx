import * as React from 'react';
import {
  Platform,
  TextInput as RNTextInput,
  type TextInputProps as RNTextInputNativeProps,
} from 'react-native';
import { getMaxFontSizeMultiplier } from 'zkit-tools';
import { useTheme } from '../../theme/useTheme';

export type TextInputPrimitiveProps = RNTextInputNativeProps;
export type TextInputPrimitiveRef = React.ComponentRef<typeof RNTextInput>;

const isAndroid = Platform.OS === 'android';

const TextInputPrimitiveBase = React.forwardRef<TextInputPrimitiveRef, TextInputPrimitiveProps>(
  function TextInputPrimitive(
    { maxFontSizeMultiplier, selectionColor, cursorColor, selectionHandleColor, ...rest },
    ref
  ) {
    const theme = useTheme();
    const finalSelectionColor = selectionColor ?? theme.colors.primary;
    const finalCursorColor = cursorColor ?? finalSelectionColor;
    const finalHandleColor = selectionHandleColor ?? finalSelectionColor;
    const androidRemountKey = isAndroid ? String(finalCursorColor) : undefined;

    return (
      <RNTextInput
        key={androidRemountKey}
        ref={ref}
        maxFontSizeMultiplier={maxFontSizeMultiplier ?? getMaxFontSizeMultiplier()}
        selectionColor={finalSelectionColor}
        cursorColor={finalCursorColor}
        selectionHandleColor={finalHandleColor}
        {...rest}
      />
    );
  }
);

TextInputPrimitiveBase.displayName = 'TextInputPrimitive';

export const TextInputPrimitive = Object.assign(TextInputPrimitiveBase, {
  State: RNTextInput.State,
});
