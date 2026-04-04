/**
 * @file テスト: SvelteKit サーバーフック
 * @module src/hooks.server.test.ts
 * @testType unit
 *
 * @target ./hooks.server.ts
 * @spec specs/login/spec.md
 * @covers AC-003
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handle } from './hooks.server';
import { createAuth } from '$lib/server/auth';

vi.mock('$lib/server/auth', () => ({
	createAuth: vi.fn()
}));

vi.mock('better-auth/svelte-kit', () => ({
	svelteKitHandler: vi.fn()
}));

vi.mock('$app/environment', () => ({
	building: false
}));

function createEvent(pathname: string, accept = 'text/html', sessionUser: unknown = null) {
	const url = new URL(`http://localhost${pathname}`);
	const request = new Request(`http://localhost${pathname}`, {
		headers: { accept }
	});
	const mockGetSession = vi
		.fn()
		.mockResolvedValue(sessionUser ? { user: sessionUser, session: {} } : null);
	vi.mocked(createAuth).mockReturnValue({
		api: { getSession: mockGetSession }
	} as never);
	return {
		platform: {
			env: { DB: {}, BETTER_AUTH_SECRET: 'secret' }
		},
		url,
		request,
		locals: {} as App.Locals
	};
}

describe('handle', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('認証ガード', () => {
		it('[SPEC: AC-003] 未認証でブラウザから / にアクセスすると /login へリダイレクトされる', async () => {
			const event = createEvent('/', 'text/html,application/xhtml+xml');
			const resolve = vi.fn();

			await expect(handle({ event, resolve } as never)).rejects.toMatchObject({
				status: 302,
				location: '/login'
			});
		});

		it('[SPEC: AC-003] 未認証でも /login へのアクセスはリダイレクトされない', async () => {
			const event = createEvent('/login', 'text/html');
			const resolve = vi.fn().mockResolvedValue(new Response('ok'));

			await expect(handle({ event, resolve } as never)).resolves.toBeDefined();
			expect(resolve).toHaveBeenCalled();
		});

		it('[SPEC: AC-003] 認証済みユーザーは / へアクセスできる', async () => {
			const event = createEvent('/', 'text/html', { id: 'user-1', email: 'test@example.com' });
			const resolve = vi.fn().mockResolvedValue(new Response('ok'));

			await expect(handle({ event, resolve } as never)).resolves.toBeDefined();
			expect(resolve).toHaveBeenCalled();
		});
	});
});
