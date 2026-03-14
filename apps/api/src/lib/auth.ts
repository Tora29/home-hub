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

// Cloudflare Workers の CPU 制限に対応するため Web Crypto API の PBKDF2 を使用
// Better Auth デフォルトの scrypt (N=16384) は CPU 時間超過でタイムアウトする
const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');

const fromHex = (hex: string) =>
  new Uint8Array(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  return `${toHex(salt.buffer)}:${toHex(bits)}`;
}

async function verifyPassword({ hash, password }: { hash: string; password: string }): Promise<boolean> {
  const [saltHex, hashHex] = hash.split(':') as [string, string];
  const salt = fromHex(saltHex);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  return toHex(bits) === hashHex;
}

export function createAuth(d1: D1Database, secret: string, baseURL: string, allowedOrigin: string) {
  const db = createDb(d1);
  return betterAuth({
    secret,
    baseURL,
    trustedOrigins: [allowedOrigin],
    database: prismaAdapter(db, { provider: 'sqlite' }),
    emailAndPassword: {
      enabled: true,
      password: {
        hash: hashPassword,
        verify: verifyPassword,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
    },
    advanced: {
      defaultCookieAttributes: {
        sameSite: 'none',
        secure: baseURL.startsWith('https'),
      },
    },
  });
}
