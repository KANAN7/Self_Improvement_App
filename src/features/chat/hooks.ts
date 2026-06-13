import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import { AiError, streamChat } from '@/lib/ai/client';
import type { ChatMessage, ChatMode } from '@/lib/db/schema';

import { buildChatContext } from './context';
import {
  appendMessage,
  clearMessages,
  listMessages,
  updateMessage,
} from './db';
import { useChatUI } from './store';
import { listEntries } from '@/features/diary/db';
import { listThoughts } from '@/features/thoughts/db';

const CHAT_KEY = ['chat', 'messages'] as const;

/** How many recent assistant/user messages we replay back to the model. */
const CHAT_HISTORY_TURNS = 30;

export function useChatHistory(): UseQueryResult<ChatMessage[]> {
  return useQuery({ queryKey: CHAT_KEY, queryFn: listMessages });
}

export type SendInput = {
  content: string;
  mode: ChatMode;
};

export type SendOutcome = {
  reason: 'sent' | AiError['reason'];
};

export function useSendChat() {
  const qc = useQueryClient();
  const beginStream = useChatUI((s) => s.beginStream);
  const appendStream = useChatUI((s) => s.appendStream);
  const endStream = useChatUI((s) => s.endStream);

  return useMutation<SendOutcome, Error, SendInput>({
    mutationFn: async ({ content, mode }) => {
      // 1. Persist the user message.
      const userMsg = await appendMessage({
        role: 'user',
        content,
        mode,
        contextBasis: null,
      });
      // Optimistic: add the user message to the cache right away so the
      // composer clears and the UI re-renders before the network call.
      qc.setQueryData<ChatMessage[]>(CHAT_KEY, (prev = []) => [...prev, userMsg]);

      // 2. Build context from local diary + thoughts.
      const [entries, thoughts] = await Promise.all([
        listEntries(),
        listThoughts(),
      ]);
      const context = buildChatContext({ entries, thoughts });

      // 3. Build the message history we replay to the model.
      const history = (
        qc.getQueryData<ChatMessage[]>(CHAT_KEY) ?? [userMsg]
      ).slice(-CHAT_HISTORY_TURNS);
      const apiMessages = history.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // 4. Persist a placeholder assistant message so the UI has a stable
      // row to attach the streaming buffer to.
      const placeholder = await appendMessage({
        role: 'assistant',
        content: '',
        mode,
        contextBasis: null,
      });
      qc.setQueryData<ChatMessage[]>(CHAT_KEY, (prev = []) => [...prev, placeholder]);
      beginStream(placeholder.id);

      let accum = '';
      try {
        for await (const event of streamChat({
          mode,
          context,
          messages: apiMessages,
        })) {
          if (event.type === 'delta') {
            accum += event.text;
            appendStream(event.text);
          } else if (event.type === 'error') {
            // Server-side stream error: stop, leave whatever we got.
            break;
          }
        }
      } catch (err) {
        endStream();
        // Replace the placeholder content with whatever we managed to
        // accumulate (often nothing) so the row is consistent on disk.
        await updateMessage(placeholder.id, { content: accum });
        qc.invalidateQueries({ queryKey: CHAT_KEY });
        const reason = err instanceof AiError ? err.reason : 'failed';
        return { reason };
      }
      endStream();

      // 5. Split the trailing "Based on…" transparency line off the body.
      const { body, contextBasis } = splitTransparencyLine(accum);
      await updateMessage(placeholder.id, {
        content: body,
        contextBasis,
      });
      qc.invalidateQueries({ queryKey: CHAT_KEY });
      return { reason: 'sent' };
    },
  });
}

export function useClearChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => clearMessages(),
    onSuccess: () => {
      qc.setQueryData(CHAT_KEY, []);
    },
  });
}

/**
 * Splits the assistant reply into body + transparency line. Per the
 * CHAT_TRANSPARENCY_INSTRUCTION prompt, Claude ends the message with a
 * single line starting "Based on …". We pull that out so we can render
 * it small and gray, separately.
 */
function splitTransparencyLine(text: string): {
  body: string;
  contextBasis: string | null;
} {
  const trimmed = text.trim();
  // Find the last newline whose following line starts with "Based on".
  const lines = trimmed.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const candidate = lines[i]?.trim();
    if (!candidate) continue;
    if (/^Based on\b/i.test(candidate)) {
      const body = lines.slice(0, i).join('\n').trim();
      return { body: body || trimmed, contextBasis: candidate };
    }
    // Non-empty, non-matching line — assistant didn't comply; bail out.
    return { body: trimmed, contextBasis: null };
  }
  return { body: trimmed, contextBasis: null };
}
