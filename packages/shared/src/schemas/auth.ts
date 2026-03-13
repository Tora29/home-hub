/**
 * @file スキーマ: Auth
 * @module packages/shared/src/schemas/auth.ts
 *
 * @description
 * 認証関連のスキーマ定義（FE・BE 共通）。
 *
 * @schemas
 * - loginSchema - ログイン用入力
 *
 * @types
 * - Login - ログイン用入力型
 */
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('メールアドレスの形式が正しくありません'),
  password: z.string().min(1, 'パスワードは必須です'),
});

export type Login = z.infer<typeof loginSchema>;
