/**
 * @file データ取得: 支払者管理
 * @module src/routes/expenses/payers/+page.server.ts
 * @feature expenses
 *
 * @description
 * 支払者管理画面の初期データをサーバーサイドで取得する。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-035
 */
import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { getPayers } from './service';

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = createDb(platform!.env.DB);
	const payers = await getPayers(db, locals.user!.id);
	return { payers };
};
