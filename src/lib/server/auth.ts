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
import type { D1Database } from '@cloudflare/workers-types';
import { and, eq, ne, notExists } from 'drizzle-orm';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { bytesToHex, randomBytes } from '@noble/hashes/utils.js';
import { createDb } from './db';
import { user, session, account, verification } from './tables';

// Cloudflare Workers の CPU 時間制限対策: r=8 に削減（N=16384 は維持）
// デフォルト r=16 は Workers で CPU タイムアウト(error 1102)するため変更
const SCRYPT = { N: 16384, r: 8, p: 1, dkLen: 64 } as const;

async function hashPassword(password: string): Promise<string> {
	const salt = bytesToHex(randomBytes(16));
	const key = await scryptAsync(password.normalize('NFKC'), salt, {
		...SCRYPT,
		maxmem: 128 * SCRYPT.N * SCRYPT.r * 2
	});
	return `${salt}:${bytesToHex(key)}`;
}

async function verifyPassword({
	hash,
	password
}: {
	hash: string;
	password: string;
}): Promise<boolean> {
	const [salt, key] = hash.split(':');
	if (!salt || !key) return false;
	const target = await scryptAsync(password.normalize('NFKC'), salt, {
		...SCRYPT,
		maxmem: 128 * SCRYPT.N * SCRYPT.r * 2
	});
	return bytesToHex(target) === key;
}

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
			enabled: true,
			password: { hash: hashPassword, verify: verifyPassword }
		},
		session: {
			expiresIn: 60 * 60 * 24 * 30 // 30日
		},
		user: {
			additionalFields: {
				role: {
					type: 'string',
					required: false,
					defaultValue: null
				}
			}
		},
		databaseHooks: {
			user: {
				create: {
					// サインアップ後に role を自動付与する。
					// NOT EXISTS サブクエリによるアトミック UPDATE で TOCTOU 競合を防ぐ。
					// primary が存在しなければ → 'primary'（同時サインアップでも1件だけ付与）
					// primary はいるが spouse がいなければ → 'spouse'
					// 両方いる → null（3人目以降）
					after: async (newUser) => {
						// Step 1: primary が存在しない場合のみアトミックに 'primary' を付与
						await db
							.update(user)
							.set({ role: 'primary' })
							.where(
								and(
									eq(user.id, newUser.id),
									notExists(
										db
											.select({ id: user.id })
											.from(user)
											.where(and(eq(user.role, 'primary'), ne(user.id, newUser.id)))
									)
								)
							);
						// Step 2: 自分が primary になれたか確認
						const self = await db
							.select({ role: user.role })
							.from(user)
							.where(eq(user.id, newUser.id))
							.get();
						if (self?.role === 'primary') return;
						// Step 3: spouse が存在しない場合のみアトミックに 'spouse' を付与
						await db
							.update(user)
							.set({ role: 'spouse' })
							.where(
								and(
									eq(user.id, newUser.id),
									notExists(
										db
											.select({ id: user.id })
											.from(user)
											.where(and(eq(user.role, 'spouse'), ne(user.id, newUser.id)))
									)
								)
							);
					}
				}
			}
		},
		logger: {
			// 「User not found」は誤認証テストで意図的に発生する想定内のエラー
			log: (level: string, message: string, ...args: unknown[]) => {
				const timestamp = new Date().toISOString();
				const displayMessage =
					level === 'error' && message.includes('User not found')
						? `${message}（想定内: 誤認証テスト）`
						: message;
				const formatted = `${timestamp} ${level.toUpperCase()} [Better Auth]: ${displayMessage}`;
				if (level === 'error') console.error(formatted, ...args);
				else if (level === 'warn') console.warn(formatted, ...args);
			}
		}
	});
}
