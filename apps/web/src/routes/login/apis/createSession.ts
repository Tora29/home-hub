/**
 * @file API: ログイン
 * @module apps/web/src/routes/login/apis/createSession.ts
 * @feature auth
 *
 * @description
 * Better Auth の sign-in/email エンドポイントを呼び出し、セッション Cookie を取得する。
 *
 * @spec specs/auth/spec.md
 * @acceptance AC-001, AC-101, AC-102
 */

import { PUBLIC_API_BASE_URL } from '$env/static/public';
import type { Login } from '@what-to-eat/shared';

export type CreateSessionResult = { ok: true } | { ok: false; message: string };

export async function createSession(input: Login): Promise<CreateSessionResult> {
	const res = await fetch(`${PUBLIC_API_BASE_URL}/api/auth/sign-in/email`, {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input)
	});

	if (res.ok) {
		return { ok: true };
	}

	// Better Auth は認証失敗時に 401 を返す
	return {
		ok: false,
		message: 'メールアドレスまたはパスワードが正しくありません'
	};
}
