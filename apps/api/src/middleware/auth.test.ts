/**
 * @file テスト: 認証ミドルウェア
 * @module apps/api/src/middleware/auth.test.ts
 * @testType unit
 *
 * @target ./auth.ts
 * @spec specs/auth/spec.md
 * @covers AC-006
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { AppError } from '../lib/errors.js';

vi.mock('../lib/auth.js', () => ({
  createAuth: vi.fn(),
}));

import { createAuth } from '../lib/auth.js';
import { authMiddleware } from './auth.js';
type CreateAuthReturn = ReturnType<typeof createAuth>;

const createTestApp = () => {
  const app = new Hono<{ Bindings: { DB: D1Database } }>();
  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json(
        { error: { code: err.code, message: err.message } },
        err.status as Parameters<typeof c.json>[1],
      );
    }
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'エラーが発生しました' } }, 500);
  });
  app.use('/protected', authMiddleware);
  app.get('/protected', (c) => c.json({ ok: true }));
  return app;
};

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('[AC-006] 未認証状態でのアクセス', () => {
    test('セッションがない場合は 401 UNAUTHORIZED を返す', async () => {
      vi.mocked(createAuth).mockReturnValue({
        api: { getSession: vi.fn().mockResolvedValue(null) },
      } as unknown as CreateAuthReturn);

      const app = createTestApp();
      const res = await app.request('/protected', {}, { DB: {} as D1Database });

      expect(res.status).toBe(401);
      const body = await res.json() as { error: { code: string; message: string } };
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('認証が必要です');
    });
  });

  describe('認証済み状態でのアクセス', () => {
    test('[AC-006] 有効なセッションがある場合は次のハンドラを実行する', async () => {
      vi.mocked(createAuth).mockReturnValue({
        api: {
          getSession: vi.fn().mockResolvedValue({
            user: { id: '1', email: 'husband@example.com', name: '夫' },
            session: { id: 'session-id' },
          }),
        },
      } as unknown as CreateAuthReturn);

      const app = createTestApp();
      const res = await app.request('/protected', {}, { DB: {} as D1Database });

      expect(res.status).toBe(200);
      const body = await res.json() as { ok: boolean };
      expect(body.ok).toBe(true);
    });
  });
});
