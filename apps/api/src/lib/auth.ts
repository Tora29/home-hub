/**
 * @file ヘルパー: Better Auth 初期化
 * @module apps/api/src/lib/auth.ts
 *
 * @description
 * Better Auth を Hono + Prisma アダプターで初期化する。
 * Zod v4 との互換性に注意（plan.md 参照）。
 */
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { createDb } from './db.js';

export function createAuth(d1: D1Database) {
  const db = createDb(d1);
  return betterAuth({
    database: prismaAdapter(db, { provider: 'sqlite' }),
    emailAndPassword: {
      enabled: true,
    },
  });
}
