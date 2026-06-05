/**
 * @file データ取得: グローバルレイアウト
 * @module src/routes/+layout.server.ts
 *
 * @description
 * 全ページに userRole を公開する。Sidebar でのロールベース表示制御に使用する。
 */
import { eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { user as userTable } from '$lib/server/tables';

export const load: LayoutServerLoad = async ({ locals, platform }) => {
	if (!locals.user) return { userRole: null };
	const db = createDb(platform!.env.DB);
	const [row] = await db
		.select({ role: userTable.role })
		.from(userTable)
		.where(eq(userTable.id, locals.user.id));
	return { userRole: row?.role ?? null };
};
