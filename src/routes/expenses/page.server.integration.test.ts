/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: データ取得 expenses
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
import { user as userTable } from '$lib/server/tables';
import { createExpense, getExpenses } from './service';
import { createCategory } from './categories/service';

function makeUserId() {
	return crypto.randomUUID();
}

async function createTestUser(db: ReturnType<typeof createDb>): Promise<string> {
	const id = makeUserId();
	await db.insert(userTable).values({
		id,
		name: 'テストユーザー',
		email: `${id}@test.example`,
		emailVerified: false,
		createdAt: new Date(),
		updatedAt: new Date()
	});
	return id;
}

describe('load (expenses +page.server.ts)', () => {
	test('[SPEC: AC-001] month 未指定時、当月の全ユーザーの支出一覧が取得できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, userId, { name: '食費' });
		await createExpense(db, userId, { amount: 800, categoryId: category.id, payerUserId });
		await createExpense(db, userId, { amount: 1200, categoryId: category.id, payerUserId });

		const now = new Date();
		const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

		const result = await getExpenses(db, { month: currentMonth });

		// 登録した支出が含まれることを確認
		const amounts = result.items.map((i) => i.amount);
		expect(amounts).toContain(800);
		expect(amounts).toContain(1200);
		expect(result.page).toBe(1);
		expect(result.limit).toBe(20);
	});

	test('[SPEC: AC-001] 支出一覧の各アイテムにカテゴリ情報が含まれる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, userId, { name: '外食費' });
		await createExpense(db, userId, { amount: 3500, categoryId: category.id, payerUserId });

		const now = new Date();
		const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
		const result = await getExpenses(db, { month });

		const item = result.items.find((i) => i.userId === userId);
		expect(item).toBeDefined();
		expect(item!.category.id).toBe(category.id);
		expect(item!.category.name).toBe('外食費');
	});

	test('[SPEC: AC-002] month を指定すると対象月の支出のみ取得できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, userId, { name: '食費' });
		await createExpense(db, userId, { amount: 1000, categoryId: category.id, payerUserId });

		const now = new Date();
		const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

		// 当月指定: 登録した支出が含まれる
		const currentResult = await getExpenses(db, { month: currentMonth });
		const hasMyExpense = currentResult.items.some((i) => i.amount === 1000 && i.userId === userId);
		expect(hasMyExpense).toBe(true);

		// 翌月指定: 登録した支出が含まれない
		const nextMonth =
			now.getMonth() === 11
				? `${now.getFullYear() + 1}-01`
				: `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}`;
		const nextResult = await getExpenses(db, { month: nextMonth });
		const hasMyExpenseNext = nextResult.items.some((i) => i.amount === 1000 && i.userId === userId);
		expect(hasMyExpenseNext).toBe(false);
	});

	test('[SPEC: AC-002c] 不正な月パラメータ（2026-13）が渡された場合の +page.server.ts のバリデーション', async () => {
		// +page.server.ts は expenseQuerySchema で month を検証し、
		// 失敗した場合は /expenses にリダイレクトする（302）。
		// このテストは schema レベルの動作を確認する。
		const { expenseQuerySchema } = await import('./schema');
		const result = expenseQuerySchema.safeParse({ month: '2026-13' });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('月は01〜12で入力してください');
		}
	});
});
