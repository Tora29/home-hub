/**
 * @file テスト: レシピ一覧画面
 * @module src/lib/features/recipes/components/RecipesPage.svelte.test.ts
 * @testType unit
 *
 * @target ./RecipesPage.svelte
 */
import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import { flushSync } from 'svelte';
import RecipesPage from './RecipesPage.svelte';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));

vi.mock('$app/state', () => ({
	page: { url: new URL('http://localhost/recipes') }
}));

function makeRecipe(overrides = {}) {
	return {
		id: crypto.randomUUID(),
		name: 'テストレシピ',
		description: null,
		imageUrl: null,
		difficulty: null,
		cookedCount: 0,
		lastCookedAt: null,
		rating: null,
		createdAt: new Date(),
		...overrides
	};
}

describe('RecipesPage', () => {
	test('レシピがない場合、空状態メッセージが表示される', async () => {
		render(RecipesPage, { items: [] });
		await expect.element(page.getByTestId('recipes-empty')).toBeVisible();
	});

	test('レシピがある場合、一覧が表示される', async () => {
		render(RecipesPage, { items: [makeRecipe()] });
		await expect.element(page.getByTestId('recipes-list')).toBeVisible();
		await expect.element(page.getByTestId('recipes-empty')).not.toBeInTheDocument();
	});

	test('レシピ登録ボタンが表示される', async () => {
		render(RecipesPage, { items: [] });
		await expect.element(page.getByTestId('recipes-create-button')).toBeVisible();
	});

	test('AI 献立相談の入力エリアが表示される', async () => {
		render(RecipesPage, { items: [] });
		await expect.element(page.getByTestId('recipes-ask-input')).toBeVisible();
		await expect.element(page.getByTestId('recipes-ask-button')).toBeVisible();
	});

	test('ソートセレクトが表示される', async () => {
		render(RecipesPage, { items: [] });
		await expect.element(page.getByTestId('recipes-sort-select')).toBeVisible();
	});

	test('AI相談の質問が空のとき送信すると「質問を入力してください」エラーが表示される', async () => {
		render(RecipesPage, { items: [] });
		(page.getByTestId('recipes-ask-button').element() as HTMLElement).click();
		flushSync();
		await expect.element(page.getByText('質問を入力してください')).toBeVisible();
	});

	test('AI相談のエラーが表示されていない初期状態', async () => {
		render(RecipesPage, { items: [] });
		await expect.element(page.getByText('質問を入力してください')).not.toBeInTheDocument();
	});

	test('レシピ登録ボタンをクリックするとダイアログが表示される', async () => {
		render(RecipesPage, { items: [] });
		(page.getByTestId('recipes-create-button').element() as HTMLElement).click();
		flushSync();
		await expect.element(page.getByRole('dialog', { name: 'レシピ登録' })).toBeVisible();
	});
});
