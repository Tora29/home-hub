/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: ダッシュボード集計サービス
 * @module src/routes/dashboard/summary/service.integration.test.ts
 * @testType integration
 *
 * @target ./service.ts
 */
import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import { expense, expenseCategory } from '$lib/server/tables';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from '$lib/server/tables';
import { getDashboardSummary } from './service';

type Db = DrizzleD1Database<typeof schema>;

async function insertCategory(db: Db, userId: string, name = 'テスト'): Promise<string> {
	const id = crypto.randomUUID();
	await db.insert(expenseCategory).values({ id, userId, name, createdAt: new Date() });
	return id;
}

async function insertExpense(
	db: Db,
	userId: string,
	categoryId: string,
	amount: number,
	createdAt: Date = new Date()
): Promise<void> {
	await db.insert(expense).values({
		id: crypto.randomUUID(),
		userId,
		amount,
		categoryId,
		payerUserId: null,
		status: 'unapproved',
		createdAt
	});
}

describe('getDashboardSummary - 権限チェック', () => {
	test('自分の支出のみ集計される（他ユーザーの支出は含まれない）', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();
		const otherUserId = crypto.randomUUID();

		const myCategoryId = await insertCategory(db, userId);
		const otherCategoryId = await insertCategory(db, otherUserId);

		await insertExpense(db, userId, myCategoryId, 1000);
		await insertExpense(db, otherUserId, otherCategoryId, 9000);

		const result = await getDashboardSummary(db, userId, { period: 'all' });
		expect(result.overall).toBe(1000);
	});
});

describe('getDashboardSummary - period=all', () => {
	test('全期間の支出合計を取得できる', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();
		const categoryId = await insertCategory(db, userId);

		const pastDate = new Date('2023-01-15');
		const recentDate = new Date('2024-06-15');

		await insertExpense(db, userId, categoryId, 3000, pastDate);
		await insertExpense(db, userId, categoryId, 5000, recentDate);

		const result = await getDashboardSummary(db, userId, { period: 'all' });
		expect(result.overall).toBe(8000);
	});

	test('支出がない場合、全体合計が0になる', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();

		const result = await getDashboardSummary(db, userId, { period: 'all' });
		expect(result.overall).toBe(0);
		expect(result.byPayer).toHaveLength(0);
		expect(result.byCategory).toHaveLength(0);
	});
});

describe('getDashboardSummary - period=month', () => {
	test('指定月のみの支出が集計される', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();
		const categoryId = await insertCategory(db, userId);

		const targetMonth = new Date('2024-06-15');
		const otherMonth = new Date('2024-05-15');

		await insertExpense(db, userId, categoryId, 2000, targetMonth);
		await insertExpense(db, userId, categoryId, 3000, otherMonth);

		const result = await getDashboardSummary(db, userId, { period: 'month', month: '2024-06' });
		expect(result.overall).toBe(2000);
	});

	test('month 未指定の場合は当月が使用される', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();
		const categoryId = await insertCategory(db, userId);

		const now = new Date();
		await insertExpense(db, userId, categoryId, 1500, now);

		const result = await getDashboardSummary(db, userId, { period: 'month' });
		expect(result.overall).toBeGreaterThanOrEqual(1500);
	});
});

describe('getDashboardSummary - カテゴリ別集計', () => {
	test('カテゴリ別の合計が多い順に返される', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();

		const cat1Id = await insertCategory(db, userId, '食費');
		const cat2Id = await insertCategory(db, userId, '交通費');

		await insertExpense(db, userId, cat1Id, 5000);
		await insertExpense(db, userId, cat1Id, 3000);
		await insertExpense(db, userId, cat2Id, 1000);

		const result = await getDashboardSummary(db, userId, { period: 'all' });
		expect(result.byCategory).toHaveLength(2);
		expect(result.byCategory[0].categoryName).toBe('食費');
		expect(result.byCategory[0].total).toBe(8000);
		expect(result.byCategory[1].categoryName).toBe('交通費');
		expect(result.byCategory[1].total).toBe(1000);
	});
});
