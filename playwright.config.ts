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
	webServer: { command: 'npm run build && npm run preview', port: 4173 },
	testMatch: '**/*.e2e.{ts,js}'
});
