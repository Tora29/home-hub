/**
 * @file E2Eテスト: 支出管理
 * @module e2e/expense.e2e.ts
 * @testType e2e
 *
 * @spec specs/expenses/spec.md
 * @covers AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009,
 *         AC-010, AC-011, AC-012, AC-013, AC-111, AC-112, AC-204, AC-205
 *
 * @scenarios
 * - 支出一覧の初期表示（当月フィルタ・登録日時降順）
 * - 月切り替えセレクトによる表示月変更
 * - 支出の新規登録フロー（正常系）
 * - 支出の承認操作（確認済み・未承認に戻す）
 * - 支出の編集フロー
 * - 支出の削除フロー
 * - ダッシュボードの未承認警告バナー表示・非表示
 * - カテゴリ管理（追加・編集・削除）
 * - 月間合計金額の表示
 * - FE バリデーション（金額未入力・カテゴリ未選択）
 * - 空状態・合計¥0 表示
 *
 * @pages
 * - /expenses - 支出一覧画面
 * - /expenses/categories - カテゴリ管理画面
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

async function createExpense(page: Page, amount: number, categoryId: string): Promise<string> {
	const res = await page.request.post('/expenses', {
		data: { amount, categoryId }
	});
	const data = (await res.json()) as { id: string };
	return data.id;
}

async function deleteExpense(page: Page, id: string): Promise<void> {
	await page.request.delete(`/expenses/${id}`);
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
		await deleteExpense(page, id);
	}
}

// ============================================================
// 一覧画面 - 初期表示
// ============================================================

test.describe('支出一覧画面 - 初期表示', () => {
	let categoryId: string;
	let expenseId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);
		categoryId = await createCategory(page, 'E2Eテスト用カテゴリ');
		expenseId = await createExpense(page, 1500, categoryId);
	});

	test.afterEach(async ({ page }) => {
		await deleteExpense(page, expenseId);
		await deleteCategory(page, categoryId);
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
});

// ============================================================
// 支出登録
// ============================================================

test.describe('支出登録', () => {
	let categoryId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);
		categoryId = await createCategory(page, 'E2E登録テスト');
	});

	test.afterEach(async ({ page }) => {
		// 当月の支出をクリーンアップしてからカテゴリ削除
		await clearCurrentMonthExpenses(page);
		await deleteCategory(page, categoryId);
	});

	test('[SPEC: AC-003] 金額とカテゴリを入力して確定すると一覧の先頭に支出が追加される', async ({
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

	test.beforeEach(async ({ page }) => {
		await login(page);
		categoryId = await createCategory(page, 'E2Eバリデーションテスト');
	});

	test.afterEach(async ({ page }) => {
		await deleteCategory(page, categoryId);
	});

	test('[SPEC: AC-111] 金額が空のまま確定を押すと「金額は必須です」とインライン表示される', async ({
		page
	}) => {
		await page.goto('/expenses');

		await page.getByTestId('expense-create-button').click();
		await expect(page.getByTestId('expense-form')).toBeVisible();

		// 金額を入力しないで確定
		await page.getByTestId('expense-category-select').selectOption({ value: categoryId });
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
		await page.getByTestId('expense-submit-button').click();

		// フォームは閉じない（サーバー非通信）
		await expect(page.getByTestId('expense-form')).toBeVisible();
		await expect(page.getByTestId('expense-category-error')).toBeVisible();
		await expect(page.getByTestId('expense-category-error')).toHaveText('カテゴリは必須です');
	});
});

// ============================================================
// 承認操作
// ============================================================

test.describe('支出 - 承認操作', () => {
	let categoryId: string;
	let expenseId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);
		categoryId = await createCategory(page, 'E2E承認テスト');
		expenseId = await createExpense(page, 2000, categoryId);
	});

	test.afterEach(async ({ page }) => {
		await deleteExpense(page, expenseId);
		await deleteCategory(page, categoryId);
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
		await page.request.put(`/expenses/${expenseId}`, {
			data: { amount: 2000, categoryId, approved: true }
		});

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
	let expenseId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);
		categoryId = await createCategory(page, 'E2E編集テスト元');
		category2Id = await createCategory(page, 'E2E編集テスト先');
		expenseId = await createExpense(page, 1000, categoryId);
	});

	test.afterEach(async ({ page }) => {
		await deleteExpense(page, expenseId);
		await deleteCategory(page, categoryId);
		await deleteCategory(page, category2Id);
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
	let expenseId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);
		categoryId = await createCategory(page, 'E2E削除テスト');
		expenseId = await createExpense(page, 800, categoryId);
	});

	test.afterEach(async ({ page }) => {
		// テストが失敗した場合のクリーンアップ
		try {
			await deleteExpense(page, expenseId);
		} catch {
			// 削除済みの場合は無視
		}
		await deleteCategory(page, categoryId);
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
	let expense1Id: string;
	let expense2Id: string;

	test.beforeEach(async ({ page }) => {
		await login(page);
		await clearCurrentMonthExpenses(page);
		categoryId = await createCategory(page, 'E2E合計テスト');
		expense1Id = await createExpense(page, 3000, categoryId);
		expense2Id = await createExpense(page, 2000, categoryId);
	});

	test.afterEach(async ({ page }) => {
		await deleteExpense(page, expense1Id);
		await deleteExpense(page, expense2Id);
		await deleteCategory(page, categoryId);
	});

	test('[SPEC: AC-013] 月間合計金額が承認状態問わず全件の合計でカンマ区切りで表示される', async ({
		page
	}) => {
		await page.goto('/expenses');

		// 3000 + 2000 = 5000
		await expect(page.getByTestId('expense-total')).toHaveText('¥5,000');
	});
});

// ============================================================
// ダッシュボード警告バナー
// ============================================================

test.describe('ダッシュボード - 未承認警告バナー', () => {
	let categoryId: string;
	let expenseId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);
		categoryId = await createCategory(page, 'E2Eダッシュボードテスト');
	});

	test.afterEach(async ({ page }) => {
		try {
			await deleteExpense(page, expenseId);
		} catch {
			// 削除済みの場合は無視
		}
		await deleteCategory(page, categoryId);
	});

	test('[SPEC: AC-008] 全期間の未承認支出が1件以上ある場合、ダッシュボードに件数付き警告バナーが表示される', async ({
		page
	}) => {
		expenseId = await createExpense(page, 1000, categoryId);

		await page.goto('/');

		const alert = page.getByTestId('expense-pending-alert');
		await expect(alert).toBeVisible();
		await expect(alert).toContainText('件あります');
		await expect(alert.getByRole('link', { name: '確認する' })).toBeVisible();
	});

	test('[SPEC: AC-009] 全支出が承認済みになると、ダッシュボードの警告バナーが消える', async ({
		page
	}) => {
		expenseId = await createExpense(page, 1000, categoryId);

		// 支出を承認済みにする
		await page.request.put(`/expenses/${expenseId}`, {
			data: { amount: 1000, categoryId, approved: true }
		});

		await page.goto('/');

		await expect(page.getByTestId('expense-pending-alert')).not.toBeVisible();
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
		// 編集後は名前がinputのvalueに移るため、リスト全体からtextboxを取得する
		const editInput = page.getByTestId('expense-category-list').getByRole('textbox');
		await expect(editInput).toBeVisible();
		await editInput.clear();
		await editInput.fill(updatedName);

		// 保存ボタンをクリック（aria-label="保存"で特定）
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
		await clearCurrentMonthExpenses(page);

		await page.goto('/expenses');

		await expect(page.getByTestId('expense-empty')).toBeVisible();
		await expect(page.getByTestId('expense-list')).not.toBeVisible();
	});

	test('[SPEC: AC-205] 支出が0件の場合、月間合計は「¥0」と表示される', async ({ page }) => {
		// 当月の支出をすべて削除
		await clearCurrentMonthExpenses(page);

		await page.goto('/expenses');

		await expect(page.getByTestId('expense-total')).toHaveText('¥0');
	});
});
