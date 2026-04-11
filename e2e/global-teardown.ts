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
		// テストカテゴリ（テストカテゴリ_ / 削除テスト_ で始まるもの）の支出・カテゴリを削除
		wranglerExecute(
			`DELETE FROM "Expense" WHERE "categoryId" IN (SELECT id FROM "ExpenseCategory" WHERE name LIKE 'テストカテゴリ_%' OR name LIKE '削除テスト_%' OR name LIKE '食費_%' OR name LIKE '交通費_%' OR name LIKE '外食費%')`
		);
		wranglerExecute(
			`DELETE FROM "ExpenseCategory" WHERE name LIKE 'テストカテゴリ_%' OR name LIKE '削除テスト_%' OR name LIKE '食費_%' OR name LIKE '交通費_%' OR name LIKE '外食費%'`
		);
		// pending 状態のテスト残留支出を 'checked' に戻す（pending は API で削除不可のため）
		wranglerExecute(`UPDATE "Expense" SET "status" = 'checked' WHERE "status" = 'pending'`);
		console.log('E2E テストデータをクリーンアップしました');
	} catch (e) {
		console.warn('E2E テストデータのクリーンアップに失敗しました:', e);
	}
}
