/**
 * @file ヘルパー: Better Auth インスタンス
 * @module src/lib/server/auth.ts
 *
 * @description
 * Better Auth の設定とインスタンス生成。
 * hooks.server.ts および +server.ts から利用する。
 */
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { createDb } from './db';

export function createAuth(d1: D1Database, secret: string, baseURL: string) {
  const db = createDb(d1);

  return betterAuth({
    secret,
    baseURL,
    database: prismaAdapter(db, { provider: 'sqlite' }),
    emailAndPassword: {
      enabled: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30日
    },
  });
}
