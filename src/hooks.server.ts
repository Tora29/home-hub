/**
 * @file ヘルパー: SvelteKit サーバーフック
 * @module src/hooks.server.ts
 *
 * @description
 * Better Auth ハンドラの登録とセッション情報の locals への注入。
 */
import { createAuth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const { DB, BETTER_AUTH_SECRET, BETTER_AUTH_URL } = event.platform!.env;
  const auth = createAuth(DB, BETTER_AUTH_SECRET, BETTER_AUTH_URL);

  // Better Auth のルート（/api/auth/*）を処理
  if (event.url.pathname.startsWith('/api/auth')) {
    return svelteKitHandler({ event, resolve, auth });
  }

  // セッションを locals に注入
  const session = await auth.api.getSession({ headers: event.request.headers });
  event.locals.user = session?.user ?? null;
  event.locals.session = session?.session ?? null;

  return resolve(event);
};
