/**
 * @file API: ダッシュボード集計サマリー
 * @module src/routes/dashboard/summary/+server.ts
 * @feature dashboard
 *
 * @description
 * 支出の集計サマリーを取得するエンドポイント。
 * period=month（デフォルト）で月別集計、period=all で全期間集計を返す。
 * 集計対象は unapproved・checked・pending・approved の全ステータスを含む。
 *
 * @spec specs/dashboard/spec.md
 * @acceptance AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007
 *
 * @endpoints
 * - GET /dashboard/summary → 200 DashboardSummary - 集計サマリー取得
 *   @query period:string=month(month|all) month:string
 *
 * @service ./service.ts
 * @schema ./schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
import { dashboardSummaryQuerySchema } from './schema';
import { getDashboardSummary } from './service';

/**
 * 集計サマリーを取得する。period=month のとき month で月を指定（省略時は当月）。
 * @ac AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007
 * @calls getDashboardSummary
 */
export const GET: RequestHandler = async ({ url, locals, platform }) => {
	const periodParam = url.searchParams.get('period') ?? undefined;
	// period=all の場合は month を無視する（不正な month 値でも 400 にしない）
	const queryResult = dashboardSummaryQuerySchema.safeParse({
		period: periodParam,
		month: periodParam === 'all' ? undefined : (url.searchParams.get('month') ?? undefined)
	});

	if (!queryResult.success) return validationErrorResponse(queryResult.error.issues);

	try {
		const db = createDb(platform!.env.DB);
		const summary = await getDashboardSummary(db, locals.user!.id, {
			period: queryResult.data.period,
			month: queryResult.data.month
		});
		return json(summary);
	} catch (e) {
		return handleApiError(e);
	}
};
