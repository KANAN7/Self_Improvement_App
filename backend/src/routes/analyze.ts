import { Hono } from 'hono';

import { AnthropicNotConfiguredError, getAnthropic } from '../anthropic.js';
import { type Env, modelFor } from '../env.js';
import {
  ANALYZE_SYSTEM_INSTRUCTIONS,
  INWARD_BASE_SYSTEM_PROMPT,
} from '../prompts.js';

type AnalyzeBody = {
  entry: { content: string; mood: number | null; energy: number | null; focus: number | null };
  recentContext?: string;
};

type AnalyzeResult = {
  tone: 'positive' | 'neutral' | 'negative' | 'mixed';
  summary: string;
  question: string;
};

export function analyzeRoute(env: Env) {
  const app = new Hono();

  app.post('/', async (c) => {
    const body = await c.req.json<AnalyzeBody>().catch(() => null);
    if (!body || typeof body.entry?.content !== 'string') {
      return c.json({ error: 'Invalid body. Expected { entry: { content } }' }, 400);
    }

    const client = getAnthropic(env);
    if (!client) {
      return c.json(
        {
          error: 'ai_not_configured',
          message:
            'ANTHROPIC_API_KEY is not set on the backend. AI features are disabled in this environment.',
        },
        503,
      );
    }

    const userMessage = buildAnalyzeUserMessage(body);

    try {
      const response = await client.messages.create({
        model: modelFor(env),
        max_tokens: 400,
        system: `${INWARD_BASE_SYSTEM_PROMPT}\n\n${ANALYZE_SYSTEM_INSTRUCTIONS}`,
        messages: [{ role: 'user', content: userMessage }],
      });

      const text = extractText(response);
      const parsed = safeParseAnalyze(text);
      if (!parsed) {
        return c.json(
          { error: 'parse_failed', message: 'Model returned non-JSON', raw: text },
          502,
        );
      }
      return c.json(parsed);
    } catch (err) {
      if (err instanceof AnthropicNotConfiguredError) {
        return c.json({ error: 'ai_not_configured' }, 503);
      }
      console.error('[/ai/analyze] error', err);
      return c.json({ error: 'upstream_failed' }, 502);
    }
  });

  return app;
}

function buildAnalyzeUserMessage(body: AnalyzeBody): string {
  const lines: string[] = [];
  if (body.recentContext?.trim()) {
    lines.push('Recent context (older entries, oldest first):');
    lines.push(body.recentContext.trim());
    lines.push('');
  }
  lines.push('New entry to analyze:');
  lines.push(body.entry.content.trim());
  if (
    body.entry.mood != null ||
    body.entry.energy != null ||
    body.entry.focus != null
  ) {
    const parts: string[] = [];
    if (body.entry.mood != null) parts.push(`mood ${body.entry.mood}/5`);
    if (body.entry.energy != null) parts.push(`energy ${body.entry.energy}/5`);
    if (body.entry.focus != null) parts.push(`focus ${body.entry.focus}/5`);
    lines.push('');
    lines.push(`Self-reported: ${parts.join(', ')}.`);
  }
  return lines.join('\n');
}

function extractText(response: { content: Array<{ type: string; text?: string }> }): string {
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('');
}

function safeParseAnalyze(text: string): AnalyzeResult | null {
  const cleaned = text
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as AnalyzeResult;
    if (
      parsed &&
      ['positive', 'neutral', 'negative', 'mixed'].includes(parsed.tone) &&
      typeof parsed.summary === 'string' &&
      typeof parsed.question === 'string'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
