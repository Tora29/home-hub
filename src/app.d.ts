/**
 * @file 型定義: SvelteKit アプリ全体の型
 * @module src/app.d.ts
 *
 * @description
 * App.Locals / App.PageData / App.Platform（Cloudflare バインディング・環境変数）の型定義。
 * 環境変数の一覧はここが唯一の参照先（→ external-integrations.md）。
 * @see https://svelte.dev/docs/kit/types#app.d.ts
 */
/// <reference types="vite-plugin-pwa/client" />
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: import('better-auth').User | null;
			session: import('better-auth').Session | null;
			// User.role（'main' | 'partner' | null）。hooks.server.ts で注入
			role: string | null;
		}
		interface PageData {
			userRole?: string | null;
		}
		// interface PageState {}
		interface Platform {
			env: {
				DB: import('@cloudflare/workers-types').D1Database;
				AI: import('@cloudflare/workers-types').Ai;
				BETTER_AUTH_SECRET: string;
				GOOGLE_CLIENT_ID: string;
				GOOGLE_CLIENT_SECRET: string;
				ALLOWED_EMAILS?: string;
				USE_REAL_AI?: string;
				LINE_CHANNEL_ACCESS_TOKEN?: string;
				LINE_USER_ID_PRIMARY?: string;
				LINE_USER_ID_SPOUSE?: string;
				LINE_MOCK?: string;
			};
			context: import('@cloudflare/workers-types').ExecutionContext;
			caches: import('@cloudflare/workers-types').CacheStorage & {
				default: import('@cloudflare/workers-types').Cache;
			};
		}
	}
}

export {};
