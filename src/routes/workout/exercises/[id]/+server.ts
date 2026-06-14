/**
 * @file API: 筋トレ種目 詳細
 * @module src/routes/workout/exercises/[id]/+server.ts
 * @feature workout
 *
 * @description
 * 筋トレ種目の更新・削除エンドポイント。
 *
 * @endpoints
 * - PUT /workout/exercises/[id] → 200 Exercise - 種目更新
 *   @body exerciseUpdateSchema（name, categoryId?）
 *   @errors 400(VALIDATION_ERROR), 404(NOT_FOUND)
 * - DELETE /workout/exercises/[id] → 204 - 種目削除
 *   @errors 404(NOT_FOUND), 409(CONFLICT)
 *
 * @service ../service.ts
 * @schema ../schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { parseJsonBody, validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
import { exerciseUpdateSchema } from '$workout/exercises/schema';
import { deleteExercise, updateExercise } from '$workout/exercises/server/service';

/**
 * 種目を更新する。exerciseUpdateSchema で入力値を検証後、service に委譲する。
 * @body exerciseUpdateSchema
 * @throws VALIDATION_ERROR - 入力値が不正な場合
 * @throws NOT_FOUND - 該当種目が存在しない場合
 */
export const PUT: RequestHandler = async ({ request, params, locals, platform }) => {
	const bodyResult = await parseJsonBody(request);
	if (!bodyResult.ok) return bodyResult.response;

	const result = exerciseUpdateSchema.safeParse(bodyResult.data);
	if (!result.success) return validationErrorResponse(result.error.issues);

	try {
		const db = createDb(platform!.env.DB);
		const updated = await updateExercise(db, locals.user!.id, params.id, result.data);
		return json(updated);
	} catch (e) {
		return handleApiError(e);
	}
};

/**
 * 種目を削除する。紐付く記録がある場合は 409 を返す。
 * @throws NOT_FOUND - 該当種目が存在しない場合
 * @throws CONFLICT - 種目に紐付く記録が 1 件以上ある場合
 */
export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		await deleteExercise(db, locals.user!.id, params.id);
		return new Response(null, { status: 204 });
	} catch (e) {
		return handleApiError(e);
	}
};
