/**
 * @file API: ログアウト
 * @module apps/web/src/routes/login/apis/deleteSession.ts
 * @feature auth
 *
 * @description
 * Better Auth の sign-out エンドポイントを呼び出し、セッション Cookie を無効化する。
 *
 * @spec specs/auth/spec.md
 * @acceptance AC-002
 */

import { PUBLIC_API_BASE_URL } from '$env/static/public';

export async function deleteSession(): Promise<void> {
	await fetch(`${PUBLIC_API_BASE_URL}/api/auth/sign-out`, {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' }
	});
}
