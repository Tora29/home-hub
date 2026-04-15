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
import { getUnapprovedCount } from '$expenses/_lib/service';
import { getDashboardSummary } from '$dashboard/summary/_lib/service';

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = createDb(platform!.env.DB);
	const now = new Date();
	const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	const [unapprovedCount, summary] = await Promise.all([
		getUnapprovedCount(db, locals.user!.id),
		getDashboardSummary(db, locals.user!.id, { period: 'month', month: currentMonth })
	]);
	return { unapprovedCount, summary, currentMonth };
};
