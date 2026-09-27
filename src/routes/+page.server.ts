/**
 * @file データ取得: ダッシュボード
 * @module src/routes/+page.server.ts
 * @feature dashboard
 *
 * @description
 * ダッシュボード画面の初期データをサーバーサイドで取得する。
 * URL クエリ（period / month）を dashboardSummaryQuerySchema で検証し、対象期間の集計サマリーと
 * 相手の承認依頼中（pending）支出件数を取得する。不正なクエリは既定値（当月の月別）にフォールバックする。
 */
import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { getUnapprovedCount } from '$expenses/server/workflow';
import { dashboardSummaryQuerySchema } from '$dashboard/schema';
import { getDashboardSummary } from '$dashboard/server/service';
import { getCurrentMonth } from '$lib/utils/date';

export const load: PageServerLoad = async ({ platform, locals, url }) => {
	const db = createDb(platform!.env.DB);
	const currentMonth = getCurrentMonth();

	const periodParam = url.searchParams.get('period') ?? undefined;
	// period=all の場合は month を無視する（/dashboard/summary と同じ扱い）
	const parsed = dashboardSummaryQuerySchema.safeParse({
		period: periodParam,
		month: periodParam === 'all' ? undefined : (url.searchParams.get('month') ?? undefined)
	});
	const period = parsed.success ? parsed.data.period : 'month';
	const month = (parsed.success ? parsed.data.month : undefined) ?? currentMonth;

	const [unapprovedCount, summary] = await Promise.all([
		getUnapprovedCount(db, locals.user!.id),
		getDashboardSummary(db, { period, month })
	]);
	return { unapprovedCount, summary, currentMonth, period, month };
};
