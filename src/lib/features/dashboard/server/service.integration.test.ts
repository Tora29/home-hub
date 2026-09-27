/**
 * @file テスト: ダッシュボード集計サービス
 * @module src/lib/features/dashboard/server/service.integration.test.ts
 * @testType integration
 *
 * @target ./service.ts
 */
/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { describe, test, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import { expense, expenseCategory, user as userTable } from '$lib/server/tables';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from '$lib/server/tables';
import { getCurrentMonth } from '$lib/utils/date';
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
	await db.insert(expenseCategory).values({ id, name: `${name}-${id}`, createdAt: new Date() });
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

// 集計は全ユーザー（世帯）の全支出が対象のため、テストごとに支出を空にして厳密値で検証する
beforeEach(async () => {
	await createDb(env.DB).delete(expense);
});

describe('getDashboardSummary', () => {
	test('複数ユーザーの支出を世帯合算した全期間合計を取得できる', async () => {
		const db = createDb(env.DB);
		const user1Id = await insertUser(db, 'user1');
		const user2Id = await insertUser(db, 'user2');
		const cat1Id = await insertCategory(db);
		const cat2Id = await insertCategory(db);

		await insertExpense(db, user1Id, cat1Id, 1000, user1Id, new Date('2023-01-15T03:00:00Z'));
		await insertExpense(db, user2Id, cat2Id, 9000, user2Id, new Date('2024-06-15T03:00:00Z'));

		const result = await getDashboardSummary(db, { period: 'all' });
		expect(result.overall).toBe(10000);
	});

	test('支払者別の合計を金額の多い順に取得できる', async () => {
		const db = createDb(env.DB);
		const user1Id = await insertUser(db, 'payer1');
		const user2Id = await insertUser(db, 'payer2');
		const catId = await insertCategory(db);

		await insertExpense(db, user1Id, catId, 1000, user1Id);
		await insertExpense(db, user1Id, catId, 500, user1Id);
		await insertExpense(db, user2Id, catId, 4000, user2Id);

		const result = await getDashboardSummary(db, { period: 'all' });
		expect(result.byPayer).toEqual([
			{ payerId: user2Id, payerName: 'payer2', total: 4000 },
			{ payerId: user1Id, payerName: 'payer1', total: 1500 }
		]);
	});

	test('カテゴリ別の合計を金額の多い順に、支払者内訳付きで取得できる', async () => {
		const db = createDb(env.DB);
		const user1Id = await insertUser(db, 'payer1');
		const user2Id = await insertUser(db, 'payer2');
		const foodId = await insertCategory(db, '食費');
		const transportId = await insertCategory(db, '交通費');

		await insertExpense(db, user1Id, foodId, 5000, user1Id);
		await insertExpense(db, user2Id, foodId, 3000, user2Id);
		await insertExpense(db, user1Id, transportId, 1000, user1Id);

		const result = await getDashboardSummary(db, { period: 'all' });
		expect(result.byCategory.map((c) => [c.categoryId, c.total])).toEqual([
			[foodId, 8000],
			[transportId, 1000]
		]);
		expect(result.byCategory[0].byPayer).toEqual([
			{ payerId: user1Id, payerName: 'payer1', total: 5000 },
			{ payerId: user2Id, payerName: 'payer2', total: 3000 }
		]);
	});

	test('period=month で指定月の支出のみを集計できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const categoryId = await insertCategory(db);

		await insertExpense(db, userId, categoryId, 2000, userId, new Date('2099-01-15T03:00:00Z'));
		await insertExpense(db, userId, categoryId, 3000, userId, new Date('2099-02-15T03:00:00Z'));

		const result = await getDashboardSummary(db, { period: 'month', month: '2099-01' });
		expect(result.overall).toBe(2000);
		expect(result.byPayer).toHaveLength(1);
		expect(result.byCategory).toHaveLength(1);
	});

	test('JST の月初早朝に登録した支出は当月に集計でき、前月には含まれない', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const categoryId = await insertCategory(db);

		// 2098-10-01 08:00 JST（UTC では 2098-09-30）
		await insertExpense(db, userId, categoryId, 700, userId, new Date('2098-09-30T23:00:00Z'));

		const october = await getDashboardSummary(db, { period: 'month', month: '2098-10' });
		const september = await getDashboardSummary(db, { period: 'month', month: '2098-09' });
		expect(october.overall).toBe(700);
		expect(september.overall).toBe(0);
	});

	test('month 未指定の場合、JST の当月の支出を集計できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const categoryId = await insertCategory(db);

		await insertExpense(db, userId, categoryId, 1500, userId, new Date());
		await insertExpense(db, userId, categoryId, 900, userId, new Date('2000-01-15T03:00:00Z'));

		const result = await getDashboardSummary(db, { period: 'month' });
		const explicit = await getDashboardSummary(db, { period: 'month', month: getCurrentMonth() });
		expect(result.overall).toBe(1500);
		expect(explicit.overall).toBe(1500);
	});

	test('支出がない期間の場合、合計 0・支払者別/カテゴリ別は空で取得できる', async () => {
		const db = createDb(env.DB);

		const result = await getDashboardSummary(db, { period: 'month', month: '2097-05' });
		expect(result).toEqual({ overall: 0, byPayer: [], byCategory: [] });
	});
});
