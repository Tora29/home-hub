/**
 * @file データ取得: 支出一覧
 * @module src/routes/expenses/+page.server.ts
 * @feature expenses
 *
 * @description
 * 支出一覧画面の初期データ（支出・カテゴリ・ユーザー・相手の承認待ち件数・選択月の精算額）をサーバーサイドで取得する。
 * 不正なクエリパラメータ（例: month=2026-13）は /expenses にリダイレクトする。
 */
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { getExpenses, getUsers } from '$expenses/server/service';
import { getUnapprovedCount } from '$expenses/server/workflow';
import { getCategories } from '$expenses/categories/server/service';
import { getSettlementSummary } from '$expenses/settlements/server/service';
import { expenseQuerySchema } from '$expenses/schema';
import { getCurrentMonth } from '$lib/utils/date';

export const load: PageServerLoad = async ({ platform, locals, url }) => {
	const parsed = expenseQuerySchema.safeParse({
		month: url.searchParams.get('month') ?? undefined,
		page: url.searchParams.get('page') ?? undefined,
		limit: url.searchParams.get('limit') ?? undefined
	});
	if (!parsed.success) redirect(302, '/expenses');

	const { month, page, limit } = parsed.data;
	const db = createDb(platform!.env.DB);
	const userId = locals.user!.id;
	// 月ドロップダウンの選択肢は常に今日の月（JST）を起点にする
	const currentMonth = getCurrentMonth();
	const selectedMonth = month ?? currentMonth;

	const [expenseData, categories, users, partnerPendingCount] = await Promise.all([
		getExpenses(db, { month: selectedMonth, page, limit }),
		getCategories(db),
		getUsers(db),
		getUnapprovedCount(db, userId)
	]);

	// 精算額は世帯の 2 ユーザー（users）で算出する。2 人でない場合は null（精算ボタン非表示）
	const settlement = await getSettlementSummary(db, selectedMonth, users);

	return {
		expenses: expenseData.items,
		monthTotal: expenseData.monthTotal,
		categories,
		users,
		currentUserId: userId,
		selectedMonth,
		currentMonth,
		partnerPendingCount,
		settlement
	};
};
