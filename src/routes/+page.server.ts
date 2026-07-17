/**
 * @file データ取得: ダッシュボード
 * @module src/routes/+page.server.ts
 * @feature dashboard
 *
 * @description
 * ダッシュボード画面の初期データをサーバーサイドで取得する。
 * 当月の集計サマリーと全期間の未承認支出件数を取得する。
 *
 * @spec specs/dashboard/spec.md
 * @acceptance AC-001, AC-002, AC-003, AC-008, AC-009
 */
import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { getUnapprovedCount } from '$expenses/server/service';
import { getDashboardSummary } from '$lib/features/dashboard/server/service';
import { getCurrentMonth } from '$lib/utils/date';

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = createDb(platform!.env.DB);
	const currentMonth = getCurrentMonth();
	const [unapprovedCount, summary] = await Promise.all([
		getUnapprovedCount(db, locals.user!.id),
		getDashboardSummary(db, { period: 'month', month: currentMonth })
	]);
	return { unapprovedCount, summary, currentMonth };
};
