/**
 * @file ヘルパー: Better Auth インスタンス
 * @module src/lib/server/auth.ts
 *
 * @description
 * Better Auth の設定とインスタンス生成。
 * Google OAuth プロバイダーを使用した認証。
 * hooks.server.ts から利用する。
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { D1Database } from '@cloudflare/workers-types';
import { createDb } from './db';
import { user, session, account, verification } from './tables';

export function createAuth(
	d1: D1Database,
	secret: string,
	baseURL: string,
	googleClientId: string,
	googleClientSecret: string
) {
	const db = createDb(d1);

	return betterAuth({
		secret,
		baseURL,
		database: drizzleAdapter(db, {
			provider: 'sqlite',
			schema: { user, session, account, verification }
		}),
		socialProviders: {
			google: {
				clientId: googleClientId,
				clientSecret: googleClientSecret
			}
		},
		session: {
			expiresIn: 60 * 60 * 24 * 30 // 30日
		},
		logger: {
			log: (level: string, message: string, ...args: unknown[]) => {
				const timestamp = new Date().toISOString();
				const formatted = `${timestamp} ${level.toUpperCase()} [Better Auth]: ${message}`;
				if (level === 'error') console.error(formatted, ...args);
				else if (level === 'warn') console.warn(formatted, ...args);
			}
		}
	});
}
