/**
 * @file ヘルパー: Better Auth クライアント
 * @module src/lib/auth-client.ts
 *
 * @description
 * クライアントサイドで使用する Better Auth のインスタンス。
 * サインアウト等の認証操作に使用する。
 */
import { createAuthClient } from 'better-auth/client';

export const authClient = createAuthClient();
