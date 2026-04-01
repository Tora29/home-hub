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
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils.js';
import { createDb } from './db';
import { user, session, account, verification } from './tables';

// Cloudflare Workers の CPU 時間制限対策: r=8 に削減（N=16384 は維持）
// デフォルト r=16 は Workers で 503 タイムアウトするため変更
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
		}
	});
}
