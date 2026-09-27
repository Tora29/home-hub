/**
 * @file API: 週間ボリューム
 * @module src/routes/workout/(actions)/volume/+server.ts
 * @feature workout
 *
 * @description
 * 週間ボリューム（全種目合計の重量×回数、月曜始まり）取得エンドポイント。
 * weekStart クエリがある場合は指定週の種目別内訳を返す。
 * role !== 'main' の呼び出しは hooks.server.ts が 403 を返す。
 *
 * @endpoints
 * - GET /workout/volume → 200 WeeklyVolumePoint[] - 週間ボリューム取得
 *   @query period:string='1m'(1m|year|all) month:string?(YYYY-MM)
 *   @errors 400(VALIDATION_ERROR), 403(FORBIDDEN)
 * - GET /workout/volume?weekStart=YYYY-MM-DD → 200 WeeklyVolumeBreakdownItem[] - 指定週の種目別内訳取得
 *   @query weekStart:string(YYYY-MM-DD・月曜日)
 *   @errors 400(VALIDATION_ERROR), 403(FORBIDDEN)
 *
 * @service $lib/features/workout/server/service.ts
 * @schema $lib/features/workout/schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
import { volumeBreakdownQuerySchema, volumeQuerySchema } from '$workout/schema';
import { getWeeklyVolume, getWeeklyVolumeBreakdown } from '$workout/server/service';

/**
 * 週間ボリュームを取得する。weekStart クエリがある場合は volumeBreakdownQuerySchema、
 * ない場合は volumeQuerySchema でクエリを検証後、service に委譲する。
 * @calls getWeeklyVolume, getWeeklyVolumeBreakdown
 * @throws {VALIDATION_ERROR} - クエリパラメータが不正な場合（weekStart が月曜日でない場合を含む）
 */
export const GET: RequestHandler = async ({ url, locals, platform }) => {
	if (url.searchParams.has('weekStart')) {
		const result = volumeBreakdownQuerySchema.safeParse({
			weekStart: url.searchParams.get('weekStart') ?? undefined
		});
		if (!result.success) return validationErrorResponse(result.error.issues);

		try {
			const db = createDb(platform!.env.DB);
			const data = await getWeeklyVolumeBreakdown(db, locals.user!.id, result.data.weekStart);
			return json(data);
		} catch (e) {
			return handleApiError(e);
		}
	}

	const result = volumeQuerySchema.safeParse({
		period: url.searchParams.get('period') ?? undefined,
		month: url.searchParams.get('month') ?? undefined
	});
	if (!result.success) return validationErrorResponse(result.error.issues);

	try {
		const db = createDb(platform!.env.DB);
		const data = await getWeeklyVolume(db, locals.user!.id, result.data);
		return json(data);
	} catch (e) {
		return handleApiError(e);
	}
};
