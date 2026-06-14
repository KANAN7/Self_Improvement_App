import { View } from 'react-native';

import { Markdown, Text } from '@/components';
import type { ChatMessage } from '@/lib/db/schema';
import { colors, radius, spacing } from '@/theme';

type MessageBubbleProps = {
  message: Pick<ChatMessage, 'role' | 'content' | 'contextBasis'>;
  /** True while this message is currently being streamed in. */
  isStreaming?: boolean;
};

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <View style={{ alignItems: 'flex-end', paddingHorizontal: spacing.md }}>
        <View
          style={{
            maxWidth: '85%',
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        >
          <Text variant="body" color="textPrimary">
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  // Assistant
  const trimmed = message.content.trim();
  const showCursor = isStreaming && trimmed.length === 0;

  return (
    <View
      style={{
        alignItems: 'flex-start',
        paddingHorizontal: spacing.md,
        gap: spacing.xs,
      }}
    >
      <View style={{ maxWidth: '90%' }}>
        {showCursor ? (
          <Text variant="body" color="textSecondary">
            …
          </Text>
        ) : isStreaming ? (
          // Plain text + cursor while streaming — markdown formatting would
          // flicker as partial tokens arrive. Render markdown once complete.
          <Text variant="body" color="textPrimary" style={{ lineHeight: 24 }}>
            {trimmed}▍
          </Text>
        ) : (
          <Markdown text={trimmed} color="textPrimary" />
        )}
      </View>
      {message.contextBasis && !isStreaming ? (
        <Text variant="micro" color="textSecondary" style={{ fontStyle: 'italic' }}>
          ℹ {message.contextBasis}
        </Text>
      ) : null}
    </View>
  );
}
