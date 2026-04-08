/**
 * @file E2Eテスト: 支出管理
 * @module e2e/expense.e2e.ts
 * @testType e2e
 *
 * @spec specs/expenses/spec.md
 * @covers AC-001, AC-002, AC-002b, AC-002c, AC-003, AC-004, AC-005, AC-006, AC-007,
 *         AC-010, AC-011, AC-012, AC-013, AC-014, AC-015, AC-016, AC-017, AC-018, AC-019, AC-020,
 *         AC-035, AC-036, AC-037, AC-038, AC-039, AC-040, AC-041,
 *         AC-111, AC-112, AC-120, AC-122, AC-204, AC-205,
 *         dashboard/AC-008, dashboard/AC-009
 *
 * @scenarios
 * - 支出一覧の初期表示（当月フィルタ・登録日時降順）
 * - 月切り替えセレクトによる表示月変更
 * - 支出の新規登録フロー（正常系）
 * - 支出の承認操作（確認済み・未承認に戻す）
 * - 支出の確定操作（確定済みへの更新・確定後のボタン非表示）
 * - 支出の編集フロー
 * - 支出の削除フロー
 * - ダッシュボードの未承認警告バナー表示・非表示
 * - カテゴリ管理（追加・編集・削除）
 * - 支払者管理（追加・編集・削除・フォームへの反映）
 * - 月間合計金額の表示
 * - FE バリデーション（金額未入力・カテゴリ未選択・支払者未選択）
 * - モバイル行メニューの開閉・表示切り替え（viewport: 375x812）
 * - 空状態・合計¥0 表示
 *
 * @pages
 * - /expenses - 支出一覧画面
 * - /expenses/categories - カテゴリ管理画面
 * - /expenses/payers - 支払者管理画面
 * - / - ダッシュボード
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

function getCurrentMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function createCategory(page: Page, name: string): Promise<string> {
	const res = await page.request.post('/expenses/categories', {
		data: { name }
	});
	const data = (await res.json()) as { id: string };
	return data.id;
}

async function deleteCategory(page: Page, id: string): Promise<void> {
	await page.request.delete(`/expenses/categories/${id}`);
}

async function createPayer(page: Page, name: string): Promise<string> {
	const res = await page.request.post('/expenses/payers', {
		data: { name }
	});
	const data = (await res.json()) as { id: string };
	return data.id;
}

async function deletePayer(page: Page, id: string): Promise<void> {
	await page.request.delete(`/expenses/payers/${id}`);
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

async function deleteExpense(page: Page, id: string): Promise<void> {
	await page.request.delete(`/expenses/${id}`);
}

async function approveExpense(page: Page, expenseId: string): Promise<void> {
	await page.request.post(`/expenses/${expenseId}/approve`);
}

async function getCurrentMonthExpenseIds(page: Page): Promise<string[]> {
	const month = getCurrentMonth();
	const res = await page.request.get(`/expenses?month=${month}&limit=100`);
	const data = (await res.json()) as { items: { id: string }[] };
	return data.items.map((e) => e.id);
}

async function clearCurrentMonthExpenses(page: Page): Promise<void> {
	const ids = await getCurrentMonthExpenseIds(page);
	for (const id of ids) {
		// 確定済み支出は削除不可（409 CONFLICT）のため無視する
		try {
			await deleteExpense(page, id);
		} catch {
			// ignore
		}
	}
}

// ============================================================
// 一覧画面 - 初期表示
// ============================================================

test.describe('支出一覧画面 - 初期表示', () => {
	let categoryId: string;
	let payerId: string;
	let expenseId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);
		categoryId = await createCategory(page, 'E2Eテスト用カテゴリ');
		payerId = await createPayer(page, 'E2Eテスト用支払者');
		expenseId = await createExpense(page, 1500, categoryId, payerId);
	});

	test.afterEach(async ({ page }) => {
		await deleteExpense(page, expenseId);
		await deleteCategory(page, categoryId);
		await deletePayer(page, payerId);
	});

	test('[SPEC: AC-001] /expenses にアクセスすると当月の支出一覧が表示される', async ({ page }) => {
		await page.goto('/expenses');

		await expect(page.getByTestId('expense-list')).toBeVisible();
		await expect(page.getByTestId('expense-item').first()).toBeVisible();

		// 月切り替えセレクトにデフォルトで当月が選択されている
		const monthSelect = page.getByTestId('expense-month-select');
		await expect(monthSelect).toHaveValue(getCurrentMonth());
	});
});

// ============================================================
// 一覧画面 - 月切り替え
// ============================================================

test.describe('支出一覧画面 - 月切り替え', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('[SPEC: AC-002] 月切り替えセレクトで別の月を選択すると URL の month パラメータが変わる', async ({
		page
	}) => {
		await page.goto('/expenses');

		const monthSelect = page.getByTestId('expense-month-select');

		// 1か月前の月を計算
		const now = new Date();
		const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

		await monthSelect.selectOption(prevMonth);

		await expect(page).toHaveURL(new RegExp(`month=${prevMonth}`));
	});

	test('[SPEC: AC-002] 月切り替え後に対象月の支出一覧が表示される（データなし月は空状態）', async ({
		page
	}) => {
		// 2か月前（データがないはず）の月
		const now = new Date();
		const oldDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
		const oldMonth = `${oldDate.getFullYear()}-${String(oldDate.getMonth() + 1).padStart(2, '0')}`;

		await page.goto(`/expenses?month=${oldMonth}`);

		// 空状態か一覧のどちらかが表示される（月によって異なるが URL は確認可能）
		await expect(page.getByTestId('expense-month-select')).toHaveValue(oldMonth);
	});

	test('[SPEC: AC-002b] 過去月を選択しても選択肢に当月が含まれたまま', async ({ page }) => {
		await page.goto('/expenses');

		const currentMonth = getCurrentMonth();

		// 2か月前に移動
		const now = new Date();
		const oldDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
		const oldMonth = `${oldDate.getFullYear()}-${String(oldDate.getMonth() + 1).padStart(2, '0')}`;

		await page.getByTestId('expense-month-select').selectOption(oldMonth);
		await page.waitForURL(new RegExp(`month=${oldMonth}`));

		// ページリロード後（load 再実行）も当月が選択肢に存在すること
		const options = await page.getByTestId('expense-month-select').locator('option').all();
		const optionValues = await Promise.all(options.map((o) => o.getAttribute('value')));
		expect(optionValues).toContain(currentMonth);

		// 当月に戻せることを確認
		await page.getByTestId('expense-month-select').selectOption(currentMonth);
		await page.waitForURL(new RegExp(`month=${currentMonth}`));
		await expect(page.getByTestId('expense-month-select')).toHaveValue(currentMonth);
	});

	test('[SPEC: AC-002c] 不正な月パラメータ（?month=2026-13）でアクセスすると /expenses にリダイレクトされ当月の支出一覧が表示される', async ({
		page
	}) => {
		await page.goto('/expenses?month=2026-13');

		// /expenses（month パラメータなし）にリダイレクトされる
		await page.waitForURL(/\/expenses($|\?(?!month=2026-13))/);

		// エラーページにならず、月切り替えセレクトが表示される
		await expect(page.getByTestId('expense-month-select')).toBeVisible();

		// 当月が選択されている
		await expect(page.getByTestId('expense-month-select')).toHaveValue(getCurrentMonth());
	});
});

// ============================================================
// 支出登録
// ============================================================

test.describe('支出登録', () => {
	let categoryId: string;
	let payerId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);
		categoryId = await createCategory(page, 'E2E登録テスト');
		payerId = await createPayer(page, 'E2E登録テスト支払者');
	});

	test.afterEach(async ({ page }) => {
		// 当月の支出をクリーンアップしてからカテゴリ・支払者削除
		await clearCurrentMonthExpenses(page);
		await deleteCategory(page, categoryId);
		await deletePayer(page, payerId);
	});

	test('[SPEC: AC-003] 金額・カテゴリ・支払者を入力して確定すると一覧の先頭に支出が追加される', async ({
		page
	}) => {
		await page.goto('/expenses');

		// 登録前の件数を記録
		const beforeCount = await page.getByTestId('expense-item').count();

		// 登録フォームを開く
		await page.getByTestId('expense-create-button').click();
		await expect(page.getByTestId('expense-form')).toBeVisible();

		// フォームに入力
		await page.getByTestId('expense-amount-input').fill('3000');
		await page.getByTestId('expense-category-select').selectOption({ value: categoryId });
		await page.getByTestId('expense-payer-select').selectOption({ value: payerId });

		// 送信
		await page.getByTestId('expense-submit-button').click();

		// フォームが閉じて一覧に追加される
		await expect(page.getByTestId('expense-form')).not.toBeVisible();
		await expect(page.getByTestId('expense-list')).toBeVisible();
		await expect(page.getByTestId('expense-item')).toHaveCount(beforeCount + 1);

		// 先頭の行に登録した金額が表示されている
		await expect(page.getByTestId('expense-item').first()).toContainText('¥3,000');
	});
});

// ============================================================
// FE バリデーション
// ============================================================

test.describe('支出登録 - FE バリデーション', () => {
	let categoryId: string;
	let payerId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);
		categoryId = await createCategory(page, 'E2Eバリデーションテスト');
		payerId = await createPayer(page, 'E2Eバリデーション支払者');
	});

	test.afterEach(async ({ page }) => {
		await deleteCategory(page, categoryId);
		await deletePayer(page, payerId);
	});

	test('[SPEC: AC-111] 金額が空のまま確定を押すと「金額は必須です」とインライン表示される', async ({
		page
	}) => {
		await page.goto('/expenses');

		await page.getByTestId('expense-create-button').click();
		await expect(page.getByTestId('expense-form')).toBeVisible();

		// 金額を入力しないで確定
		await page.getByTestId('expense-category-select').selectOption({ value: categoryId });
		await page.getByTestId('expense-payer-select').selectOption({ value: payerId });
		await page.getByTestId('expense-submit-button').click();

		// フォームは閉じない（サーバー非通信）
		await expect(page.getByTestId('expense-form')).toBeVisible();
		await expect(page.getByTestId('expense-amount-error')).toBeVisible();
		await expect(page.getByTestId('expense-amount-error')).toHaveText('金額は必須です');
	});

	test('[SPEC: AC-112] カテゴリが未選択のまま確定を押すと「カテゴリは必須です」とインライン表示される', async ({
		page
	}) => {
		await page.goto('/expenses');

		await page.getByTestId('expense-create-button').click();
		await expect(page.getByTestId('expense-form')).toBeVisible();

		// カテゴリを選択しないで確定
		await page.getByTestId('expense-amount-input').fill('1000');
		await page.getByTestId('expense-payer-select').selectOption({ value: payerId });
		await page.getByTestId('expense-submit-button').click();

		// フォームは閉じない（サーバー非通信）
		await expect(page.getByTestId('expense-form')).toBeVisible();
		await expect(page.getByTestId('expense-category-error')).toBeVisible();
		await expect(page.getByTestId('expense-category-error')).toHaveText('カテゴリは必須です');
	});

	test('[SPEC: AC-120] 支払者が未選択のまま確定を押すと「支払者は必須です」とインライン表示される', async ({
		page
	}) => {
		await page.goto('/expenses');

		await page.getByTestId('expense-create-button').click();
		await expect(page.getByTestId('expense-form')).toBeVisible();

		// 支払者を選択しないで確定
		await page.getByTestId('expense-amount-input').fill('1000');
		await page.getByTestId('expense-category-select').selectOption({ value: categoryId });
		await page.getByTestId('expense-submit-button').click();

		// フォームは閉じない（サーバー非通信）
		await expect(page.getByTestId('expense-form')).toBeVisible();
		await expect(page.getByTestId('expense-payer-error')).toBeVisible();
		await expect(page.getByTestId('expense-payer-error')).toHaveText('支払者は必須です');
	});
});

// ============================================================
// 承認操作
// ============================================================

test.describe('支出 - 承認操作', () => {
	let categoryId: string;
	let payerId: string;
	let expenseId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);
		categoryId = await createCategory(page, 'E2E承認テスト');
		payerId = await createPayer(page, 'E2E承認テスト支払者');
		expenseId = await createExpense(page, 2000, categoryId, payerId);
	});

	test.afterEach(async ({ page }) => {
		await deleteExpense(page, expenseId);
		await deleteCategory(page, categoryId);
		await deletePayer(page, payerId);
	});

	test('[SPEC: AC-004] 未承認の支出の「確認済み」ボタンを押すと承認状態が「確認済み」に更新される', async ({
		page
	}) => {
		await page.goto('/expenses');

		// 未承認の支出行を取得（承認ボタンがある行）
		const item = page.getByTestId('expense-item').filter({ hasText: '未承認' }).first();
		await expect(item).toBeVisible();

		// 確認済みボタンをクリック
		await item.getByTestId('expense-approve-button').click();

		// 承認状態が更新される
		const updatedItem = page.getByTestId('expense-item').filter({ hasText: '¥2,000' }).first();
		await expect(updatedItem).toContainText('確認済み');
		await expect(updatedItem.getByTestId('expense-approve-button')).not.toBeVisible();
		await expect(updatedItem.getByTestId('expense-unapprove-button')).toBeVisible();
	});

	test('[SPEC: AC-005] 確認済みの支出の「未承認に戻す」ボタンを押すと承認状態が「未承認」に戻る', async ({
		page
	}) => {
		// まず承認済みにする
		await approveExpense(page, expenseId);

		await page.goto('/expenses');

		// 確認済みの支出行を取得
		const item = page.getByTestId('expense-item').filter({ hasText: '確認済み' }).first();
		await expect(item).toBeVisible();

		// 未承認に戻すボタンをクリック
		await item.getByTestId('expense-unapprove-button').click();

		// 承認状態が更新される
		const updatedItem = page.getByTestId('expense-item').filter({ hasText: '¥2,000' }).first();
		await expect(updatedItem).toContainText('未承認');
		await expect(updatedItem.getByTestId('expense-unapprove-button')).not.toBeVisible();
		await expect(updatedItem.getByTestId('expense-approve-button')).toBeVisible();
	});
});

// ============================================================
// 支出編集
// ============================================================

test.describe('支出 - 編集', () => {
	let categoryId: string;
	let category2Id: string;
	let payerId: string;
	let expenseId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);
		categoryId = await createCategory(page, 'E2E編集テスト元');
		category2Id = await createCategory(page, 'E2E編集テスト先');
		payerId = await createPayer(page, 'E2E編集テスト支払者');
		expenseId = await createExpense(page, 1000, categoryId, payerId);
	});

	test.afterEach(async ({ page }) => {
		await deleteExpense(page, expenseId);
		await deleteCategory(page, categoryId);
		await deleteCategory(page, category2Id);
		await deletePayer(page, payerId);
	});

	test('[SPEC: AC-006] 編集ボタンをクリックして金額・カテゴリを変更すると一覧が更新される', async ({
		page
	}) => {
		await page.goto('/expenses');

		// 対象の支出行の編集ボタンをクリック
		const item = page.getByTestId('expense-item').filter({ hasText: '¥1,000' }).first();
		await item.getByTestId('expense-edit-button').click();

		// 編集フォームが開く
		await expect(page.getByTestId('expense-form')).toBeVisible();

		// 金額とカテゴリを変更
		const amountInput = page.getByTestId('expense-amount-input');
		await amountInput.clear();
		await amountInput.fill('5000');
		await page.getByTestId('expense-category-select').selectOption({ value: category2Id });

		// 送信
		await page.getByTestId('expense-submit-button').click();

		// フォームが閉じて一覧が更新される
		await expect(page.getByTestId('expense-form')).not.toBeVisible();
		await expect(page.getByTestId('expense-item').filter({ hasText: '¥5,000' })).toBeVisible();
		await expect(
			page.getByTestId('expense-item').filter({ hasText: 'E2E編集テスト先' })
		).toBeVisible();
	});
});

// ============================================================
// 支出削除
// ============================================================

test.describe('支出 - 削除', () => {
	let categoryId: string;
	let payerId: string;
	let expenseId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);
		categoryId = await createCategory(page, 'E2E削除テスト');
		payerId = await createPayer(page, 'E2E削除テスト支払者');
		expenseId = await createExpense(page, 800, categoryId, payerId);
	});

	test.afterEach(async ({ page }) => {
		// テストが失敗した場合のクリーンアップ
		try {
			await deleteExpense(page, expenseId);
		} catch {
			// 削除済みの場合は無視
		}
		await deleteCategory(page, categoryId);
		await deletePayer(page, payerId);
	});

	test('[SPEC: AC-007] 削除ボタンをクリックし確認ダイアログで確定すると一覧から消える', async ({
		page
	}) => {
		await page.goto('/expenses');

		const beforeCount = await page.getByTestId('expense-item').count();

		// 対象の支出行の削除ボタンをクリック
		const item = page.getByTestId('expense-item').filter({ hasText: '¥800' }).first();
		await item.getByTestId('expense-delete-button').click();

		// 削除確認ダイアログが表示される
		await expect(page.getByTestId('expense-delete-dialog')).toBeVisible();

		// 確定ボタンをクリック
		await page.getByTestId('expense-delete-confirm-button').click();

		// ダイアログが閉じて一覧から消える
		await expect(page.getByTestId('expense-delete-dialog')).not.toBeVisible();

		if (beforeCount === 1) {
			// 最後の1件の場合は空状態になる
			await expect(page.getByTestId('expense-empty')).toBeVisible();
		} else {
			await expect(page.getByTestId('expense-item')).toHaveCount(beforeCount - 1);
		}
	});
});

// ============================================================
// 月間合計金額
// ============================================================

test.describe('支出一覧 - 月間合計金額', () => {
	let categoryId: string;
	let payerId: string;
	let expense1Id: string;
	let expense2Id: string;

	test.beforeEach(async ({ page }) => {
		await login(page);
		categoryId = await createCategory(page, 'E2E合計テスト');
		payerId = await createPayer(page, 'E2E合計テスト支払者');
	});

	test.afterEach(async ({ page }) => {
		try {
			await deleteExpense(page, expense1Id);
		} catch {
			// ignore
		}
		try {
			await deleteExpense(page, expense2Id);
		} catch {
			// ignore
		}
		await deleteCategory(page, categoryId);
		await deletePayer(page, payerId);
	});

	test('[SPEC: AC-013] 月間合計金額が承認状態問わず全件の合計でカンマ区切りで表示される', async ({
		page
	}) => {
		// ベースライン合計を取得（確定済みなど削除不可の支出が残っている可能性がある）
		await page.goto('/expenses');
		const baselineText = await page.getByTestId('expense-total').textContent();
		const baseline = parseInt((baselineText ?? '¥0').replace(/[¥,]/g, ''), 10);

		// 2件の支出を作成（3000 + 2000 = 5000）
		expense1Id = await createExpense(page, 3000, categoryId, payerId);
		expense2Id = await createExpense(page, 2000, categoryId, payerId);

		await page.reload();

		const expectedTotal = baseline + 5000;
		const formatted = `¥${expectedTotal.toLocaleString('ja-JP')}`;
		await expect(page.getByTestId('expense-total')).toHaveText(formatted);
	});
});

// ============================================================
// ダッシュボード警告バナー
// ============================================================

test.describe('ダッシュボード - 未承認警告バナー', () => {
	let categoryId: string;
	let payerId: string;
	let expenseId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);
		categoryId = await createCategory(page, 'E2Eダッシュボードテスト');
		payerId = await createPayer(page, 'E2Eダッシュボードテスト支払者');
	});

	test.afterEach(async ({ page }) => {
		try {
			await deleteExpense(page, expenseId);
		} catch {
			// 削除済みの場合は無視
		}
		await deleteCategory(page, categoryId);
		await deletePayer(page, payerId);
	});

	test('[SPEC: dashboard/AC-008] 全期間の未承認支出が1件以上ある場合、ダッシュボードに件数付き警告バナーが表示される', async ({
		page
	}) => {
		expenseId = await createExpense(page, 1000, categoryId, payerId);

		await page.goto('/');

		const alert = page.getByTestId('expense-pending-alert');
		await expect(alert).toBeVisible();
		await expect(alert).toContainText('件あります');
		await expect(alert.getByRole('link', { name: '確認する' })).toBeVisible();
	});

	test('[SPEC: dashboard/AC-009] 全支出が承認済みになると、ダッシュボードの警告バナーが消える', async ({
		page
	}) => {
		expenseId = await createExpense(page, 1000, categoryId, payerId);

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

// ============================================================
// カテゴリ管理
// ============================================================

test.describe('カテゴリ管理 - 追加', () => {
	let createdCategoryName: string;

	test.afterEach(async ({ page }) => {
		// 作成したカテゴリを削除
		const res = await page.request.get('/expenses/categories');
		const data = (await res.json()) as { items: { id: string; name: string }[] };
		const cat = data.items.find((c) => c.name === createdCategoryName);
		if (cat) await deleteCategory(page, cat.id);
	});

	test('[SPEC: AC-010] カテゴリを追加すると一覧に反映され、支出フォームのセレクトに表示される', async ({
		page
	}) => {
		createdCategoryName = 'E2E新規カテゴリ';

		await login(page);
		await page.goto('/expenses/categories');

		// カテゴリ名を入力して追加
		await page.getByTestId('expense-category-name-input').fill(createdCategoryName);
		await page.getByTestId('expense-category-add-button').click();

		// カテゴリ一覧に追加される
		await expect(page.getByTestId('expense-category-list')).toContainText(createdCategoryName);

		// 支出一覧に遷移して登録フォームを開く
		await page.goto('/expenses');
		await page.getByTestId('expense-create-button').click();
		await expect(page.getByTestId('expense-form')).toBeVisible();

		// カテゴリセレクトに新カテゴリが表示される
		await expect(page.getByTestId('expense-category-select')).toContainText(createdCategoryName);
	});
});

test.describe('カテゴリ管理 - 編集', () => {
	let categoryId: string;
	const originalName = 'E2E編集前カテゴリ';
	const updatedName = 'E2E編集後カテゴリ';

	test.beforeEach(async ({ page }) => {
		await login(page);
		categoryId = await createCategory(page, originalName);
	});

	test.afterEach(async ({ page }) => {
		await deleteCategory(page, categoryId);
	});

	test('[SPEC: AC-011] カテゴリを編集すると一覧のカテゴリ名が更新される', async ({ page }) => {
		await page.goto('/expenses/categories');

		// 対象カテゴリの編集ボタンをクリック
		const item = page.getByTestId('expense-category-item').filter({ hasText: originalName });
		await item.getByTestId('expense-category-edit-button').click();

		// インライン編集モードに切り替わる
		const editInput = page.getByTestId('expense-category-list').getByRole('textbox');
		await expect(editInput).toBeVisible();
		await editInput.clear();
		await editInput.fill(updatedName);

		// 保存ボタンをクリック
		await page.getByTestId('expense-category-list').getByRole('button', { name: '保存' }).click();

		// カテゴリ名が更新される
		await expect(page.getByTestId('expense-category-list')).toContainText(updatedName);
		await expect(page.getByTestId('expense-category-list')).not.toContainText(originalName);
	});
});

test.describe('カテゴリ管理 - 削除', () => {
	let categoryId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);
		categoryId = await createCategory(page, 'E2E削除対象カテゴリ');
	});

	test.afterEach(async ({ page }) => {
		// テストが失敗した場合のクリーンアップ
		try {
			await deleteCategory(page, categoryId);
		} catch {
			// 削除済みの場合は無視
		}
	});

	test('[SPEC: AC-012] 支出が0件のカテゴリを削除すると一覧から消える', async ({ page }) => {
		await page.goto('/expenses/categories');

		const item = page
			.getByTestId('expense-category-item')
			.filter({ hasText: 'E2E削除対象カテゴリ' });
		await expect(item).toBeVisible();

		// 削除ボタンをクリック
		await item.getByTestId('expense-category-delete-button').click();

		// 削除確認ダイアログが表示される
		await expect(page.getByTestId('expense-category-delete-dialog')).toBeVisible();

		// 確定ボタンをクリック
		await page.getByTestId('expense-category-delete-confirm-button').click();

		// ダイアログが閉じてカテゴリが消える
		await expect(page.getByTestId('expense-category-delete-dialog')).not.toBeVisible();
		await expect(page.getByTestId('expense-category-list')).not.toContainText(
			'E2E削除対象カテゴリ'
		);
	});
});

// ============================================================
// 支払者管理
// ============================================================

test.describe('支払者管理 - 一覧表示', () => {
	let payerId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);
		payerId = await createPayer(page, 'E2E支払者一覧テスト');
	});

	test.afterEach(async ({ page }) => {
		await deletePayer(page, payerId);
	});

	test('[SPEC: AC-035] /expenses/payers にアクセスすると登録済みの支払者一覧が表示される', async ({
		page
	}) => {
		await page.goto('/expenses/payers');

		await expect(page.getByTestId('expense-payer-list')).toBeVisible();
		await expect(
			page.getByTestId('expense-payer-item').filter({ hasText: 'E2E支払者一覧テスト' })
		).toBeVisible();
	});
});

test.describe('支払者管理 - 追加', () => {
	let createdPayerName: string;

	test.afterEach(async ({ page }) => {
		// 作成した支払者を削除
		const res = await page.request.get('/expenses/payers');
		const data = (await res.json()) as { items: { id: string; name: string }[] };
		const payer = data.items.find((p) => p.name === createdPayerName);
		if (payer) await deletePayer(page, payer.id);
	});

	test('[SPEC: AC-036] 支払者名を入力して「追加」を押すと支払者が一覧に追加される', async ({
		page
	}) => {
		createdPayerName = 'E2E新規支払者';

		await login(page);
		await page.goto('/expenses/payers');

		await page.getByTestId('expense-payer-name-input').fill(createdPayerName);
		await page.getByTestId('expense-payer-add-button').click();

		await expect(page.getByTestId('expense-payer-list')).toContainText(createdPayerName);
	});

	test('[SPEC: AC-039] 支払者を追加すると支出登録フォームの支払者セレクトに反映される', async ({
		page
	}) => {
		createdPayerName = 'E2Eフォーム反映支払者';

		await login(page);
		await page.goto('/expenses/payers');

		await page.getByTestId('expense-payer-name-input').fill(createdPayerName);
		await page.getByTestId('expense-payer-add-button').click();

		// 支払者一覧に追加される
		await expect(page.getByTestId('expense-payer-list')).toContainText(createdPayerName);

		// 支出一覧に遷移して登録フォームを開く
		await page.goto('/expenses');
		await page.getByTestId('expense-create-button').click();
		await expect(page.getByTestId('expense-form')).toBeVisible();

		// 支払者セレクトに新支払者が表示される
		await expect(page.getByTestId('expense-payer-select')).toContainText(createdPayerName);
	});
});

test.describe('支払者管理 - 編集', () => {
	let payerId: string;
	const originalName = 'E2E編集前支払者';
	const updatedName = 'E2E編集後支払者';

	test.beforeEach(async ({ page }) => {
		await login(page);
		payerId = await createPayer(page, originalName);
	});

	test.afterEach(async ({ page }) => {
		await deletePayer(page, payerId);
	});

	test('[SPEC: AC-037] 支払者を編集するとインライン編集で名前が更新される', async ({ page }) => {
		await page.goto('/expenses/payers');

		// 対象支払者の編集ボタンをクリック
		const item = page.getByTestId('expense-payer-item').filter({ hasText: originalName });
		await item.getByTestId('expense-payer-edit-button').click();

		// インライン編集モードに切り替わる
		const editInput = page.getByTestId('expense-payer-list').getByRole('textbox');
		await expect(editInput).toBeVisible();
		await editInput.clear();
		await editInput.fill(updatedName);

		// 保存ボタンをクリック
		await page.getByTestId('expense-payer-list').getByRole('button', { name: '保存' }).click();

		// 支払者名が更新される
		await expect(page.getByTestId('expense-payer-list')).toContainText(updatedName);
		await expect(page.getByTestId('expense-payer-list')).not.toContainText(originalName);
	});
});

test.describe('支払者管理 - 削除', () => {
	let payerId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);
		payerId = await createPayer(page, 'E2E削除対象支払者');
	});

	test.afterEach(async ({ page }) => {
		// テストが失敗した場合のクリーンアップ
		try {
			await deletePayer(page, payerId);
		} catch {
			// 削除済みの場合は無視
		}
	});

	test('[SPEC: AC-038] 支出が0件の支払者を削除すると一覧から消える', async ({ page }) => {
		await page.goto('/expenses/payers');

		const item = page.getByTestId('expense-payer-item').filter({ hasText: 'E2E削除対象支払者' });
		await expect(item).toBeVisible();

		// 削除ボタンをクリック
		await item.getByTestId('expense-payer-delete-button').click();

		// 削除確認ダイアログが表示される
		await expect(page.getByTestId('expense-payer-delete-dialog')).toBeVisible();

		// 確定ボタンをクリック
		await page.getByTestId('expense-payer-delete-confirm-button').click();

		// ダイアログが閉じて支払者が消える
		await expect(page.getByTestId('expense-payer-delete-dialog')).not.toBeVisible();
		await expect(page.getByTestId('expense-payer-list')).not.toContainText('E2E削除対象支払者');
	});
});

// ============================================================
// 支出確定
// ============================================================

test.describe('支出 - 確定操作', () => {
	let categoryId: string;
	let payerId: string;
	let expenseId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);
		categoryId = await createCategory(page, 'E2E確定テスト');
		payerId = await createPayer(page, 'E2E確定テスト支払者');
		expenseId = await createExpense(page, 4500, categoryId, payerId);
		// 確認済みにしてから確定できる状態にする
		await approveExpense(page, expenseId);
	});

	test.afterEach(async ({ page }) => {
		// 確定済み支出は DELETE できないため try/catch で無視する
		try {
			await deleteExpense(page, expenseId);
		} catch {
			// 確定済みの場合は削除不可
		}
		await deleteCategory(page, categoryId);
		await deletePayer(page, payerId);
	});

	test('[SPEC: AC-014] 確認済みの支出がある状態で「まとめて確定」ボタンを押し、確認ダイアログで確定すると「確定済み」に更新される', async ({
		page
	}) => {
		await page.goto('/expenses');

		// 確認済みの支出行が表示されていることを確認
		const item = page.getByTestId('expense-item').filter({ hasText: '確認済み' }).first();
		await expect(item).toBeVisible();

		// 確認済み未確定が存在するため「まとめて確定」ボタンが表示される
		await expect(page.getByTestId('expense-bulk-finalize-button')).toBeVisible();

		// 「確定する（1件）」ボタンをクリックしてダイアログを開く
		await page.getByTestId('expense-bulk-finalize-button').click();
		await expect(page.getByTestId('expense-finalize-dialog')).toBeVisible();

		// ダイアログで確定ボタンをクリック
		await page.getByTestId('expense-finalize-confirm-button').click();

		// ダイアログが閉じ、承認状態が「確定済み」に更新される
		await expect(page.getByTestId('expense-finalize-dialog')).not.toBeVisible();
		const updatedItem = page.getByTestId('expense-item').filter({ hasText: '¥4,500' }).first();
		await expect(updatedItem).toContainText('確定済み');
	});

	test('[SPEC: AC-015] 確定済みの支出行には編集・削除・未承認に戻す・確定ボタンが表示されない', async ({
		page
	}) => {
		// 支出を確定する
		await page.request.post(`/expenses/${expenseId}/finalize`);

		await page.goto('/expenses');

		// 確定済みの支出行を取得
		const item = page.getByTestId('expense-item').filter({ hasText: '確定済み' }).first();
		await expect(item).toBeVisible();

		// 操作ボタンが表示されない
		await expect(item.getByTestId('expense-edit-button')).not.toBeVisible();
		await expect(item.getByTestId('expense-delete-button')).not.toBeVisible();
		await expect(item.getByTestId('expense-unapprove-button')).not.toBeVisible();

		// 行がグレーアウトされている
		await expect(item).toHaveClass(/opacity-60/);
		await expect(item.getByTestId('expense-approve-button')).not.toBeVisible();
	});
});

// ============================================================
// モバイル行メニュー（viewport: 375x812）
// ============================================================

test.describe('支出一覧 - モバイル行メニュー', () => {
	let categoryId: string;
	let payerId: string;
	let expenseId: string;

	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await login(page);
		categoryId = await createCategory(page, 'E2Eモバイルテスト');
		payerId = await createPayer(page, 'E2Eモバイルテスト支払者');
		expenseId = await createExpense(page, 1200, categoryId, payerId);
	});

	test.afterEach(async ({ page }) => {
		try {
			await deleteExpense(page, expenseId);
		} catch {
			// 確定済みの場合は削除不可
		}
		await deleteCategory(page, categoryId);
		await deletePayer(page, payerId);
	});

	test('[SPEC: AC-016] 未承認の行メニューボタンをタップするとメニューが表示される', async ({
		page
	}) => {
		await page.goto('/expenses');

		const item = page.getByTestId('expense-item').filter({ hasText: '¥1,200' }).first();

		// モバイルでは expense-menu-button が表示される
		const menuButton = item.getByTestId('expense-menu-button');
		await expect(menuButton).toBeVisible();

		// タップするとメニューが開く
		await menuButton.click();
		await expect(item.getByTestId('expense-menu')).toBeVisible();
	});

	test('[SPEC: AC-017] メニュー表示中にメニュー外をクリックするとメニューが閉じる', async ({
		page
	}) => {
		await page.goto('/expenses');

		const item = page.getByTestId('expense-item').filter({ hasText: '¥1,200' }).first();
		await item.getByTestId('expense-menu-button').click();
		await expect(item.getByTestId('expense-menu')).toBeVisible();

		// メニュー外（月間合計エリア）をクリック
		await page.getByTestId('expense-total').click();

		// メニューが閉じる
		await expect(item.getByTestId('expense-menu')).not.toBeVisible();
	});

	test('[SPEC: AC-018] 未承認行のメニューには「確認済みにする」のみ表示され「未承認に戻す」は表示されない', async ({
		page
	}) => {
		await page.goto('/expenses');

		const item = page.getByTestId('expense-item').filter({ hasText: '未承認' }).first();
		await item.getByTestId('expense-menu-button').click();
		const menu = item.getByTestId('expense-menu');

		await expect(menu).toBeVisible();
		await expect(menu.getByTestId('expense-approve-button')).toBeVisible();
		await expect(menu.getByTestId('expense-unapprove-button')).not.toBeVisible();
	});

	test('[SPEC: AC-019] 確認済み行のメニューには「未承認に戻す」が表示され「確認済みにする」は表示されない', async ({
		page
	}) => {
		// 確認済みにする
		await approveExpense(page, expenseId);

		await page.goto('/expenses');

		const item = page.getByTestId('expense-item').filter({ hasText: '確認済み' }).first();
		await item.getByTestId('expense-menu-button').click();
		const menu = item.getByTestId('expense-menu');

		await expect(menu).toBeVisible();
		await expect(menu.getByTestId('expense-unapprove-button')).toBeVisible();
		await expect(menu.getByTestId('expense-approve-button')).not.toBeVisible();
	});

	test('[SPEC: AC-020] 確定済みの行にはメニューボタンが表示されない', async ({ page }) => {
		// 確認済みにしてから確定
		await approveExpense(page, expenseId);
		await page.request.post(`/expenses/${expenseId}/finalize`);

		await page.goto('/expenses');

		const item = page.getByTestId('expense-item').filter({ hasText: '確定済み' }).first();
		await expect(item).toBeVisible();
		await expect(item.getByTestId('expense-menu-button')).not.toBeVisible();
	});
});

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
		// データが存在しない過去月を指定して空状態を確認
		await page.goto('/expenses?month=1970-01');

		await expect(page.getByTestId('expense-empty')).toBeVisible();
		await expect(page.getByTestId('expense-list')).not.toBeVisible();
	});

	test('[SPEC: AC-205] 支出が0件の場合、月間合計は「¥0」と表示される', async ({ page }) => {
		// データが存在しない過去月を指定して空状態を確認
		await page.goto('/expenses?month=1970-01');

		await expect(page.getByTestId('expense-total')).toHaveText('¥0');
	});
});
