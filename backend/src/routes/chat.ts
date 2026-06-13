import { Hono } from 'hono';

import { getAnthropic } from '../anthropic.js';
import { type Env, modelFor } from '../env.js';
import {
  CHAT_TRANSPARENCY_INSTRUCTION,
  INWARD_BASE_SYSTEM_PROMPT,
  MODE_MODIFIERS,
  type ChatMode,
} from '../prompts.js';

type ChatBody = {
  mode: ChatMode;
  /** Recent diary entries + thoughts, formatted as plain text by the phone. */
  context?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
};

const VALID_MODES: ChatMode[] = ['reflective', 'coach', 'direct'];

export function chatRoute(env: Env) {
  const app = new Hono();

  app.post('/', async (c) => {
    const body = await c.req.json<ChatBody>().catch(() => null);
    if (
      !body ||
      !VALID_MODES.includes(body.mode) ||
      !Array.isArray(body.messages) ||
      body.messages.length === 0
    ) {
      return c.json(
        { error: 'Invalid body. Expected { mode, context?, messages: [] }' },
        400,
      );
    }

    const client = getAnthropic(env);
    if (!client) {
      return c.json(
        {
          error: 'ai_not_configured',
          message: 'ANTHROPIC_API_KEY is not set on the backend.',
        },
        503,
      );
    }

    const systemPrompt = [
      INWARD_BASE_SYSTEM_PROMPT,
      MODE_MODIFIERS[body.mode],
      CHAT_TRANSPARENCY_INSTRUCTION,
      body.context?.trim()
        ? `Recent context from the user (oldest first):\n${body.context.trim()}`
        : 'The user has no recent diary or thought context to ground from.',
    ].join('\n\n');

    try {
      const stream = await client.messages.create({
        model: modelFor(env),
        max_tokens: 1024,
        system: systemPrompt,
        messages: body.messages,
        stream: true,
      });

      // Stream Server-Sent Events back to the phone. Each chunk is a JSON
      // object on its own line: { type: 'delta', text: '...' } or
      // { type: 'done' }. Phone parses by splitting on newlines.
      c.header('Content-Type', 'application/x-ndjson');
      c.header('Cache-Control', 'no-cache');

      const encoder = new TextEncoder();
      const readable = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const event of stream) {
              if (
                event.type === 'content_block_delta' &&
                event.delta.type === 'text_delta'
              ) {
                const line = JSON.stringify({
                  type: 'delta',
                  text: event.delta.text,
                });
                controller.enqueue(encoder.encode(line + '\n'));
              }
            }
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'));
            controller.close();
          } catch (err) {
            console.error('[/ai/chat] stream error', err);
            controller.enqueue(
              encoder.encode(
                JSON.stringify({ type: 'error', message: 'upstream_failed' }) +
                  '\n',
              ),
            );
            controller.close();
          }
        },
      });

      return c.body(readable);
    } catch (err) {
      console.error('[/ai/chat] error', err);
      return c.json({ error: 'upstream_failed' }, 502);
    }
  });

  return app;
}
