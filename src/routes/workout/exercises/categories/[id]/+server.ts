/**
 * @file API: 筋トレ種目カテゴリ 詳細
 * @module src/routes/workout/exercises/categories/[id]/+server.ts
 * @feature workout
 *
 * @description
 * 筋トレ種目カテゴリの更新・削除エンドポイント。
 *
 * @endpoints
 * - PUT /workout/exercises/categories/[id] → 200 ExerciseCategory - カテゴリ更新
 *   @body exerciseCategoryUpdateSchema
 *   @errors 400(VALIDATION_ERROR), 404(NOT_FOUND)
 * - DELETE /workout/exercises/categories/[id] → 204 - カテゴリ削除
 *   @errors 404(NOT_FOUND)
 *
 * @service $workout/exercises/server/service.ts
 * @schema $workout/exercises/schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { parseJsonBody, validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
import { exerciseCategoryUpdateSchema } from '$workout/exercises/schema';
import { updateExerciseCategory, deleteExerciseCategory } from '$workout/exercises/server/service';

/**
 * カテゴリを更新する。exerciseCategoryUpdateSchema で入力値を検証後、service に委譲する。
 * @body exerciseCategoryUpdateSchema
 * @throws VALIDATION_ERROR - 入力値が不正な場合
 * @throws NOT_FOUND - 該当カテゴリが存在しない場合
 */
export const PUT: RequestHandler = async ({ request, params, locals, platform }) => {
	const bodyResult = await parseJsonBody(request);
	if (!bodyResult.ok) return bodyResult.response;

	const result = exerciseCategoryUpdateSchema.safeParse(bodyResult.data);
	if (!result.success) return validationErrorResponse(result.error.issues);

	try {
		const db = createDb(platform!.env.DB);
		const updated = await updateExerciseCategory(db, locals.user!.id, params.id, result.data);
		return json(updated);
	} catch (e) {
		return handleApiError(e);
	}
};

/**
 * カテゴリを削除する。紐付く種目の categoryId は DB FK (set null) で自動的に null になる。
 * @throws NOT_FOUND - 該当カテゴリが存在しない場合
 */
export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		await deleteExerciseCategory(db, locals.user!.id, params.id);
		return new Response(null, { status: 204 });
	} catch (e) {
		return handleApiError(e);
	}
};
