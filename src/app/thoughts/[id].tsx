import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

import { Button, Screen, ScreenHeader, Switch, Text, TextInput } from '@/components';
import { useDiaryEntries } from '@/features/diary';
import {
  TypeChips,
  useDeleteThought,
  useThought,
  useUpdateThought,
} from '@/features/thoughts';
import { isSameDay } from '@/lib/date';
import type { ThoughtType } from '@/lib/db/schema';
import { spacing } from '@/theme';

export default function EditThoughtScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: thought, isLoading } = useThought(id);
  const updateThought = useUpdateThought(id ?? '');
  const deleteThought = useDeleteThought();
  const { data: entries = [] } = useDiaryEntries();

  const [content, setContent] = useState('');
  const [type, setType] = useState<ThoughtType>('other');
  const [linkToToday, setLinkToToday] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!thought) return;
    setContent(thought.content);
    setType(thought.type);
    setLinkToToday(Boolean(thought.linkedEntryId));
  }, [thought]);

  const todaysEntry = useMemo(
    () => entries.find((entry) => isSameDay(entry.createdAt, new Date())),
    [entries],
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/thoughts');
  };

  const handleSave = () => {
    if (!thought || content.trim().length === 0) return;
    updateThought.mutate(
      {
        content: content.trim(),
        type,
        aiExcluded: thought.aiExcluded,
        linkedEntryId:
          linkToToday && todaysEntry
            ? todaysEntry.id
            : thought.linkedEntryId && !linkToToday
            ? null
            : thought.linkedEntryId,
      },
      { onSuccess: goBack },
    );
  };

  const handleDelete = () => {
    if (!id) return;
    if (Platform.OS === 'web') {
      setConfirmingDelete(true);
      return;
    }
    Alert.alert('Delete this thought?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteThought.mutate(id, { onSuccess: goBack }),
      },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader
        title="Thought"
        showBack
        rightSlot={
          <Pressable
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel="Delete thought"
            hitSlop={12}
          >
            <Text variant="caption" color="textSecondary">
              Delete
            </Text>
          </Pressable>
        }
      />

      {isLoading || !thought ? (
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
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  gap: spacing.md,
                }}
              >
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
                  onPress={() =>
                    deleteThought.mutate(thought.id, { onSuccess: goBack })
                  }
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  <Text variant="caption" color="moodRose">
                    Confirm delete
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <TextInput
              multiline
              value={content}
              onChangeText={setContent}
              placeholder="What's on your mind?"
            />

            <View style={{ gap: spacing.sm }}>
              <Text variant="caption" color="textSecondary">
                Type
              </Text>
              <TypeChips value={type} onChange={setType} />
            </View>

            {todaysEntry || thought.linkedEntryId ? (
              <Switch
                label="Linked to today's diary entry"
                value={linkToToday}
                onChange={setLinkToToday}
              />
            ) : null}

            <Button
              label={updateThought.isPending ? 'Saving…' : 'Save'}
              onPress={handleSave}
              disabled={content.trim().length === 0 || updateThought.isPending}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}
