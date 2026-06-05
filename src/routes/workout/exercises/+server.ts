/**
 * @file API: 筋トレ種目
 * @module src/routes/workout/exercises/+server.ts
 * @feature workout
 *
 * @description
 * 筋トレ種目の一覧取得・新規登録エンドポイント。
 *
 * @endpoints
 * - GET /workout/exercises → 200 { items: Exercise[]; total: number; page: number; limit: number } - 種目一覧取得
 * - POST /workout/exercises → 201 Exercise - 種目登録
 *   @body exerciseCreateSchema
 *   @errors 400(VALIDATION_ERROR)
 *
 * @service ./service.ts
 * @schema ./schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { parseJsonBody, validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
import { exerciseCreateSchema } from '$workout/exercises/schema';
import { createExercise, getExercises } from '$workout/exercises/service';

/**
 * 種目一覧を取得する（全件）。
 * @calls getExercises
 */
export const GET: RequestHandler = async ({ locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		const result = await getExercises(db, locals.user!.id);
		return json(result);
	} catch (e) {
		return handleApiError(e);
	}
};

/**
 * 種目を新規作成する。exerciseCreateSchema で入力値を検証後、service に委譲する。
 * @body exerciseCreateSchema
 * @throws VALIDATION_ERROR - 入力値が不正な場合
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const bodyResult = await parseJsonBody(request);
	if (!bodyResult.ok) return bodyResult.response;

	const result = exerciseCreateSchema.safeParse(bodyResult.data);
	if (!result.success) return validationErrorResponse(result.error.issues);

	try {
		const db = createDb(platform!.env.DB);
		const created = await createExercise(db, locals.user!.id, result.data);
		return json(created, { status: 201 });
	} catch (e) {
		return handleApiError(e);
	}
};
