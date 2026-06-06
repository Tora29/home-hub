/**
 * @file API: 週間ボリューム
 * @module src/routes/workout/(actions)/volume/+server.ts
 * @feature workout
 *
 * @description
 * 週間ボリューム（全種目合計の重量×回数）取得エンドポイント。
 *
 * @endpoints
 * - GET /workout/volume → 200 WeeklyVolumePoint[] - 週間ボリューム取得
 *   @query period:string='1m'(1m|1y|all) month:string?
 *   @errors 400(VALIDATION_ERROR)
 *
 * @service ../service.ts
 * @schema ../schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
import { volumeQuerySchema } from '$workout/schema';
import { getWeeklyVolume } from '$workout/server/service';

/**
 * 週間ボリュームを取得する。volumeQuerySchema でクエリを検証後、service に委譲する。
 * @throws VALIDATION_ERROR - クエリパラメータが不正な場合
 */
export const GET: RequestHandler = async ({ url, locals, platform }) => {
	const params = {
		period: url.searchParams.get('period') ?? '1m',
		...(url.searchParams.get('month') ? { month: url.searchParams.get('month') } : {})
	};

	const result = volumeQuerySchema.safeParse(params);
	if (!result.success) return validationErrorResponse(result.error.issues);

	try {
		const db = createDb(platform!.env.DB);
		const data = await getWeeklyVolume(db, locals.user!.id, result.data);
		return json(data);
	} catch (e) {
		return handleApiError(e);
	}
};
