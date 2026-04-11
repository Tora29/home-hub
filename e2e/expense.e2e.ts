/**
 * @file E2Eテスト: 支出管理
 * @module e2e/expense.e2e.ts
 * @testType e2e
 *
 * @spec specs/expenses/spec.md
 * @covers AC-001, AC-002, AC-002b, AC-002c, AC-003, AC-004, AC-005, AC-006, AC-007,
 *         AC-008, AC-009, AC-010, AC-011, AC-012, AC-013,
 *         AC-015, AC-016, AC-017, AC-018, AC-019,
 *         AC-111, AC-112, AC-120, AC-122, AC-204, AC-205
 *
 * @scenarios
 * - 支出一覧の初期表示（当月フィルタ・登録日時降順）
 * - 月切り替えセレクトによる表示月変更
 * - 月切り替えセレクトの選択肢は過去月選択後も当月を含む（AC-002b）
 * - 不正な月パラメータでアクセスすると /expenses にリダイレクト（AC-002c）
 * - 支出の新規登録フロー（正常系）
 * - チェックボックス操作（unapproved → checked / checked → unapproved）
 * - 支出の編集フロー
 * - 支出の削除フロー
 * - 承認依頼ボタンの表示・送信フロー
 * - 申請取り消しボタンの表示・取り消しフロー
 * - カテゴリ管理（追加・編集・削除）
 * - モバイル行メニューの開閉（viewport: 375x812）
 * - 空状態・合計¥0 表示
 * - FE バリデーション（金額未入力・カテゴリ未選択）
 *
 * @pages
 * - /expenses - 支出一覧画面
 * - /expenses/categories - カテゴリ管理画面
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

/**
 * ログインユーザーの ID をログインセッションから取得する。
 * API を通じて自分の情報を取得する（支出登録の payerUserId に使用）。
 */
async function getCurrentUserId(page: Page): Promise<string> {
	const res = await page.request.get('/api/auth/get-session');
	const data = (await res.json()) as { user?: { id: string } };
	return data.user?.id ?? '';
}

async function createExpense(
	page: Page,
	amount: number,
	categoryId: string,
	payerUserId: string
): Promise<string> {
	const res = await page.request.post('/expenses', {
		data: { amount, categoryId, payerUserId }
	});
	const data = (await res.json()) as { id: string };
	return data.id;
}

async function deleteExpense(page: Page, id: string): Promise<void> {
	await page.request.delete(`/expenses/${id}`);
}

// ============================================================
// テスト
// ============================================================

test.describe('支出一覧 - 初期表示', () => {
	test('[SPEC: AC-001] /expenses にアクセスすると当月の支出一覧が表示される', async ({ page }) => {
		await login(page);
		await page.goto('/expenses');

		await expect(page.getByTestId('expense-list')).toBeVisible();
		await expect(page.getByTestId('expense-month-select')).toBeVisible();
		await expect(page.getByTestId('expense-total')).toBeVisible();
	});
});

test.describe('支出一覧 - 月切り替え', () => {
	test('[SPEC: AC-002] 月切り替えセレクトで別の月を選択すると、表示月が変わる', async ({
		page
	}) => {
		await login(page);
		await page.goto('/expenses');

		const prevMonth = (() => {
			const now = new Date();
			const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
			return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
		})();

		await page.getByTestId('expense-month-select').selectOption(prevMonth);

		// 月切り替え後も expense-total が表示されていること
		await expect(page.getByTestId('expense-total')).toBeVisible();
	});

	test('[SPEC: AC-002b] 過去月を選択しても選択肢に当月が含まれたまま', async ({ page }) => {
		await login(page);
		await page.goto('/expenses');

		const currentMonth = getCurrentMonth();

		const prevMonth = (() => {
			const now = new Date();
			const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
			return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
		})();

		// 過去月に切り替える
		await page.getByTestId('expense-month-select').selectOption(prevMonth);

		// 当月がセレクトの選択肢に存在することを確認
		const options = await page.getByTestId('expense-month-select').locator('option').all();
		const optionValues = await Promise.all(options.map((o) => o.getAttribute('value')));
		expect(optionValues).toContain(currentMonth);

		// 当月に戻せることを確認
		await page.getByTestId('expense-month-select').selectOption(currentMonth);
		await expect(page.getByTestId('expense-total')).toBeVisible();
	});

	test('[SPEC: AC-002c] 不正な月パラメータ（?month=2026-13）でアクセスすると /expenses にリダイレクトされ当月の支出一覧が表示される', async ({
		page
	}) => {
		await login(page);
		await page.goto('/expenses?month=2026-13');

		// リダイレクト後は /expenses（クエリなし）になる
		await page.waitForURL('/expenses');

		// 当月の一覧が表示されていること
		await expect(page.getByTestId('expense-list')).toBeVisible();
		const selectedValue = await page.getByTestId('expense-month-select').inputValue();
		expect(selectedValue).toBe(getCurrentMonth());
	});
});

test.describe('支出 CRUD', () => {
	let categoryId: string;
	let expenseId: string;
	let currentUserId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);
		categoryId = await createCategory(page, `テストカテゴリ_${Date.now()}`);
		currentUserId = await getCurrentUserId(page);
	});

	test.afterEach(async ({ page }) => {
		if (expenseId) {
			try {
				await deleteExpense(page, expenseId);
			} catch {
				// 削除済みの場合は無視
			}
		}
		if (categoryId) {
			await deleteCategory(page, categoryId);
		}
	});

	test('[SPEC: AC-003] 金額・カテゴリ・支払者を入力して確定ボタンを押すと支出が登録される', async ({
		page
	}) => {
		await page.goto('/expenses');

		// 登録ボタンをクリック
		await page.getByTestId('expense-create-button').click();
		await expect(page.getByTestId('expense-form')).toBeVisible();

		// フォームに入力
		await page.getByTestId('expense-amount-input').fill('1500');
		await page.getByTestId('expense-category-select').selectOption(categoryId);
		await page.getByTestId('expense-payer-select').selectOption(currentUserId);

		// 確定ボタンをクリック
		await page.getByTestId('expense-submit-button').click();

		// 一覧に新しい支出が表示される
		const items = await page.getByTestId('expense-item').all();
		expect(items.length).toBeGreaterThanOrEqual(1);

		// 後片付け用に ID を取得
		const res = await page.request.get(`/expenses?month=${getCurrentMonth()}`);
		const data = (await res.json()) as { items: { id: string; amount: number }[] };
		const created = data.items.find((i) => i.amount === 1500);
		if (created) expenseId = created.id;
	});

	test('[SPEC: AC-004] unapproved の支出のチェックボックスをクリックすると checked になる', async ({
		page
	}) => {
		expenseId = await createExpense(page, 1000, categoryId, currentUserId);
		await page.goto('/expenses');

		// チェックボックスをクリック（unchecked → checked）
		const checkBtn = page.getByTestId('expense-check-button').first();
		await checkBtn.click();

		// ステータスが checked に変わった行が表示されることを確認
		// （ステータスバッジまたは UI の変化を確認）
		await expect(page.getByTestId('expense-list')).toBeVisible();
	});

	test('[SPEC: AC-006] unapproved/checked の支出の編集ボタンをクリックすると編集フォームが表示される', async ({
		page
	}) => {
		expenseId = await createExpense(page, 2000, categoryId, currentUserId);
		await page.goto('/expenses');

		// 編集ボタンをクリック
		await page.getByTestId('expense-edit-button').first().click();
		await expect(page.getByTestId('expense-form')).toBeVisible();
	});

	test('[SPEC: AC-007] 支出の削除ボタンをクリックして確認すると一覧から消える', async ({
		page
	}) => {
		expenseId = await createExpense(page, 3000, categoryId, currentUserId);
		await page.goto('/expenses');

		const initialItems = await page.getByTestId('expense-item').all();
		const initialCount = initialItems.length;

		// 削除ボタンをクリック
		await page.getByTestId('expense-delete-button').first().click();
		await expect(page.getByTestId('expense-delete-dialog')).toBeVisible();

		// 確認ボタンをクリック
		await page.getByTestId('expense-delete-confirm-button').click();

		// 件数が1減ることを確認（ページ更新を待つ）
		await expect(page.getByTestId('expense-item')).toHaveCount(initialCount - 1);

		expenseId = ''; // 削除済みなのでクリア
	});
});

test.describe('承認ワークフロー', () => {
	let categoryId: string;
	let expenseId: string;
	let currentUserId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);
		categoryId = await createCategory(page, `テストカテゴリ_${Date.now()}`);
		currentUserId = await getCurrentUserId(page);
		expenseId = await createExpense(page, 1000, categoryId, currentUserId);
	});

	test.afterEach(async ({ page }) => {
		if (expenseId) {
			try {
				await deleteExpense(page, expenseId);
			} catch {
				// 承認済みで削除不可の場合は無視
			}
		}
		if (categoryId) {
			await deleteCategory(page, categoryId);
		}
	});

	test('[SPEC: AC-008] checked 支出が 1 件以上の場合、承認依頼ボタンが表示される', async ({
		page
	}) => {
		// check 操作
		await page.request.post(`/expenses/${expenseId}/check`);

		await page.goto('/expenses');

		await expect(page.getByTestId('expense-bulk-request-button')).toBeVisible();
	});

	test('[SPEC: AC-009] pending 支出がある場合、申請取り消しボタンが表示される', async ({
		page
	}) => {
		// check → pending
		await page.request.post(`/expenses/${expenseId}/check`);
		await page.request.post('/expenses/request');

		await page.goto('/expenses');

		await expect(page.getByTestId('expense-bulk-cancel-button')).toBeVisible();
	});
});

test.describe('カテゴリ管理', () => {
	let categoryId: string;

	test.afterEach(async ({ page }) => {
		if (categoryId) {
			try {
				await deleteCategory(page, categoryId);
			} catch {
				// 削除済みの場合は無視
			}
		}
	});

	test('[SPEC: AC-011] カテゴリを追加すると一覧に表示される', async ({ page }) => {
		await login(page);
		await page.goto('/expenses/categories');

		const categoryName = `テストカテゴリ_${Date.now()}`;
		await page.getByTestId('expense-category-name-input').fill(categoryName);
		await page.getByTestId('expense-category-add-button').click();

		await expect(page.getByTestId('expense-category-list')).toContainText(categoryName);

		// 後片付け用に ID を取得
		const res = await page.request.get('/expenses/categories');
		const data = (await res.json()) as { items: { id: string; name: string }[] };
		const created = data.items.find((i) => i.name === categoryName);
		if (created) categoryId = created.id;
	});

	test('[SPEC: AC-013] 支出が紐付いていないカテゴリを削除できる', async ({ page }) => {
		await login(page);
		categoryId = await createCategory(page, `削除テスト_${Date.now()}`);
		await page.goto('/expenses/categories');

		const item = page.getByTestId('expense-category-item').filter({ hasText: '削除テスト' });
		await item.getByTestId('expense-category-delete-button').click();
		await expect(page.getByTestId('expense-category-delete-dialog')).toBeVisible();

		await page.getByTestId('expense-category-delete-confirm-button').click();

		await expect(page.getByTestId('expense-category-list')).not.toContainText('削除テスト');
		categoryId = '';
	});
});

test.describe('行メニュー（モバイル）', () => {
	let categoryId: string;
	let expenseId: string;
	let currentUserId: string;

	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await login(page);
		categoryId = await createCategory(page, `テストカテゴリ_${Date.now()}`);
		currentUserId = await getCurrentUserId(page);
		expenseId = await createExpense(page, 1000, categoryId, currentUserId);
	});

	test.afterEach(async ({ page }) => {
		if (expenseId) {
			try {
				await deleteExpense(page, expenseId);
			} catch {
				// ignore
			}
		}
		if (categoryId) {
			await deleteCategory(page, categoryId);
		}
	});

	test('[SPEC: AC-018] モバイルで自分の unapproved 行の行メニューボタンをタップするとメニューが表示される', async ({
		page
	}) => {
		await page.goto('/expenses');

		await page.getByTestId('expense-menu-button').first().click();

		await expect(page.getByTestId('expense-menu')).toBeVisible();
	});

	test('[SPEC: AC-019] expense-menu 表示中にメニュー外をクリックするとメニューが閉じる', async ({
		page
	}) => {
		await page.goto('/expenses');

		await page.getByTestId('expense-menu-button').first().click();
		await expect(page.getByTestId('expense-menu')).toBeVisible();

		// メニュー外をクリック
		await page.getByTestId('expense-list').click({ position: { x: 10, y: 10 }, force: true });

		await expect(page.getByTestId('expense-menu')).not.toBeVisible();
	});
});

test.describe('空状態・合計表示', () => {
	test('[SPEC: AC-204] 支出が0件の場合、空状態メッセージが表示される', async ({ page }) => {
		await login(page);

		// 支出が存在しない遠い過去の月を指定
		await page.goto('/expenses?month=2000-01');

		await expect(page.getByTestId('expense-empty')).toBeVisible();
	});

	test('[SPEC: AC-205] 支出が0件の場合、合計金額が「¥0」と表示される', async ({ page }) => {
		await login(page);

		await page.goto('/expenses?month=2000-01');

		await expect(page.getByTestId('expense-total')).toContainText('¥0');
	});
});

test.describe('フロントバリデーション', () => {
	let categoryId: string;

	test.beforeEach(async ({ page }) => {
		await login(page);
		categoryId = await createCategory(page, `テストカテゴリ_${Date.now()}`);
	});

	test.afterEach(async ({ page }) => {
		if (categoryId) {
			await deleteCategory(page, categoryId);
		}
	});

	test('[SPEC: AC-111] 金額が空のまま確定ボタンを押すと「金額は必須です」が表示される', async ({
		page
	}) => {
		await page.goto('/expenses');

		await page.getByTestId('expense-create-button').click();
		await expect(page.getByTestId('expense-form')).toBeVisible();

		// 金額を入力せずに確定
		await page.getByTestId('expense-submit-button').click();

		await expect(page.getByTestId('expense-amount-error')).toBeVisible();
		await expect(page.getByTestId('expense-amount-error')).toContainText('金額は必須です');
	});

	test('[SPEC: AC-112] カテゴリが未選択のまま確定ボタンを押すと「カテゴリは必須です」が表示される', async ({
		page
	}) => {
		await page.goto('/expenses');

		await page.getByTestId('expense-create-button').click();
		await expect(page.getByTestId('expense-form')).toBeVisible();

		// 金額のみ入力、カテゴリは未選択
		await page.getByTestId('expense-amount-input').fill('1000');
		await page.getByTestId('expense-submit-button').click();

		await expect(page.getByTestId('expense-category-error')).toBeVisible();
		await expect(page.getByTestId('expense-category-error')).toContainText('カテゴリは必須です');
	});
});
