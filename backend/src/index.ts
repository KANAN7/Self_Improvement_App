import { serve } from '@hono/node-server';
import { Hono } from 'hono';

import { loadEnv, modelFor } from './env.js';
import { checkRateLimit } from './rateLimit.js';
import { analyzeRoute } from './routes/analyze.js';
import { chatRoute } from './routes/chat.js';
import { enrichRoute } from './routes/enrich.js';

const env = loadEnv();
const app = new Hono();

// CORS — allow Expo dev (web on localhost) and the Expo Go LAN IP.
// In production we'd lock this down to the app's domain.
app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, X-Device-Id');
  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204);
  }
  await next();
});

// Health check — never rate-limited, never authenticated.
app.get('/health', (c) =>
  c.json({
    ok: true,
    aiConfigured: Boolean(env.anthropicApiKey),
    model: env.anthropicApiKey ? modelFor(env) : null,
    nodeEnv: env.nodeEnv,
  }),
);

// Per-device rate limiting on AI endpoints. Enrichment is also gated, but
// with a more forgiving limit since it doesn't cost API tokens.
app.use('/ai/*', async (c, next) => {
  const deviceId = c.req.header('X-Device-Id');
  if (!deviceId) {
    return c.json({ error: 'missing_device_id' }, 400);
  }
  const result = checkRateLimit(deviceId, env.rateLimitPerDevicePerDay);
  c.header('X-RateLimit-Remaining', String(result.remaining));
  if (!result.allowed) {
    return c.json(
      {
        error: 'rate_limited',
        message: 'Daily AI call limit reached on this device.',
        resetAt: result.resetAt,
      },
      429,
    );
  }
  await next();
});

app.route('/enrich', enrichRoute());
app.route('/ai/analyze', analyzeRoute(env));
app.route('/ai/chat', chatRoute(env));

const port = env.port;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(
    `[inward-backend] listening on http://localhost:${info.port} (${env.nodeEnv})`,
  );
  if (!env.anthropicApiKey) {
    console.log(
      '[inward-backend] ANTHROPIC_API_KEY not set — /ai/* endpoints will return 503 until configured.',
    );
  } else {
    console.log(`[inward-backend] AI model: ${modelFor(env)}`);
  }
});
