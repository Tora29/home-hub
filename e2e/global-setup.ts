/**
 * @file E2E グローバルセットアップ
 * @module e2e/global-setup.ts
 *
 * @description
 * Playwright テスト実行前にテストユーザーとシードデータを投入する。
 * Better Auth の sign-up エンドポイントでユーザーを作成後、
 * recipes.sql / expenses.sql を wrangler 経由で D1 に投入する（INSERT OR REPLACE で冪等）。
 */

import { execFileSync } from 'child_process';
import path from 'node:path';

const TEST_EMAIL = process.env.TEST_EMAIL ?? 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'password123';
const BASE_URL = 'http://localhost:4173';

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
	// ユーザー作成
	const res = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
		body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD, name: 'Test User' })
	});

	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		const message = (body as { message?: string }).message ?? '';
		if (!message.toLowerCase().includes('already') && !message.toLowerCase().includes('exist')) {
			console.warn(`テストユーザー作成をスキップ: ${JSON.stringify(body)}`);
		}
	}

	// 既存データを削除してからシード投入（FK: Expense → ExpenseCategory の順で削除）
	wranglerExecute(`DELETE FROM "Recipe" WHERE "userId" = (SELECT id FROM "User" LIMIT 1)`);
	wranglerExecute(`DELETE FROM "Expense" WHERE "userId" = (SELECT id FROM "User" LIMIT 1)`);
	wranglerExecute(`DELETE FROM "ExpenseCategory" WHERE "userId" = (SELECT id FROM "User" LIMIT 1)`);

	const seedDir = path.resolve('drizzle/seeds');
	wranglerFile(path.join(seedDir, 'recipes.sql'));
	wranglerFile(path.join(seedDir, 'expenses.sql'));
	console.log('E2E シードデータを投入しました');
}
