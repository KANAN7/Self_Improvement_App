import { Image, Pressable, View } from 'react-native';

import { Card, Text } from '@/components';
import type { VaultItem } from '@/lib/db/schema';
import { colors, radius, spacing } from '@/theme';

import { VAULT_CATEGORIES } from './CategoryChips';

const CATEGORY_LABEL: Record<VaultItem['category'], string> = Object.fromEntries(
  VAULT_CATEGORIES.map((c) => [c.value, c.label]),
) as Record<VaultItem['category'], string>;

const CONTENT_TYPE_LABEL: Record<VaultItem['contentType'], string> = {
  youtube: 'YouTube',
  article: 'Article',
  podcast: 'Podcast',
  reel: 'Reel',
  other: 'Link',
};

type VaultCardProps = {
  item: VaultItem;
  onPress?: () => void;
};

export function VaultCard({ item, onPress }: VaultCardProps) {
  const subtitle = (() => {
    try {
      return new URL(item.url).hostname.replace(/^www\./, '');
    } catch {
      return item.url;
    }
  })();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.title ?? subtitle}
      style={{ flex: 1 }}
    >
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {item.thumbnailUrl ? (
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={{
              width: '100%',
              aspectRatio: 16 / 9,
              backgroundColor: colors.bg,
            }}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View
            style={{
              width: '100%',
              aspectRatio: 16 / 9,
              backgroundColor: colors.bg,
              borderTopLeftRadius: radius.md,
              borderTopRightRadius: radius.md,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="micro" color="textSecondary">
              {CONTENT_TYPE_LABEL[item.contentType]}
            </Text>
          </View>
        )}
        <View style={{ padding: spacing.md, gap: spacing.xs }}>
          <Text variant="micro" color="accentSage">
            {CATEGORY_LABEL[item.category]}
          </Text>
          <Text variant="body" numberOfLines={2}>
            {item.title ?? subtitle}
          </Text>
          {item.title ? (
            <Text variant="micro" color="textSecondary" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}
