/**
 * @file E2Eテスト: ダッシュボード
 * @module e2e/dashboard.e2e.ts
 * @testType e2e
 *
 * @spec specs/dashboard/spec.md
 * @covers AC-002, AC-002b, AC-003, AC-004, AC-008, AC-009
 *
 * @scenarios
 * - 月切り替えセレクトで表示月を変更
 * - 月切り替えセレクトの選択肢は過去月選択後も当月を含む（AC-002b）
 * - 「全期間」タブ選択で月切り替えセレクトが非表示になる
 * - 「月別」タブ選択で月切り替えセレクトが再表示される
 * - 全期間の未承認支出がある場合に警告バナーが表示される
 * - 全支出が承認済みになると警告バナーが非表示になる
 *
 * @pages
 * - / - ダッシュボード
 * - /expenses - 支出管理（支出作成・承認操作）
 */
import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL ?? 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'password123';

// ============================================================
// ヘルパー関数
// ============================================================

async function login(page: Page): Promise<void> {
	await page.goto('/login');
	await page.getByTestId('login-email-input').fill(TEST_EMAIL);
	await page.getByTestId('login-password-input').fill(TEST_PASSWORD);
	await page.getByTestId('login-submit-button').click();
	await page.waitForURL('/');
}

async function createCategory(page: Page, name: string): Promise<string> {
	const res = await page.request.post('/expenses/categories', {
		data: { name }
	});
	const data = (await res.json()) as { id: string };
	return data.id;
}

async function createPayer(page: Page, name: string): Promise<string> {
	const res = await page.request.post('/expenses/payers', {
		data: { name }
	});
	const data = (await res.json()) as { id: string };
	return data.id;
}

async function createExpense(
	page: Page,
	amount: number,
	categoryId: string,
	payerId: string
): Promise<string> {
	const res = await page.request.post('/expenses', {
		data: { amount, categoryId, payerId }
	});
	const data = (await res.json()) as { id: string };
	return data.id;
}

async function approveExpense(page: Page, expenseId: string): Promise<void> {
	await page.request.post(`/expenses/${expenseId}/approve`);
}

// ============================================================
// テスト
// ============================================================

test.describe('ダッシュボード - 期間切り替え', () => {
	test('[SPEC: AC-002] 月切り替えセレクトで別の月を選択すると、表示月が変わる', async ({
		page
	}) => {
		await login(page);
		await page.goto('/');

		const prevMonth = (() => {
			const now = new Date();
			const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
			return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
		})();

		await page.getByTestId('dashboard-month-select').selectOption(prevMonth);

		// 月切り替え後も dashboard-total が表示されていること
		await expect(page.getByTestId('dashboard-total')).toBeVisible();
	});

	test('[SPEC: AC-002b] 過去月を選択しても選択肢に当月が含まれたまま', async ({ page }) => {
		await login(page);
		await page.goto('/');

		const currentMonth = (() => {
			const now = new Date();
			return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
		})();

		const prevMonth = (() => {
			const now = new Date();
			const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
			return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
		})();

		// 過去月に切り替える
		await page.getByTestId('dashboard-month-select').selectOption(prevMonth);

		// 当月がセレクトの選択肢に存在することを確認
		const options = await page.getByTestId('dashboard-month-select').locator('option').all();
		const optionValues = await Promise.all(options.map((o) => o.getAttribute('value')));
		expect(optionValues).toContain(currentMonth);

		// 当月に戻せることを確認
		await page.getByTestId('dashboard-month-select').selectOption(currentMonth);
		await expect(page.getByTestId('dashboard-total')).toBeVisible();
	});

	test('[SPEC: AC-003] 「全期間」タブを選択すると月切り替えセレクトが非表示になる', async ({
		page
	}) => {
		await login(page);
		await page.goto('/');

		// 初期状態では月切り替えセレクトが表示されている
		await expect(page.getByTestId('dashboard-month-select')).toBeVisible();

		await page.getByTestId('dashboard-period-tab-all').click();

		// 全期間タブ選択後は月切り替えセレクトが非表示
		await expect(page.getByTestId('dashboard-month-select')).not.toBeVisible();
	});

	test('[SPEC: AC-004] 「月別」タブを選択すると月切り替えセレクトが再表示される', async ({
		page
	}) => {
		await login(page);
		await page.goto('/');

		// 全期間タブに切り替え
		await page.getByTestId('dashboard-period-tab-all').click();
		await expect(page.getByTestId('dashboard-month-select')).not.toBeVisible();

		// 月別タブに戻す
		await page.getByTestId('dashboard-period-tab-month').click();
		await expect(page.getByTestId('dashboard-month-select')).toBeVisible();
	});
});

test.describe('ダッシュボード - 未承認支出警告バナー', () => {
	let categoryId: string;
	let payerId: string;
	let expenseId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);
		categoryId = await createCategory(page, `テストカテゴリ_${Date.now()}`);
		payerId = await createPayer(page, `テスト支払者_${Date.now()}`);
	});

	test.afterEach(async ({ page }) => {
		if (expenseId) {
			try {
				await page.request.delete(`/expenses/${expenseId}`);
			} catch {
				// 確定済みまたは削除済みの場合は無視
			}
		}
		await page.request.delete(`/expenses/categories/${categoryId}`);
		await page.request.delete(`/expenses/payers/${payerId}`);
	});

	test('[SPEC: AC-008] 全期間の未承認支出が1件以上ある場合、警告バナーに件数付きで表示される', async ({
		page
	}) => {
		expenseId = await createExpense(page, 1000, categoryId, payerId);

		await page.goto('/');

		await expect(page.getByTestId('expense-pending-alert')).toBeVisible();
		// 件数が含まれていること（「X 件あります」のような表示）
		await expect(page.getByTestId('expense-pending-alert')).toContainText('件');
		// /expenses へのリンクが含まれていること
		const link = page.getByTestId('expense-pending-alert').getByRole('link');
		await expect(link).toBeVisible();
	});

	test('[SPEC: AC-009] 全支出が承認済みになると、警告バナーが非表示になる', async ({ page }) => {
		expenseId = await createExpense(page, 500, categoryId, payerId);

		// バナーが表示されていることを確認し、承認前の未承認件数を記録
		await page.goto('/');
		await expect(page.getByTestId('expense-pending-alert')).toBeVisible();
		const alertText = (await page.getByTestId('expense-pending-alert').textContent()) ?? '';
		const countBefore = parseInt(alertText.match(/(\d+)/)?.[1] ?? '0');

		// 支出を承認済みにする
		await approveExpense(page, expenseId);
		await page.reload();

		if (countBefore === 1) {
			// この1件のみが未承認だったため、バナーが非表示になる（AC-009 メインシナリオ）
			await expect(page.getByTestId('expense-pending-alert')).not.toBeVisible();
		} else {
			// 他に未承認支出が存在するため、件数が1減ったことを確認
			await expect(page.getByTestId('expense-pending-alert')).toContainText(
				`${countBefore - 1} 件`
			);
		}
	});
});
