/**
 * @file データ取得: 支出
 * @module src/routes/expenses/+page.server.ts
 * @feature expenses
 *
 * @description
 * 支出一覧画面の初期データをサーバーサイドで取得する。
 * 当月の支出一覧とカテゴリ一覧を返す。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-001
 */
import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { getExpenses } from './service';
import { getCategories } from './categories/service';
import { getPayers } from './payers/service';

export const load: PageServerLoad = async ({ platform, locals, url }) => {
	const db = createDb(platform!.env.DB);
	const monthParam = url.searchParams.get('month') ?? undefined;
	const now = new Date();
	const currentMonth =
		monthParam ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

	const [expenses, categories, payers] = await Promise.all([
		getExpenses(db, locals.user!.id, { month: currentMonth }),
		getCategories(db, locals.user!.id),
		getPayers(db, locals.user!.id)
	]);

	return { expenses, categories, payers, currentMonth };
};
