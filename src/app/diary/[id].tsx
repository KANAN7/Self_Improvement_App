import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { Button, Card, Screen, ScreenHeader, Text, TextInput } from '@/components';
import {
  EntryForm,
  useAnalyzeEntry,
  useAnalyzingIds,
  useDeleteEntry,
  useDiaryEntry,
  useUpdateEntry,
} from '@/features/diary';
import { requestEntryUnlock, useEntryUnlocks } from '@/features/privacy';
import { spacing } from '@/theme';

export default function EditEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: entry, isLoading } = useDiaryEntry(id);
  const updateEntry = useUpdateEntry(id ?? '');
  const deleteEntry = useDeleteEntry();
  const analyzeEntry = useAnalyzeEntry();
  const analyzingIds = useAnalyzingIds();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const unlockedEntryIds = useEntryUnlocks((s) => s.unlocked);
  const isLocked = Boolean(entry?.isLocked) && !unlockedEntryIds.has(entry?.id ?? '');

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/diary');
  };

  const handleDelete = () => {
    if (!id) return;
    if (Platform.OS === 'web') {
      // Alert.alert is iOS/Android only — use an inline confirm row on web.
      setConfirmingDelete(true);
      return;
    }
    Alert.alert('Delete this entry?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteEntry.mutate(id, { onSuccess: goBack }),
      },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader
        title="Entry"
        showBack
        rightSlot={
          <Pressable
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel="Delete entry"
            hitSlop={12}
          >
            <Text variant="caption" color="textSecondary">
              Delete
            </Text>
          </Pressable>
        }
      />

      {isLoading || !entry ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="body" color="textSecondary">
            Loading…
          </Text>
        </View>
      ) : isLocked ? (
        <LockedEntryPrompt entryId={entry.id} />
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ paddingBottom: spacing.xl, gap: spacing.lg }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {confirmingDelete ? (
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md }}>
                <Pressable
                  onPress={() => setConfirmingDelete(false)}
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  <Text variant="caption" color="textSecondary">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => deleteEntry.mutate(entry.id, { onSuccess: goBack })}
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  <Text variant="caption" color="moodRose">
                    Confirm delete
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <ObservationBlock
              entry={entry}
              isAnalyzing={analyzingIds.has(entry.id)}
            />

            <EntryForm
              key={entry.id}
              initial={{
                content: entry.content,
                mood: entry.mood,
                energy: entry.energy ?? 3,
                focus: entry.focus ?? 3,
                whatHelped: entry.whatHelped,
                aiExcluded: entry.aiExcluded,
                isLocked: entry.isLocked,
              }}
              submitLabel={updateEntry.isPending ? 'Saving…' : 'Save'}
              isSubmitting={updateEntry.isPending}
              onSubmit={(values) => {
                updateEntry.mutate(values, {
                  onSuccess: (updated) => {
                    // Re-analyze on edit (only if not excluded/locked)
                    analyzeEntry.mutate(updated);
                    goBack();
                  },
                });
              }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}

type LockedEntryPromptProps = {
  entryId: string;
};

function LockedEntryPrompt({ entryId }: LockedEntryPromptProps) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPasscode, setShowPasscode] = useState(false);

  const tryUnlock = async () => {
    setError(null);
    const ok = await requestEntryUnlock({
      entryId,
      promptForPasscode: () => {
        // Surface the inline passcode field if biometric was declined.
        setShowPasscode(true);
        return Promise.resolve(passcode || null);
      },
    });
    if (!ok) {
      setError('Couldn\'t unlock. Try again.');
    }
  };

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.lg,
        paddingHorizontal: spacing.lg,
      }}
    >
      <Text variant="body" color="textSecondary">
        🔒 This entry is locked.
      </Text>
      {showPasscode ? (
        <TextInput
          value={passcode}
          onChangeText={setPasscode}
          placeholder="Passcode"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          style={{ width: 200, textAlign: 'center', letterSpacing: 8, fontSize: 22 }}
        />
      ) : null}
      {error ? (
        <Text variant="caption" color="moodRose">
          {error}
        </Text>
      ) : null}
      <Button label="Unlock" onPress={tryUnlock} fullWidth={false} />
    </View>
  );
}

type ObservationBlockProps = {
  entry: NonNullable<ReturnType<typeof useDiaryEntry>['data']>;
  isAnalyzing: boolean;
};

function ObservationBlock({ entry, isAnalyzing }: ObservationBlockProps) {
  if (entry.isLocked || entry.aiExcluded) return null;

  const hasObservation = Boolean(entry.aiSummary);
  if (!hasObservation && !isAnalyzing) return null;

  return (
    <Card>
      {isAnalyzing && !hasObservation ? (
        <Text variant="caption" color="textSecondary">
          Reflecting on your entry…
        </Text>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Text
            variant="body"
            color="textPrimary"
            style={{ fontStyle: 'italic' }}
          >
            {entry.aiSummary}
          </Text>
          {entry.aiQuestion ? (
            <Text variant="body" color="accentSage" style={{ fontStyle: 'italic' }}>
              {entry.aiQuestion}
            </Text>
          ) : null}
          <Text variant="micro" color="textSecondary">
            ℹ Based on your recent entries
          </Text>
        </View>
      )}
    </Card>
  );
}
