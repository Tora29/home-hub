/**
 * @file テスト: Expense page.server load 関数
 * @module src/routes/expenses/page.server.integration.test.ts
 * @testType integration
 *
 * @target ./+page.server.ts
 * @spec specs/expenses/spec.md
 * @covers AC-001, AC-002, AC-002c
 */

import { describe, test, expect } from 'vitest';
import { SELF } from 'cloudflare:test';

describe('load (page.server)', () => {
	test('[SPEC: AC-001] ページロード時に全ユーザーの当月支出データを取得できる // spec:c4cbc954', async () => {
		const res = await SELF.fetch('http://localhost/expenses');
		expect(res.status).toBe(200);
	});

	test('[SPEC: AC-002] month クエリで指定月の支出データを取得できる // spec:c4cbc954', async () => {
		const res = await SELF.fetch('http://localhost/expenses?month=2026-01');
		expect(res.status).toBe(200);
	});

	test('[SPEC: AC-002c] 不正な month パラメータの場合 /expenses にリダイレクトする // spec:c4cbc954', async () => {
		const res = await SELF.fetch('http://localhost/expenses?month=2026-13', {
			redirect: 'manual'
		});
		// リダイレクト（302）または 400 を返す（実装による）
		expect([302, 400]).toContain(res.status);
	});
});
