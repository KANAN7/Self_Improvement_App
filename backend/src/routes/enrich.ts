import { Hono } from 'hono';

import { enrich } from '../enrich.js';

type EnrichBody = { url: string };

export function enrichRoute() {
  const app = new Hono();

  app.post('/', async (c) => {
    const body = await c.req.json<EnrichBody>().catch(() => null);
    if (!body || typeof body.url !== 'string' || body.url.trim() === '') {
      return c.json({ error: 'Invalid body. Expected { url }' }, 400);
    }

    try {
      const url = new URL(body.url.trim());
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return c.json({ error: 'Only http(s) URLs are supported' }, 400);
      }
    } catch {
      return c.json({ error: 'Not a valid URL' }, 400);
    }

    const result = await enrich(body.url);
    return c.json(result);
  });

  return app;
}
