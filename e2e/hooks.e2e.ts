/**
 * @file E2Eテスト: 認証ガード・セキュリティヘッダー（hooks.server.ts）
 * @module e2e/hooks.e2e.ts
 * @testType e2e
 *
 * @scenarios
 * - 未認証の画面遷移は /login へ 302 リダイレクトされる
 * - 未認証の API 呼び出し（fetch）は JSON 401 UNAUTHORIZED が返る
 * - SSR ページ・API レスポンスにセキュリティヘッダー 4 種が付与される
 * - role が main 以外のユーザーの /workout API 呼び出しは JSON 403 FORBIDDEN が返る
 *
 * @pages
 * - / - ダッシュボード（認証必須）
 * - /expenses - 支出 API（認証必須）
 * - /workout - 筋トレ API（role=main 限定）
 */
import { execFileSync } from 'node:child_process';
import { test, expect, type APIResponse } from '@playwright/test';

const SECURITY_HEADERS = {
	'x-frame-options': 'DENY',
	'x-content-type-options': 'nosniff',
	'strict-transport-security': 'max-age=31536000; includeSubDomains',
	'referrer-policy': 'strict-origin-when-cross-origin'
};

function expectSecurityHeaders(res: APIResponse) {
	const headers = res.headers();
	for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
		expect(headers[key], key).toBe(value);
	}
}

test.describe('認証ガード - 未認証', () => {
	test.use({ storageState: { cookies: [], origins: [] } });

	test('未認証で画面遷移した場合、/login へ 302 リダイレクトされる', async ({ request }) => {
		const res = await request.get('/', {
			headers: { Accept: 'text/html' },
			maxRedirects: 0
		});
		expect(res.status()).toBe(302);
		expect(res.headers()['location']).toBe('/login');
	});

	test('未認証で API を呼び出した場合、401 UNAUTHORIZED が JSON で返る', async ({ request }) => {
		const res = await request.get('/expenses', {
			headers: { Accept: 'application/json' },
			maxRedirects: 0
		});
		expect(res.status()).toBe(401);
		expect(await res.json()).toEqual({ code: 'UNAUTHORIZED', message: '認証が必要です' });
	});

	test('未認証レスポンスの場合も、セキュリティヘッダーが付与される', async ({ request }) => {
		const res = await request.get('/expenses', { headers: { Accept: 'application/json' } });
		expectSecurityHeaders(res);
	});
});

test.describe('セキュリティヘッダー - 認証済み', () => {
	test('SSR ページのレスポンスにセキュリティヘッダーが付与される', async ({ request }) => {
		const res = await request.get('/', { headers: { Accept: 'text/html' } });
		expect(res.status()).toBe(200);
		expectSecurityHeaders(res);
	});

	test('API のレスポンスにセキュリティヘッダーが付与される', async ({ request }) => {
		const res = await request.get('/dashboard/summary', {
			headers: { Accept: 'application/json' }
		});
		expect(res.status()).toBe(200);
		expectSecurityHeaders(res);
	});
});

// global-setup.ts が作成する role=null のパートナーユーザー
const PARTNER_USER_ID = 'e2e-partner-user-id';
const PARTNER_SESSION_ID = 'e2e-partner-session-id';
const PARTNER_SESSION_TOKEN = 'e2e-partner-session-token-do-not-use-in-prod';
const SESSION_COOKIE_NAME = 'better-auth.session_token';

function wranglerExecute(sql: string) {
	execFileSync('npx', ['wrangler', 'd1', 'execute', 'home-hub', '--local', `--command=${sql}`], {
		stdio: 'pipe'
	});
}

/** Better Auth の setSignedCookie と同じ方式で Cookie 値を生成する（global-setup.ts と同一）。 */
async function signCookieValue(value: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
	return encodeURIComponent(`${value}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`);
}

test.describe('role 制限 - role が main 以外', () => {
	test.use({ storageState: { cookies: [], origins: [] } });

	test.beforeAll(() => {
		wranglerExecute(
			`INSERT OR REPLACE INTO Session (id, token, userId, expiresAt, createdAt, updatedAt)
       VALUES ('${PARTNER_SESSION_ID}', '${PARTNER_SESSION_TOKEN}', '${PARTNER_USER_ID}',
               unixepoch() + 3600, unixepoch(), unixepoch())`
		);
	});

	test.afterAll(() => {
		wranglerExecute(`DELETE FROM "Session" WHERE "id" = '${PARTNER_SESSION_ID}'`);
	});

	test('role が main 以外のユーザーが /workout API を呼び出した場合、403 FORBIDDEN が JSON で返る', async ({
		playwright,
		baseURL
	}) => {
		const cookie = await signCookieValue(
			PARTNER_SESSION_TOKEN,
			process.env.BETTER_AUTH_SECRET ?? ''
		);
		const request = await playwright.request.newContext({
			baseURL: baseURL ?? 'http://localhost:4173',
			extraHTTPHeaders: { Cookie: `${SESSION_COOKIE_NAME}=${cookie}` }
		});
		try {
			// 認証自体は通っている（家計簿 API は利用可能）ことを確認し、403 が role 起因であることを担保する
			const allowed = await request.get('/expenses', { headers: { Accept: 'application/json' } });
			expect(allowed.status()).toBe(200);

			const res = await request.get('/workout', { headers: { Accept: 'application/json' } });
			expect(res.status()).toBe(403);
			expect(await res.json()).toEqual({ code: 'FORBIDDEN', message: 'アクセス権限がありません' });
		} finally {
			await request.dispose();
		}
	});
});
