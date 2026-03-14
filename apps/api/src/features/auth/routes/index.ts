/**
 * @file API: 認証
 * @module apps/api/src/features/auth/routes/index.ts
 * @feature auth
 *
 * @description
 * Better Auth のハンドラを /api/auth/* にマウントする。
 * sign-in/sign-out/session エンドポイントは Better Auth が内部処理する。
 *
 * @spec specs/auth/spec.md
 * @acceptance AC-001, AC-002
 *
 * @endpoints
 * - POST /api/auth/sign-in/email → ログイン
 * - POST /api/auth/sign-out → ログアウト
 * - GET  /api/auth/session  → セッション情報取得
 */
import { Hono } from 'hono';
import { createAuth } from '../../../lib/auth.js';
import type { Env } from '../../../index.js';

const authRoutes = new Hono<{ Bindings: Env }>();

authRoutes.on(['GET', 'POST'], '/auth/*', (c) => {
  const auth = createAuth(c.env.DB, c.env.BETTER_AUTH_SECRET, c.env.BETTER_AUTH_URL, c.env.ALLOWED_ORIGIN);
  return auth.handler(c.req.raw);
});

export { authRoutes };
