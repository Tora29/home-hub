/**
 * @file テスト: RecipeForm コンポーネント
 * @module src/routes/recipes/components/RecipeForm.svelte.test.ts
 * @testType unit
 *
 * @target ./RecipeForm.svelte
 * @spec specs/recipes/spec.md
 * @covers AC-007, AC-013
 */
import { afterEach, describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import RecipeForm from './RecipeForm.svelte';

afterEach(() => {
	vi.unstubAllGlobals();
});

/** edit モードで使用するテスト用レシピデータ */
const testRecipe = {
	id: 'test-recipe-id',
	name: 'テストレシピ',
	description: null,
	imageUrl: null,
	ingredients: null,
	steps: null,
	sourceUrl: null,
	servings: null,
	cookingTimeMinutes: null,
	cookedCount: 0,
	lastCookedAt: null,
	rating: null,
	difficulty: null,
	memo: null
};

// edit モードで mount：手動入力タブのみ表示されるため、タブ切り替え不要
function renderEditForm() {
	return render(RecipeForm, {
		mode: 'edit',
		recipe: testRecipe,
		onSuccess: vi.fn(),
		onCancel: vi.fn()
	});
}

describe('RecipeForm - 材料行の動的追加・削除', () => {
	it('[SPEC: AC-007] 材料の「追加」ボタンをクリックすると入力行が 1 つ増える', async () => {
		renderEditForm();

		expect((await page.getByTestId('recipes-ingredient-item').elements()).length).toBe(0);

		await page.getByTestId('recipes-ingredient-add-button').click();

		expect((await page.getByTestId('recipes-ingredient-item').elements()).length).toBe(1);
	});

	it('[SPEC: AC-007] 材料の「追加」ボタンを複数回クリックすると複数行が追加される', async () => {
		renderEditForm();

		await page.getByTestId('recipes-ingredient-add-button').click();
		await page.getByTestId('recipes-ingredient-add-button').click();
		await page.getByTestId('recipes-ingredient-add-button').click();

		expect((await page.getByTestId('recipes-ingredient-item').elements()).length).toBe(3);
	});

	it('[SPEC: AC-007] 材料の「削除」ボタンをクリックするとその行が除去される', async () => {
		renderEditForm();

		await page.getByTestId('recipes-ingredient-add-button').click();
		await page.getByTestId('recipes-ingredient-add-button').click();

		expect((await page.getByTestId('recipes-ingredient-item').elements()).length).toBe(2);

		await page.getByTestId('recipes-ingredient-remove-button').first().click();

		expect((await page.getByTestId('recipes-ingredient-item').elements()).length).toBe(1);
	});
});

describe('RecipeForm - 手順行の動的追加・削除', () => {
	it('[SPEC: AC-007] 手順の「追加」ボタンをクリックすると入力行が 1 つ増える', async () => {
		renderEditForm();

		expect((await page.getByTestId('recipes-step-item').elements()).length).toBe(0);

		await page.getByTestId('recipes-step-add-button').click();

		expect((await page.getByTestId('recipes-step-item').elements()).length).toBe(1);
	});

	it('[SPEC: AC-007] 手順の「追加」ボタンを複数回クリックすると複数行が追加される', async () => {
		renderEditForm();

		await page.getByTestId('recipes-step-add-button').click();
		await page.getByTestId('recipes-step-add-button').click();
		await page.getByTestId('recipes-step-add-button').click();

		expect((await page.getByTestId('recipes-step-item').elements()).length).toBe(3);
	});

	it('[SPEC: AC-007] 手順の「削除」ボタンをクリックするとその行が除去される', async () => {
		renderEditForm();

		await page.getByTestId('recipes-step-add-button').click();
		await page.getByTestId('recipes-step-add-button').click();

		expect((await page.getByTestId('recipes-step-item').elements()).length).toBe(2);

		await page.getByTestId('recipes-step-remove-button').first().click();

		expect((await page.getByTestId('recipes-step-item').elements()).length).toBe(1);
	});
});

describe('RecipeForm - AI解析タブの sourceUrl 引き継ぎ', () => {
	it('[SPEC: AC-013] AI 解析タブで sourceUrl を入力して解析すると、手動入力タブの sourceUrl フィールドに引き継がれる', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					name: 'テストレシピ',
					description: null,
					servings: null,
					cookingTimeMinutes: null,
					ingredients: null,
					steps: null
				})
			})
		);

		render(RecipeForm, {
			mode: 'create',
			onSuccess: vi.fn(),
			onCancel: vi.fn()
		});

		// AI解析タブ（create モードのデフォルト）で sourceUrl を入力
		await expect.element(page.getByTestId('recipes-source-url-input')).toBeVisible();
		await page.getByTestId('recipes-source-url-input').fill('https://example.com/recipe');

		// テキストを入力して解析ボタンをクリック
		await page.getByTestId('recipes-extract-input').fill('カレーの作り方。材料：カレールー');
		await page.getByTestId('recipes-extract-button').click();

		// 手動入力タブに切り替わり、sourceUrl が引き継がれていることを確認
		await expect.element(page.getByTestId('recipes-form')).toBeVisible();
		await expect
			.element(page.getByTestId('recipes-source-url-input'))
			.toHaveValue('https://example.com/recipe');
	});
});
