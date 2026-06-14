import { useRouter } from 'expo-router';
import { FlatList, View } from 'react-native';

import { PlusButton, Screen, ScreenHeader, SkeletonList, Text } from '@/components';
import { EntryCard, useAnalyzingIds, useDiaryEntries } from '@/features/diary';
import { colors, spacing } from '@/theme';

export default function DiaryListScreen() {
  const router = useRouter();
  const { data: entries = [], isLoading } = useDiaryEntries();
  const analyzingIds = useAnalyzingIds();

  return (
    <Screen>
      <ScreenHeader
        title="Reflect"
        showBack
        rightSlot={
          <PlusButton
            onPress={() => router.push('/diary/new')}
            accessibilityLabel="New entry"
          />
        }
      />

      {isLoading ? (
        <SkeletonList count={3} />
      ) : entries.length === 0 ? (
        <EmptyState message="Nothing here yet. Tap + to write something." />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(entry) => entry.id}
          contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <EntryCard
              entry={item}
              isAnalyzing={analyzingIds.has(item.id)}
              onPress={() => router.push(`/diary/${item.id}`)}
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

export const accent = colors.accentGold;
