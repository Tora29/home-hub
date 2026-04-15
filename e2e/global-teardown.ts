/**
 * @file E2E グローバルティアダウン
 * @module e2e/global-teardown.ts
 *
 * @description
 * Playwright テスト実行後にテストユーザーの全データを削除し、シードデータで復元する。
 * FK 制約（Expense → ExpenseCategory）に合わせて Expense を先に削除する。
 * 最後に recipes.sql / expenses.sql を再投入してクリーンな初期状態に戻す。
 */

import { execFileSync } from 'child_process';
import path from 'node:path';

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

export default async function globalTeardown() {
	try {
		// テストユーザーの全データ削除（FK: Expense → ExpenseCategory の順）
		wranglerExecute(`DELETE FROM "Recipe" WHERE "userId" = (SELECT id FROM "User" LIMIT 1)`);
		wranglerExecute(`DELETE FROM "Expense" WHERE "userId" = (SELECT id FROM "User" LIMIT 1)`);
		wranglerExecute(
			`DELETE FROM "ExpenseCategory" WHERE "userId" = (SELECT id FROM "User" LIMIT 1)`
		);

		// シードデータで復元
		const seedDir = path.resolve('drizzle/seeds');
		wranglerFile(path.join(seedDir, 'recipes.sql'));
		wranglerFile(path.join(seedDir, 'expenses.sql'));

		console.log('E2E テストデータをクリーンアップし、シードデータで復元しました');
	} catch (e) {
		console.warn('E2E テストデータのクリーンアップに失敗しました:', e);
	}
}
