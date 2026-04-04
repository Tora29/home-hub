/**
 * @file テスト: RecipeCard コンポーネント
 * @module src/routes/recipes/components/RecipeCard.svelte.test.ts
 * @testType unit
 *
 * @target ./RecipeCard.svelte
 * @spec specs/recipes/spec.md
 * @covers AC-001, AC-206
 */
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { describe, test, expect } from 'vitest';
import RecipeCard from './RecipeCard.svelte';

const minimalRecipe = {
	id: 'dish-1',
	userId: 'user-1',
	name: 'テストレシピ',
	cookedCount: 0,
	imageUrl: null,
	difficulty: null,
	rating: null,
	lastCookedAt: null,
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z'
};

describe('RecipeCard', () => {
	describe('imageUrl', () => {
		test('[SPEC: AC-001] imageUrl がない場合は外部画像 img 要素が表示されない（プレースホルダー表示）', async () => {
			render(RecipeCard, { recipe: { ...minimalRecipe, imageUrl: null } });
			const externalImages = document.querySelectorAll('img[src^="http"]');
			expect(externalImages).toHaveLength(0);
		});

		test('[SPEC: AC-001] imageUrl がある場合は img 要素が表示される', async () => {
			const imageUrl = 'https://example.com/image.jpg';
			render(RecipeCard, { recipe: { ...minimalRecipe, imageUrl } });
			const img = document.querySelector(`img[src="${imageUrl}"]`);
			expect(img).not.toBeNull();
		});
	});

	describe('cookedCount', () => {
		test('[SPEC: AC-206] cookedCount が 0 の場合「0 回」と表示される', async () => {
			render(RecipeCard, { recipe: { ...minimalRecipe, cookedCount: 0 } });
			await expect.element(page.getByText('0 回')).toBeVisible();
		});

		test('[SPEC: AC-206] cookedCount が 5 の場合「5 回」と表示される', async () => {
			render(RecipeCard, { recipe: { ...minimalRecipe, cookedCount: 5 } });
			await expect.element(page.getByText('5 回')).toBeVisible();
		});
	});
});
