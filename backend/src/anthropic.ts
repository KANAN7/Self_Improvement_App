/**
 * Thin Anthropic SDK wrapper. Returns null when the API key is missing,
 * so handlers can render an "AI not configured" response instead of
 * crashing during dev.
 */

import Anthropic from '@anthropic-ai/sdk';

import type { Env } from './env.js';

let cachedClient: Anthropic | null | undefined;

export function getAnthropic(env: Env): Anthropic | null {
  if (cachedClient !== undefined) return cachedClient;
  if (!env.anthropicApiKey) {
    cachedClient = null;
    return null;
  }
  cachedClient = new Anthropic({ apiKey: env.anthropicApiKey });
  return cachedClient;
}

export class AnthropicNotConfiguredError extends Error {
  constructor() {
    super('Anthropic API key not configured');
    this.name = 'AnthropicNotConfiguredError';
  }
}
