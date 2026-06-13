import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { Screen, ScreenHeader } from '@/components';
import { EntryForm, useAnalyzeEntry, useCreateEntry } from '@/features/diary';
import { spacing } from '@/theme';

export default function NewEntryScreen() {
  const router = useRouter();
  const createEntry = useCreateEntry();
  const analyzeEntry = useAnalyzeEntry();

  return (
    <Screen>
      <ScreenHeader title="New entry" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingBottom: spacing.xl,
            gap: spacing.lg,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <EntryForm
            submitLabel={createEntry.isPending ? 'Saving…' : 'Save'}
            isSubmitting={createEntry.isPending}
            onSubmit={(values) => {
              createEntry.mutate(values, {
                onSuccess: (entry) => {
                  // Fire-and-forget analyze — never block the user
                  analyzeEntry.mutate(entry);
                  if (router.canGoBack()) router.back();
                  else router.replace('/diary');
                },
              });
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
