/**
 * @file E2Eテスト: 支出
 * @module e2e/expenses.e2e.ts
 * @testType e2e
 *
 * @scenarios
 * - 初期表示: 支出一覧ページが表示される
 * - 空状態: 当月に支出がない場合は空状態メッセージが表示される
 * - 月切り替え: 月セレクトで URL パラメータが変わり支出が更新される
 * - 登録: フォームから支出を登録できる
 * - バリデーション: 必須項目未入力でエラーが表示される
 * - 削除: 確認ダイアログから支出を削除できる
 * - チェック: 支出を確認済みにできる
 * - カテゴリ管理: カテゴリを追加・削除できる
 * - モバイル: モバイルで行メニューが開く
 * - キーボード・モーダル: フォーカス移動・背景へのフォーカス防止・Escape・背景クリック・フォーカス復帰
 * - 承認依頼: 確認済み支出を申請・取消できる
 *
 * @pages
 * - /expenses - 支出一覧
 * - /expenses/categories - カテゴリ管理
 */
import { test, expect, type Page } from '@playwright/test';
import { addMonths, getCurrentMonth } from '../src/lib/utils/date';

// API で作成した支出は当月（JST）に入る。シード（過去の固定月）と重ならない前月は空月として使う
const CURRENT_MONTH = getCurrentMonth();
const EMPTY_MONTH = addMonths(CURRENT_MONTH, -1);

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

test.describe('支出一覧 - 初期表示', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/expenses');
	});

	test('主要要素が表示される', async ({ page }) => {
		await expect(page.getByTestId('expense-month-select')).toBeVisible();
		await expect(page.getByTestId('expense-create-button')).toBeVisible();
		await expect(page.getByTestId('expense-total')).toBeVisible();
	});

	test('支出がない月は空状態メッセージが表示される', async ({ page }) => {
		await page.goto(`/expenses?month=${EMPTY_MONTH}`);
		await expect(page.getByTestId('expense-empty')).toBeVisible();
		await expect(page.getByTestId('expense-empty')).toHaveText('支出はまだありません');
	});

	test('カテゴリ管理リンクが表示される', async ({ page }) => {
		await expect(page.getByRole('link', { name: 'カテゴリ' })).toBeVisible();
	});
});

test.describe('支出一覧 - 月切り替え', () => {
	test('月セレクトで支出のある月に切り替えると支出一覧が更新される', async ({ page }) => {
		const expense = await createExpense(page, { amount: 2468 });
		try {
			await page.goto(`/expenses?month=${EMPTY_MONTH}`);
			await expect(page.getByTestId('expense-empty')).toBeVisible();

			await page.getByTestId('expense-month-select').selectOption(CURRENT_MONTH);
			await expect(page).toHaveURL(new RegExp(`month=${CURRENT_MONTH}`));
			await expect(
				page.getByTestId('expense-item').filter({ hasText: '¥2,468' }).first()
			).toBeVisible();
		} finally {
			await deleteExpense(page, expense.id);
		}
	});

	test('支出のある月の月間合計が ¥0 より大きい値で表示される', async ({ page }) => {
		const expense = await createExpense(page, { amount: 1357 });
		try {
			await page.goto(`/expenses?month=${CURRENT_MONTH}`);
			await expect(page.getByTestId('expense-total')).not.toHaveText('¥0');
		} finally {
			await deleteExpense(page, expense.id);
		}
	});
});

test.describe('支出一覧 - 登録', () => {
	test('登録ボタンからフォームダイアログが開く', async ({ page }) => {
		await page.goto('/expenses');
		await page.getByTestId('expense-create-button').click();
		await expect(page.getByRole('dialog', { name: '支出を登録' })).toBeVisible();
	});

	test('金額・カテゴリ・支払者を入力して支出を登録できる', async ({ page }) => {
		await page.goto('/expenses');
		await page.getByTestId('expense-create-button').click();
		await page.getByTestId('expense-amount-input').fill('1500');
		await page.getByTestId('expense-category-select').selectOption({ label: '食費' });
		await page.getByTestId('expense-payer-select').selectOption({ label: 'Test User' });
		const createdRes = page.waitForResponse(
			(res) => res.url().endsWith('/expenses') && res.request().method() === 'POST'
		);
		await page.getByTestId('expense-submit-button').click();
		const created = (await (await createdRes).json()) as { id: string };
		try {
			await expect(
				page.getByTestId('expense-item').filter({ hasText: '¥1,500' }).first()
			).toBeVisible();
		} finally {
			await deleteExpense(page, created.id);
		}
	});

	test('金額が未入力でフォーム送信するとバリデーションエラーが表示される', async ({ page }) => {
		await page.goto('/expenses');
		await page.getByTestId('expense-create-button').click();
		await page.getByTestId('expense-submit-button').click();
		await expect(page.getByTestId('expense-amount-error')).toHaveText('金額は必須です');
	});

	test('カテゴリが未選択でフォーム送信するとバリデーションエラーが表示される', async ({ page }) => {
		await page.goto('/expenses');
		await page.getByTestId('expense-create-button').click();
		await page.getByTestId('expense-amount-input').fill('1000');
		await page.getByTestId('expense-submit-button').click();
		await expect(page.getByTestId('expense-category-error')).toHaveText('カテゴリは必須です');
	});
});

test.describe('支出一覧 - 削除', () => {
	test('削除確認ダイアログから支出を削除できる', async ({ page }) => {
		await createExpense(page, { amount: 9999 });
		await page.goto('/expenses');
		const item = page.getByTestId('expense-item').filter({ hasText: '¥9,999' });
		await expect(item.first()).toBeVisible();

		await item.getByTestId('expense-delete-button').first().click();
		await expect(page.getByTestId('expense-delete-dialog')).toBeVisible();
		await page.getByTestId('expense-delete-confirm-button').click();
		await expect(page.getByTestId('expense-item').filter({ hasText: '¥9,999' })).toHaveCount(0);
	});

	test('削除ダイアログでキャンセルすると削除されない', async ({ page }) => {
		const expense = await createExpense(page, { amount: 8888 });
		try {
			await page.goto('/expenses');
			const item = page.getByTestId('expense-item').filter({ hasText: '¥8,888' });
			await item.getByTestId('expense-delete-button').first().click();
			await expect(page.getByTestId('expense-delete-dialog')).toBeVisible();
			// ConfirmDialog のキャンセルボタンは testid を受け取れないため、ダイアログの testid でスコープしてロールで取得
			await page
				.getByTestId('expense-delete-dialog')
				.getByRole('button', { name: 'キャンセル' })
				.click();
			await expect(item.first()).toBeVisible();
		} finally {
			await deleteExpense(page, expense.id);
		}
	});
});

test.describe('支出一覧 - チェック操作', () => {
	test('未承認支出をチェックすると確認済みステータスになる', async ({ page }) => {
		const expense = await createExpense(page, { amount: 7777 });
		try {
			await page.goto('/expenses');
			const item = page.getByTestId('expense-item').filter({ hasText: '¥7,777' });
			await expect(item.getByText('未承認').first()).toBeVisible();

			await item.getByTestId('expense-check-button').first().click();
			await expect(item.getByText('確認済み').first()).toBeVisible();
		} finally {
			await deleteExpense(page, expense.id);
		}
	});

	test('確認済み支出のチェックを外すと未承認ステータスに戻る', async ({ page }) => {
		const expense = await createExpense(page, { amount: 6666 });
		try {
			// まずチェック状態にする
			await page.request.post(`/expenses/${expense.id}/check`);
			await page.goto('/expenses');
			const item = page.getByTestId('expense-item').filter({ hasText: '¥6,666' });
			await expect(item.getByText('確認済み').first()).toBeVisible();

			await item.getByTestId('expense-check-button').first().click();
			await expect(item.getByText('未承認').first()).toBeVisible();
		} finally {
			await deleteExpense(page, expense.id);
		}
	});
});

test.describe('支出一覧 - モバイル', () => {
	test.use({ viewport: { width: 375, height: 812 } });

	test('モバイルで行メニューボタンをクリックするとメニューが開く', async ({ page }) => {
		const expense = await createExpense(page, { amount: 5555 });
		try {
			await page.goto('/expenses');
			const item = page.getByTestId('expense-item').filter({ hasText: '¥5,555' });
			await item.getByTestId('expense-menu-button').click();
			await expect(item.getByTestId('expense-menu')).toBeVisible();
			await expect(
				item.getByTestId('expense-menu').getByTestId('expense-edit-button')
			).toBeVisible();
			await expect(
				item.getByTestId('expense-menu').getByTestId('expense-delete-button')
			).toBeVisible();
		} finally {
			await deleteExpense(page, expense.id);
		}
	});

	test('モバイルでページ外をクリックするとメニューが閉じる', async ({ page }) => {
		const expense = await createExpense(page, { amount: 4444 });
		try {
			await page.goto('/expenses');
			const item = page.getByTestId('expense-item').filter({ hasText: '¥4,444' });
			await item.getByTestId('expense-menu-button').click();
			await expect(item.getByTestId('expense-menu')).toBeVisible();

			// ページ外クリックでメニューが閉じる
			await page.mouse.click(10, 10);
			await expect(item.getByTestId('expense-menu')).not.toBeVisible();
		} finally {
			await deleteExpense(page, expense.id);
		}
	});
});

test.describe('カテゴリ管理', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/expenses/categories');
	});

	test('カテゴリ管理ページが表示される', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'カテゴリ管理', exact: true })).toBeVisible();
		await expect(page.getByTestId('expense-category-name-input')).toBeVisible();
		await expect(page.getByTestId('expense-category-add-button')).toBeVisible();
	});

	test('シードカテゴリが一覧に表示される', async ({ page }) => {
		await expect(page.getByTestId('expense-category-list')).toBeVisible();
		await expect(page.getByText('食費')).toBeVisible();
		await expect(page.getByText('家賃')).toBeVisible();
	});

	test('新しいカテゴリを追加できる', async ({ page }) => {
		await page.getByTestId('expense-category-name-input').fill('E2Eテストカテゴリ');
		const createdRes = page.waitForResponse(
			(res) => res.url().endsWith('/expenses/categories') && res.request().method() === 'POST'
		);
		await page.getByTestId('expense-category-add-button').click();
		const created = (await (await createdRes).json()) as { id: string };
		try {
			await expect(page.getByText('E2Eテストカテゴリ')).toBeVisible();
		} finally {
			await page.request.delete(`/expenses/categories/${created.id}`);
		}
	});

	test('カテゴリ名が未入力で追加するとエラーが表示される', async ({ page }) => {
		await page.getByTestId('expense-category-add-button').click();
		await expect(page.getByTestId('expense-category-name-error')).toHaveText(
			'カテゴリ名は必須です'
		);
	});

	test('カテゴリを削除できる', async ({ page }) => {
		// 削除用カテゴリを追加
		await page.getByTestId('expense-category-name-input').fill('E2E削除カテゴリ');
		await page.getByTestId('expense-category-add-button').click();
		await expect(
			page.getByTestId('expense-category-list').getByText('E2E削除カテゴリ')
		).toBeVisible();

		const items = await page.getByTestId('expense-category-item').all();
		for (const item of items) {
			const text = await item.textContent();
			if (text?.includes('E2E削除カテゴリ')) {
				await item.getByTestId('expense-category-delete-button').click();
				break;
			}
		}
		await expect(page.getByTestId('expense-category-delete-dialog')).toBeVisible();
		await page.getByTestId('expense-category-delete-confirm-button').click();
		await expect(
			page.getByTestId('expense-category-list').getByText('E2E削除カテゴリ')
		).not.toBeVisible();
	});

	test('支出一覧への戻るリンクが機能する', async ({ page }) => {
		await page.getByRole('link', { name: '支出一覧に戻る' }).click();
		await expect(page).toHaveURL('/expenses');
	});
});

test.describe('支出一覧 - キーボード・モーダル操作', () => {
	/** フォーカス中の要素が開いている <dialog> の内側にあるか */
	const focusInsideDialog = (page: Page) =>
		page.evaluate(() => !!document.activeElement?.closest('dialog[open]'));

	/**
	 * 背景（ダイアログ外のページ要素）にフォーカスが移っていないか。
	 * ネイティブ modal は最後の要素の次にブラウザ UI（body）へ抜けるのが仕様のため、body は許容する。
	 */
	const focusNotOnBackground = (page: Page) =>
		page.evaluate(() => {
			const active = document.activeElement;
			return !active || active === document.body || !!active.closest('dialog[open]');
		});

	test('登録ダイアログを開くとフォーカスがダイアログ内に移り、Tab で背景に移らない', async ({
		page
	}) => {
		await page.goto('/expenses');
		await page.getByTestId('expense-create-button').click();
		await expect(page.getByTestId('expense-form')).toBeVisible();
		expect(await focusInsideDialog(page)).toBe(true);

		for (let i = 0; i < 10; i++) {
			await page.keyboard.press('Tab');
			expect(await focusNotOnBackground(page)).toBe(true);
		}
	});

	test('Escape で登録ダイアログが閉じ、開いたボタンにフォーカスが戻る', async ({ page }) => {
		await page.goto('/expenses');
		const createButton = page.getByTestId('expense-create-button');
		await createButton.click();
		await expect(page.getByTestId('expense-form')).toBeVisible();

		await page.keyboard.press('Escape');
		await expect(page.getByTestId('expense-form')).not.toBeVisible();
		await expect(createButton).toBeFocused();
	});

	test('登録ダイアログは背景クリックで閉じる', async ({ page }) => {
		await page.goto('/expenses');
		await page.getByTestId('expense-create-button').click();
		await expect(page.getByTestId('expense-form')).toBeVisible();

		await page.mouse.click(5, 5);
		await expect(page.getByTestId('expense-form')).not.toBeVisible();
	});

	test('削除確認ダイアログは背景クリックでは閉じず、Escape で閉じる', async ({ page }) => {
		const expense = await createExpense(page, { amount: 7777 });
		try {
			await page.goto('/expenses');
			const item = page.getByTestId('expense-item').filter({ hasText: '¥7,777' });
			await item.getByTestId('expense-delete-button').first().click();
			await expect(page.getByTestId('expense-delete-dialog')).toBeVisible();

			await page.mouse.click(5, 5);
			await expect(page.getByTestId('expense-delete-dialog')).toBeVisible();

			await page.keyboard.press('Escape');
			await expect(page.getByTestId('expense-delete-dialog')).not.toBeVisible();
			await expect(item).toHaveCount(1);
		} finally {
			await deleteExpense(page, expense.id);
		}
	});

	test('モバイルの行メニューは Escape で閉じる', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 812 });
		const expense = await createExpense(page, { amount: 6666 });
		try {
			await page.goto('/expenses');
			const item = page.getByTestId('expense-item').filter({ hasText: '¥6,666' });
			await item.getByTestId('expense-menu-button').click();
			await expect(item.getByTestId('expense-menu')).toBeVisible();

			await page.keyboard.press('Escape');
			await expect(item.getByTestId('expense-menu')).not.toBeVisible();
		} finally {
			await deleteExpense(page, expense.id);
		}
	});
});

test.describe('支出一覧 - 承認依頼', () => {
	test('確認済み支出の承認依頼を送ると申請中になり、取消すと確認済みに戻る', async ({ page }) => {
		const expense = await createExpense(page, { amount: 3333 });
		try {
			await page.request.post(`/expenses/${expense.id}/check`);

			// LINE 通知は waitUntil でレスポンス返却後に実行される（E2E は LINE_MOCK でスキップ）
			const requestRes = await page.request.post('/expenses/request');
			expect(requestRes.status()).toBe(200);

			await page.goto('/expenses');
			const item = page.getByTestId('expense-item').filter({ hasText: '¥3,333' });
			await expect(item.getByText('申請中').first()).toBeVisible();

			const cancelRes = await page.request.post('/expenses/cancel');
			expect(cancelRes.status()).toBe(200);
			await page.reload();
			await expect(item.getByText('確認済み').first()).toBeVisible();
		} finally {
			await page.request.post('/expenses/cancel');
			await deleteExpense(page, expense.id);
		}
	});
});
