import { forwardRef } from 'react';
import {
  TextInput as RNTextInput,
  type TextInputProps as RNTextInputProps,
} from 'react-native';

import { colors, fontFamilies, radius, spacing, typeScale } from '@/theme';

type TextInputProps = RNTextInputProps & {
  /** Use the journal serif font (for diary entries). */
  journal?: boolean;
};

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(
  { journal = false, style, multiline, ...rest },
  ref,
) {
  return (
    <RNTextInput
      ref={ref}
      placeholderTextColor={colors.textSecondary}
      multiline={multiline}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          color: colors.textPrimary,
          fontFamily: journal ? fontFamilies.journal : fontFamilies.body,
          ...typeScale.body,
          minHeight: multiline ? 120 : undefined,
          textAlignVertical: multiline ? 'top' : 'auto',
        },
        style,
      ]}
      {...rest}
    />
  );
});
