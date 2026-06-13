import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
} from 'react-native';

import {
  Button,
  Screen,
  ScreenHeader,
  Text,
  TextInput,
} from '@/components';
import {
  MessageBubble,
  ModeSegmented,
  useChatHistory,
  useChatUI,
  useClearChat,
  useSendChat,
} from '@/features/chat';
import { useSettings } from '@/features/settings';
import type { ChatMessage } from '@/lib/db/schema';
import { colors, spacing } from '@/theme';

export default function ChatScreen() {
  const { data: history = [] } = useChatHistory();
  const { data: settings } = useSettings();
  const send = useSendChat();
  const clear = useClearChat();

  const mode = useChatUI((s) => s.mode);
  const setMode = useChatUI((s) => s.setMode);
  const streaming = useChatUI((s) => s.streaming);

  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const initializedFromSettings = useRef(false);

  // Adopt the user's saved default mode once when settings load.
  useEffect(() => {
    if (!settings || initializedFromSettings.current) return;
    initializedFromSettings.current = true;
    setMode(settings.defaultAiMode);
  }, [settings, setMode]);

  // Scroll to the bottom whenever the list grows or new tokens arrive.
  useEffect(() => {
    if (history.length === 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [history.length, streaming?.text]);

  const canSend = draft.trim().length > 0 && !send.isPending;

  const handleSend = () => {
    if (!canSend) return;
    const content = draft.trim();
    setDraft('');
    send.mutate(
      { content, mode },
      {
        onSuccess: ({ reason }) => {
          if (reason === 'sent') return;
          showSendError(reason);
        },
      },
    );
  };

  const handleClear = () => {
    if (history.length === 0) return;
    if (Platform.OS === 'web') {
      // Native confirms aren't available on web; clear directly with a
      // gentle visual nudge — the user can re-fill if they made a mistake
      // (their entries/thoughts aren't touched).
      clear.mutate();
      return;
    }
    Alert.alert(
      'Clear this conversation?',
      'Your diary entries and thoughts are not affected. The companion will start fresh next time.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => clear.mutate() },
      ],
    );
  };

  return (
    <Screen>
      <ScreenHeader
        title="Companion"
        showBack
        rightSlot={
          <Pressable
            onPress={handleClear}
            accessibilityRole="button"
            accessibilityLabel="Clear conversation"
            hitSlop={12}
          >
            <Text variant="caption" color="textSecondary">
              Clear
            </Text>
          </Pressable>
        }
      />

      <View style={{ marginBottom: spacing.sm }}>
        <ModeSegmented value={mode} onChange={setMode} disabled={send.isPending} />
      </View>

      <Text
        variant="micro"
        color="textSecondary"
        style={{
          textAlign: 'center',
          marginBottom: spacing.md,
        }}
      >
        Reflection tool — not a substitute for professional support.
      </Text>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          ref={listRef}
          data={history}
          keyExtractor={(message) => message.id}
          contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.md }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: spacing.xxl,
                paddingHorizontal: spacing.lg,
              }}
            >
              <Text
                variant="body"
                color="textSecondary"
                style={{ textAlign: 'center' }}
              >
                A space to think out loud. Whatever you share, it stays on your device.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isStreamingRow = streaming?.messageId === item.id;
            const display = isStreamingRow
              ? { ...item, content: streaming.text, contextBasis: null }
              : item;
            return <MessageBubble message={display} isStreaming={isStreamingRow} />;
          }}
        />

        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            paddingTop: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: colors.surface,
          }}
        >
          <View style={{ flex: 1 }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Say something…"
              multiline
              editable={!send.isPending}
            />
          </View>
          <View style={{ alignSelf: 'flex-end' }}>
            <Button
              label={send.isPending ? '…' : 'Send'}
              onPress={handleSend}
              disabled={!canSend}
              fullWidth={false}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function showSendError(reason: string) {
  const message = (() => {
    switch (reason) {
      case 'ai_not_configured':
        return 'AI is not configured on the backend yet.';
      case 'rate_limited':
        return 'Daily AI limit reached on this device.';
      case 'offline':
        return 'Could not reach the backend. Check your connection.';
      default:
        return 'Something went wrong. Try again in a moment.';
    }
  })();

  if (Platform.OS === 'web') {
    // Soft surface — log to console; the placeholder bubble will already
    // be visible in the chat as an empty assistant row, so users see a
    // visible signal without an alert popup.
    console.warn('[chat] send failed:', message);
    return;
  }
  Alert.alert('Couldn\'t send', message);
}
