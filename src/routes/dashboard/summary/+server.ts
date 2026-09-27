/**
 * @file API: ダッシュボード集計サマリー
 * @module src/routes/dashboard/summary/+server.ts
 * @feature dashboard
 *
 * @description
 * 支出の集計サマリーを JSON で取得するエンドポイント。
 * period=month（デフォルト）で月別集計、period=all で全期間集計を返す。
 * 集計対象は未承認・確認済み・確定済みの全ステータスを含む。
 *
 * @endpoints
 * - GET /dashboard/summary → 200 DashboardSummary - 集計サマリー取得
 *   @query period:string=month(month|all) month:string
 *   @errors 400(VALIDATION_ERROR)
 *
 * @service $lib/features/dashboard/server/service.ts
 * @schema $lib/features/dashboard/schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
import { dashboardSummaryQuerySchema } from '$dashboard/schema';
import { getDashboardSummary } from '$dashboard/server/service';

/**
 * 集計サマリーを取得する。dashboardSummaryQuerySchema でクエリを検証後、service に委譲する。
 * period=month のとき month で月を指定（省略時は当月）。period=all のとき month は無視する。
 * @query dashboardSummaryQuerySchema
 * @throws VALIDATION_ERROR - period / month が不正
 * @calls getDashboardSummary
 */
export const GET: RequestHandler = async ({ url, platform }) => {
	const periodParam = url.searchParams.get('period') ?? undefined;
	// period=all の場合は month を無視する（不正な month 値でも 400 にしない）
	const queryResult = dashboardSummaryQuerySchema.safeParse({
		period: periodParam,
		month: periodParam === 'all' ? undefined : (url.searchParams.get('month') ?? undefined)
	});

	if (!queryResult.success) return validationErrorResponse(queryResult.error.issues);

	try {
		const db = createDb(platform!.env.DB);
		const summary = await getDashboardSummary(db, {
			period: queryResult.data.period,
			month: queryResult.data.month
		});
		return json(summary);
	} catch (e) {
		return handleApiError(e);
	}
};
