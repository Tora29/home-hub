/**
 * @file ヘルパー: Drizzle クライアント初期化
 * @module src/lib/server/db.ts
 *
 * @description
 * Cloudflare D1 バインディングから Drizzle クライアントを生成する。
 * `+server.ts` / `+page.server.ts` / `hooks.server.ts` から利用する。
 */
import { drizzle } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types';
import * as schema from './tables';

export function createDb(d1: D1Database) {
	return drizzle(d1, { schema });
}
