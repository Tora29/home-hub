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
 * @service ../service.ts
 * @schema ../schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { parseJsonBody, validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
import { recipeUpdateSchema } from '$recipes/schema';
import { deleteRecipe, getRecipeById, updateRecipe } from '$recipes/server/service';
import { deleteR2ImageBestEffort } from '$recipes/server/r2';

/**
 * レシピを更新する。recipeUpdateSchema で入力値を検証後、service に委譲する。
 * imageUrl が R2 URL から変更された場合、旧ファイルを R2 から削除する。
 * @ac AC-004, AC-101, AC-102, AC-103, AC-104, AC-105, AC-106, AC-107, AC-108, AC-109, AC-110
 * @body recipeUpdateSchema
 * @throws NOT_FOUND - 該当レシピが存在しない場合
 * @throws VALIDATION_ERROR - 入力値が不正な場合
 */
export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
	const bodyResult = await parseJsonBody(request);
	if (!bodyResult.ok) return bodyResult.response;

	const result = recipeUpdateSchema.safeParse(bodyResult.data);
	if (!result.success) return validationErrorResponse(result.error.issues);

	try {
		const db = createDb(platform!.env.DB);
		const existing = await getRecipeById(db, locals.user!.id, params.id);
		const updated = await updateRecipe(db, locals.user!.id, params.id, result.data);

		// imageUrl が変更された場合、旧 r2ImageKey（信頼済み）で R2 オブジェクトを削除する
		// r2ImageKey はユーザー入力 URL ではなくアップロード時に DB へ保存した値を使用する
		if (existing.r2ImageKey && existing.imageUrl !== updated.imageUrl) {
			await deleteR2ImageBestEffort(platform!.env.RECIPE_IMAGES, existing.r2ImageKey, '旧画像');
		}

		return json(updated);
	} catch (e) {
		return handleApiError(e);
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
		if (r2ImageKey) {
			await deleteR2ImageBestEffort(platform!.env.RECIPE_IMAGES, r2ImageKey, '画像');
		}

		return new Response(null, { status: 204 });
	} catch (e) {
		return handleApiError(e);
	}
};
