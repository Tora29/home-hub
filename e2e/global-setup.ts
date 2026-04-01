/**
 * @file E2E グローバルセットアップ
 * @module e2e/global-setup.ts
 *
 * @description
 * Playwright テスト実行前にテストユーザーとシードデータを作成する。
 * Better Auth の sign-up/sign-in エンドポイントを呼び出し、
 * 続けて支出カテゴリのシードデータを API 経由で投入する。
 */

const TEST_EMAIL = process.env.TEST_EMAIL ?? 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'password123';
const BASE_URL = 'http://localhost:4173';

const SEED_CATEGORIES = ['食費', '家賃', '光熱費', '日用品', '交通費'];

export default async function globalSetup() {
	// ユーザー作成
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

	// サインインしてセッション Cookie を取得
	const signInRes = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
		body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
	});

	if (!signInRes.ok) {
		console.warn('シードデータ投入用サインインに失敗しました。カテゴリシードをスキップします。');
		return;
	}

	const cookie = signInRes.headers.get('set-cookie') ?? '';

	// 既存カテゴリを取得して重複しないようにシード
	const listRes = await fetch(`${BASE_URL}/expenses/categories`, {
		headers: { Cookie: cookie }
	});
	const existingNames: string[] = listRes.ok
		? ((await listRes.json()) as { items: { name: string }[] }).items.map((c) => c.name)
		: [];

	for (const name of SEED_CATEGORIES) {
		if (existingNames.includes(name)) continue;
		const catRes = await fetch(`${BASE_URL}/expenses/categories`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Cookie: cookie },
			body: JSON.stringify({ name })
		});
		if (!catRes.ok) {
			console.warn(`カテゴリ「${name}」の作成に失敗しました: ${catRes.status}`);
		}
	}
}
