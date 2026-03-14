/**
 * @file データ取得: 共通レイアウト（認証チェック）
 * @module apps/web/src/routes/+layout.ts
 * @feature auth
 *
 * @description
 * 全ページ共通のクライアントサイド認証チェック。
 * 未認証時は /login にリダイレクト、ログイン済みで /login アクセス時は / にリダイレクト。
 *
 * @spec specs/auth/spec.md
 * @acceptance AC-003, AC-004
 */

import { redirect } from '@sveltejs/kit';
import { PUBLIC_API_BASE_URL } from '$env/static/public';
import { currentUser } from '$lib/stores/auth';
import type { AuthUser } from '$lib/stores/auth';

export const ssr = false;

type SessionResponse = {
	user: AuthUser;
	session: { id: string; expiresAt: string };
} | null;

export async function load({ url }: { url: URL }) {
	let user: AuthUser | null = null;

	try {
		const res = await fetch(`${PUBLIC_API_BASE_URL}/api/auth/get-session`, {
			credentials: 'include'
		});
		if (res.ok) {
			const data: SessionResponse = await res.json();
			user = data?.user ?? null;
		}
	} catch {
		user = null;
	}

	currentUser.set(user);

	const isLoginPage = url.pathname === '/login';

	if (!user && !isLoginPage) {
		redirect(302, '/login');
	}

	if (user && isLoginPage) {
		redirect(302, '/');
	}

	return { user };
}
