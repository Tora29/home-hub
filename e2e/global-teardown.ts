/**
 * @file E2E グローバルティアダウン
 * @module e2e/global-teardown.ts
 *
 * @description
 * Playwright テスト実行後に E2E テストが残したデータを一括削除する。
 * 確定済み支出は API で削除不可のため、D1 に直接 SQL を実行してクリーンアップする。
 */

import { execFileSync } from 'child_process';

function wranglerExecute(sql: string) {
	execFileSync('npx', ['wrangler', 'd1', 'execute', 'home-hub', '--local', `--command=${sql}`], {
		stdio: 'pipe'
	});
}

export default async function globalTeardown() {
	try {
		wranglerExecute(
			`DELETE FROM "Expense" WHERE "categoryId" IN (SELECT id FROM "ExpenseCategory" WHERE name LIKE 'E2E%')`
		);
		wranglerExecute(`DELETE FROM "ExpenseCategory" WHERE name LIKE 'E2E%'`);
		console.log('E2E テストデータをクリーンアップしました');
	} catch (e) {
		console.warn('E2E テストデータのクリーンアップに失敗しました:', e);
	}
}
