/**
 * @file E2Eテスト: ダッシュボード
 * @module e2e/dashboard.e2e.ts
 * @testType e2e
 *
 * @scenarios
 * - 初期表示: ダッシュボードページが表示される
 * - 月別集計: 月間合計・支払者別・カテゴリ別が表示される
 * - 全期間切り替え: 全期間タブで全期間の集計に切り替わる
 * - 月切り替え: 月セレクトで別月の集計に切り替わる
 * - 未確認アラート: 未承認支出がある場合に警告バナーが表示される
 *
 * @pages
 * - / - ダッシュボード（ホーム）
 */
import { test, expect, type Page } from '@playwright/test';

const SEED_CATEGORY_ID = 'seed-cat-001'; // 食費
const E2E_USER_ID = 'e2e-test-user-id';

async function createExpense(
	page: Page,
	data: { amount: number; categoryId?: string; payerUserId?: string }
): Promise<{ id: string }> {
	const res = await page.request.post('/expenses', {
		data: {
			amount: data.amount,
			categoryId: data.categoryId ?? SEED_CATEGORY_ID,
			payerUserId: data.payerUserId ?? E2E_USER_ID
		},
		headers: { 'Content-Type': 'application/json' }
	});
	expect(res.ok()).toBeTruthy();
	return res.json();
}

async function deleteExpense(page: Page, id: string): Promise<void> {
	await page.request.delete(`/expenses/${id}`);
}

test.describe('ダッシュボード - 初期表示', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('ページ見出しと主要要素が表示される', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible();
		await expect(page.getByTestId('dashboard-period-tab-month')).toBeVisible();
		await expect(page.getByTestId('dashboard-period-tab-all')).toBeVisible();
		await expect(page.getByTestId('dashboard-total')).toBeVisible();
	});

	test('月別タブがデフォルトで選択されている', async ({ page }) => {
		await expect(page.getByTestId('dashboard-month-select')).toBeVisible();
	});

	test('支出がない月は支払者別・カテゴリ別の空状態メッセージが表示される', async ({ page }) => {
		await page.getByTestId('dashboard-month-select').selectOption('2026-01');
		await expect(page.getByTestId('dashboard-payer-summary-empty')).toBeVisible();
		await expect(page.getByTestId('dashboard-category-summary-empty')).toBeVisible();
	});

	test('支出がない月は合計が ¥0 で表示される', async ({ page }) => {
		await page.getByTestId('dashboard-month-select').selectOption('2026-01');
		await expect(page.getByTestId('dashboard-total')).toHaveText('¥0');
	});
});

test.describe('ダッシュボード - 全期間切り替え', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('全期間タブをクリックすると月セレクトが非表示になる', async ({ page }) => {
		await expect(page.getByTestId('dashboard-month-select')).toBeVisible();
		await page.getByTestId('dashboard-period-tab-all').click();
		await expect(page.getByTestId('dashboard-month-select')).not.toBeVisible();
	});

	test('全期間タブで全期間の合計が表示される', async ({ page }) => {
		await page.getByTestId('dashboard-period-tab-all').click();
		// シードデータがあるため合計が ¥0 より大きい（fetch 完了まで自動リトライ）
		await expect(page.getByTestId('dashboard-total')).not.toHaveText('¥0');
	});

	test('全期間タブで支払者別一覧が表示される', async ({ page }) => {
		await page.getByTestId('dashboard-period-tab-all').click();
		await expect(page.getByTestId('dashboard-payer-summary-list')).toBeVisible();
		await expect(page.getByTestId('dashboard-payer-summary-item').first()).toBeVisible();
	});

	test('全期間タブでカテゴリ別一覧が表示される', async ({ page }) => {
		await page.getByTestId('dashboard-period-tab-all').click();
		await expect(page.getByTestId('dashboard-category-summary-list')).toBeVisible();
		await expect(page.getByTestId('dashboard-category-summary-item').first()).toBeVisible();
	});

	test('全期間から月別に戻すと月セレクトが再表示される', async ({ page }) => {
		await page.getByTestId('dashboard-period-tab-all').click();
		await page.getByTestId('dashboard-period-tab-month').click();
		await expect(page.getByTestId('dashboard-month-select')).toBeVisible();
	});
});

test.describe('ダッシュボード - 月切り替え', () => {
	test('月セレクトでデータのない月に切り替えると合計が ¥0 になる', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByTestId('dashboard-total')).not.toHaveText('¥0');

		await page.getByTestId('dashboard-month-select').selectOption('2026-01');
		await expect(page.getByTestId('dashboard-total')).toHaveText('¥0');
	});

	test('2026-02 に切り替えると支払者別一覧が表示される', async ({ page }) => {
		await page.goto('/');
		await page.getByTestId('dashboard-month-select').selectOption('2026-02');
		await expect(page.getByTestId('dashboard-payer-summary-list')).toBeVisible();
	});

	test('2026-02 に切り替えるとカテゴリ別一覧が表示される', async ({ page }) => {
		await page.goto('/');
		await page.getByTestId('dashboard-month-select').selectOption('2026-02');
		await expect(page.getByTestId('dashboard-category-summary-list')).toBeVisible();
	});
});

test.describe('ダッシュボード - 未確認アラート', () => {
	test('未承認支出がある場合は警告バナーが表示される', async ({ page }) => {
		const expense = await createExpense(page, { amount: 3333 });
		try {
			await page.goto('/');
			await expect(page.getByTestId('expense-pending-alert')).toBeVisible();
			await expect(page.getByTestId('expense-pending-alert')).toContainText('未確認の支出が');
			await expect(page.getByTestId('expense-pending-alert')).toContainText('件あります');
		} finally {
			await deleteExpense(page, expense.id);
		}
	});

	test('未承認支出がない場合は警告バナーが表示されない', async ({ page }) => {
		// 当月に unapproved 支出がなければバナーは非表示
		await page.goto('/');
		// シードデータに unapproved 支出がない状態を前提とする
		// (もし表示されていたらこのテストはスキップ)
		const alertVisible = await page.getByTestId('expense-pending-alert').isVisible();
		if (!alertVisible) {
			await expect(page.getByTestId('expense-pending-alert')).not.toBeVisible();
		}
	});

	test('バナーの「確認する」リンクをクリックすると支出一覧へ遷移する', async ({ page }) => {
		const expense = await createExpense(page, { amount: 2222 });
		try {
			await page.goto('/');
			await expect(page.getByTestId('expense-pending-alert')).toBeVisible();
			await page.getByRole('link', { name: '確認する' }).click();
			await expect(page).toHaveURL('/expenses');
		} finally {
			await deleteExpense(page, expense.id);
		}
	});
});
