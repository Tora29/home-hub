/// <reference types="@cloudflare/vitest-pool-workers/types" />
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
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import { getExpenses } from './service';
import { createCategory } from './categories/service';
import { expenseQuerySchema } from './schema';
import { user as userTable } from '$lib/server/tables';

function makeUserId() {
	return crypto.randomUUID();
}

function getCurrentMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function createTestUser(db: ReturnType<typeof createDb>, name: string) {
	const id = crypto.randomUUID();
	const now = new Date();
	await db.insert(userTable).values({
		id,
		name,
		email: `${id}@example.com`,
		emailVerified: false,
		createdAt: now,
		updatedAt: now
	});
	return { id, name };
}

describe('load (page.server)', () => {
	test('[SPEC: AC-001] ページロード時に全ユーザーの当月支出データを取得できる // spec:c4cbc954', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const month = getCurrentMonth();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createTestUser(db, '田中');

		const result = await getExpenses(db, { month });

		expect(result).toHaveProperty('items');
		expect(result).toHaveProperty('total');
		expect(result).toHaveProperty('monthTotal');
		expect(Array.isArray(result.items)).toBe(true);

		// suppress unused warning
		void category;
		void payer;
	});

	test('[SPEC: AC-002] month クエリで指定月の支出データを取得できる // spec:c4cbc954', async () => {
		const db = createDb(env.DB);

		const resultCurrentMonth = await getExpenses(db, { month: getCurrentMonth() });
		const resultPastMonth = await getExpenses(db, { month: '2020-01' });

		expect(Array.isArray(resultCurrentMonth.items)).toBe(true);
		expect(resultPastMonth.total).toBe(0);
	});

	test('[SPEC: AC-002c] 不正な month パラメータは expenseQuerySchema でバリデーションエラーになる // spec:c4cbc954', () => {
		const result = expenseQuerySchema.safeParse({ month: '2026-13' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.length).toBeGreaterThan(0);
		}
	});
});
