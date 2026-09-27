/**
 * @file E2Eテスト: ダッシュボード
 * @module e2e/dashboard.e2e.ts
 * @testType e2e
 *
 * @scenarios
 * - 初期表示: ダッシュボードページが表示され、月別タブが選択されている
 * - 月別集計: 支出のない月は ¥0・空状態、支出のある月は一覧が表示される
 * - 全期間切り替え: 全期間タブで全期間の集計に切り替わる
 * - 月切り替え: 月セレクトで別月の集計に切り替わり、URL に反映される
 * - 未確認アラート: 相手の承認依頼中支出がある場合に警告バナーが表示される
 *
 * @pages
 * - / - ダッシュボード（ホーム）
 */
import { test, expect, type Page } from '@playwright/test';
import { generateMonthOptions, getCurrentMonth } from '../src/lib/utils/date';

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

/**
 * 月セレクトの選択肢（JST の当月から過去 13 か月）のうち、支出が 1 件もない月を古い順に探す。
 * シードデータの月は固定のため、実行日に依存しないよう集計 API で空を確認して選ぶ。
 */
async function findEmptyMonth(page: Page): Promise<string> {
	const options = generateMonthOptions(getCurrentMonth()).reverse();
	for (const { value } of options) {
		const res = await page.request.get(`/dashboard/summary?period=month&month=${value}`, {
			headers: { Accept: 'application/json' }
		});
		expect(res.ok()).toBeTruthy();
		const summary = (await res.json()) as { overall: number; byPayer: unknown[] };
		if (summary.overall === 0 && summary.byPayer.length === 0) return value;
	}
	throw new Error('支出のない月が選択肢内に見つかりません（テストデータを確認してください）');
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

	test('月別タブがデフォルトで選択され、当月が表示される', async ({ page }) => {
		await expect(page.getByTestId('dashboard-period-tab-month')).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await expect(page.getByTestId('dashboard-period-tab-all')).toHaveAttribute(
			'aria-pressed',
			'false'
		);
		await expect(page.getByTestId('dashboard-month-select')).toHaveValue(getCurrentMonth());
	});

	test('支出がない月は支払者別・カテゴリ別の空状態メッセージが表示される', async ({ page }) => {
		const emptyMonth = await findEmptyMonth(page);
		await page.getByTestId('dashboard-month-select').selectOption(emptyMonth);
		await expect(page.getByTestId('dashboard-payer-summary-empty')).toBeVisible();
		await expect(page.getByTestId('dashboard-category-summary-empty')).toBeVisible();
	});

	test('支出がない月は合計が ¥0 で表示される', async ({ page }) => {
		const emptyMonth = await findEmptyMonth(page);
		await page.getByTestId('dashboard-month-select').selectOption(emptyMonth);
		await expect(page.getByTestId('dashboard-total')).toHaveText('¥0');
	});
});

test.describe('ダッシュボード - 全期間切り替え', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('全期間タブをクリックすると全期間タブが選択され、月セレクトが非表示になる', async ({
		page
	}) => {
		await expect(page.getByTestId('dashboard-month-select')).toBeVisible();
		await page.getByTestId('dashboard-period-tab-all').click();
		await expect(page.getByTestId('dashboard-period-tab-all')).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await expect(page.getByTestId('dashboard-month-select')).not.toBeVisible();
		await expect(page).toHaveURL(/\?period=all$/);
	});

	test('全期間タブで全期間の合計が表示される', async ({ page }) => {
		await page.getByTestId('dashboard-period-tab-all').click();
		// シードデータがあるため合計が ¥0 より大きい（SSR 再取得完了まで自動リトライ）
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
		await expect(page.getByTestId('dashboard-month-select')).not.toBeVisible();
		await page.getByTestId('dashboard-period-tab-month').click();
		await expect(page.getByTestId('dashboard-month-select')).toBeVisible();
	});
});

test.describe('ダッシュボード - 月切り替え', () => {
	// 当月（JST）に支出を 1 件作成し、「支出のある月」を実行日に依存せず用意する
	let createdId: string | undefined;

	test.beforeEach(async ({ page }) => {
		createdId = (await createExpense(page, { amount: 4321 })).id;
	});

	test.afterEach(async ({ page }) => {
		if (createdId) await deleteExpense(page, createdId);
		createdId = undefined;
	});

	test('月セレクトでデータのない月に切り替えると合計が ¥0 になり、URL に月が反映される', async ({
		page
	}) => {
		const emptyMonth = await findEmptyMonth(page);
		await page.goto('/');
		await expect(page.getByTestId('dashboard-total')).not.toHaveText('¥0');

		await page.getByTestId('dashboard-month-select').selectOption(emptyMonth);
		await expect(page.getByTestId('dashboard-total')).toHaveText('¥0');
		await expect(page).toHaveURL(new RegExp(`period=month&month=${emptyMonth}$`));
	});

	test('データのない月から当月に切り替えると支払者別一覧が表示される', async ({ page }) => {
		const emptyMonth = await findEmptyMonth(page);
		await page.goto(`/?period=month&month=${emptyMonth}`);
		await expect(page.getByTestId('dashboard-payer-summary-empty')).toBeVisible();

		await page.getByTestId('dashboard-month-select').selectOption(getCurrentMonth());
		await expect(page.getByTestId('dashboard-payer-summary-list')).toBeVisible();
	});

	test('データのない月から当月に切り替えるとカテゴリ別一覧が表示される', async ({ page }) => {
		const emptyMonth = await findEmptyMonth(page);
		await page.goto(`/?period=month&month=${emptyMonth}`);
		await expect(page.getByTestId('dashboard-category-summary-empty')).toBeVisible();

		await page.getByTestId('dashboard-month-select').selectOption(getCurrentMonth());
		await expect(page.getByTestId('dashboard-category-summary-list')).toBeVisible();
	});
});

// バナー非表示（件数 0）のケースは相手の pending を消すと他テストに影響するため、
// DashboardPage.svelte.test.ts のコンポーネントテストで検証する
test.describe('ダッシュボード - 未確認アラート', () => {
	test('相手の承認依頼中支出がある場合は件数付きの警告バナーが表示される', async ({ page }) => {
		// global-setup.ts がパートナーの pending 支出を 1 件投入済み
		await page.goto('/');
		await expect(page.getByTestId('expense-pending-alert')).toBeVisible();
		await expect(page.getByTestId('expense-pending-alert')).toContainText(
			/未確認の支出が \d+ 件あります/
		);
	});

	test('バナーの「確認する」リンクをクリックすると支出一覧へ遷移する', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByTestId('expense-pending-alert')).toBeVisible();
		await page.getByRole('link', { name: '確認する' }).click();
		await expect(page).toHaveURL('/expenses');
	});
});
