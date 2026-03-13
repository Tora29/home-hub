/**
 * @file API: エントリーポイント
 * @module apps/api/src/index.ts
 *
 * @description
 * Cloudflare Workers エントリーポイント。Hono アプリを初期化しルートを登録する。
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';

export type Env = {
  DB: D1Database;
  AI: Ai;
};

const app = new Hono<{ Bindings: Env }>();

app.use(
  '/api/*',
  cors({
    origin: ['http://localhost:5173'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    credentials: true,
  }),
);

app.get('/health', (c) => c.json({ status: 'ok' }));

export default app;
