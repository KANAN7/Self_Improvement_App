import { useRouter } from 'expo-router';
import { FlatList, Pressable, View } from 'react-native';

import { Screen, ScreenHeader, Text } from '@/components';
import { EntryCard, useDiaryEntries } from '@/features/diary';
import { colors, spacing } from '@/theme';

export default function DiaryListScreen() {
  const router = useRouter();
  const { data: entries = [], isLoading } = useDiaryEntries();

  return (
    <Screen>
      <ScreenHeader
        title="Reflect"
        showBack
        rightSlot={
          <Pressable
            onPress={() => router.push('/diary/new')}
            accessibilityRole="button"
            accessibilityLabel="New entry"
            hitSlop={12}
          >
            <Text variant="body" color="accentGold">
              +
            </Text>
          </Pressable>
        }
      />

      {isLoading ? (
        <EmptyState message="Loading…" />
      ) : entries.length === 0 ? (
        <EmptyState message="Nothing here yet. Tap + to write something." />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(entry) => entry.id}
          contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <EntryCard entry={item} onPress={() => router.push(`/diary/${item.id}`)} />
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

export const accent = colors.accentGold;
