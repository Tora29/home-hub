/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: ダッシュボード集計サービス
 * @module src/lib/features/dashboard/server/service.integration.test.ts
 * @testType integration
 *
 * @target ./service.ts
 */
import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import { expense, expenseCategory, user as userTable } from '$lib/server/tables';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from '$lib/server/tables';
import { getDashboardSummary } from './service';

type Db = DrizzleD1Database<typeof schema>;

async function insertUser(db: Db, name = 'テストユーザー'): Promise<string> {
	const id = crypto.randomUUID();
	await db.insert(userTable).values({
		id,
		name,
		email: `${id}@test.example`,
		emailVerified: false,
		createdAt: new Date(),
		updatedAt: new Date()
	});
	return id;
}

async function insertCategory(db: Db, name = 'テスト'): Promise<string> {
	const id = crypto.randomUUID();
	await db.insert(expenseCategory).values({ id, name, createdAt: new Date() });
	return id;
}

async function insertExpense(
	db: Db,
	userId: string,
	categoryId: string,
	amount: number,
	payerUserId: string,
	createdAt: Date = new Date()
): Promise<void> {
	await db.insert(expense).values({
		id: crypto.randomUUID(),
		userId,
		amount,
		categoryId,
		payerUserId,
		status: 'unapproved',
		createdAt
	});
}

describe('getDashboardSummary - 世帯合算', () => {
	test('複数ユーザーの支出が合算される', async () => {
		const db = createDb(env.DB);
		const user1Id = await insertUser(db, 'user1');
		const user2Id = await insertUser(db, 'user2');
		const cat1Id = await insertCategory(db);
		const cat2Id = await insertCategory(db);

		await insertExpense(db, user1Id, cat1Id, 1000, user1Id);
		await insertExpense(db, user2Id, cat2Id, 9000, user2Id);

		const result = await getDashboardSummary(db, { period: 'all' });
		expect(result.overall).toBeGreaterThanOrEqual(10000);
	});

	test('カテゴリ別集計に全ユーザーのカテゴリが含まれる', async () => {
		const db = createDb(env.DB);
		const user1Id = await insertUser(db, 'user1');
		const user2Id = await insertUser(db, 'user2');
		const cat1Id = await insertCategory(db, `食費-${crypto.randomUUID()}`);
		const cat2Id = await insertCategory(db, `交通費-${crypto.randomUUID()}`);

		await insertExpense(db, user1Id, cat1Id, 5000, user1Id);
		await insertExpense(db, user2Id, cat2Id, 3000, user2Id);

		const result = await getDashboardSummary(db, { period: 'all' });
		const catIds = result.byCategory.map((c) => c.categoryId);
		expect(catIds).toContain(cat1Id);
		expect(catIds).toContain(cat2Id);
	});

	test('カテゴリ別集計に支払者内訳が含まれる', async () => {
		const db = createDb(env.DB);
		const user1Id = await insertUser(db, 'payer1');
		const user2Id = await insertUser(db, 'payer2');
		const catId = await insertCategory(db, `共通費-${crypto.randomUUID()}`);

		await insertExpense(db, user1Id, catId, 3000, user1Id);
		await insertExpense(db, user2Id, catId, 2000, user2Id);

		const result = await getDashboardSummary(db, { period: 'all' });
		const cat = result.byCategory.find((c) => c.categoryId === catId);
		expect(cat).toBeDefined();
		expect(cat!.total).toBe(5000);
		expect(cat!.byPayer).toHaveLength(2);
	});
});

describe('getDashboardSummary - period=all', () => {
	test('全期間の支出合計を取得できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const categoryId = await insertCategory(db);

		const pastDate = new Date('2023-01-15');
		const recentDate = new Date('2024-06-15');

		await insertExpense(db, userId, categoryId, 3000, userId, pastDate);
		await insertExpense(db, userId, categoryId, 5000, userId, recentDate);

		const result = await getDashboardSummary(db, { period: 'all' });
		expect(result.overall).toBeGreaterThanOrEqual(8000);
	});
});

describe('getDashboardSummary - period=month', () => {
	test('指定月のみの支出が集計される', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const categoryId = await insertCategory(db);

		const targetMonth = new Date('2099-01-15');
		const otherMonth = new Date('2099-02-15');

		await insertExpense(db, userId, categoryId, 2000, userId, targetMonth);
		await insertExpense(db, userId, categoryId, 3000, userId, otherMonth);

		const result = await getDashboardSummary(db, { period: 'month', month: '2099-01' });
		expect(result.overall).toBe(2000);
	});

	test('month 未指定の場合は当月が使用される', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const categoryId = await insertCategory(db);

		const now = new Date();
		await insertExpense(db, userId, categoryId, 1500, userId, now);

		const result = await getDashboardSummary(db, { period: 'month' });
		expect(result.overall).toBeGreaterThanOrEqual(1500);
	});
});

describe('getDashboardSummary - カテゴリ別集計', () => {
	test('カテゴリ別の合計が多い順に返される', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		const suffix = crypto.randomUUID();
		const cat1Id = await insertCategory(db, `食費-${suffix}`);
		const cat2Id = await insertCategory(db, `交通費-${suffix}`);

		await insertExpense(db, userId, cat1Id, 5000, userId);
		await insertExpense(db, userId, cat1Id, 3000, userId);
		await insertExpense(db, userId, cat2Id, 1000, userId);

		const result = await getDashboardSummary(db, { period: 'all' });
		const cat1 = result.byCategory.find((c) => c.categoryId === cat1Id);
		const cat2 = result.byCategory.find((c) => c.categoryId === cat2Id);

		expect(cat1).toBeDefined();
		expect(cat1!.total).toBe(8000);
		expect(cat2).toBeDefined();
		expect(cat2!.total).toBe(1000);

		const cat1Index = result.byCategory.findIndex((c) => c.categoryId === cat1Id);
		const cat2Index = result.byCategory.findIndex((c) => c.categoryId === cat2Id);
		expect(cat1Index).toBeLessThan(cat2Index);
	});
});
