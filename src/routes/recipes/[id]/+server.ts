/**
 * @file API: レシピ（ID 指定）
 * @module src/routes/recipes/[id]/+server.ts
 * @feature recipes
 *
 * @description
 * レシピ更新・削除エンドポイント。
 *
 * @spec specs/recipes/spec.md
 * @acceptance AC-004, AC-005, AC-017, AC-101, AC-102, AC-103, AC-104, AC-105, AC-106, AC-107, AC-108, AC-109, AC-110
 *
 * @endpoints
 * - PUT /recipes/[id] → 200 Dish - 更新（imageUrl 変更時 R2 旧ファイル削除）
 *   @body recipeUpdateSchema
 *   @errors 400(VALIDATION_ERROR), 404(NOT_FOUND)
 * - DELETE /recipes/[id] → 204 - 削除（R2 画像も同時削除）
 *   @errors 404(NOT_FOUND)
 *
 * @service ../_lib/service.ts
 * @schema ../_lib/schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AppError } from '$lib/server/errors';
import { createDb } from '$lib/server/db';
import { recipeUpdateSchema } from '$recipes/_lib/schema';
import { deleteRecipe, getRecipeById, updateRecipe } from '$recipes/_lib/service';

/**
 * レシピを更新する。recipeUpdateSchema で入力値を検証後、service に委譲する。
 * imageUrl が R2 URL から変更された場合、旧ファイルを R2 から削除する。
 * @ac AC-004, AC-101, AC-102, AC-103, AC-104, AC-105, AC-106, AC-107, AC-108, AC-109, AC-110
 * @body recipeUpdateSchema
 * @throws NOT_FOUND - 該当レシピが存在しない場合
 * @throws VALIDATION_ERROR - 入力値が不正な場合
 */
export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json(
			{ code: 'VALIDATION_ERROR', message: 'リクエストボディが不正です', fields: [] },
			{ status: 400 }
		);
	}
	const result = recipeUpdateSchema.safeParse(body);
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
		const existing = await getRecipeById(db, locals.user!.id, params.id);
		const updated = await updateRecipe(db, locals.user!.id, params.id, result.data);

		// imageUrl が変更された場合、旧 r2ImageKey（信頼済み）で R2 オブジェクトを削除する
		// r2ImageKey はユーザー入力 URL ではなくアップロード時に DB へ保存した値を使用する
		// R2 削除失敗は DB 更新済みのため、ログだけ出して成功扱いにする
		if (existing.r2ImageKey && existing.imageUrl !== updated.imageUrl) {
			try {
				await platform!.env.RECIPE_IMAGES.delete(existing.r2ImageKey);
			} catch (r2Err) {
				console.error('R2 旧画像の削除に失敗しました（DB 更新は完了済み）', r2Err);
			}
		}

		return json(updated);
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
 * レシピを削除する。R2 に画像がある場合は同時に削除する。
 * @ac AC-005, AC-017, AC-107
 * @throws NOT_FOUND - 該当レシピが存在しない場合
 */
export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		const { r2ImageKey } = await deleteRecipe(db, locals.user!.id, params.id);

		// r2ImageKey（信頼済み）で R2 オブジェクトを削除する
		// R2 削除失敗は DB 削除済みのため、ログだけ出して成功扱いにする
		if (r2ImageKey) {
			try {
				await platform!.env.RECIPE_IMAGES.delete(r2ImageKey);
			} catch (r2Err) {
				console.error('R2 画像の削除に失敗しました（DB 削除は完了済み）', r2Err);
			}
		}

		return new Response(null, { status: 204 });
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
