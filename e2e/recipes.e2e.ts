/**
 * @file E2Eテスト: レシピ
 * @module e2e/recipes.e2e.ts
 * @testType e2e
 *
 * @scenarios
 * - 初期表示: レシピ一覧ページが表示される
 * - 一覧: シードデータのレシピが表示される
 * - ソート: ソートセレクトで URL パラメータが変わる
 * - 登録: 手動入力タブでレシピを登録できる
 * - バリデーション: レシピ名未入力でエラーが表示される
 * - 詳細: カードクリックで詳細ページへ遷移できる
 * - 削除: 確認ダイアログからレシピを削除できる
 * - AI相談: 質問未入力でエラーが表示される
 *
 * @pages
 * - /recipes - レシピ一覧
 * - /recipes/[id] - レシピ詳細
 */
import { test, expect, type Page } from '@playwright/test';

async function createRecipe(
	page: Page,
	data: { name: string; [key: string]: unknown }
): Promise<{ id: string }> {
	const res = await page.request.post('/recipes', {
		data,
		headers: { 'Content-Type': 'application/json' }
	});
	expect(res.ok()).toBeTruthy();
	return res.json();
}

async function deleteRecipe(page: Page, id: string): Promise<void> {
	await page.request.delete(`/recipes/${id}`);
}

test.describe('レシピ一覧 - 初期表示', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/recipes');
	});

	test('ページ見出しと主要要素が表示される', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'レシピ' })).toBeVisible();
		await expect(page.getByTestId('recipes-create-button')).toBeVisible();
		await expect(page.getByTestId('recipes-sort-select')).toBeVisible();
		await expect(page.getByRole('heading', { name: 'AI 献立相談' })).toBeVisible();
	});

	test('シードデータのレシピ一覧が表示される', async ({ page }) => {
		await expect(page.getByTestId('recipes-list')).toBeVisible();
		await expect(page.getByTestId('recipes-item').first()).toBeVisible();
	});

	test('シードレシピ「肉じゃが」が一覧に表示される', async ({ page }) => {
		await expect(page.getByText('肉じゃが')).toBeVisible();
	});
});

test.describe('レシピ一覧 - ソート', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/recipes');
	});

	test('ソートを「よく作る順」に変更すると URL パラメータが更新される', async ({ page }) => {
		await page.getByTestId('recipes-sort-select').selectOption('cookedCount_desc');
		await expect(page).toHaveURL(/sort=cookedCount_desc/);
	});

	test('ソートを「しばらく作ってない順」に変更すると URL パラメータが更新される', async ({
		page
	}) => {
		await page.getByTestId('recipes-sort-select').selectOption('lastCookedAt_asc');
		await expect(page).toHaveURL(/sort=lastCookedAt_asc/);
	});
});

test.describe('レシピ一覧 - 登録', () => {
	test('登録ボタンをクリックするとダイアログが開く', async ({ page }) => {
		await page.goto('/recipes');
		await page.getByTestId('recipes-create-button').click();
		await expect(page.getByRole('dialog', { name: 'レシピ登録' })).toBeVisible();
	});

	test('手動入力タブでレシピを登録できる', async ({ page }) => {
		await page.goto('/recipes');
		await page.getByTestId('recipes-create-button').click();
		await page.getByRole('button', { name: '手動入力' }).click();
		await page.getByTestId('recipes-name-input').fill('E2Eテスト料理');
		await page.getByTestId('recipes-submit-button').click();
		await expect(page.getByText('E2Eテスト料理')).toBeVisible();

		// クリーンアップ: 登録されたレシピを API 経由で削除
		const items = await page.getByTestId('recipes-item').all();
		let testRecipeId: string | null = null;
		for (const item of items) {
			const href = await item.getAttribute('href');
			if (href) {
				const id = href.split('/recipes/')[1];
				const res = await page.request.get(`/recipes/${id}`);
				if (res.ok()) {
					const data = await res.json();
					if (data.name === 'E2Eテスト料理') {
						testRecipeId = id;
						break;
					}
				}
			}
		}
		if (testRecipeId) await deleteRecipe(page, testRecipeId);
	});

	test('レシピ名が未入力でフォーム送信するとバリデーションエラーが表示される', async ({ page }) => {
		await page.goto('/recipes');
		await page.getByTestId('recipes-create-button').click();
		await page.getByRole('button', { name: '手動入力' }).click();
		await page.getByTestId('recipes-submit-button').click();
		await expect(page.getByTestId('recipes-name-error')).toHaveText('レシピ名は必須です');
	});
});

test.describe('レシピ詳細 - 表示', () => {
	test('一覧のカードをクリックすると詳細ページへ遷移する', async ({ page }) => {
		await page.goto('/recipes');
		await page.getByTestId('recipes-item').first().click();
		await page.waitForURL(/\/recipes\/.+/);
		await expect(page.getByRole('link', { name: '一覧に戻る' })).toBeVisible();
	});

	test('詳細ページでレシピ名と操作ボタンが表示される', async ({ page }) => {
		const recipe = await createRecipe(page, { name: 'E2E詳細確認料理' });
		try {
			await page.goto(`/recipes/${recipe.id}`);
			await expect(page.getByRole('heading', { name: 'E2E詳細確認料理', level: 1 })).toBeVisible();
			await expect(page.getByRole('button', { name: '編集' })).toBeVisible();
			await expect(page.getByTestId('recipes-delete-button')).toBeVisible();
		} finally {
			await deleteRecipe(page, recipe.id);
		}
	});
});

test.describe('レシピ詳細 - 削除', () => {
	test('削除確認ダイアログからレシピを削除すると一覧に戻り該当レシピが消える', async ({ page }) => {
		const recipe = await createRecipe(page, { name: 'E2E削除対象料理' });
		await page.goto(`/recipes/${recipe.id}`);
		await page.getByTestId('recipes-delete-button').click();
		await expect(page.getByTestId('recipes-delete-dialog')).toBeVisible();
		await page.getByTestId('recipes-delete-confirm-button').click();
		await page.waitForURL('/recipes');
		await expect(page.getByText('E2E削除対象料理')).not.toBeVisible();
	});

	test('削除ダイアログでキャンセルすると削除されない', async ({ page }) => {
		const recipe = await createRecipe(page, { name: 'E2Eキャンセルテスト料理' });
		try {
			await page.goto(`/recipes/${recipe.id}`);
			await page.getByTestId('recipes-delete-button').click();
			await expect(page.getByTestId('recipes-delete-dialog')).toBeVisible();
			await page.getByRole('button', { name: 'キャンセル' }).click();
			await expect(
				page.getByRole('heading', { name: 'E2Eキャンセルテスト料理', level: 1 })
			).toBeVisible();
		} finally {
			await deleteRecipe(page, recipe.id);
		}
	});
});

test.describe('レシピ一覧 - AI 献立相談', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/recipes');
	});

	test('質問を未入力のまま送信するとエラーメッセージが表示される', async ({ page }) => {
		await page.getByTestId('recipes-ask-button').click();
		await expect(page.getByText('質問を入力してください')).toBeVisible();
	});

	test('AI 相談入力欄にテキストを入力できる', async ({ page }) => {
		await page.getByTestId('recipes-ask-input').fill('今日は何を作ればいいですか？');
		await expect(page.getByTestId('recipes-ask-input')).toHaveValue('今日は何を作ればいいですか？');
	});
});
