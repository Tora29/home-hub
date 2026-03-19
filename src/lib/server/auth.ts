/**
 * @file ヘルパー: Better Auth インスタンス
 * @module src/lib/server/auth.ts
 *
 * @description
 * Better Auth の設定とインスタンス生成。
 * hooks.server.ts および +server.ts から利用する。
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createDb } from './db';
import { user, session, account, verification } from './schema';

export function createAuth(d1: D1Database, secret: string, baseURL: string) {
	const db = createDb(d1);

	return betterAuth({
		secret,
		baseURL,
		database: drizzleAdapter(db, {
			provider: 'sqlite',
			schema: { user, session, account, verification }
		}),
		emailAndPassword: {
			enabled: true
		},
		session: {
			expiresIn: 60 * 60 * 24 * 30 // 30日
		}
	});
}
