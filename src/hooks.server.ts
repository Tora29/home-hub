/**
 * @file ヘルパー: SvelteKit サーバーフック
 * @module src/hooks.server.ts
 *
 * @description
 * Better Auth ハンドラの登録、セッション情報・role の locals への注入、
 * 全ルートへの認証ガード・role 制限の適用、およびセキュリティヘッダーの付与。
 */
import { createAuth } from '$lib/server/auth';
import { createDb } from '$lib/server/db';
import { getUserRole } from '$lib/server/user';
import { building } from '$app/environment';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { json } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

// ログインなしでアクセスできるパス（完全一致）
const PUBLIC_PATHS = new Set([
	'/login',
	'/manifest.webmanifest',
	'/apple-touch-icon.png',
	'/favicon.ico',
	'/robots.txt'
]);

// role=main のみ利用可能なパス（前方一致だが `/workout` 配下のセグメント単位で判定）
const MAIN_ONLY_PREFIXES = ['/workout'];

function isMainOnlyPath(pathname: string): boolean {
	return MAIN_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isHtmlNavigation(request: Request): boolean {
	return request.headers.get('accept')?.includes('text/html') ?? false;
}

// _headers は SSR レスポンス（Worker 生成）に適用されないため、ここで付与する
const SECURITY_HEADERS: Record<string, string> = {
	'X-Frame-Options': 'DENY',
	'X-Content-Type-Options': 'nosniff',
	'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
	'Referrer-Policy': 'strict-origin-when-cross-origin'
};

function withSecurityHeaders(response: Response): Response {
	let res = response;
	try {
		for (const [key, value] of Object.entries(SECURITY_HEADERS)) res.headers.set(key, value);
	} catch {
		// headers が immutable なレスポンスはコピーしてから付与する
		res = new Response(response.body, response);
		for (const [key, value] of Object.entries(SECURITY_HEADERS)) res.headers.set(key, value);
	}
	return res;
}

const authGuard: Handle = async ({ event, resolve }) => {
	const { DB, BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ALLOWED_EMAILS } =
		event.platform!.env;
	const baseURL = `${event.url.protocol}//${event.url.host}`;
	const auth = createAuth({
		d1: DB,
		secret: BETTER_AUTH_SECRET,
		baseURL,
		googleClientId: GOOGLE_CLIENT_ID,
		googleClientSecret: GOOGLE_CLIENT_SECRET,
		allowedEmails: ALLOWED_EMAILS
	});

	// Better Auth が /api/auth/* を自前で処理するので先に渡す
	if (event.url.pathname.startsWith('/api/auth/')) {
		return svelteKitHandler({ event, resolve, auth, building });
	}

	// セッションを取得して locals に注入（全ルート共通）
	const session = await auth.api.getSession({ headers: event.request.headers });
	event.locals.user = session?.user ?? null;
	event.locals.session = session?.session ?? null;
	event.locals.role = event.locals.user
		? await getUserRole(createDb(DB), event.locals.user.id)
		: null;

	// 公開パスはそのまま通す
	if (PUBLIC_PATHS.has(event.url.pathname)) {
		return resolve(event);
	}

	// 未認証ガード
	if (!event.locals.user) {
		// ブラウザの画面遷移（Accept に text/html が含まれる）→ ログインページへ
		// fetch() による API 呼び出し（application/json のみ）→ JSON 401
		if (isHtmlNavigation(event.request)) {
			return new Response(null, { status: 302, headers: { location: '/login' } });
		}
		return json({ code: 'UNAUTHORIZED', message: '認証が必要です' }, { status: 401 });
	}

	// role 制限: 画面遷移は +page.server.ts の load が 403 ページを返す。API 呼び出しはここで JSON 403
	if (
		isMainOnlyPath(event.url.pathname) &&
		event.locals.role !== 'main' &&
		!(event.request.method === 'GET' && isHtmlNavigation(event.request))
	) {
		return json({ code: 'FORBIDDEN', message: 'アクセス権限がありません' }, { status: 403 });
	}

	return resolve(event);
};

export const handle: Handle = async (input) => withSecurityHeaders(await authGuard(input));
