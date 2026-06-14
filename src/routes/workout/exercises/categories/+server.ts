/**
 * @file API: 筋トレ種目カテゴリ
 * @module src/routes/workout/exercises/categories/+server.ts
 * @feature workout
 *
 * @description
 * 筋トレ種目カテゴリの一覧取得・新規登録エンドポイント。
 *
 * @endpoints
 * - GET /workout/exercises/categories → 200 ExerciseCategory[] - カテゴリ一覧取得
 * - POST /workout/exercises/categories → 201 ExerciseCategory - カテゴリ登録
 *   @body exerciseCategoryCreateSchema
 *   @errors 400(VALIDATION_ERROR)
 *
 * @service $workout/exercises/server/service.ts
 * @schema $workout/exercises/schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { parseJsonBody, validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
import { exerciseCategoryCreateSchema } from '$workout/exercises/schema';
import { getExerciseCategories, createExerciseCategory } from '$workout/exercises/server/service';

/**
 * カテゴリ一覧を取得する（全件）。
 * @calls getExerciseCategories
 */
export const GET: RequestHandler = async ({ locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		const categories = await getExerciseCategories(db, locals.user!.id);
		return json(categories);
	} catch (e) {
		return handleApiError(e);
	}
};

/**
 * カテゴリを新規作成する。exerciseCategoryCreateSchema で入力値を検証後、service に委譲する。
 * @body exerciseCategoryCreateSchema
 * @throws VALIDATION_ERROR - 入力値が不正な場合
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const bodyResult = await parseJsonBody(request);
	if (!bodyResult.ok) return bodyResult.response;

	const result = exerciseCategoryCreateSchema.safeParse(bodyResult.data);
	if (!result.success) return validationErrorResponse(result.error.issues);

	try {
		const db = createDb(platform!.env.DB);
		const created = await createExerciseCategory(db, locals.user!.id, result.data);
		return json(created, { status: 201 });
	} catch (e) {
		return handleApiError(e);
	}
};
