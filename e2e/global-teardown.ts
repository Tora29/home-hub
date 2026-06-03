/**
 * @file E2Eテスト: グローバルティアダウン
 * @module e2e/global-teardown.ts
 * @testType e2e
 *
 * @description
 * E2E テスト終了後に D1 のテストデータを削除する。
 * 固定の E2E_USER_ID を使用して確実に削除する。
 */
import { execFileSync } from 'child_process';

const E2E_USER_ID = 'e2e-test-user-id';

function wranglerExecute(sql: string) {
	execFileSync('npx', ['wrangler', 'd1', 'execute', 'home-hub', '--local', `--command=${sql}`], {
		stdio: 'pipe'
	});
}

export default async function globalTeardown() {
	wranglerExecute(`DELETE FROM "Recipe" WHERE "userId" = '${E2E_USER_ID}'`);
	wranglerExecute(`DELETE FROM "Expense" WHERE "userId" = '${E2E_USER_ID}'`);
	wranglerExecute(`DELETE FROM "ExpenseCategory" WHERE "userId" = '${E2E_USER_ID}'`);
	wranglerExecute(`DELETE FROM "Session" WHERE "userId" = '${E2E_USER_ID}'`);
	wranglerExecute(`DELETE FROM "Account" WHERE "userId" = '${E2E_USER_ID}'`);
	wranglerExecute(`DELETE FROM "User" WHERE "id" = '${E2E_USER_ID}'`);
	console.log('E2E テストデータを削除しました');
}
