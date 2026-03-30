/**
 * @file E2Eテスト: 支出管理
 * @module e2e/expense.e2e.ts
 * @testType e2e
 *
 * @spec specs/expenses/spec.md
 * @covers AC-204, AC-205
 *
 * @scenarios
 * - 支出が0件のときの空状態メッセージ表示
 * - 支出が0件のときの月間合計「¥0」表示
 *
 * @pages
 * - /expenses - 支出一覧画面
 */
import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL ?? 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'password123';

async function login(page: Page): Promise<void> {
	await page.goto('/login');
	await page.getByTestId('login-email-input').fill(TEST_EMAIL);
	await page.getByTestId('login-password-input').fill(TEST_PASSWORD);
	await page.getByTestId('login-submit-button').click();
	await page.waitForURL('/');
}

async function deleteExpense(page: Page, id: string): Promise<void> {
	await page.request.delete(`/expenses/${id}`);
}

async function getCurrentMonthExpenseIds(page: Page): Promise<string[]> {
	const now = new Date();
	const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	const res = await page.request.get(`/expenses?month=${month}&limit=100`);
	const data = (await res.json()) as { items: { id: string }[] };
	return data.items.map((e) => e.id);
}

// ============================================================
// 一覧画面 - 空状態
// ============================================================

test.describe('支出一覧画面 - 空状態', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('[SPEC: AC-204] 支出が0件の場合、空状態メッセージ（expense-empty）が表示される', async ({
		page
	}) => {
		// 当月の支出をすべて削除
		const ids = await getCurrentMonthExpenseIds(page);
		for (const id of ids) {
			await deleteExpense(page, id);
		}

		await page.goto('/expenses');

		await expect(page.getByTestId('expense-empty')).toBeVisible();
		await expect(page.getByTestId('expense-list')).not.toBeVisible();
	});

	test('[SPEC: AC-205] 支出が0件の場合、月間合計は「¥0」と表示される', async ({ page }) => {
		// 当月の支出をすべて削除
		const ids = await getCurrentMonthExpenseIds(page);
		for (const id of ids) {
			await deleteExpense(page, id);
		}

		await page.goto('/expenses');

		await expect(page.getByTestId('expense-total')).toHaveText('¥0');
	});
});
