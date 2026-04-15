/**
 * @file スキーマ: Login
 * @module src/routes/login/_lib/schema.ts
 * @feature login
 *
 * @description
 * ログイン画面の入力バリデーションスキーマ。
 * Better Auth の signIn.email() に渡す前にクライアントサイドで検証する。
 *
 * @spec specs/login/spec.md - Schema セクション
 *
 * @schemas
 * - loginSchema - ログイン入力バリデーション
 *
 * @types
 * - Login - ログイン入力型
 */
import { z } from 'zod';

export const loginSchema = z.object({
	email: z
		.string()
		.min(1, 'メールアドレスは必須です')
		.max(254, '254文字以内で入力してください')
		.email('正しいメールアドレスを入力してください'),
	password: z
		.string()
		.min(1, 'パスワードは必須です')
		.min(8, '8文字以上で入力してください')
		.max(128, '128文字以内で入力してください')
});

export type Login = z.infer<typeof loginSchema>;
