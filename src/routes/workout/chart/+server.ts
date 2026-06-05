/**
 * @file API: グラフデータ
 * @module src/routes/workout/chart/+server.ts
 * @feature workout
 *
 * @description
 * 種目別重量推移チャートデータ取得エンドポイント。体重データも含む。
 *
 * @endpoints
 * - GET /workout/chart → 200 ChartData - チャートデータ取得
 *   @query exerciseId:string period:string='1m'(1m|1y|all) month:string?
 *   @errors 400(VALIDATION_ERROR), 404(NOT_FOUND)
 *
 * @service ../service.ts
 * @schema ../schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
import { chartQuerySchema } from '$workout/schema';
import { getChartData } from '$workout/service';

/**
 * 種目別チャートデータを取得する。chartQuerySchema でクエリを検証後、service に委譲する。
 * @throws VALIDATION_ERROR - クエリパラメータが不正な場合
 * @throws NOT_FOUND - 種目が存在しない場合
 */
export const GET: RequestHandler = async ({ url, locals, platform }) => {
	const params = {
		exerciseId: url.searchParams.get('exerciseId') ?? '',
		period: url.searchParams.get('period') ?? '1m',
		...(url.searchParams.get('month') ? { month: url.searchParams.get('month') } : {})
	};

	const result = chartQuerySchema.safeParse(params);
	if (!result.success) return validationErrorResponse(result.error.issues);

	try {
		const db = createDb(platform!.env.DB);
		const data = await getChartData(db, locals.user!.id, result.data);
		return json(data);
	} catch (e) {
		return handleApiError(e);
	}
};
