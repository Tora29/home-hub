/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: レシピサービス
 * @module src/lib/features/recipes/server/service.integration.test.ts
 * @testType integration
 *
 * @target ./service.ts
 */
import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import { recipe } from '$lib/server/tables';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from '$lib/server/tables';
import { getRecipes, getRecipeById, createRecipe, updateRecipe, deleteRecipe } from './service';

type Db = DrizzleD1Database<typeof schema>;

async function insertRecipe(
	db: Db,
	userId: string,
	name: string = 'テストレシピ',
	overrides: Partial<typeof recipe.$inferInsert> = {}
): Promise<string> {
	const id = crypto.randomUUID();
	const now = new Date();
	await db.insert(recipe).values({
		id,
		userId,
		name,
		cookedCount: 0,
		createdAt: now,
		updatedAt: now,
		...overrides
	});
	return id;
}

describe('getRecipeById - 権限チェック', () => {
	test('他ユーザーのレシピは取得できない（NOT_FOUND）', async () => {
		const db = createDb(env.DB);
		const ownerUserId = crypto.randomUUID();
		const otherUserId = crypto.randomUUID();

		const recipeId = await insertRecipe(db, ownerUserId);

		await expect(getRecipeById(db, otherUserId, recipeId)).rejects.toMatchObject({
			code: 'NOT_FOUND'
		});
	});

	test('自分のレシピを取得できる', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();

		const recipeId = await insertRecipe(db, userId, 'カレー');
		const result = await getRecipeById(db, userId, recipeId);
		expect(result.name).toBe('カレー');
	});
});

describe('getRecipes - 権限チェック', () => {
	test('他ユーザーのレシピは含まれない', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();
		const otherUserId = crypto.randomUUID();

		await insertRecipe(db, userId, '自分のレシピ');
		await insertRecipe(db, otherUserId, '他人のレシピ');

		const result = await getRecipes(db, userId);
		expect(result.items).toHaveLength(1);
		expect(result.items[0].name).toBe('自分のレシピ');
		expect(result.total).toBe(1);
	});
});

describe('getRecipes - ページネーション', () => {
	test('page=2 で2ページ目のデータが取得される', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();

		for (let i = 1; i <= 5; i++) {
			await insertRecipe(db, userId, `レシピ${i}`);
		}

		const result = await getRecipes(db, userId, { page: 2, limit: 3 });
		expect(result.items).toHaveLength(2);
		expect(result.page).toBe(2);
		expect(result.total).toBe(5);
	});

	test('limit を超えた件数のデータがある場合、limit 件数のみ取得される', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();

		for (let i = 1; i <= 5; i++) {
			await insertRecipe(db, userId, `レシピ${i}`);
		}

		const result = await getRecipes(db, userId, { limit: 3 });
		expect(result.items).toHaveLength(3);
		expect(result.total).toBe(5);
	});
});

describe('getRecipes - ソート', () => {
	test('lastCookedAt_asc のとき NULL（未調理）が先に並ぶ', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();
		const now = new Date();

		await insertRecipe(db, userId, '調理済み', { lastCookedAt: now });
		await insertRecipe(db, userId, '未調理');

		const result = await getRecipes(db, userId, { sort: 'lastCookedAt_asc' });
		expect(result.items[0].name).toBe('未調理');
		expect(result.items[1].name).toBe('調理済み');
	});
});

describe('updateRecipe - 権限チェック', () => {
	test('他ユーザーのレシピは更新できない（NOT_FOUND）', async () => {
		const db = createDb(env.DB);
		const ownerUserId = crypto.randomUUID();
		const otherUserId = crypto.randomUUID();

		const recipeId = await insertRecipe(db, ownerUserId);

		await expect(
			updateRecipe(db, otherUserId, recipeId, { name: '更新名', cookedCount: 0 })
		).rejects.toMatchObject({ code: 'NOT_FOUND' });
	});
});

describe('deleteRecipe - 権限チェック', () => {
	test('他ユーザーのレシピは削除できない（NOT_FOUND）', async () => {
		const db = createDb(env.DB);
		const ownerUserId = crypto.randomUUID();
		const otherUserId = crypto.randomUUID();

		const recipeId = await insertRecipe(db, ownerUserId);

		await expect(deleteRecipe(db, otherUserId, recipeId)).rejects.toMatchObject({
			code: 'NOT_FOUND'
		});
	});

	test('自分のレシピを削除できる', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();

		const recipeId = await insertRecipe(db, userId);
		const result = await deleteRecipe(db, userId, recipeId);
		expect(result).toHaveProperty('r2ImageKey');
	});
});

describe('createRecipe', () => {
	test('レシピを作成できる', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();

		const created = await createRecipe(db, userId, { name: 'パスタ' });
		expect(created.name).toBe('パスタ');
		expect(created.userId).toBe(userId);
		expect(created.cookedCount).toBe(0);
	});

	test('ingredients と steps が正しく JSON で保存される', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();

		const created = await createRecipe(db, userId, {
			name: 'サラダ',
			ingredients: [{ name: 'レタス', amount: '1/2個' }],
			steps: ['洗う', '切る']
		});
		expect(created.ingredients).toEqual([{ name: 'レタス', amount: '1/2個' }]);
		expect(created.steps).toEqual(['洗う', '切る']);
	});
});
