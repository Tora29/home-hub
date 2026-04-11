/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: dashboard サマリー サービス
 * @module src/routes/dashboard/summary/service.integration.test.ts
 * @testType integration
 *
 * @target ./service.ts
 * @spec specs/dashboard/spec.md
 * @covers AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-201, AC-202, AC-203
 */

import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import { user } from '$lib/server/tables';
import { getDashboardSummary } from './service';
import { createExpense, checkExpense } from '../../expenses/service';
import { createCategory } from '../../expenses/categories/service';

function makeUserId() {
	return crypto.randomUUID();
}

function getCurrentMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * User テーブルにテストユーザーを挿入するヘルパー。
 * getDashboardSummary の byPayer 集計が User テーブルを JOIN するため、
 * 支払者 ID に対応するユーザーを事前に作成する必要がある。
 */
async function createTestUser(
	db: ReturnType<typeof createDb>,
	name: string
): Promise<{ id: string; name: string }> {
	const id = makeUserId();
	const now = new Date();
	await db.insert(user).values({
		id,
		name,
		email: `${id}@test.example.com`,
		emailVerified: true,
		createdAt: now,
		updatedAt: now
	});
	return { id, name };
}

describe('getDashboardSummary - 月別集計', () => {
	test('[SPEC: AC-001] 当月の全体合計金額が返る', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = (await createTestUser(db, `ユーザー_${Date.now()}`)).id;
		const month = getCurrentMonth();

		const category = await createCategory(db, userId, { name: '食費' });

		await createExpense(db, userId, { amount: 1000, categoryId: category.id, payerUserId });
		await createExpense(db, userId, { amount: 2000, categoryId: category.id, payerUserId });

		const summary = await getDashboardSummary(db, { period: 'month', month });

		expect(summary.overall).toBeGreaterThanOrEqual(3000);
	});

	test('[SPEC: AC-005] 全体合計金額が数値として返る', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = (await createTestUser(db, `ユーザー_${Date.now()}`)).id;
		const month = getCurrentMonth();

		const category = await createCategory(db, userId, { name: '交通費' });

		await createExpense(db, userId, {
			amount: 12300,
			categoryId: category.id,
			payerUserId
		});

		const summary = await getDashboardSummary(db, { period: 'month', month });

		expect(typeof summary.overall).toBe('number');
		expect(summary.overall).toBeGreaterThanOrEqual(12300);
	});

	test('[SPEC: AC-001] 全ユーザーの支出が世帯合計として集計される', async () => {
		const db = createDb(env.DB);
		const userId1 = makeUserId();
		const userId2 = makeUserId();
		const payerUserId = (await createTestUser(db, `ユーザー_${Date.now()}`)).id;
		const month = getCurrentMonth();

		const category1 = await createCategory(db, userId1, { name: '食費_世帯テスト' });
		const category2 = await createCategory(db, userId2, { name: '交通費_世帯テスト' });

		await createExpense(db, userId1, {
			amount: 1111,
			categoryId: category1.id,
			payerUserId
		});
		await createExpense(db, userId2, {
			amount: 2222,
			categoryId: category2.id,
			payerUserId
		});

		const summary = await getDashboardSummary(db, { period: 'month', month });

		// 両ユーザーの支出合計 3333 が含まれていること（世帯集計）
		expect(summary.overall).toBeGreaterThanOrEqual(3333);
	});

	test('[SPEC: AC-001] 全ステータス（unapproved・checked）が集計対象に含まれる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = (await createTestUser(db, `ユーザー_${Date.now()}`)).id;
		const month = getCurrentMonth();

		const category = await createCategory(db, userId, { name: '食費_ステータステスト' });

		// unapproved
		await createExpense(db, userId, { amount: 1000, categoryId: category.id, payerUserId });
		// checked
		const expense2 = await createExpense(db, userId, {
			amount: 2000,
			categoryId: category.id,
			payerUserId
		});
		await checkExpense(db, userId, expense2.id);

		const summary = await getDashboardSummary(db, { period: 'month', month });

		// unapproved(1000) + checked(2000) = 3000 が含まれていること
		expect(summary.overall).toBeGreaterThanOrEqual(3000);
	});

	test('[SPEC: AC-002] 月切り替えで指定した月の集計が返る', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = (await createTestUser(db, `ユーザー_${Date.now()}`)).id;
		const month = getCurrentMonth();

		const category = await createCategory(db, userId, { name: '食費_月別テスト' });
		await createExpense(db, userId, { amount: 5555, categoryId: category.id, payerUserId });

		const summaryCurrentMonth = await getDashboardSummary(db, { period: 'month', month });
		const summaryOtherMonth = await getDashboardSummary(db, { period: 'month', month: '2020-01' });

		expect(summaryCurrentMonth.overall).toBeGreaterThanOrEqual(5555);
		// 2020-01 のデータは存在しないため、別ユーザー分のみ or 0
		// 少なくとも 5555 より小さいことを確認（当月データが混入しない）
		expect(summaryOtherMonth.overall).toBeLessThan(summaryCurrentMonth.overall);
	});

	test('[SPEC: AC-006] 支払者別合計が合計金額の多い順で返る', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const month = getCurrentMonth();

		const userA = await createTestUser(db, `田中_${Date.now()}`);
		const userB = await createTestUser(db, `佐藤_${Date.now()}`);

		const category = await createCategory(db, userId, { name: '食費_支払者テスト' });

		// userA: 3000 + 2000 = 5000
		await createExpense(db, userId, {
			amount: 3000,
			categoryId: category.id,
			payerUserId: userA.id
		});
		await createExpense(db, userId, {
			amount: 2000,
			categoryId: category.id,
			payerUserId: userA.id
		});
		// userB: 1000
		await createExpense(db, userId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId: userB.id
		});

		const summary = await getDashboardSummary(db, { period: 'month', month });

		// 2名分の支払者別集計が含まれていること
		const payerEntries = summary.byPayer.filter(
			(p) => p.payerId === userA.id || p.payerId === userB.id
		);
		expect(payerEntries).toHaveLength(2);

		const payerAEntry = payerEntries.find((p) => p.payerId === userA.id);
		const payerBEntry = payerEntries.find((p) => p.payerId === userB.id);

		expect(payerAEntry).toBeDefined();
		expect(payerAEntry!.total).toBe(5000);
		expect(payerAEntry!.payerName).toBe(userA.name);

		expect(payerBEntry).toBeDefined();
		expect(payerBEntry!.total).toBe(1000);

		// 多い順にソートされていること
		const payerAIndex = summary.byPayer.findIndex((p) => p.payerId === userA.id);
		const payerBIndex = summary.byPayer.findIndex((p) => p.payerId === userB.id);
		expect(payerAIndex).toBeLessThan(payerBIndex);
	});

	test('[SPEC: AC-007] カテゴリ別合計が合計金額の多い順で返る', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = (await createTestUser(db, `ユーザー_${Date.now()}`)).id;
		const month = getCurrentMonth();

		const category1 = await createCategory(db, userId, {
			name: `食費_カテゴリテスト_${Date.now()}`
		});
		const category2 = await createCategory(db, userId, {
			name: `交通費_カテゴリテスト_${Date.now()}`
		});

		await createExpense(db, userId, { amount: 2000, categoryId: category2.id, payerUserId });
		await createExpense(db, userId, { amount: 5000, categoryId: category1.id, payerUserId });
		await createExpense(db, userId, { amount: 1000, categoryId: category2.id, payerUserId });

		const summary = await getDashboardSummary(db, { period: 'month', month });

		const cat1Entry = summary.byCategory.find((c) => c.categoryId === category1.id);
		const cat2Entry = summary.byCategory.find((c) => c.categoryId === category2.id);

		expect(cat1Entry).toBeDefined();
		expect(cat1Entry!.total).toBe(5000);
		expect(cat1Entry!.categoryName).toBe(category1.name);

		expect(cat2Entry).toBeDefined();
		expect(cat2Entry!.total).toBe(3000);

		// 多い順（食費 5000 > 交通費 3000）
		const cat1Index = summary.byCategory.findIndex((c) => c.categoryId === category1.id);
		const cat2Index = summary.byCategory.findIndex((c) => c.categoryId === category2.id);
		expect(cat1Index).toBeLessThan(cat2Index);
	});
});

describe('getDashboardSummary - 全期間集計', () => {
	test('[SPEC: AC-003] 全期間の集計を取得できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = (await createTestUser(db, `ユーザー_${Date.now()}`)).id;

		const category = await createCategory(db, userId, { name: '食費_全期間テスト' });

		await createExpense(db, userId, { amount: 1000, categoryId: category.id, payerUserId });
		await createExpense(db, userId, { amount: 2000, categoryId: category.id, payerUserId });

		const summary = await getDashboardSummary(db, { period: 'all' });

		expect(summary.overall).toBeGreaterThanOrEqual(3000);
		expect(Array.isArray(summary.byPayer)).toBe(true);
		expect(Array.isArray(summary.byCategory)).toBe(true);
	});

	test('[SPEC: AC-004] 全期間集計は month パラメータを無視する', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = (await createTestUser(db, `ユーザー_${Date.now()}`)).id;

		const category = await createCategory(db, userId, { name: '食費_全期間月無視テスト' });
		await createExpense(db, userId, { amount: 7777, categoryId: category.id, payerUserId });

		// period=all なので month=2020-01 を指定しても当月データが取得される
		const summaryAllWithPastMonth = await getDashboardSummary(db, {
			period: 'all',
			month: '2020-01'
		});
		const summaryAll = await getDashboardSummary(db, { period: 'all' });

		// どちらも全期間集計なので同じ overall が返る
		expect(summaryAllWithPastMonth.overall).toBe(summaryAll.overall);
		expect(summaryAllWithPastMonth.overall).toBeGreaterThanOrEqual(7777);
	});
});

describe('getDashboardSummary - 境界値', () => {
	test('[SPEC: AC-201] 対象期間に支出が0件の場合、全体合計が0を返す', async () => {
		const db = createDb(env.DB);

		const summary = await getDashboardSummary(db, {
			period: 'month',
			month: '2001-01'
		});

		expect(summary.overall).toBe(0);
	});

	test('[SPEC: AC-202] 支払者別集計対象の支出がない場合、byPayer が空配列を返す', async () => {
		const db = createDb(env.DB);

		const summary = await getDashboardSummary(db, { period: 'month', month: '2001-02' });

		expect(summary.byPayer).toHaveLength(0);
	});

	test('[SPEC: AC-203] カテゴリ別集計対象の支出がない場合、byCategory が空配列を返す', async () => {
		const db = createDb(env.DB);

		const summary = await getDashboardSummary(db, { period: 'month', month: '2001-03' });

		expect(summary.byCategory).toHaveLength(0);
	});
});
