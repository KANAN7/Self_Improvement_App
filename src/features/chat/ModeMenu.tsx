/**
 * Compact mode picker for the chat header. Tapping the pill opens a small
 * modal menu listing the three modes with short descriptions. Replaces the
 * full-width segmented control to free up vertical space and make the
 * active mode unambiguous.
 */

import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { Text } from '@/components';
import type { ChatMode } from '@/lib/db/schema';
import { colors, radius, spacing } from '@/theme';

const MODES: { value: ChatMode; label: string; blurb: string }[] = [
  {
    value: 'reflective',
    label: 'Reflective',
    blurb: 'Curious, asks more than it tells.',
  },
  {
    value: 'coach',
    label: 'Coach',
    blurb: 'Action-oriented, gentle accountability.',
  },
  {
    value: 'direct',
    label: 'Direct',
    blurb: 'Honest and concise. Names patterns plainly.',
  },
];

type ModeMenuProps = {
  value: ChatMode;
  onChange: (value: ChatMode) => void;
  disabled?: boolean;
};

export function ModeMenu({ value, onChange, disabled }: ModeMenuProps) {
  const [open, setOpen] = useState(false);
  const current = MODES.find((m) => m.value === value) ?? MODES[0]!;

  const handlePick = (mode: ChatMode) => {
    void Haptics.selectionAsync();
    setOpen(false);
    if (mode !== value) onChange(mode);
  };

  return (
    <>
      <Pressable
        onPress={() => {
          if (disabled) return;
          setOpen(true);
        }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Mode: ${current.label}. Tap to change.`}
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        hitSlop={6}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          backgroundColor: colors.surface,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.md,
          paddingVertical: 6,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        })}
      >
        <Text variant="caption" color="textSecondary">
          Mode
        </Text>
        <Text variant="caption" family="bodyMedium" color="accentSage">
          {current.label}
        </Text>
        <Text variant="caption" color="textSecondary">
          ▾
        </Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            paddingHorizontal: spacing.lg,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.md,
              gap: spacing.xs,
            }}
          >
            <Text
              variant="caption"
              color="textSecondary"
              style={{ marginBottom: spacing.sm }}
            >
              Choose how the companion responds
            </Text>
            {MODES.map((mode) => {
              const selected = mode.value === value;
              return (
                <Pressable
                  key={mode.value}
                  onPress={() => handlePick(mode.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => ({
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.sm,
                    backgroundColor: selected
                      ? colors.bg
                      : pressed
                        ? colors.bg
                        : 'transparent',
                  })}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 2,
                    }}
                  >
                    <Text
                      variant="body"
                      family="bodyMedium"
                      color={selected ? 'accentSage' : 'textPrimary'}
                    >
                      {mode.label}
                    </Text>
                    {selected ? (
                      <Text variant="caption" color="accentSage">
                        ●
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="caption" color="textSecondary">
                    {mode.blurb}
                  </Text>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
