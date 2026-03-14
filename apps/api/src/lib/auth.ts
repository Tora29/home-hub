/**
 * @file ヘルパー: Better Auth 初期化
 * @module apps/api/src/lib/auth.ts
 *
 * @description
 * Better Auth を Hono + Prisma アダプターで初期化する。
 * セッション有効期限は 30日（security.md 参照）。
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
    session: {
      expiresIn: 60 * 60 * 24 * 30,
    },
  });
}
