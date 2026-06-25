import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as React from 'react';
import type {
  ColorValue,
  DimensionValue,
  GestureResponderEvent,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import {
  Platform,
  Pressable,
  processColor,
  StyleSheet,
  View,
} from 'react-native';
import { wp } from 'y2kit-tools';
import { useI18n } from '../../i18n/useI18n';
import type { Theme } from '../../theme/types';
import { useTheme } from '../../theme/useTheme';
import { Text } from '../Text';
import {
  TextInputPrimitive,
  type TextInputPrimitiveProps,
  type TextInputPrimitiveRef,
} from './TextInputPrimitive';
export {
  TextInputPrimitive,
  type TextInputPrimitiveProps,
  type TextInputPrimitiveRef,
} from './TextInputPrimitive';

export type TextInputVariant = 'outline' | 'filled' | 'plain';
export type TextInputTone = 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
export type TextInputStatus = 'default' | 'success' | 'warning' | 'error';
export type TextInputSize = 'sm' | 'md' | 'lg';

export type TextInputLayout = {
  width?: DimensionValue;
  minWidth?: DimensionValue;
  maxWidth?: DimensionValue;
  height?: DimensionValue;
  minHeight?: number;
  maxHeight?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  gap?: number;
  radius?: number;
  textSize?: number;
  textLineHeight?: number;
};

export type TextInputColors = {
  background?: string;
  border?: string;
  focusBorder?: string;
  text?: string;
  placeholder?: ColorValue;
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  warning?: string;
  icon?: string;
  disabledBackground?: string;
  disabledBorder?: string;
  disabledText?: string;
};

type NativeTextInputProps = Omit<
  TextInputPrimitiveProps,
  | 'defaultValue'
  | 'editable'
  | 'onChange'
  | 'onChangeText'
  | 'readOnly'
  | 'style'
  | 'value'
>;

type SubmitEditingEvent = Parameters<
  NonNullable<TextInputPrimitiveProps['onSubmitEditing']>
>[0];

export type TextInputRef = TextInputPrimitiveRef;

export interface TextInputProps extends NativeTextInputProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onNativeChange?: TextInputPrimitiveProps['onChange'];
  onSubmit?: (value: string, event: SubmitEditingEvent) => void;

  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  invalid?: boolean;

  variant?: TextInputVariant;
  tone?: TextInputTone;
  status?: TextInputStatus;
  size?: TextInputSize;
  color?: string;
  colors?: TextInputColors;
  layout?: TextInputLayout;

  label?: React.ReactNode;
  labelAction?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;

  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  clearable?: boolean;
  clearIcon?: React.ReactNode;
  clearAccessibilityLabel?: string;
  onClear?: () => void;

  minRows?: number;
  maxRows?: number;
  showCount?: boolean;
  renderCount?: (info: { count: number; maxLength?: number }) => React.ReactNode;

  style?: StyleProp<ViewStyle>;
  fieldStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
  descriptionStyle?: StyleProp<TextStyle>;
  errorStyle?: StyleProp<TextStyle>;
  countStyle?: StyleProp<TextStyle>;
  prefixStyle?: StyleProp<ViewStyle>;
  suffixStyle?: StyleProp<ViewStyle>;
  clearButtonStyle?: StyleProp<ViewStyle>;
}

type TextInputMetrics = {
  minHeight: number;
  paddingHorizontal: number;
  paddingVertical: number;
  gap: number;
  radius: number;
  textSize: number;
  textLineHeight: number;
  clearButtonSize: number;
  clearIconSize: number;
  borderWidth: number;
  labelGap: number;
  messageGap: number;
};

type TextInputVisualColors = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  placeholderColor: ColorValue;
  labelColor: string;
  messageColor: string;
  countColor: string;
  iconColor: string;
};

const SEMANTIC_COLORS: Record<string, string> = {
  danger: '#DC2626',
  error: '#DC2626',
  info: '#2563EB',
  success: '#16A34A',
  warn: '#D97706',
  warning: '#D97706',
};

const SIZE_TOKENS = {
  sm: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    radius: 10,
    textSize: 14,
    textLineHeight: 20,
    clearButtonSize: 26,
    clearIconSize: 16,
  },
  md: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    radius: 12,
    textSize: 15,
    textLineHeight: 21,
    clearButtonSize: 28,
    clearIconSize: 17,
  },
  lg: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    radius: 14,
    textSize: 16,
    textLineHeight: 22,
    clearButtonSize: 30,
    clearIconSize: 18,
  },
} as const satisfies Record<
  TextInputSize,
  Omit<TextInputMetrics, 'borderWidth' | 'labelGap' | 'messageGap'>
>;

const WEB_INPUT_RESET_STYLE =
  Platform.OS === 'web'
    ? ({
        outlineStyle: 'solid',
        outlineWidth: 0,
      } as TextStyle)
    : null;

function isPrimitiveNode(node: React.ReactNode): node is string | number {
  return typeof node === 'string' || typeof node === 'number';
}

function extractReadableText(node: React.ReactNode): string | undefined {
  if (node == null || typeof node === 'boolean') return undefined;
  if (isPrimitiveNode(node)) return String(node);
  if (Array.isArray(node)) {
    const text = node
      .map((item) => extractReadableText(item))
      .filter(Boolean)
      .join(' ')
      .trim();
    return text || undefined;
  }
  return undefined;
}

function isProcessableColor(color: string) {
  return processColor(color) != null;
}

function colorToRgba(color: string, alpha: number) {
  const processed = processColor(color);
  if (typeof processed !== 'number') return undefined;

  const normalized = processed >>> 0;
  const r = (normalized >> 16) & 255;
  const g = (normalized >> 8) & 255;
  const b = normalized & 255;
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r},${g},${b},${a})`;
}

function resolveColorToken(input: string | undefined, fallback: string, theme: Theme) {
  if (input == null) return fallback;
  const key = input.trim();
  if (!key) return fallback;

  const resolved =
    key === 'primary'
      ? theme.colors.primary
      : key === 'onPrimary'
        ? theme.colors.onPrimary
        : key === 'secondary' || key === 'neutral'
          ? theme.colors.secondary
          : key === 'onSecondary'
            ? theme.colors.onSecondary
            : key === 'surface'
              ? theme.colors.surface
              : key === 'onSurface'
                ? theme.colors.onSurface
                : key === 'border'
                  ? theme.colors.border
                  : key === 'muted'
                    ? theme.colors.muted
                    : key === 'disabled'
                      ? theme.colors.disabled
                      : SEMANTIC_COLORS[key] ?? key;

  return isProcessableColor(resolved) ? resolved : fallback;
}

function resolveToneAccent(tone: TextInputTone, theme: Theme) {
  if (tone === 'neutral') return theme.colors.onSurface;
  if (tone === 'success') return SEMANTIC_COLORS.success;
  if (tone === 'warning') return SEMANTIC_COLORS.warning;
  if (tone === 'danger') return SEMANTIC_COLORS.danger;
  if (tone === 'info') return SEMANTIC_COLORS.info;
  return theme.colors.primary;
}

function resolveMetrics(size: TextInputSize, layout: TextInputLayout | undefined): TextInputMetrics {
  const token = SIZE_TOKENS[size] ?? SIZE_TOKENS.md;
  return {
    minHeight: layout?.minHeight ?? wp(token.minHeight),
    paddingHorizontal: layout?.paddingHorizontal ?? wp(token.paddingHorizontal),
    paddingVertical: layout?.paddingVertical ?? wp(token.paddingVertical),
    gap: layout?.gap ?? wp(token.gap),
    radius: layout?.radius ?? wp(token.radius),
    textSize: layout?.textSize ?? wp(token.textSize),
    textLineHeight: layout?.textLineHeight ?? wp(token.textLineHeight),
    clearButtonSize: wp(token.clearButtonSize),
    clearIconSize: wp(token.clearIconSize),
    borderWidth: wp(1),
    labelGap: wp(6),
    messageGap: wp(6),
  };
}

function normalizeRows(value: number | undefined, fallback: number) {
  if (value == null) return fallback;
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.round(value));
}

function resolveVisualColors({
  accentColor,
  colors,
  disabled,
  focused,
  status,
  theme,
  variant,
}: {
  accentColor: string;
  colors?: TextInputColors;
  disabled: boolean;
  focused: boolean;
  status: TextInputStatus;
  theme: Theme;
  variant: TextInputVariant;
}): TextInputVisualColors {
  const subtleSurface = colorToRgba(theme.colors.onSurface, 0.04) ?? theme.colors.secondary;
  const statusColor =
    status === 'error'
      ? colors?.error ?? SEMANTIC_COLORS.danger
      : status === 'warning'
        ? colors?.warning ?? SEMANTIC_COLORS.warning
        : status === 'success'
          ? colors?.success ?? SEMANTIC_COLORS.success
          : accentColor;

  const baseBackground =
    variant === 'plain'
      ? 'transparent'
      : variant === 'filled'
        ? subtleSurface
        : theme.colors.surface;
  const baseBorder = variant === 'plain' ? 'transparent' : theme.colors.border;
  const focusedBorder = colors?.focusBorder ?? statusColor;
  const emphasizedBorder = status === 'default' ? focusedBorder : statusColor;

  const borderColor = focused || status !== 'default' ? emphasizedBorder : colors?.border ?? baseBorder;

  if (disabled) {
    return {
      backgroundColor: colors?.disabledBackground ?? (variant === 'plain' ? 'transparent' : subtleSurface),
      borderColor: colors?.disabledBorder ?? (variant === 'plain' ? 'transparent' : theme.colors.border),
      textColor: colors?.disabledText ?? theme.colors.disabled,
      placeholderColor: colors?.placeholder ?? theme.colors.disabled,
      labelColor: colors?.label ?? theme.colors.disabled,
      messageColor: colors?.description ?? theme.colors.disabled,
      countColor: colors?.description ?? theme.colors.disabled,
      iconColor: colors?.icon ?? theme.colors.disabled,
    };
  }

  return {
    backgroundColor: colors?.background ?? baseBackground,
    borderColor,
    textColor: colors?.text ?? theme.colors.onSurface,
    placeholderColor: colors?.placeholder ?? theme.colors.muted,
    labelColor: colors?.label ?? theme.colors.onSurface,
    messageColor:
      status === 'error'
        ? colors?.error ?? SEMANTIC_COLORS.danger
        : status === 'warning'
          ? colors?.warning ?? SEMANTIC_COLORS.warning
          : status === 'success'
            ? colors?.success ?? SEMANTIC_COLORS.success
            : colors?.description ?? theme.colors.muted,
    countColor: colors?.description ?? theme.colors.muted,
    iconColor: colors?.icon ?? theme.colors.muted,
  };
}

function renderTextNode(
  node: React.ReactNode,
  props: React.ComponentPropsWithoutRef<typeof Text>
) {
  if (node == null || typeof node === 'boolean') return null;
  if (isPrimitiveNode(node)) {
    return <Text {...props}>{node}</Text>;
  }
  return node;
}

function renderAffix(
  node: React.ReactNode,
  color: string,
  style: StyleProp<ViewStyle>,
  textSize: number,
  lineHeight: number
) {
  if (node == null || typeof node === 'boolean') return null;

  return (
    <View pointerEvents="box-none" style={[styles.affix, style]}>
      {isPrimitiveNode(node) ? (
        <Text
          numberOfLines={1}
          style={[
            styles.affixText,
            {
              color,
              fontSize: textSize,
              lineHeight,
            },
          ]}
        >
          {node}
        </Text>
      ) : (
        node
      )}
    </View>
  );
}

function assignRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  if (ref) {
    ref.current = value;
  }
}

const TextInputBase = React.forwardRef<TextInputRef, TextInputProps>(function TextInput(
  {
    value,
    defaultValue = '',
    onChange,
    onNativeChange,
    onSubmit,
    disabled = false,
    readOnly = false,
    required = false,
    invalid,
    variant = 'outline',
    tone = 'primary',
    status = 'default',
    size = 'md',
    color,
    colors,
    layout,
    label,
    labelAction,
    description,
    error,
    prefix,
    suffix,
    clearable = false,
    clearIcon,
    clearAccessibilityLabel,
    onClear,
    minRows,
    maxRows,
    showCount = false,
    renderCount,
    style,
    fieldStyle,
    inputStyle,
    labelStyle,
    descriptionStyle,
    errorStyle,
    countStyle,
    prefixStyle,
    suffixStyle,
    clearButtonStyle,
    maxFontSizeMultiplier,
    placeholderTextColor,
    selectionColor,
    cursorColor,
    selectionHandleColor,
    onBlur,
    onFocus,
    onSubmitEditing,
    accessibilityLabel,
    accessibilityHint,
    accessibilityState,
    maxLength,
    multiline = false,
    numberOfLines,
    testID,
    underlineColorAndroid,
    ...nativeProps
  },
  forwardedRef
) {
  const theme = useTheme();
  const { t } = useI18n();
  const inputRef = React.useRef<TextInputRef | null>(null);
  const isControlled = value !== undefined;
  const initialValueRef = React.useRef(defaultValue);
  const currentValueRef = React.useRef(isControlled ? value ?? '' : initialValueRef.current);
  const shouldTrackValue = clearable || showCount || renderCount != null;
  const [trackedValue, setTrackedValue] = React.useState(() => currentValueRef.current);
  const [focused, setFocused] = React.useState(false);

  if (isControlled) {
    currentValueRef.current = value ?? '';
  }

  React.useEffect(() => {
    if (!isControlled && shouldTrackValue) {
      setTrackedValue(currentValueRef.current);
    }
  }, [isControlled, shouldTrackValue]);

  const setInputRef = React.useCallback(
    (node: TextInputRef | null) => {
      inputRef.current = node;
      assignRef(forwardedRef, node);
    },
    [forwardedRef]
  );

  const interactive = !disabled && !readOnly;
  const resolvedStatus: TextInputStatus = error != null || invalid ? 'error' : status;
  const metrics = React.useMemo(() => resolveMetrics(size, layout), [layout, size]);
  const accentColor = React.useMemo(
    () => resolveColorToken(color, resolveToneAccent(tone, theme), theme),
    [color, theme, tone]
  );
  const visualColors = React.useMemo(
    () =>
      resolveVisualColors({
        accentColor,
        colors,
        disabled,
        focused,
        status: resolvedStatus,
        theme,
        variant,
      }),
    [accentColor, colors, disabled, focused, resolvedStatus, theme, variant]
  );

  const displayValue = isControlled ? value ?? '' : trackedValue;
  const hasValue = displayValue.length > 0;
  const count = displayValue.length;
  const resolvedMinRows = multiline
    ? normalizeRows(minRows ?? numberOfLines, 3)
    : 1;
  const resolvedMaxRows =
    multiline && maxRows != null
      ? Math.max(resolvedMinRows, normalizeRows(maxRows, resolvedMinRows))
      : undefined;
  const inputMinHeight = metrics.textLineHeight * resolvedMinRows;
  const inputMaxHeight =
    resolvedMaxRows == null ? undefined : metrics.textLineHeight * resolvedMaxRows;
  const fieldPaddingHorizontal = variant === 'plain' ? 0 : metrics.paddingHorizontal;
  const fieldPaddingVertical = variant === 'plain' ? 0 : metrics.paddingVertical;
  const fieldBorderWidth = variant === 'plain' ? 0 : metrics.borderWidth;
  const fieldMinHeight = Math.max(
    metrics.minHeight,
    inputMinHeight + fieldPaddingVertical * 2 + fieldBorderWidth * 2
  );
  const fieldMaxHeight =
    layout?.maxHeight ??
    (inputMaxHeight == null
      ? undefined
      : inputMaxHeight + fieldPaddingVertical * 2 + fieldBorderWidth * 2);
  const rootSizeStyle = React.useMemo<ViewStyle>(
    () => ({
      ...(layout?.width !== undefined ? { width: layout.width } : undefined),
      ...(layout?.minWidth !== undefined ? { minWidth: layout.minWidth } : undefined),
      ...(layout?.maxWidth !== undefined ? { maxWidth: layout.maxWidth } : undefined),
    }),
    [layout?.maxWidth, layout?.minWidth, layout?.width]
  );
  const fieldSizeStyle = React.useMemo<ViewStyle>(
    () => ({
      ...(layout?.height !== undefined
        ? { height: layout.height }
        : multiline
          ? undefined
          : { height: fieldMinHeight }),
      ...(multiline && fieldMaxHeight !== undefined ? { maxHeight: fieldMaxHeight } : undefined),
      minHeight: fieldMinHeight,
      paddingHorizontal: fieldPaddingHorizontal,
      paddingVertical: fieldPaddingVertical,
    }),
    [
      fieldMaxHeight,
      fieldMinHeight,
      fieldPaddingHorizontal,
      fieldPaddingVertical,
      layout?.height,
      multiline,
    ]
  );
  const fieldVisualStyle = React.useMemo<ViewStyle>(
    () => ({
      alignItems: multiline ? 'flex-start' : 'center',
      backgroundColor: visualColors.backgroundColor,
      borderColor: visualColors.borderColor,
      borderRadius: variant === 'plain' ? 0 : metrics.radius,
      borderWidth: fieldBorderWidth,
      gap: metrics.gap,
    }),
    [
      fieldBorderWidth,
      metrics.gap,
      metrics.radius,
      multiline,
      variant,
      visualColors.backgroundColor,
      visualColors.borderColor,
    ]
  );
  const inputBaseStyle = React.useMemo<TextStyle>(
    () => ({
      backgroundColor: 'transparent',
      borderWidth: 0,
      color: visualColors.textColor,
      fontSize: metrics.textSize,
      includeFontPadding: multiline ? false : undefined,
      lineHeight: multiline ? metrics.textLineHeight : undefined,
      maxHeight: multiline ? inputMaxHeight : undefined,
      minHeight: multiline ? inputMinHeight : undefined,
      padding: multiline ? 0 : undefined,
      paddingBottom: multiline ? 0 : undefined,
      paddingHorizontal: 0,
      paddingTop: multiline ? 0 : undefined,
      paddingVertical: multiline ? 0 : undefined,
      textAlignVertical: multiline ? 'top' : undefined,
    }),
    [
      inputMaxHeight,
      inputMinHeight,
      metrics.textLineHeight,
      metrics.textSize,
      multiline,
      visualColors.textColor,
    ]
  );
  const finalSelectionColor = selectionColor ?? accentColor;
  const finalCursorColor = cursorColor ?? finalSelectionColor;
  const finalHandleColor = selectionHandleColor ?? finalSelectionColor;
  const computedAccessibilityLabel =
    accessibilityLabel ?? extractReadableText(label) ?? nativeProps.placeholder;
  const computedAccessibilityHint =
    accessibilityHint ??
    extractReadableText(resolvedStatus === 'error' ? error : description);
  const finalClearAccessibilityLabel = clearAccessibilityLabel ?? t('textInput.clear');

  const commitValue = React.useCallback(
    (nextValue: string) => {
      currentValueRef.current = nextValue;
      if (!isControlled && shouldTrackValue) {
        setTrackedValue(nextValue);
      }
      onChange?.(nextValue);
    },
    [isControlled, onChange, shouldTrackValue]
  );

  const handleChangeText = React.useCallback(
    (nextValue: string) => {
      commitValue(nextValue);
    },
    [commitValue]
  );

  const handleNativeChange = React.useCallback(
    (event: Parameters<NonNullable<TextInputPrimitiveProps['onChange']>>[0]) => {
      onNativeChange?.(event);
    },
    [onNativeChange]
  );

  const handleFocus = React.useCallback(
    (event: Parameters<NonNullable<TextInputPrimitiveProps['onFocus']>>[0]) => {
      setFocused(true);
      onFocus?.(event);
    },
    [onFocus]
  );

  const handleBlur = React.useCallback(
    (event: Parameters<NonNullable<TextInputPrimitiveProps['onBlur']>>[0]) => {
      setFocused(false);
      onBlur?.(event);
    },
    [onBlur]
  );

  const handleSubmitEditing = React.useCallback(
    (event: SubmitEditingEvent) => {
      onSubmitEditing?.(event);
      onSubmit?.(currentValueRef.current, event);
    },
    [onSubmit, onSubmitEditing]
  );

  const handleClear = React.useCallback(
    (event: GestureResponderEvent) => {
      event.preventDefault();
      if (!interactive) return;
      inputRef.current?.clear();
      commitValue('');
      onClear?.();
      inputRef.current?.focus();
    },
    [commitValue, interactive, onClear]
  );

  const labelNode = renderTextNode(label, {
    variant: 'label',
    color: visualColors.labelColor,
    weight: 'semibold',
    style: [styles.labelText, labelStyle],
  });
  const messageNode =
    resolvedStatus === 'error' && error != null
      ? renderTextNode(error, {
          variant: 'caption',
          color: visualColors.messageColor,
          style: [styles.messageText, errorStyle],
        })
      : renderTextNode(description, {
          variant: 'caption',
          color: visualColors.messageColor,
          style: [styles.messageText, descriptionStyle],
        });
  const countNode =
    showCount || renderCount
      ? renderTextNode(
          renderCount?.({ count, maxLength }) ??
            (maxLength != null ? `${count}/${maxLength}` : String(count)),
          {
            variant: 'caption',
            color: visualColors.countColor,
            style: [styles.countText, countStyle],
          }
        )
      : null;
  const prefixNode = renderAffix(
    prefix,
    visualColors.iconColor,
    prefixStyle,
    metrics.textSize,
    metrics.textLineHeight
  );
  const suffixNode = renderAffix(
    suffix,
    visualColors.iconColor,
    suffixStyle,
    metrics.textSize,
    metrics.textLineHeight
  );
  const showClearButton = clearable && interactive && hasValue;

  return (
    <View style={[styles.root, rootSizeStyle, style]}>
      {labelNode || labelAction ? (
        <View style={[styles.labelRow, { marginBottom: metrics.labelGap }]}>
          <View style={styles.labelContent}>
            {labelNode}
            {required && labelNode ? (
              <Text
                accessibilityElementsHidden
                tone="danger"
                importantForAccessibility="no"
                style={styles.requiredMark}
              >
                *
              </Text>
            ) : null}
          </View>
          {labelAction ? <View style={styles.labelAction}>{labelAction}</View> : null}
        </View>
      ) : null}

      <View style={[styles.field, fieldSizeStyle, fieldVisualStyle, fieldStyle]}>
        {prefixNode}

        <TextInputPrimitive
          ref={setInputRef}
          {...nativeProps}
          accessibilityHint={computedAccessibilityHint}
          accessibilityLabel={computedAccessibilityLabel}
          accessibilityState={{
            ...accessibilityState,
            disabled,
          }}
          cursorColor={finalCursorColor}
          defaultValue={isControlled ? undefined : initialValueRef.current}
          editable={interactive}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={multiline ? resolvedMinRows : numberOfLines}
          onBlur={handleBlur}
          onChange={handleNativeChange}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onSubmitEditing={handleSubmitEditing}
          placeholderTextColor={placeholderTextColor ?? visualColors.placeholderColor}
          readOnly={readOnly || disabled}
          selectionColor={finalSelectionColor}
          selectionHandleColor={finalHandleColor}
          style={[styles.input, inputBaseStyle, WEB_INPUT_RESET_STYLE, inputStyle]}
          testID={testID}
          underlineColorAndroid={underlineColorAndroid ?? 'transparent'}
          value={isControlled ? value ?? '' : undefined}
        />

        {showClearButton ? (
          <Pressable
            accessibilityLabel={finalClearAccessibilityLabel}
            accessibilityRole="button"
            hitSlop={{
              bottom: wp(8),
              left: wp(8),
              right: wp(8),
              top: wp(8),
            }}
            onPress={handleClear}
            style={[
              styles.clearButton,
              {
                height: metrics.clearButtonSize,
                width: metrics.clearButtonSize,
              },
              clearButtonStyle,
            ]}
          >
            {clearIcon ?? (
              <MaterialIcons
                color={visualColors.iconColor}
                name="close"
                size={metrics.clearIconSize}
              />
            )}
          </Pressable>
        ) : null}

        {suffixNode}
      </View>

      {messageNode || countNode ? (
        <View style={[styles.footerRow, { marginTop: metrics.messageGap }]}>
          <View style={styles.messageSlot}>{messageNode}</View>
          {countNode ? <View style={styles.countSlot}>{countNode}</View> : null}
        </View>
      ) : null}
    </View>
  );
});

TextInputBase.displayName = 'TextInput';

export const TextInput = Object.assign(TextInputBase, { State: TextInputPrimitive.State });

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  labelContent: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
  },
  labelText: {
    flexShrink: 1,
  },
  requiredMark: {
    fontSize: wp(13),
    fontWeight: '700',
    lineHeight: wp(18),
    marginLeft: wp(3),
  },
  labelAction: {
    flexShrink: 0,
    marginLeft: wp(12),
  },
  field: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    margin: 0,
    minWidth: 0,
  },
  affix: {
    alignItems: 'center',
    flexShrink: 0,
    justifyContent: 'center',
    minHeight: wp(24),
  },
  affixText: {
    fontWeight: '500',
  },
  clearButton: {
    alignItems: 'center',
    borderRadius: wp(999),
    flexShrink: 0,
    justifyContent: 'center',
  },
  footerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  messageSlot: {
    flex: 1,
    minWidth: 0,
  },
  messageText: {
    flexShrink: 1,
  },
  countSlot: {
    flexShrink: 0,
    marginLeft: wp(12),
  },
  countText: {
    textAlign: 'right',
  },
});
