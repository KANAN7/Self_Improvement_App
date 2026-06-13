/**
 * Tiny env loader. Node 20+ supports `--env-file=.env` natively, and tsx
 * respects it. We just read what's already in process.env and validate.
 */

export type Env = {
  anthropicApiKey: string | null;
  devModel: string;
  prodModel: string;
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  rateLimitPerDevicePerDay: number;
};

export function loadEnv(): Env {
  const nodeEnv = (process.env.NODE_ENV ?? 'development') as Env['nodeEnv'];
  return {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY?.trim() || null,
    devModel: process.env.INWARD_DEV_MODEL ?? 'claude-haiku-4-5-20251001',
    prodModel: process.env.INWARD_PROD_MODEL ?? 'claude-sonnet-4',
    port: Number(process.env.PORT ?? 3000),
    nodeEnv,
    rateLimitPerDevicePerDay: Number(
      process.env.RATE_LIMIT_PER_DEVICE_PER_DAY ?? 200,
    ),
  };
}

export function modelFor(env: Env): string {
  return env.nodeEnv === 'production' ? env.prodModel : env.devModel;
}
