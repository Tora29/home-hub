/**
 * @file API: 筋トレ記録 詳細
 * @module src/routes/workout/[id]/+server.ts
 * @feature workout
 *
 * @description
 * 筋トレ記録の削除エンドポイント。
 *
 * @endpoints
 * - DELETE /workout/[id] → 204 - 記録削除
 *   @errors 404(NOT_FOUND)
 *
 * @service ../service.ts
 */
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { handleApiError } from '$lib/server/api-helpers';
import { deleteRecord } from '$workout/service';

/**
 * 記録を削除する。
 * @throws NOT_FOUND - 該当データなし or 他ユーザーのもの
 */
export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		await deleteRecord(db, locals.user!.id, params.id);
		return new Response(null, { status: 204 });
	} catch (e) {
		return handleApiError(e);
	}
};
