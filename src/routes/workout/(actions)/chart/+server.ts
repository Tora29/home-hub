/**
 * @file API: グラフデータ
 * @module src/routes/workout/(actions)/chart/+server.ts
 * @feature workout
 *
 * @description
 * 種目別重量推移チャートデータ（日別最大重量 + 同期間の体重）取得エンドポイント。
 * role !== 'main' の呼び出しは hooks.server.ts が 403 を返す。
 *
 * @endpoints
 * - GET /workout/chart → 200 ChartData - チャートデータ取得
 *   @query exerciseId:string period:string='1m'(1m|year|all) month:string?(YYYY-MM)
 *   @errors 400(VALIDATION_ERROR), 403(FORBIDDEN), 404(NOT_FOUND)
 *
 * @service $lib/features/workout/server/service.ts
 * @schema $lib/features/workout/schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
import { chartQuerySchema } from '$workout/schema';
import { getChartData } from '$workout/server/service';

/**
 * 種目別チャートデータを取得する。chartQuerySchema でクエリを検証後、service に委譲する。
 * @calls getChartData
 * @throws {VALIDATION_ERROR} - クエリパラメータが不正な場合
 * @throws {NOT_FOUND} - 自分の種目が存在しない場合
 */
export const GET: RequestHandler = async ({ url, locals, platform }) => {
	const result = chartQuerySchema.safeParse({
		exerciseId: url.searchParams.get('exerciseId') ?? undefined,
		period: url.searchParams.get('period') ?? undefined,
		month: url.searchParams.get('month') ?? undefined
	});
	if (!result.success) return validationErrorResponse(result.error.issues);

	try {
		const db = createDb(platform!.env.DB);
		const data = await getChartData(db, locals.user!.id, result.data);
		return json(data);
	} catch (e) {
		return handleApiError(e);
	}
};
