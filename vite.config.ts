import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	optimizeDeps: {
		exclude: ['@lucide/svelte']
	},
	test: {
		expect: { requireAssertions: true },
		coverage: {
			provider: 'v8',
			include: ['src/routes/**/*.ts', 'src/lib/**/*.ts'],
			exclude: [
				'src/lib/server/db.ts',
				'src/lib/server/tables.ts',
				'src/lib/server/auth.ts',
				'src/lib/index.ts',
				'src/lib/assets/**',
				'src/hooks.server.ts',
				'src/app.d.ts',
				'**/*.test.ts',
				'**/*.integration.test.ts',
				'**/*.svelte.test.ts'
			],
			thresholds: {
				functions: 80,
				lines: 80
			}
		},
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }],
						viewport: { width: 1280, height: 800 }
					},
					include: ['src/**/*.svelte.test.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.test.{js,ts}'],
					exclude: ['src/**/*.svelte.test.{js,ts}', 'src/**/*.integration.test.{js,ts}']
				}
			}
		]
	}
});
