import { useRouter } from 'expo-router';
import { Linking, FlatList, Pressable, View } from 'react-native';

import { PlusButton, Screen, ScreenHeader, SkeletonList, Text } from '@/components';
import { useVaultItems, VaultCard } from '@/features/vault';
import { spacing } from '@/theme';

export default function VaultListScreen() {
  const router = useRouter();
  const { data: items = [], isLoading } = useVaultItems();

  return (
    <Screen>
      <ScreenHeader
        title="Vault"
        showBack
        rightSlot={
          <PlusButton
            onPress={() => router.push('/vault/new')}
            accessibilityLabel="Save a link"
          />
        }
      />

      {isLoading ? (
        <SkeletonList count={2} />
      ) : items.length === 0 ? (
        <EmptyState message="Nothing here yet. Tap + to save something worth returning to." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.md }}
          contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <VaultCard
                item={item}
                onPress={() => {
                  // Long-press could be added later for edit; tap opens link.
                  void Linking.openURL(item.url);
                }}
              />
              <Pressable
                onPress={() => router.push(`/vault/${item.id}`)}
                accessibilityRole="button"
                accessibilityLabel="Edit"
                hitSlop={8}
                style={{ alignSelf: 'flex-end', marginTop: spacing.xs }}
              >
                <Text variant="micro" color="textSecondary">
                  Edit
                </Text>
              </Pressable>
            </View>
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
