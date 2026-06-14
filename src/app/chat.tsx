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
  ModeMenu,
  useChatHistory,
  useChatUI,
  useClearChat,
  useSendChat,
} from '@/features/chat';
import { useSettings } from '@/features/settings';
import type { ChatMessage, ChatMode } from '@/lib/db/schema';
import { colors, radius, spacing } from '@/theme';

const MODE_LABEL: Record<ChatMode, string> = {
  reflective: 'Reflective',
  coach: 'Coach',
  direct: 'Direct',
};

const TOAST_MS = 2200;

type TimelineRow =
  | { kind: 'message'; message: ChatMessage }
  | { kind: 'mode-change'; id: string; mode: ChatMode };

export default function ChatScreen() {
  const { data: history = [] } = useChatHistory();
  const { data: settings } = useSettings();
  const send = useSendChat();
  const clear = useClearChat();

  const mode = useChatUI((s) => s.mode);
  const setMode = useChatUI((s) => s.setMode);
  const streaming = useChatUI((s) => s.streaming);

  const [draft, setDraft] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const listRef = useRef<FlatList<TimelineRow>>(null);
  const initializedFromSettings = useRef(false);

  // Adopt the user's saved default mode once when settings load.
  useEffect(() => {
    if (!settings || initializedFromSettings.current) return;
    initializedFromSettings.current = true;
    setMode(settings.defaultAiMode);
  }, [settings, setMode]);

  // Auto-dismiss toast.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  // Build the timeline with mode-change markers derived from message modes.
  const rows = buildTimeline(history);

  // Scroll to bottom on growth or token deltas.
  useEffect(() => {
    if (rows.length === 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [rows.length, streaming?.text]);

  const handleModeChange = (next: ChatMode) => {
    if (next === mode) return;
    setMode(next);
    setToast(`Switched to ${MODE_LABEL[next]} mode`);
  };

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

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.sm,
        }}
      >
        <ModeMenu value={mode} onChange={handleModeChange} disabled={send.isPending} />
        <Text variant="micro" color="textSecondary">
          Reflection tool — not professional support.
        </Text>
      </View>

      {toast ? (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.md,
            paddingVertical: 6,
            alignSelf: 'center',
            marginBottom: spacing.sm,
          }}
        >
          <Text variant="caption" color="accentSage">
            {toast}
          </Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(row) =>
            row.kind === 'mode-change' ? `mc-${row.id}` : `m-${row.message.id}`
          }
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
            if (item.kind === 'mode-change') {
              return <ModeChangeMarker mode={item.mode} />;
            }
            const message = item.message;
            const isStreamingRow = streaming?.messageId === message.id;
            const display = isStreamingRow
              ? { ...message, content: streaming.text, contextBasis: null }
              : message;
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

/**
 * Walks the chat history and inserts a synthetic mode-change row each time
 * the *assistant* mode shifts between consecutive assistant replies. We use
 * the assistant's mode rather than the user's, because that's what the user
 * actually sees in the prior reply.
 */
function buildTimeline(history: ChatMessage[]): TimelineRow[] {
  const rows: TimelineRow[] = [];
  let lastAssistantMode: ChatMode | null = null;
  for (const message of history) {
    if (message.role === 'assistant') {
      if (lastAssistantMode != null && message.mode !== lastAssistantMode) {
        rows.push({
          kind: 'mode-change',
          id: `${message.id}-mc`,
          mode: message.mode,
        });
      }
      lastAssistantMode = message.mode;
    }
    rows.push({ kind: 'message', message });
  }
  return rows;
}

function ModeChangeMarker({ mode }: { mode: ChatMode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
      }}
    >
      <View style={{ flex: 1, height: 1, backgroundColor: colors.surface }} />
      <Text variant="micro" color="textSecondary">
        Switched to {MODE_LABEL[mode]} mode
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.surface }} />
    </View>
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
    console.warn('[chat] send failed:', message);
    return;
  }
  Alert.alert("Couldn't send", message);
}
