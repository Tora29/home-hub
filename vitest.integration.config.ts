import path from 'node:path';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig, type Plugin } from 'vitest/config';

/**
 * SvelteKit の `$app/*` はビルド時にしか解決されないため、Integration テスト（Workers 実行）用に
 * 仮想モジュールで代替する。`+page.server.ts` / service が `$app/environment` を import しても読み込めるようにする。
 * 値は本番相当（dev=false）に固定する。
 */
function sveltekitAppStub(): Plugin {
	const modules: Record<string, string> = {
		'$app/environment':
			"export const browser = false; export const dev = false; export const building = false; export const version = 'test';"
	};
	return {
		name: 'sveltekit-app-stub',
		enforce: 'pre',
		resolveId(id) {
			return id in modules ? `\0${id}` : null;
		},
		load(id) {
			return id.startsWith('\0') ? modules[id.slice(1)] : null;
		}
	};
}

export default defineConfig(async () => {
	const migrationsPath = path.join(import.meta.dirname, 'drizzle/migrations');
	const migrations = await readD1Migrations(migrationsPath);

	return {
		resolve: {
			alias: {
				$lib: path.resolve('./src/lib'),
				$expenses: path.resolve('./src/lib/features/expenses'),
				$dashboard: path.resolve('./src/lib/features/dashboard'),
				$workout: path.resolve('./src/lib/features/workout')
			}
		},
		plugins: [
			sveltekitAppStub(),
			cloudflareTest({
				wrangler: { configPath: './wrangler.test.toml' },
				miniflare: {
					bindings: { TEST_MIGRATIONS: migrations }
				}
			})
		],
		test: {
			include: ['src/**/*.integration.test.{js,ts}'],
			setupFiles: ['./src/test/integration-setup.ts']
		}
	};
});
