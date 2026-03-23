/**
 * @file E2E グローバルセットアップ
 * @module e2e/global-setup.ts
 *
 * @description
 * Playwright テスト実行前にテストユーザーを作成する。
 * Better Auth の sign-up エンドポイントを呼び出す。
 */

const TEST_EMAIL = process.env.TEST_EMAIL ?? 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'password123';
const BASE_URL = 'http://localhost:4173';

export default async function globalSetup() {
	const res = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
		body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD, name: 'Test User' })
	});

	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		const message = (body as { message?: string }).message ?? '';
		// ユーザーが既に存在する場合は無視する
		if (!message.toLowerCase().includes('already') && !message.toLowerCase().includes('exist')) {
			console.warn(`テストユーザー作成をスキップ: ${JSON.stringify(body)}`);
		}
	}
}
