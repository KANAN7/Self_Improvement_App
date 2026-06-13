import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { Screen, ScreenHeader, Text, TextInput } from '@/components';
import { ThoughtCard, useThoughts } from '@/features/thoughts';
import { spacing } from '@/theme';

export default function ThoughtsListScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { data: thoughts = [], isLoading } = useThoughts(query);

  return (
    <Screen>
      <ScreenHeader
        title="Thoughts"
        showBack
        rightSlot={
          <Pressable
            onPress={() => router.push('/thoughts/new')}
            accessibilityRole="button"
            accessibilityLabel="New thought"
            hitSlop={12}
          >
            <Text variant="body" color="accentGold">
              +
            </Text>
          </Pressable>
        }
      />

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search thoughts"
        autoCorrect={false}
        autoCapitalize="none"
        style={{ marginBottom: spacing.md }}
      />

      {isLoading ? (
        <EmptyState message="Loading…" />
      ) : thoughts.length === 0 ? (
        <EmptyState
          message={
            query.trim()
              ? 'No thoughts match that search.'
              : 'Nothing here yet. Tap + to capture a thought.'
          }
        />
      ) : (
        <FlatList
          data={thoughts}
          keyExtractor={(thought) => thought.id}
          contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <ThoughtCard
              thought={item}
              onPress={() => router.push(`/thoughts/${item.id}`)}
            />
          )}
        />
      )}
    </Screen>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
      }}
    >
      <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
        {message}
      </Text>
    </View>
  );
}
