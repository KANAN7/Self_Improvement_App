import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Button, Screen, ScreenHeader, Text, TextInput } from '@/components';
import { CategoryChips, useCreateVaultItem } from '@/features/vault';
import type { VaultCategory, VaultContentType } from '@/lib/db/schema';
import { colors, radius, spacing } from '@/theme';
import { enrichUrl, guessContentType, isUrl } from '@/lib/url';

export default function NewVaultItemScreen() {
  const router = useRouter();
  const createItem = useCreateVaultItem();

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState<VaultContentType>('other');
  const [category, setCategory] = useState<VaultCategory>('other');
  const [whySaved, setWhySaved] = useState('');
  const [isEnriching, setIsEnriching] = useState(false);
  const enrichedFor = useRef<string | null>(null);

  useEffect(() => {
    const trimmed = url.trim();
    if (!isUrl(trimmed)) return;
    if (enrichedFor.current === trimmed) return;
    enrichedFor.current = trimmed;
    setIsEnriching(true);
    void enrichUrl(trimmed)
      .then((result) => {
        // Only apply if user hasn't moved on to a different URL
        if (enrichedFor.current === trimmed) {
          setTitle(result.title);
          setThumbnailUrl(result.thumbnailUrl);
          setContentType(result.contentType);
        }
      })
      .finally(() => {
        if (enrichedFor.current === trimmed) setIsEnriching(false);
      });
  }, [url]);

  const canSubmit = isUrl(url.trim()) && !createItem.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const trimmed = url.trim();
    createItem.mutate(
      {
        url: trimmed,
        title: title?.trim() ? title.trim() : null,
        thumbnailUrl,
        contentType: contentType ?? guessContentType(trimmed),
        category,
        whySaved: whySaved.trim() ? whySaved.trim() : null,
      },
      {
        onSuccess: () => {
          router.replace('/vault');
        },
      },
    );
  };

  return (
    <Screen>
      <ScreenHeader title="Save a link" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: spacing.xl, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: spacing.sm }}>
            <Text variant="caption" color="textSecondary">
              URL
            </Text>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="Paste a link"
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          {isUrl(url.trim()) ? (
            <View style={{ gap: spacing.sm }}>
              <Text variant="caption" color="textSecondary">
                Preview {isEnriching ? '· loading…' : ''}
              </Text>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius.md,
                  overflow: 'hidden',
                }}
              >
                {thumbnailUrl ? (
                  <Image
                    source={{ uri: thumbnailUrl }}
                    style={{
                      width: '100%',
                      aspectRatio: 16 / 9,
                      backgroundColor: colors.bg,
                    }}
                    resizeMode="cover"
                    accessibilityIgnoresInvertColors
                  />
                ) : null}
                <View style={{ padding: spacing.md, gap: spacing.xs }}>
                  <TextInput
                    value={title ?? ''}
                    onChangeText={setTitle}
                    placeholder="Title (optional)"
                    style={{ backgroundColor: colors.bg }}
                  />
                </View>
              </View>
            </View>
          ) : null}

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
              placeholder="Optional — what called to you about this?"
              multiline
            />
          </View>

          <Button
            label={createItem.isPending ? 'Saving…' : 'Save'}
            onPress={handleSubmit}
            disabled={!canSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
