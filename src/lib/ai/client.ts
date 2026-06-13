/**
 * Phone → backend AI client.
 *
 * Errors are normalized so screens can branch on a small set of cases:
 *   - 'ai_not_configured': backend is up but the Anthropic key is unset.
 *   - 'rate_limited': this device hit its daily cap.
 *   - 'offline': we couldn't reach the backend at all.
 *   - 'failed': anything else upstream.
 *
 * No screen should care about HTTP status codes directly.
 */

import { getBackendUrl } from '../backend';
import { getDeviceId } from '../device';

export type AiErrorReason =
  | 'ai_not_configured'
  | 'rate_limited'
  | 'offline'
  | 'failed';

export class AiError extends Error {
  reason: AiErrorReason;
  constructor(reason: AiErrorReason, message?: string) {
    super(message ?? reason);
    this.name = 'AiError';
    this.reason = reason;
  }
}

export type AnalyzeInput = {
  entry: {
    content: string;
    mood: number | null;
    energy: number | null;
    focus: number | null;
  };
  recentContext?: string;
};

export type AnalyzeResult = {
  tone: 'positive' | 'neutral' | 'negative' | 'mixed';
  summary: string;
  question: string;
};

export async function analyzeEntry(input: AnalyzeInput): Promise<AnalyzeResult> {
  const url = await requireBackendUrl();
  const deviceId = await getDeviceId();
  let res: Response;
  try {
    res = await fetch(`${url}/ai/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId,
      },
      body: JSON.stringify(input),
    });
  } catch {
    throw new AiError('offline');
  }
  if (res.status === 503) throw new AiError('ai_not_configured');
  if (res.status === 429) throw new AiError('rate_limited');
  if (!res.ok) throw new AiError('failed', `HTTP ${res.status}`);
  return (await res.json()) as AnalyzeResult;
}

export type ChatMode = 'reflective' | 'coach' | 'direct';

export type ChatInput = {
  mode: ChatMode;
  context?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
};

export type ChatStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

/**
 * Streams chat tokens from the backend. The caller iterates with for-await:
 *
 *   for await (const event of streamChat({ mode, messages })) {
 *     if (event.type === 'delta') accum += event.text;
 *   }
 *
 * Throws AiError before yielding if the backend is unreachable / 503 / 429.
 */
export async function* streamChat(
  input: ChatInput,
): AsyncGenerator<ChatStreamEvent, void, void> {
  const url = await requireBackendUrl();
  const deviceId = await getDeviceId();

  let res: Response;
  try {
    res = await fetch(`${url}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId,
      },
      body: JSON.stringify(input),
    });
  } catch {
    throw new AiError('offline');
  }
  if (res.status === 503) throw new AiError('ai_not_configured');
  if (res.status === 429) throw new AiError('rate_limited');
  if (!res.ok || !res.body) throw new AiError('failed', `HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newlineIdx = buffer.indexOf('\n');
      while (newlineIdx !== -1) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);
        if (line) {
          try {
            const event = JSON.parse(line) as ChatStreamEvent;
            yield event;
          } catch {
            // Malformed line — skip
          }
        }
        newlineIdx = buffer.indexOf('\n');
      }
    }
  } finally {
    reader.cancel().catch(() => undefined);
  }
}

async function requireBackendUrl(): Promise<string> {
  const url = getBackendUrl();
  if (!url) throw new AiError('offline', 'Backend URL not resolvable');
  return url;
}
