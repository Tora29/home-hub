/**
 * @file API: 筋トレ記録 詳細
 * @module src/routes/workout/[id]/+server.ts
 * @feature workout
 *
 * @description
 * 筋トレ記録の削除エンドポイント。他ユーザーの記録は存在を隠蔽して 404 を返す。
 * role !== 'main' の呼び出しは hooks.server.ts が 403 を返す。
 *
 * @endpoints
 * - DELETE /workout/[id] → 204 - 記録削除
 *   @errors 403(FORBIDDEN), 404(NOT_FOUND)
 *
 * @service $lib/features/workout/server/service.ts
 */
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { handleApiError } from '$lib/server/api-helpers';
import { deleteRecord } from '$workout/server/service';

/**
 * 記録を削除する。
 * @calls deleteRecord
 * @throws {NOT_FOUND} - 該当データなし or 他ユーザーのもの
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
