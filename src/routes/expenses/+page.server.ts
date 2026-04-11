/**
 * @file データ取得: 支出
 * @module src/routes/expenses/+page.server.ts
 * @feature expenses
 *
 * @description
 * 支出一覧画面の初期データをサーバーサイドで取得する。
 * 全ユーザーの当月支出一覧・カテゴリ一覧・ユーザー一覧（支払者選択用）を返す。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-001
 */
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { getExpenses, getUsers, getBulkCounts } from './service';
import { getCategories } from './categories/service';
import { expenseQuerySchema } from './schema';

export const load: PageServerLoad = async ({ platform, locals, url }) => {
	const db = createDb(platform!.env.DB);
	const now = new Date();
	// currentMonth は常に今日の月。月ドロップダウンの選択肢は今月を起点に固定する（AC-002b）
	const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	// expenseQuerySchema で month を検証。不正値（例: 2026-13）は /expenses にリダイレクト（AC-002c）
	const rawMonth = url.searchParams.get('month');
	const parsed = expenseQuerySchema.safeParse({ month: rawMonth ?? undefined });
	if (rawMonth !== null && !parsed.success) {
		redirect(302, '/expenses');
	}
	const selectedMonth = parsed.success ? (parsed.data.month ?? currentMonth) : currentMonth;

	const [expenses, categories, users, bulkCounts] = await Promise.all([
		getExpenses(db, { month: selectedMonth }),
		getCategories(db, locals.user!.id),
		getUsers(db, locals.user!.id),
		getBulkCounts(db, locals.user!.id)
	]);

	return { expenses, categories, users, bulkCounts, currentMonth, currentUserId: locals.user!.id };
};
