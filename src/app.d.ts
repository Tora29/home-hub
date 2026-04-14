/// <reference types="vite-plugin-pwa/client" />
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: import('better-auth').User | null;
			session: import('better-auth').Session | null;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				DB: import('@cloudflare/workers-types').D1Database;
				AI: import('@cloudflare/workers-types').Ai;
				BETTER_AUTH_SECRET: string;
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
