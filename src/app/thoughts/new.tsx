import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Button, Screen, ScreenHeader, Switch, Text, TextInput } from '@/components';
import { useDiaryEntries } from '@/features/diary';
import { TypeChips, useCreateThought } from '@/features/thoughts';
import { isSameDay } from '@/lib/date';
import type { ThoughtType } from '@/lib/db/schema';
import { spacing } from '@/theme';

export default function NewThoughtScreen() {
  const router = useRouter();
  const createThought = useCreateThought();
  const { data: entries = [] } = useDiaryEntries();

  const [content, setContent] = useState('');
  const [type, setType] = useState<ThoughtType>('other');
  const [linkToToday, setLinkToToday] = useState(false);

  const todaysEntry = useMemo(
    () => entries.find((entry) => isSameDay(entry.createdAt, new Date())),
    [entries],
  );

  const canSubmit = content.trim().length > 0 && !createThought.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    createThought.mutate(
      {
        content: content.trim(),
        type,
        aiExcluded: false,
        linkedEntryId: linkToToday && todaysEntry ? todaysEntry.id : null,
      },
      {
        onSuccess: () => {
          // Land on the list so the user sees their thought (and discovers
          // older ones) right after capture.
          router.replace('/thoughts');
        },
      },
    );
  };

  return (
    <Screen>
      <ScreenHeader title="New thought" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: spacing.xl, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TextInput
            multiline
            value={content}
            onChangeText={setContent}
            placeholder="What's on your mind?"
            autoFocus
          />

          <View style={{ gap: spacing.sm }}>
            <Text variant="caption" color="textSecondary">
              Type
            </Text>
            <TypeChips value={type} onChange={setType} />
          </View>

          {todaysEntry ? (
            <Switch
              label="Link to today's diary entry"
              description="Connect this thought to what you reflected on today."
              value={linkToToday}
              onChange={setLinkToToday}
            />
          ) : null}

          <Button
            label={createThought.isPending ? 'Saving…' : 'Save'}
            onPress={handleSubmit}
            disabled={!canSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
