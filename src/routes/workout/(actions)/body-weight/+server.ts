/**
 * @file API: 体重記録
 * @module src/routes/workout/(actions)/body-weight/+server.ts
 * @feature workout
 *
 * @description
 * 体重記録の登録エンドポイント。同日の既存レコードは上書きする（upsert）。
 * role !== 'main' の呼び出しは hooks.server.ts が 403 を返す。
 *
 * @endpoints
 * - POST /workout/body-weight → 200 { id, date, weight } - 体重登録（同日上書き）
 *   @body bodyWeightCreateSchema
 *   @errors 400(VALIDATION_ERROR), 403(FORBIDDEN)
 *
 * @service $lib/features/workout/server/service.ts
 * @schema $lib/features/workout/schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { parseJsonBody, validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
import { bodyWeightCreateSchema } from '$workout/schema';
import { upsertBodyWeight } from '$workout/server/service';

/**
 * 体重を登録する（同日既存レコードは上書き）。bodyWeightCreateSchema で入力値を検証後、service に委譲する。
 * @body bodyWeightCreateSchema
 * @calls upsertBodyWeight
 * @throws {VALIDATION_ERROR} - 入力値が不正な場合
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const bodyResult = await parseJsonBody(request);
	if (!bodyResult.ok) return bodyResult.response;

	const result = bodyWeightCreateSchema.safeParse(bodyResult.data);
	if (!result.success) return validationErrorResponse(result.error.issues);

	try {
		const db = createDb(platform!.env.DB);
		const data = await upsertBodyWeight(db, locals.user!.id, result.data);
		return json(data);
	} catch (e) {
		return handleApiError(e);
	}
};
