/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: recipes サービス
 * @module src/routes/recipes/service.integration.test.ts
 * @testType integration
 *
 * @target ./service.ts
 * @spec specs/recipes/spec.md
 * @covers AC-001, AC-002, AC-003, AC-004, AC-005, AC-008, AC-009, AC-010, AC-107
 */

import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import { AppError } from '$lib/server/errors';
import { getRecipes, getRecipeById, createRecipe, updateRecipe, deleteRecipe } from './service';

function makeUserId() {
	return crypto.randomUUID();
}

describe('createRecipe', () => {
	test('[SPEC: AC-002] name のみで登録できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const created = await createRecipe(db, userId, { name: '唐揚げ' });

		expect(created.id).toBeDefined();
		expect(created.name).toBe('唐揚げ');
		expect(created.userId).toBe(userId);
		expect(created.cookedCount).toBe(0);
		expect(created.createdAt).toBeDefined();
		expect(created.updatedAt).toBeDefined();
	});

	test('[SPEC: AC-002] 全フィールドを指定して登録できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const created = await createRecipe(db, userId, {
			name: 'カレー',
			description: 'スパイシーなカレー',
			imageUrl: 'https://example.com/curry.jpg',
			sourceUrl: 'https://example.com/recipe',
			servings: 4,
			cookingTimeMinutes: 60,
			rating: 'excellent',
			difficulty: 'medium',
			ingredients: [{ name: 'カレールー', amount: '1箱' }],
			steps: ['野菜を切る', '炒める', '煮る'],
			memo: '辛さ控えめにした'
		});

		expect(created.name).toBe('カレー');
		expect(created.description).toBe('スパイシーなカレー');
		expect(created.servings).toBe(4);
		expect(created.cookingTimeMinutes).toBe(60);
		expect(created.rating).toBe('excellent');
		expect(created.difficulty).toBe('medium');
	});
});

describe('getRecipes', () => {
	test('[SPEC: AC-001] 登録済みレシピを createdAt_desc（デフォルト）で取得できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		await createRecipe(db, userId, { name: '最初のレシピ' });
		await createRecipe(db, userId, { name: '2番目のレシピ' });
		await createRecipe(db, userId, { name: '3番目のレシピ' });

		const result = await getRecipes(db, userId, { sort: 'createdAt_desc' });

		expect(result.items).toHaveLength(3);
		expect(result.total).toBe(3);
		expect(result.page).toBe(1);
		expect(result.limit).toBe(20);
		expect(result.items[0].name).toBe('3番目のレシピ');
		expect(result.items[2].name).toBe('最初のレシピ');
	});

	test('[SPEC: AC-001] 自分のレシピのみ取得できる（他ユーザーのレシピは含まれない）', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const otherUserId = makeUserId();

		await createRecipe(db, userId, { name: '自分のレシピ' });
		await createRecipe(db, otherUserId, { name: '他人のレシピ' });

		const result = await getRecipes(db, userId, {});

		expect(result.items).toHaveLength(1);
		expect(result.items[0].name).toBe('自分のレシピ');
	});

	test('[SPEC: AC-008] sort=lastCookedAt_asc の場合、lastCookedAt が NULL のレシピが先頭になる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		await createRecipe(db, userId, { name: 'NULL のレシピ' });
		await updateRecipe(db, userId, (await createRecipe(db, userId, { name: '古いレシピ' })).id, {
			name: '古いレシピ',
			cookedCount: 1,
			lastCookedAt: '2024-01-01T00:00:00Z'
		});
		await updateRecipe(db, userId, (await createRecipe(db, userId, { name: '新しいレシピ' })).id, {
			name: '新しいレシピ',
			cookedCount: 1,
			lastCookedAt: '2024-06-01T00:00:00Z'
		});

		const result = await getRecipes(db, userId, { sort: 'lastCookedAt_asc' });

		expect(result.items).toHaveLength(3);
		expect(result.items[0].name).toBe('NULL のレシピ');
		expect(result.items[1].name).toBe('古いレシピ');
		expect(result.items[2].name).toBe('新しいレシピ');
	});

	test('[SPEC: AC-009] sort=cookedCount_desc の場合、作った回数が多い順になる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const r1 = await createRecipe(db, userId, { name: '1回のレシピ' });
		await updateRecipe(db, userId, r1.id, { name: '1回のレシピ', cookedCount: 1 });

		const r2 = await createRecipe(db, userId, { name: '5回のレシピ' });
		await updateRecipe(db, userId, r2.id, { name: '5回のレシピ', cookedCount: 5 });

		const r3 = await createRecipe(db, userId, { name: '3回のレシピ' });
		await updateRecipe(db, userId, r3.id, { name: '3回のレシピ', cookedCount: 3 });

		const result = await getRecipes(db, userId, { sort: 'cookedCount_desc' });

		expect(result.items).toHaveLength(3);
		expect(result.items[0].name).toBe('5回のレシピ');
		expect(result.items[1].name).toBe('3回のレシピ');
		expect(result.items[2].name).toBe('1回のレシピ');
	});

	test('[SPEC: AC-010] sort=rating_desc の場合、excellent→good→average→poor→未設定 の順になる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		await createRecipe(db, userId, { name: '未設定', rating: undefined });
		await createRecipe(db, userId, { name: 'average', rating: 'average' });
		await createRecipe(db, userId, { name: 'excellent', rating: 'excellent' });
		await createRecipe(db, userId, { name: 'poor', rating: 'poor' });
		await createRecipe(db, userId, { name: 'good', rating: 'good' });

		const result = await getRecipes(db, userId, { sort: 'rating_desc' });

		expect(result.items).toHaveLength(5);
		expect(result.items[0].name).toBe('excellent');
		expect(result.items[1].name).toBe('good');
		expect(result.items[2].name).toBe('average');
		expect(result.items[3].name).toBe('poor');
		expect(result.items[4].name).toBe('未設定');
	});

	test('[SPEC: AC-001] page と limit でページネーションできる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		for (let i = 1; i <= 5; i++) {
			await createRecipe(db, userId, { name: `レシピ${i}` });
		}

		const result = await getRecipes(db, userId, { page: 2, limit: 2 });

		expect(result.items).toHaveLength(2);
		expect(result.total).toBe(5);
		expect(result.page).toBe(2);
		expect(result.limit).toBe(2);
	});
});

describe('getRecipeById', () => {
	test('[SPEC: AC-003] ID を指定してレシピを取得できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const created = await createRecipe(db, userId, {
			name: '詳細テスト用レシピ',
			description: '詳細説明',
			ingredients: [{ name: '材料A', amount: '100g' }],
			steps: ['手順1', '手順2']
		});

		const recipe = await getRecipeById(db, userId, created.id);

		expect(recipe.id).toBe(created.id);
		expect(recipe.name).toBe('詳細テスト用レシピ');
		expect(recipe.description).toBe('詳細説明');
	});

	test('[SPEC: AC-107] 存在しない ID を指定した場合は NOT_FOUND エラーになる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		await expect(getRecipeById(db, userId, crypto.randomUUID())).rejects.toThrow(AppError);

		try {
			await getRecipeById(db, userId, crypto.randomUUID());
		} catch (e) {
			expect(e).toBeInstanceOf(AppError);
			expect((e as AppError).status).toBe(404);
			expect((e as AppError).code).toBe('NOT_FOUND');
		}
	});

	test('[SPEC: AC-107] 他ユーザーのレシピ ID を指定した場合は NOT_FOUND エラーになる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const otherUserId = makeUserId();

		const created = await createRecipe(db, otherUserId, { name: '他人のレシピ' });

		await expect(getRecipeById(db, userId, created.id)).rejects.toThrow(AppError);
	});
});

describe('updateRecipe', () => {
	test('[SPEC: AC-004] レシピを更新できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const created = await createRecipe(db, userId, { name: '更新前レシピ' });
		const updated = await updateRecipe(db, userId, created.id, {
			name: '更新後レシピ',
			description: '更新後の説明',
			cookedCount: 3,
			rating: 'good',
			difficulty: 'easy'
		});

		expect(updated.id).toBe(created.id);
		expect(updated.name).toBe('更新後レシピ');
		expect(updated.description).toBe('更新後の説明');
		expect(updated.cookedCount).toBe(3);
		expect(updated.rating).toBe('good');
		expect(updated.difficulty).toBe('easy');
	});

	test('[SPEC: AC-004] null を指定してフィールドをクリアできる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const created = await createRecipe(db, userId, {
			name: 'クリアテスト',
			description: 'クリアされる説明',
			rating: 'excellent'
		});
		const updated = await updateRecipe(db, userId, created.id, {
			name: 'クリアテスト',
			cookedCount: 0,
			description: null,
			rating: null
		});

		expect(updated.description).toBeNull();
		expect(updated.rating).toBeNull();
	});

	test('[SPEC: AC-107] 存在しない ID を指定した場合は NOT_FOUND エラーになる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		await expect(
			updateRecipe(db, userId, crypto.randomUUID(), { name: 'テスト', cookedCount: 0 })
		).rejects.toThrow(AppError);
	});

	test('[SPEC: AC-107] 他ユーザーのレシピを更新しようとした場合は NOT_FOUND エラーになる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const otherUserId = makeUserId();

		const created = await createRecipe(db, otherUserId, { name: '他人のレシピ' });

		await expect(
			updateRecipe(db, userId, created.id, { name: '更新', cookedCount: 0 })
		).rejects.toThrow(AppError);
	});
});

describe('deleteRecipe', () => {
	test('[SPEC: AC-005] レシピを削除できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const created = await createRecipe(db, userId, { name: '削除テスト用レシピ' });
		await deleteRecipe(db, userId, created.id);

		await expect(getRecipeById(db, userId, created.id)).rejects.toThrow(AppError);
	});

	test('[SPEC: AC-107] 存在しない ID を指定した場合は NOT_FOUND エラーになる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		await expect(deleteRecipe(db, userId, crypto.randomUUID())).rejects.toThrow(AppError);
	});

	test('[SPEC: AC-107] 他ユーザーのレシピを削除しようとした場合は NOT_FOUND エラーになる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const otherUserId = makeUserId();

		const created = await createRecipe(db, otherUserId, { name: '他人のレシピ' });

		await expect(deleteRecipe(db, userId, created.id)).rejects.toThrow(AppError);
	});
});
