/**
 * @file データ取得: カテゴリ管理
 * @module src/routes/expenses/categories/+page.server.ts
 * @feature expenses
 *
 * @description
 * カテゴリ管理画面の初期データをサーバーサイドで取得する。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-010
 */
import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { getCategories } from '$expenses/categories/_lib/service';

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = createDb(platform!.env.DB);
	const categories = await getCategories(db, locals.user!.id);
	return { categories };
};
