/**
 * @file ヘルパー: Better Auth インスタンス
 * @module src/lib/server/auth.ts
 *
 * @description
 * Better Auth の設定とインスタンス生成。
 * Google OAuth プロバイダーを使用した認証。
 * ALLOWED_EMAILS（fail-closed）でユーザー作成・セッション作成の両方を制限する。
 * hooks.server.ts から利用する。
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { D1Database } from '@cloudflare/workers-types';
import { eq } from 'drizzle-orm';
import { createDb } from './db';
import { user, session, account, verification } from './tables';

export function createAuth(config: {
	d1: D1Database;
	secret: string;
	baseURL: string;
	googleClientId: string;
	googleClientSecret: string;
	allowedEmails?: string;
}) {
	const db = createDb(config.d1);
	// 未設定・空の場合は全員拒否（fail-closed）
	const allowedList = (config.allowedEmails ?? '')
		.split(',')
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);
	const isAllowed = (email: string) => allowedList.includes(email.toLowerCase());

	return betterAuth({
		secret: config.secret,
		baseURL: config.baseURL,
		database: drizzleAdapter(db, {
			provider: 'sqlite',
			schema: { user, session, account, verification }
		}),
		socialProviders: {
			google: {
				clientId: config.googleClientId,
				clientSecret: config.googleClientSecret
			}
		},
		databaseHooks: {
			user: {
				create: {
					before: async (newUser) => {
						if (!isAllowed(newUser.email)) {
							throw new Error('unauthorized');
						}
					}
				}
			},
			session: {
				create: {
					// 既存ユーザーでも許可リストから外れた場合はログインさせない（false = セッションを作成しない）
					before: async (newSession) => {
						const row = await db
							.select({ email: user.email })
							.from(user)
							.where(eq(user.id, newSession.userId))
							.get();
						if (!row || !isAllowed(row.email)) return false;
					}
				}
			}
		},
		session: {
			expiresIn: 60 * 60 * 24 * 30 // 30日
		},
		logger: {
			log: (level: string, message: string, ...args: unknown[]) => {
				const timestamp = new Date().toISOString();
				const formatted = `${timestamp} ${level.toUpperCase()} [Better Auth]: ${message}`;
				// args にはリクエスト・セッション・トークン等が含まれうるため、Error の name/message のみ出力する
				const details = args
					.filter((a): a is Error => a instanceof Error)
					.map((e) => `${e.name}: ${e.message}`);
				if (level === 'error') console.error(formatted, ...details);
				else if (level === 'warn') console.warn(formatted, ...details);
			}
		}
	});
}
