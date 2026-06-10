import { defineConfig } from '@playwright/test';
import { readFileSync } from 'fs';

// .dev.vars から環境変数を読み込む（ローカル開発・E2E テスト用）
try {
	const vars = readFileSync('.dev.vars', 'utf-8');
	for (const line of vars.split('\n')) {
		const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
		if (match) process.env[match[1]] ??= match[2];
	}
} catch {
	// CI 環境等で .dev.vars がない場合は環境変数をそのまま使用
}

export default defineConfig({
	globalSetup: './e2e/global-setup.ts',
	globalTeardown: './e2e/global-teardown.ts',
	globalTimeout: process.env.CI ? 10 * 60 * 1000 : undefined, // CI: 10分で強制終了
	workers: 1,
	retries: process.env.CI ? 2 : 0,
	use: {
		storageState: 'e2e/.auth/session.json'
	},
	webServer: {
		command: 'npm run build && wrangler pages dev .svelte-kit/cloudflare --port 4173',
		port: 4173
	},
	testMatch: '**/*.e2e.{ts,js}'
});
