/**
 * @file ヘルパー: SvelteKit サーバーフック
 * @module src/hooks.server.ts
 *
 * @description
 * Better Auth ハンドラの登録、セッション情報の locals への注入、
 * および全ルートへの認証ガード適用。
 */
import { createAuth } from '$lib/server/auth';
import { building } from '$app/environment';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { json, redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

// ログインなしでアクセスできるパス
const PUBLIC_PATHS = ['/api/auth', '/login'];

export const handle: Handle = async ({ event, resolve }) => {
	const { DB, BETTER_AUTH_SECRET } = event.platform!.env;
	const baseURL = `${event.url.protocol}//${event.url.host}`;
	const auth = createAuth(DB, BETTER_AUTH_SECRET, baseURL);

	// Better Auth が /api/auth/* を自前で処理するので先に渡す
	if (event.url.pathname.startsWith('/api/auth')) {
		return svelteKitHandler({ event, resolve, auth, building });
	}

	// セッションを取得して locals に注入（全ルート共通）
	const session = await auth.api.getSession({ headers: event.request.headers });
	event.locals.user = session?.user ?? null;
	event.locals.session = session?.session ?? null;

	// 公開パスはそのまま通す
	if (PUBLIC_PATHS.some((p) => event.url.pathname.startsWith(p))) {
		return resolve(event);
	}

	// 未認証ガード
	if (!event.locals.user) {
		// ブラウザの画面遷移（Accept に text/html が含まれる）→ ログインページへ
		// fetch() による API 呼び出し（application/json のみ）→ JSON 401
		if (event.request.headers.get('accept')?.includes('text/html')) {
			redirect(302, '/login');
		}
		return json({ code: 'UNAUTHORIZED', message: '認証が必要です' }, { status: 401 });
	}

	return resolve(event);
};
