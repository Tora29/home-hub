/**
 * @file ミドルウェア: 認証
 * @module apps/api/src/middleware/auth.ts
 * @feature auth
 *
 * @description
 * セッションを検証し、未認証の場合は 401 を返す Hono ミドルウェア。
 * Better Auth の getSession API を使用してセッション情報を取得する。
 *
 * @spec specs/auth/spec.md
 * @acceptance AC-006
 */
import { createMiddleware } from 'hono/factory';
import { createAuth } from '../lib/auth.js';
import { AppError } from '../lib/errors.js';
import type { Env } from '../index.js';

export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const auth = createAuth(c.env.DB);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    throw new AppError('UNAUTHORIZED', 401, '認証が必要です');
  }
  await next();
});
