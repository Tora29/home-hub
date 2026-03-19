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
				BETTER_AUTH_URL: string;
			};
			context: import('@cloudflare/workers-types').ExecutionContext;
			caches: import('@cloudflare/workers-types').CacheStorage & {
				default: import('@cloudflare/workers-types').Cache;
			};
		}
	}
}

export {};
