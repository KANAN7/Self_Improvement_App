import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

import { Button, Screen, ScreenHeader, Text, TextInput } from '@/components';
import {
  CategoryChips,
  useDeleteVaultItem,
  useUpdateVaultItem,
  useVaultItem,
} from '@/features/vault';
import type { VaultCategory } from '@/lib/db/schema';
import { colors, radius, spacing } from '@/theme';

export default function EditVaultItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: item, isLoading } = useVaultItem(id);
  const updateItem = useUpdateVaultItem(id ?? '');
  const deleteItem = useDeleteVaultItem();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<VaultCategory>('other');
  const [whySaved, setWhySaved] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!item) return;
    setTitle(item.title ?? '');
    setCategory(item.category);
    setWhySaved(item.whySaved ?? '');
  }, [item]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/vault');
  };

  const handleSave = () => {
    if (!item) return;
    updateItem.mutate(
      {
        url: item.url,
        title: title.trim() ? title.trim() : null,
        thumbnailUrl: item.thumbnailUrl,
        contentType: item.contentType,
        category,
        whySaved: whySaved.trim() ? whySaved.trim() : null,
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
    Alert.alert('Delete this saved link?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteItem.mutate(id, { onSuccess: goBack }),
      },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader
        title="Saved link"
        showBack
        rightSlot={
          <Pressable
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel="Delete saved link"
            hitSlop={12}
          >
            <Text variant="caption" color="textSecondary">
              Delete
            </Text>
          </Pressable>
        }
      />

      {isLoading || !item ? (
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
                    deleteItem.mutate(item.id, { onSuccess: goBack })
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

            {item.thumbnailUrl ? (
              <Image
                source={{ uri: item.thumbnailUrl }}
                style={{
                  width: '100%',
                  aspectRatio: 16 / 9,
                  borderRadius: radius.md,
                  backgroundColor: colors.bg,
                }}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
            ) : null}

            <Pressable
              onPress={() => void Linking.openURL(item.url)}
              accessibilityRole="link"
              hitSlop={8}
            >
              <Text variant="caption" color="accentGold" numberOfLines={1}>
                {item.url}
              </Text>
            </Pressable>

            <View style={{ gap: spacing.sm }}>
              <Text variant="caption" color="textSecondary">
                Title
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Title"
              />
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text variant="caption" color="textSecondary">
                Category
              </Text>
              <CategoryChips value={category} onChange={setCategory} />
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text variant="caption" color="textSecondary">
                Why saved?
              </Text>
              <TextInput
                value={whySaved}
                onChangeText={setWhySaved}
                placeholder="Optional"
                multiline
              />
            </View>

            <Button
              label={updateItem.isPending ? 'Saving…' : 'Save'}
              onPress={handleSave}
              disabled={updateItem.isPending}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}
