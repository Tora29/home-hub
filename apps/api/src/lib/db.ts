/**
 * @file ヘルパー: DB クライアント初期化
 * @module apps/api/src/lib/db.ts
 *
 * @description
 * Cloudflare D1 用 Prisma クライアントを初期化する。
 */
import { PrismaClient } from '../generated/prisma/edge.js';
import { PrismaD1 } from '@prisma/adapter-d1';

export function createDb(d1: D1Database): PrismaClient {
  const adapter = new PrismaD1(d1);
  return new PrismaClient({ adapter });
}
