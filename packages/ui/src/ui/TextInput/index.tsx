import * as React from 'react';
import {
  Platform,
  TextInput as RNTextInput,
  type TextInputProps as RNTextInputProps,
} from 'react-native';
import { getMaxFontScale } from 'y2kit-tools';
import { useTheme } from '../../theme/useTheme';

export type TextInputProps = RNTextInputProps;

type RNTextInputRef = React.ComponentPropsWithRef<typeof RNTextInput> extends {
  ref?: React.Ref<infer Instance>;
}
  ? Instance
  : never;

const isAndroid = Platform.OS === 'android';

const TextInputBase = React.forwardRef<RNTextInputRef, TextInputProps>(function TextInput(
  { maxFontSizeMultiplier, selectionColor, cursorColor, selectionHandleColor, ...rest },
  ref
) {
  const theme = useTheme();
  const primary = theme.colors.primary;
  const finalSelectionColor = selectionColor ?? primary;
  const finalCursorColor = cursorColor ?? finalSelectionColor;
  const finalHandleColor = selectionHandleColor ?? finalSelectionColor;
  const androidRemountKey = isAndroid ? String(finalCursorColor) : undefined;

  return (
    <RNTextInput
      // Android 部分 OEM 设备 / Fabric 新架构下，cursorColor prop 存在时序竞争：
      // 原生 EditText 创建 cursor drawable 时 prop 尚未 commit，导致光标颜色回退到系统默认。
      // 用 key 强制在颜色确定后重建原生视图，彻底规避此问题。
      key={androidRemountKey}
      ref={ref}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? getMaxFontScale()}
      selectionColor={finalSelectionColor}
      cursorColor={finalCursorColor}
      selectionHandleColor={finalHandleColor}
      {...rest}
    />
  );
});

export const TextInput = Object.assign(TextInputBase, { State: RNTextInput.State });
