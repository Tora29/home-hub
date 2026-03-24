/**
 * @file API: レシピ
 * @module src/routes/recipes/+server.ts
 * @feature recipes
 *
 * @description
 * レシピ一覧取得・新規登録エンドポイント。
 *
 * @spec specs/recipes/spec.md
 * @acceptance AC-001, AC-002, AC-101, AC-102, AC-103, AC-104, AC-105, AC-106, AC-108, AC-109
 *
 * @endpoints
 * - GET /recipes → 200 DishList - 一覧取得（ページネーション・ソート）
 *   @query page:number=1 limit:number=20 sort:string=createdAt_desc
 *   @errors 400(VALIDATION_ERROR)
 * - POST /recipes → 201 Dish - 新規作成
 *   @body recipeCreateSchema
 *   @errors 400(VALIDATION_ERROR)
 *
 * @service ./service.ts
 * @schema ./schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AppError } from '$lib/server/errors';
import { createDb } from '$lib/server/db';
import { listRecipesQuerySchema, recipeCreateSchema } from './schema';
import { createRecipe, getRecipes } from './service';

/**
 * レシピ一覧を取得する。クエリパラメータでソート・ページネーションを制御する。
 * @ac AC-001, AC-008, AC-009, AC-010
 * @calls getRecipes
 */
export const GET: RequestHandler = async ({ url, locals, platform }) => {
	const rawQuery = Object.fromEntries(url.searchParams.entries());
	const queryResult = listRecipesQuerySchema.safeParse(rawQuery);
	if (!queryResult.success) {
		return json(
			{
				code: 'VALIDATION_ERROR',
				message: '入力値が正しくありません',
				fields: queryResult.error.issues.map((i) => ({
					field: i.path.join('.'),
					message: i.message
				}))
			},
			{ status: 400 }
		);
	}

	try {
		const db = createDb(platform!.env.DB);
		const result = await getRecipes(db, locals.user!.id, queryResult.data);
		return json(result);
	} catch (e) {
		if (e instanceof AppError) {
			return json({ code: e.code, message: e.message, fields: e.fields }, { status: e.status });
		}
		console.error(e);
		return json(
			{ code: 'INTERNAL_SERVER_ERROR', message: 'サーバーエラーが発生しました' },
			{ status: 500 }
		);
	}
};

/**
 * レシピを新規作成する。recipeCreateSchema で入力値を検証後、service に委譲する。
 * @ac AC-002, AC-101, AC-102, AC-103, AC-104, AC-105, AC-106, AC-108, AC-109
 * @body recipeCreateSchema
 * @throws VALIDATION_ERROR - 入力値が不正な場合
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const body = await request.json();
	const result = recipeCreateSchema.safeParse(body);
	if (!result.success) {
		return json(
			{
				code: 'VALIDATION_ERROR',
				message: '入力値が正しくありません',
				fields: result.error.issues.map((i) => ({
					field: i.path.join('.'),
					message: i.message
				}))
			},
			{ status: 400 }
		);
	}

	try {
		const db = createDb(platform!.env.DB);
		const created = await createRecipe(db, locals.user!.id, result.data);
		return json(created, { status: 201 });
	} catch (e) {
		if (e instanceof AppError) {
			return json({ code: e.code, message: e.message, fields: e.fields }, { status: e.status });
		}
		console.error(e);
		return json(
			{ code: 'INTERNAL_SERVER_ERROR', message: 'サーバーエラーが発生しました' },
			{ status: 500 }
		);
	}
};
