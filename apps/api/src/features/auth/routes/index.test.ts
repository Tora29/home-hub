/**
 * @file テスト: 認証 API ルート
 * @module apps/api/src/features/auth/routes/index.test.ts
 * @testType api
 *
 * @target ./index.ts
 * @spec specs/auth/spec.md
 * @covers AC-001, AC-002, AC-005, AC-101, AC-102
 *
 * @note
 * AC-201, AC-202（空フィールドのバリデーションエラー表示）は FE 側の loginSchema によるバリデーションであり、
 * packages/shared/src/schemas/auth.ts の Unit テストで担保する。
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

vi.mock('../../../lib/auth.js', () => ({
  createAuth: vi.fn(),
}));

import { createAuth } from '../../../lib/auth.js';
type CreateAuthReturn = ReturnType<typeof createAuth>;
import { authRoutes } from './index.js';

const createTestApp = () => {
  const app = new Hono<{ Bindings: { DB: D1Database } }>();
  app.route('/api', authRoutes);
  return app;
};

describe('POST /api/auth/sign-in/email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('[AC-001] 正しい認証情報でログインすると 200 とユーザー情報を返す', async () => {
    vi.mocked(createAuth).mockReturnValue({
      handler: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ user: { id: '1', email: 'husband@example.com', name: '夫' }, token: 'session-token' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    } as unknown as CreateAuthReturn);

    const app = createTestApp();
    const res = await app.request(
      '/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'husband@example.com', password: 'correct-password' }),
      },
      { DB: {} as D1Database },
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { user: { email: string; name: string } };
    expect(body.user.email).toBe('husband@example.com');
    expect(body.user.name).toBe('夫');
  });

  test('[AC-101] 存在しないメールアドレスでのログインは 401 を返す', async () => {
    vi.mocked(createAuth).mockReturnValue({
      handler: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ message: 'Invalid email or password' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    } as unknown as CreateAuthReturn);

    const app = createTestApp();
    const res = await app.request(
      '/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'notexist@example.com', password: 'any-password' }),
      },
      { DB: {} as D1Database },
    );

    expect(res.status).toBe(401);
  });

  test('[AC-102] 誤ったパスワードでのログインは 401 を返す', async () => {
    vi.mocked(createAuth).mockReturnValue({
      handler: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ message: 'Invalid email or password' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    } as unknown as CreateAuthReturn);

    const app = createTestApp();
    const res = await app.request(
      '/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'husband@example.com', password: 'wrong-password' }),
      },
      { DB: {} as D1Database },
    );

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/sign-out', () => {
  test('[AC-002] ログアウトすると 200 を返す', async () => {
    vi.mocked(createAuth).mockReturnValue({
      handler: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    } as unknown as CreateAuthReturn);

    const app = createTestApp();
    const res = await app.request(
      '/api/auth/sign-out',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'session=valid-session-token',
        },
      },
      { DB: {} as D1Database },
    );

    expect(res.status).toBe(200);
  });
});

describe('GET /api/auth/session', () => {
  test('[AC-005] 有効なセッションでセッション情報を取得できる', async () => {
    vi.mocked(createAuth).mockReturnValue({
      handler: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ user: { id: '1', email: 'husband@example.com', name: '夫' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    } as unknown as CreateAuthReturn);

    const app = createTestApp();
    const res = await app.request(
      '/api/auth/session',
      { headers: { Cookie: 'session=valid-session-token' } },
      { DB: {} as D1Database },
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { user: { email: string } };
    expect(body.user.email).toBe('husband@example.com');
  });
});
