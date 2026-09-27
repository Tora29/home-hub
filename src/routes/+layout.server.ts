/**
 * @file データ取得: グローバルレイアウト
 * @module src/routes/+layout.server.ts
 *
 * @description
 * 全ページに userRole を公開する。Sidebar でのロールベース表示制御に使用する。
 * role は hooks.server.ts が locals に注入済み。
 */
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return { userRole: locals.role };
};
