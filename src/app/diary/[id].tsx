import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { Screen, ScreenHeader, Text } from '@/components';
import {
  EntryForm,
  useDeleteEntry,
  useDiaryEntry,
  useUpdateEntry,
} from '@/features/diary';
import { spacing } from '@/theme';

export default function EditEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: entry, isLoading } = useDiaryEntry(id);
  const updateEntry = useUpdateEntry(id ?? '');
  const deleteEntry = useDeleteEntry();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
                updateEntry.mutate(values, { onSuccess: goBack });
              }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}
