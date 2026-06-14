import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';

import {
  Button,
  Card,
  Screen,
  ScreenHeader,
  Switch,
  Text,
  TextInput,
} from '@/components';
import { ModeSegmented } from '@/features/chat';
import {
  clearPasscode,
  exportData,
  getBiometricCapability,
  isBiometricEnabled,
  isPasscodeSet,
  setBiometricEnabled,
  setPasscode,
  useLock,
} from '@/features/privacy';
import { useSetDefaultMode, useSettings } from '@/features/settings';
import type { ChatMode } from '@/lib/db/schema';
import { spacing } from '@/theme';

export default function SettingsScreen() {
  const { data: settings } = useSettings();
  const setDefaultMode = useSetDefaultMode();

  const passcodeSet = useLock((s) => s.passcodeSet);
  const biometricEnabledFlag = useLock((s) => s.biometricEnabled);
  const setPasscodeSet = useLock((s) => s.setPasscodeSet);
  const setBiometricEnabledStore = useLock((s) => s.setBiometricEnabled);
  const lockNow = useLock((s) => s.lock);

  const [passcodeDraft, setPasscodeDraft] = useState('');
  const [confirmDraft, setConfirmDraft] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [biometricSupported, setBiometricSupported] = useState(false);

  useEffect(() => {
    void getBiometricCapability().then((cap) =>
      setBiometricSupported(cap.hardwarePresent && cap.enrolled),
    );
  }, []);

  const handleSetPasscode = async () => {
    if (passcodeDraft.length < 4) {
      setPasscodeError('Passcode must be 4–6 digits.');
      return;
    }
    if (passcodeDraft !== confirmDraft) {
      setPasscodeError('The two entries didn\'t match.');
      return;
    }
    await setPasscode(passcodeDraft);
    setPasscodeSet(true);
    setPasscodeDraft('');
    setConfirmDraft('');
    setPasscodeError(null);
  };

  const handleRemovePasscode = async () => {
    if (Platform.OS === 'web') {
      await clearPasscode();
      setPasscodeSet(false);
      setBiometricEnabledStore(false);
      return;
    }
    Alert.alert(
      'Remove passcode?',
      'Inward will no longer ask to unlock on launch.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await clearPasscode();
            setPasscodeSet(false);
            setBiometricEnabledStore(false);
          },
        },
      ],
    );
  };

  const handleToggleBiometric = async (next: boolean) => {
    await setBiometricEnabled(next);
    setBiometricEnabledStore(next);
  };

  const handleExport = async () => {
    const result = await exportData();
    if (Platform.OS === 'web') return; // browser handled the download
    if (result.ok) return;
    Alert.alert('Export failed', result.reason);
  };

  return (
    <Screen>
      <ScreenHeader title="Settings" showBack />
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xl, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection title="Privacy">
          <Card>
            {!passcodeSet ? (
              <View style={{ gap: spacing.md }}>
                <Text variant="body">Set a passcode</Text>
                <Text variant="caption" color="textSecondary">
                  4–6 digits. You’ll be asked for it each time the app opens.
                </Text>
                <TextInput
                  value={passcodeDraft}
                  onChangeText={setPasscodeDraft}
                  placeholder="New passcode"
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                />
                <TextInput
                  value={confirmDraft}
                  onChangeText={setConfirmDraft}
                  placeholder="Confirm passcode"
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                />
                {passcodeError ? (
                  <Text variant="caption" color="moodRose">
                    {passcodeError}
                  </Text>
                ) : null}
                <Button
                  label="Save passcode"
                  onPress={handleSetPasscode}
                  disabled={
                    passcodeDraft.length < 4 || confirmDraft.length < 4
                  }
                />
              </View>
            ) : (
              <View style={{ gap: spacing.md }}>
                <Text variant="body">Passcode is set</Text>
                <Text variant="caption" color="textSecondary">
                  Inward asks to unlock when you open the app.
                </Text>
                {biometricSupported ? (
                  <Switch
                    label="Use biometric to unlock"
                    description="Fingerprint or face. Passcode is the fallback."
                    value={biometricEnabledFlag}
                    onChange={handleToggleBiometric}
                  />
                ) : (
                  <Text variant="caption" color="textSecondary">
                    Biometric unlock isn’t available on this device.
                  </Text>
                )}
                <Button
                  label="Remove passcode"
                  variant="ghost"
                  onPress={handleRemovePasscode}
                />
                <Pressable
                  onPress={() => lockNow()}
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  <Text
                    variant="caption"
                    color="textSecondary"
                    style={{ textAlign: 'center' }}
                  >
                    Lock now
                  </Text>
                </Pressable>
              </View>
            )}
          </Card>
        </SettingsSection>

        <SettingsSection title="Companion">
          <Card>
            <View style={{ gap: spacing.md }}>
              <Text variant="body">Default mode</Text>
              <Text variant="caption" color="textSecondary">
                The chat opens in this voice. You can switch any time.
              </Text>
              <ModeSegmented
                value={(settings?.defaultAiMode ?? 'reflective') as ChatMode}
                onChange={(mode) => setDefaultMode.mutate(mode)}
              />
            </View>
          </Card>
        </SettingsSection>

        <SettingsSection title="Your data">
          <Card>
            <View style={{ gap: spacing.md }}>
              <Text variant="body">Export everything</Text>
              <Text variant="caption" color="textSecondary">
                Saves a JSON file with all your entries, thoughts, vault items,
                and chat. No auth secrets are included.
              </Text>
              <Button label="Export" onPress={handleExport} />
            </View>
          </Card>
        </SettingsSection>

        <SettingsSection title="About">
          <Card>
            <View style={{ gap: spacing.sm }}>
              <Text variant="caption" color="textSecondary">
                Inward is a reflection tool — not a substitute for professional
                support. If you’re in crisis, please reach out to a local
                helpline or a trusted professional.
              </Text>
              <Text variant="micro" color="textSecondary">
                Your data lives on this device. AI calls are routed through your
                own backend; entries are never stored on our servers.
              </Text>
            </View>
          </Card>
        </SettingsSection>
      </ScrollView>
    </Screen>
  );
}

type SettingsSectionProps = {
  title: string;
  children: React.ReactNode;
};

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="caption" color="textSecondary">
        {title}
      </Text>
      {children}
    </View>
  );
}
