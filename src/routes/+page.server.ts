/**
 * @file データ取得: ダッシュボード
 * @module src/routes/+page.server.ts
 *
 * @description
 * ダッシュボード画面の初期データをサーバーサイドで取得する。
 * 全期間の未承認支出件数を取得し、警告バナーの表示判定に使う。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-008, AC-009
 */
import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { getUnapprovedCount } from './expenses/service';

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = createDb(platform!.env.DB);
	const unapprovedCount = await getUnapprovedCount(db, locals.user!.id);
	return { unapprovedCount };
};
