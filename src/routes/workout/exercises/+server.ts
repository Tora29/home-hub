/**
 * @file API: 筋トレ種目
 * @module src/routes/workout/exercises/+server.ts
 * @feature workout
 *
 * @description
 * 筋トレ種目の一覧取得・新規登録エンドポイント。
 * role !== 'main' の呼び出しは hooks.server.ts が 403 を返す。
 *
 * @endpoints
 * - GET /workout/exercises → 200 { items: ExerciseWithCategory[]; total; page; limit } - 種目一覧取得（全件）
 *   @errors 403(FORBIDDEN)
 * - POST /workout/exercises → 201 ExerciseWithCategory - 種目登録
 *   @body exerciseCreateSchema（name, categoryId: string | null）
 *   @errors 400(VALIDATION_ERROR), 403(FORBIDDEN), 404(NOT_FOUND)
 *
 * @service $lib/features/workout/exercises/server/service.ts
 * @schema $lib/features/workout/exercises/schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { parseJsonBody, validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
import { exerciseCreateSchema } from '$workout/exercises/schema';
import { createExercise, getExercises } from '$workout/exercises/server/service';

/**
 * 種目一覧を取得する（全件。マスタ系のため page=1 / limit=件数）。
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
 * @calls createExercise
 * @throws {VALIDATION_ERROR} - 入力値が不正な場合
 * @throws {NOT_FOUND} - categoryId に該当する自分のカテゴリが存在しない場合
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
