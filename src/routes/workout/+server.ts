/**
 * @file API: 筋トレ記録
 * @module src/routes/workout/+server.ts
 * @feature workout
 *
 * @description
 * 筋トレ記録の新規登録エンドポイント。
 *
 * @endpoints
 * - POST /workout → 201 WorkoutRecord - 記録登録（1レコード = 1セット）
 *   @body recordCreateSchema
 *   @errors 400(VALIDATION_ERROR), 404(NOT_FOUND)
 *
 * @service ./service.ts
 * @schema ./schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { parseJsonBody, validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
import { recordCreateSchema } from '$workout/schema';
import { createRecord } from '$workout/service';

/**
 * 記録を新規作成する。recordCreateSchema で入力値を検証後、service に委譲する。
 * @body recordCreateSchema
 * @throws VALIDATION_ERROR - 入力値が不正な場合
 * @throws NOT_FOUND - 種目が存在しない場合
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const bodyResult = await parseJsonBody(request);
	if (!bodyResult.ok) return bodyResult.response;

	const result = recordCreateSchema.safeParse(bodyResult.data);
	if (!result.success) return validationErrorResponse(result.error.issues);

	try {
		const db = createDb(platform!.env.DB);
		const created = await createRecord(db, locals.user!.id, result.data);
		return json(created, { status: 201 });
	} catch (e) {
		return handleApiError(e);
	}
};
