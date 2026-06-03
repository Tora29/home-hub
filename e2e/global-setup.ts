/**
 * @file E2Eテスト: グローバルセットアップ
 * @module e2e/global-setup.ts
 * @testType e2e
 *
 * @description
 * E2E テスト実行前に D1 へユーザー・セッションを直接挿入し、
 * storageState（Cookie）ファイルを生成する。
 * これにより Google OAuth を実際に実行せずに認証済み状態でテストできる。
 */
import { execFileSync } from 'child_process';
import path from 'node:path';
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const TEST_EMAIL = process.env.TEST_EMAIL ?? 'test@example.com';
const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET ?? '';

// E2E 用固定値（global-setup・global-teardown・seeds で共有）
export const E2E_SESSION_TOKEN = 'e2e-test-session-token-do-not-use-in-prod';
export const E2E_USER_ID = 'e2e-test-user-id';
const E2E_SESSION_ID = 'e2e-test-session-id';

const SESSION_COOKIE_NAME = 'better-auth.session_token';

/**
 * Better Auth の setSignedCookie と同じ方式で Cookie 値を生成する。
 * 形式: encodeURIComponent("{token}.{base64(HMAC-SHA256)}")
 */
async function signCookieValue(value: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
	const signed = `${value}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;
	return encodeURIComponent(signed);
}

function wranglerExecute(sql: string) {
	execFileSync('npx', ['wrangler', 'd1', 'execute', 'home-hub', '--local', `--command=${sql}`], {
		stdio: 'pipe'
	});
}

function wranglerFile(file: string) {
	execFileSync('npx', ['wrangler', 'd1', 'execute', 'home-hub', '--local', `--file=${file}`], {
		stdio: 'pipe'
	});
}

export default async function globalSetup() {
	// 既存ユーザーを全削除してから E2E ユーザーを挿入
	wranglerExecute(`DELETE FROM "Session"`);
	wranglerExecute(`DELETE FROM "Account"`);
	wranglerExecute(`DELETE FROM "User"`);
	wranglerExecute(
		`INSERT INTO User (id, name, email, emailVerified, createdAt, updatedAt)
     VALUES ('${E2E_USER_ID}', 'Test User', '${TEST_EMAIL}', 1, unixepoch(), unixepoch())`
	);

	// DB には平文トークンを格納する（Better Auth は DB に平文、Cookie に署名付きを使う）
	wranglerExecute(
		`INSERT OR REPLACE INTO Session (id, token, userId, expiresAt, createdAt, updatedAt)
     VALUES ('${E2E_SESSION_ID}', '${E2E_SESSION_TOKEN}', '${E2E_USER_ID}',
             unixepoch() + 7776000, unixepoch(), unixepoch())`
	);

	const authDir = path.resolve('e2e/.auth');
	fs.mkdirSync(authDir, { recursive: true });

	const signedToken = await signCookieValue(E2E_SESSION_TOKEN, BETTER_AUTH_SECRET);

	const browser = await chromium.launch();
	const context = await browser.newContext();
	await context.addCookies([
		{
			name: SESSION_COOKIE_NAME,
			value: signedToken,
			domain: 'localhost',
			path: '/',
			httpOnly: true,
			secure: false,
			sameSite: 'Lax'
		}
	]);
	await context.storageState({ path: path.join(authDir, 'session.json') });
	await browser.close();

	// シードデータ投入
	wranglerExecute(`DELETE FROM "Recipe" WHERE "userId" = '${E2E_USER_ID}'`);
	wranglerExecute(`DELETE FROM "Expense" WHERE "userId" = '${E2E_USER_ID}'`);
	wranglerExecute(`DELETE FROM "ExpenseCategory" WHERE "userId" = '${E2E_USER_ID}'`);

	const seedDir = path.resolve('drizzle/seeds');
	wranglerFile(path.join(seedDir, 'recipes.sql'));
	wranglerFile(path.join(seedDir, 'expenses.sql'));
	console.log('E2E セッション・シードデータを投入しました');
}
