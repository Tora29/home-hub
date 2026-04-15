/**
 * @file データ取得: 支出一覧
 * @module src/routes/expenses/+page.server.ts
 * @feature expenses
 *
 * @description
 * 支出一覧画面の初期データをサーバーサイドで取得する。
 * 不正な month パラメータは /expenses にリダイレクトする（AC-002c）。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-001, AC-002, AC-002b, AC-002c
 */
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { getExpenses, getUsers } from '$expenses/_lib/service';
import { getCategories } from '$expenses/categories/_lib/service';
import { expenseQuerySchema } from '$expenses/_lib/schema';

export const load: PageServerLoad = async ({ platform, locals, url }) => {
	const db = createDb(platform!.env.DB);
	const userId = locals.user!.id;

	// expenseQuerySchema で month を検証。不正値（例: 2026-13）は /expenses にリダイレクト（AC-002c）
	const rawMonth = url.searchParams.get('month');
	const rawPage = url.searchParams.get('page');
	const rawLimit = url.searchParams.get('limit');

	const raw: Record<string, string> = {};
	if (rawMonth) raw.month = rawMonth;
	if (rawPage) raw.page = rawPage;
	if (rawLimit) raw.limit = rawLimit;

	const parsed = expenseQuerySchema.safeParse(raw);
	if (!parsed.success) {
		redirect(302, '/expenses');
	}

	const { month, page, limit } = parsed.data;

	// currentMonth は常に今日の月。月ドロップダウンの選択肢は今月を起点に固定する（AC-002b）
	const now = new Date();
	const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	const selectedMonth = month ?? currentMonth;

	const [expenseData, categories, users] = await Promise.all([
		getExpenses(db, { month: selectedMonth, page, limit }),
		getCategories(db, userId),
		getUsers(db)
	]);

	return {
		expenses: expenseData.items,
		total: expenseData.total,
		monthTotal: expenseData.monthTotal,
		categories,
		users,
		currentUserId: userId,
		currentMonth,
		selectedMonth
	};
};
