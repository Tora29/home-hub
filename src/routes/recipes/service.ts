/**
 * @file サービス: Recipe
 * @module src/routes/recipes/service.ts
 * @feature recipes
 *
 * @description
 * レシピ機能のビジネスロジックと DB 操作を担う。
 *
 * @spec specs/recipes/spec.md
 * @acceptance AC-001, AC-002, AC-003, AC-004, AC-005, AC-008, AC-009, AC-010, AC-107
 *
 * @entity Recipe
 *
 * @functions
 * - getRecipes      - 一覧取得（ページネーション・ソート付き）
 * - getAllRecipes   - 全件取得（AI 相談用）
 * - getRecipeById  - ID 指定取得
 * - createRecipe   - 新規作成
 * - updateRecipe   - 更新
 * - deleteRecipe   - 削除
 *
 * @test ./service.integration.test.ts
 */
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { AppError } from '$lib/server/errors';
import { recipe } from '$lib/server/tables';
import type * as schema from '$lib/server/tables';
import type { RecipeCreate, RecipeUpdate } from './schema';

type Db = DrizzleD1Database<typeof schema>;

type Ingredient = { name: string; amount?: string };

type Recipe = {
	id: string;
	userId: string;
	name: string;
	description: string | null;
	imageUrl: string | null;
	ingredients: Ingredient[] | null;
	steps: string[] | null;
	sourceUrl: string | null;
	servings: number | null;
	cookingTimeMinutes: number | null;
	cookedCount: number;
	lastCookedAt: Date | null;
	rating: string | null;
	difficulty: string | null;
	memo: string | null;
	createdAt: Date;
	updatedAt: Date;
};

function parseRow(row: typeof recipe.$inferSelect): Recipe {
	return {
		...row,
		ingredients: row.ingredients ? (JSON.parse(row.ingredients) as Ingredient[]) : null,
		steps: row.steps ? (JSON.parse(row.steps) as string[]) : null
	};
}

type ListOptions = {
	sort?: string;
	page?: number;
	limit?: number;
};

/**
 * レシピ一覧をページネーション・ソート付きで取得する。
 * @ac AC-001, AC-008, AC-009, AC-010
 */
export async function getRecipes(
	db: Db,
	userId: string,
	options: ListOptions = {}
): Promise<{ items: Recipe[]; total: number; page: number; limit: number }> {
	const page = options.page ?? 1;
	const limit = options.limit ?? 20;
	const sort = options.sort ?? 'createdAt_desc';
	const offset = (page - 1) * limit;

	const where = eq(recipe.userId, userId);

	const [{ total }] = await db
		.select({ total: sql<number>`count(*)` })
		.from(recipe)
		.where(where);

	let orderBy: Parameters<ReturnType<typeof db.select>['orderBy']>;
	switch (sort) {
		case 'lastCookedAt_asc':
			orderBy = [
				sql`CASE WHEN ${recipe.lastCookedAt} IS NULL THEN 0 ELSE 1 END`,
				asc(recipe.lastCookedAt)
			];
			break;
		case 'cookedCount_desc':
			orderBy = [desc(recipe.cookedCount)];
			break;
		case 'rating_desc':
			orderBy = [
				sql`CASE WHEN ${recipe.rating} = 'excellent' THEN 4 WHEN ${recipe.rating} = 'good' THEN 3 WHEN ${recipe.rating} = 'average' THEN 2 WHEN ${recipe.rating} = 'poor' THEN 1 ELSE 0 END DESC`
			];
			break;
		default: // createdAt_desc
			orderBy = [desc(recipe.createdAt), desc(sql`rowid`)];
	}

	const rows = await db
		.select()
		.from(recipe)
		.where(where)
		// @ts-expect-error spread of dynamic orderBy tuple
		.orderBy(...orderBy)
		.limit(limit)
		.offset(offset);

	return {
		items: rows.map(parseRow),
		total: Number(total),
		page,
		limit
	};
}

/**
 * 全レシピを取得する（AI 相談用。最大 100 件）。
 * @ac AC-006
 */
export async function getAllRecipes(db: Db, userId: string): Promise<Recipe[]> {
	const rows = await db
		.select()
		.from(recipe)
		.where(eq(recipe.userId, userId))
		.limit(100);
	return rows.map(parseRow);
}

/**
 * ID を指定してレシピを取得する。
 * @ac AC-003
 * @throws {NOT_FOUND} - 該当レシピが存在しない場合、または他ユーザーのレシピの場合
 */
export async function getRecipeById(db: Db, userId: string, id: string): Promise<Recipe> {
	const row = await db
		.select()
		.from(recipe)
		.where(and(eq(recipe.id, id), eq(recipe.userId, userId)))
		.get();
	if (!row) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');
	return parseRow(row);
}

/**
 * レシピを新規作成する。
 * @ac AC-002
 */
export async function createRecipe(
	db: Db,
	userId: string,
	data: RecipeCreate
): Promise<Recipe> {
	const id = crypto.randomUUID();
	const now = new Date();

	const [row] = await db
		.insert(recipe)
		.values({
			id,
			userId,
			name: data.name,
			description: data.description ?? null,
			imageUrl: data.imageUrl ?? null,
			ingredients: data.ingredients ? JSON.stringify(data.ingredients) : null,
			steps: data.steps ? JSON.stringify(data.steps) : null,
			sourceUrl: data.sourceUrl ?? null,
			servings: data.servings ?? null,
			cookingTimeMinutes: data.cookingTimeMinutes ?? null,
			cookedCount: 0,
			lastCookedAt: null,
			rating: data.rating ?? null,
			difficulty: data.difficulty ?? null,
			memo: data.memo ?? null,
			createdAt: now,
			updatedAt: now
		})
		.returning();

	return parseRow(row);
}

/**
 * レシピを更新する。undefined フィールドは既存値を保持し、null フィールドはクリアする。
 * @ac AC-004
 * @throws {NOT_FOUND} - 該当レシピが存在しない場合、または他ユーザーのレシピの場合
 */
export async function updateRecipe(
	db: Db,
	userId: string,
	id: string,
	data: RecipeUpdate
): Promise<Recipe> {
	const existing = await db
		.select()
		.from(recipe)
		.where(and(eq(recipe.id, id), eq(recipe.userId, userId)))
		.get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');

	const now = new Date();

	const [row] = await db
		.update(recipe)
		.set({
			name: data.name,
			cookedCount: data.cookedCount,
			description: data.description !== undefined ? data.description : existing.description,
			imageUrl: data.imageUrl !== undefined ? data.imageUrl : existing.imageUrl,
			ingredients:
				data.ingredients !== undefined
					? data.ingredients
						? JSON.stringify(data.ingredients)
						: null
					: existing.ingredients,
			steps:
				data.steps !== undefined
					? data.steps
						? JSON.stringify(data.steps)
						: null
					: existing.steps,
			sourceUrl: data.sourceUrl !== undefined ? data.sourceUrl : existing.sourceUrl,
			servings: data.servings !== undefined ? data.servings : existing.servings,
			cookingTimeMinutes:
				data.cookingTimeMinutes !== undefined
					? data.cookingTimeMinutes
					: existing.cookingTimeMinutes,
			lastCookedAt:
				data.lastCookedAt !== undefined
					? data.lastCookedAt
						? new Date(data.lastCookedAt)
						: null
					: existing.lastCookedAt,
			rating: data.rating !== undefined ? data.rating : existing.rating,
			difficulty: data.difficulty !== undefined ? data.difficulty : existing.difficulty,
			memo: data.memo !== undefined ? data.memo : existing.memo,
			updatedAt: now
		})
		.where(and(eq(recipe.id, id), eq(recipe.userId, userId)))
		.returning();

	return parseRow(row);
}

/**
 * レシピを削除する。
 * @ac AC-005
 * @throws {NOT_FOUND} - 該当レシピが存在しない場合、または他ユーザーのレシピの場合
 */
export async function deleteRecipe(db: Db, userId: string, id: string): Promise<void> {
	const existing = await db
		.select()
		.from(recipe)
		.where(and(eq(recipe.id, id), eq(recipe.userId, userId)))
		.get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');

	await db.delete(recipe).where(and(eq(recipe.id, id), eq(recipe.userId, userId)));
}
