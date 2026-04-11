/**
 * @file データ取得: ダッシュボード
 * @module src/routes/+page.server.ts
 * @feature dashboard
 *
 * @description
 * ダッシュボード画面の初期データをサーバーサイドで取得する。
 * 当月の集計サマリーと全期間の承認依頼件数（相手からの pending）を取得する。
 *
 * @spec specs/dashboard/spec.md
 * @acceptance AC-001, AC-002, AC-003, AC-008, AC-009
 */
import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { getPendingApprovalCount } from './expenses/service';
import { getDashboardSummary } from './dashboard/summary/service';

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = createDb(platform!.env.DB);
	const now = new Date();
	const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	const [pendingApprovalCount, summary] = await Promise.all([
		getPendingApprovalCount(db, locals.user!.id),
		getDashboardSummary(db, { period: 'month', month: currentMonth })
	]);
	return { pendingApprovalCount, summary, currentMonth };
};
