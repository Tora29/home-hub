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

export const load: PageServerLoad = async ({ platform, locals, url }) => {
	const db = createDb(platform!.env.DB);
	const month = url.searchParams.get('month') ?? undefined;

	const [expenses, categories] = await Promise.all([
		getExpenses(db, locals.user!.id, { month }),
		getCategories(db, locals.user!.id)
	]);

	return { expenses, categories };
};
