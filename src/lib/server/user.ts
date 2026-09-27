/**
 * @file ヘルパー: ユーザー情報取得
 * @module src/lib/server/user.ts
 *
 * @description
 * 複数 feature・hooks から参照するユーザー属性（role 等）の取得処理。
 */
import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { user as userTable } from './tables';
import type * as schema from './tables';

type Db = DrizzleD1Database<typeof schema>;

/**
 * ユーザーの role を取得する。存在しない・未設定の場合は null。
 */
export async function getUserRole(db: Db, userId: string): Promise<string | null> {
	const row = await db
		.select({ role: userTable.role })
		.from(userTable)
		.where(eq(userTable.id, userId))
		.get();
	return row?.role ?? null;
}
