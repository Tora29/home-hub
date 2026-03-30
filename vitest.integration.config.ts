import path from 'node:path';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
	const migrationsPath = path.join(__dirname, 'drizzle/migrations');
	const migrations = await readD1Migrations(migrationsPath);

	return {
		resolve: {
			alias: {
				$lib: path.resolve('./src/lib')
			}
		},
		plugins: [
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
