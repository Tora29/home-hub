/**
 * @file ヘルパー: Prisma クライアント初期化
 * @module src/lib/server/db.ts
 *
 * @description
 * Cloudflare D1 バインディングから Prisma クライアントを生成する。
 * `+server.ts` / `+page.server.ts` / `hooks.server.ts` から利用する。
 */
import { PrismaClient } from '../generated/prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';

export function createDb(d1: D1Database) {
  const adapter = new PrismaD1(d1);
  return new PrismaClient({ adapter });
}
