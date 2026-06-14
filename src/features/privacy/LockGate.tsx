import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Screen, Text, TextInput } from '@/components';
import { colors, spacing } from '@/theme';

import { promptBiometric, verifyPasscode } from './auth';
import { useLock } from './store';

const SHAKE_MS = 320;

export function LockGate() {
  const unlock = useLock((s) => s.unlock);
  const biometricEnabled = useLock((s) => s.biometricEnabled);

  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const triedBiometric = useRef(false);

  useEffect(() => {
    if (!biometricEnabled || triedBiometric.current) return;
    triedBiometric.current = true;
    void (async () => {
      const ok = await promptBiometric('Unlock Inward');
      if (ok) unlock();
    })();
  }, [biometricEnabled, unlock]);

  const handleSubmit = async () => {
    if (passcode.length < 4) return;
    const ok = await verifyPasscode(passcode);
    if (ok) {
      setPasscode('');
      setError(null);
      unlock();
    } else {
      setError('That passcode didn\'t match. Try again.');
      setPasscode('');
      setTimeout(() => setError(null), SHAKE_MS * 4);
    }
  };

  const handleBiometric = async () => {
    const ok = await promptBiometric('Unlock Inward');
    if (ok) unlock();
  };

  return (
    <Screen>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.lg,
          paddingHorizontal: spacing.lg,
        }}
      >
        <Text variant="display" color="textPrimary">
          Inward
        </Text>
        <Text
          variant="caption"
          color="textSecondary"
          style={{ textAlign: 'center' }}
        >
          Enter your passcode to continue.
        </Text>

        <TextInput
          value={passcode}
          onChangeText={setPasscode}
          placeholder="••••"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          onSubmitEditing={handleSubmit}
          style={{
            width: 200,
            textAlign: 'center',
            letterSpacing: 8,
            fontSize: 22,
          }}
        />

        {error ? (
          <Text variant="caption" color="moodRose">
            {error}
          </Text>
        ) : null}

        <Button
          label="Unlock"
          onPress={handleSubmit}
          disabled={passcode.length < 4}
          fullWidth={false}
        />

        {biometricEnabled ? (
          <Pressable
            onPress={handleBiometric}
            accessibilityRole="button"
            accessibilityLabel="Use biometric"
            hitSlop={12}
          >
            <Text variant="caption" color="accentSage">
              Use biometric
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}

export const lockGateBg = colors;
