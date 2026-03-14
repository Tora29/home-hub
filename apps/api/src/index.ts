/**
 * @file API: エントリーポイント
 * @module apps/api/src/index.ts
 *
 * @description
 * Cloudflare Workers エントリーポイント。Hono アプリを初期化しルートを登録する。
 * Better Auth ハンドラを /api/auth/* にマウントし、グローバルエラーハンドラを設定する。
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { AppError } from './lib/errors.js';
import { authRoutes } from './features/auth/routes/index.js';

export type Env = {
  DB: D1Database;
  AI: Ai;
  ALLOWED_ORIGIN: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', async (c, next) => {
  return cors({
    origin: c.env.ALLOWED_ORIGIN,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    credentials: true,
  })(c, next);
});

// feature ルート登録
app.route('/api', authRoutes);

app.get('/health', (c) => c.json({ status: 'ok' }));

// グローバルエラーハンドラ
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(
      { error: { code: err.code, message: err.message, fields: err.fields } },
      err.status as Parameters<typeof c.json>[1],
    );
  }
  console.error(err);
  return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'エラーが発生しました' } }, 500);
});

export default app;
