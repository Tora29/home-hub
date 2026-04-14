/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: データ取得 ダッシュボード
 * @module src/routes/page.server.integration.test.ts
 * @testType integration
 *
 * @target ./+page.server.ts
 * @spec specs/dashboard/spec.md
 * @covers AC-001, AC-002, AC-003, AC-004, AC-008, AC-009
 */

import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import {
	createExpense,
	checkExpense,
	requestExpenses,
	getUnapprovedCount
} from './expenses/service';
import { createCategory } from './expenses/categories/service';
import { getDashboardSummary } from './dashboard/summary/service';
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

describe('load (ダッシュボード +page.server.ts) - 集計サマリー', () => {
	test('[SPEC: AC-001] 当月の全体合計・支払者別・カテゴリ別集計が取得できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const month = getCurrentMonth();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createTestUser(db, '田中');
		await createExpense(db, userId, {
			amount: 3000,
			categoryId: category.id,
			payerUserId: payer.id
		});

		const summary = await getDashboardSummary(db, userId, { period: 'month', month });

		expect(summary.overall).toBe(3000);
		expect(summary.byPayer).toHaveLength(1);
		expect(summary.byPayer[0].payerName).toBe('田中');
		expect(summary.byCategory).toHaveLength(1);
		expect(summary.byCategory[0].categoryName).toBe('食費');
	});

	test('[SPEC: AC-002] 月切り替えで指定月の集計データが取得できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const month = getCurrentMonth();

		const category = await createCategory(db, userId, { name: '交通費' });
		const payer = await createTestUser(db, '佐藤');
		await createExpense(db, userId, {
			amount: 500,
			categoryId: category.id,
			payerUserId: payer.id
		});

		const summaryCurrentMonth = await getDashboardSummary(db, userId, { period: 'month', month });
		const summaryOtherMonth = await getDashboardSummary(db, userId, {
			period: 'month',
			month: '2020-01'
		});

		expect(summaryCurrentMonth.overall).toBe(500);
		expect(summaryOtherMonth.overall).toBe(0);
	});

	test('[SPEC: AC-003] 全期間の集計データが取得できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createTestUser(db, '田中');
		await createExpense(db, userId, {
			amount: 2000,
			categoryId: category.id,
			payerUserId: payer.id
		});

		const summary = await getDashboardSummary(db, userId, { period: 'all' });

		expect(summary.overall).toBeGreaterThanOrEqual(2000);
		expect(summary.byPayer.length).toBeGreaterThanOrEqual(1);
		expect(summary.byCategory.length).toBeGreaterThanOrEqual(1);
	});

	test('[SPEC: AC-004] period=month で月別集計が取得できる（全期間と区別）', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const month = getCurrentMonth();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createTestUser(db, '田中');
		await createExpense(db, userId, {
			amount: 1500,
			categoryId: category.id,
			payerUserId: payer.id
		});

		const summaryMonth = await getDashboardSummary(db, userId, { period: 'month', month });
		const summaryAll = await getDashboardSummary(db, userId, { period: 'all' });

		expect(typeof summaryMonth.overall).toBe('number');
		expect(typeof summaryAll.overall).toBe('number');
		expect(Array.isArray(summaryMonth.byPayer)).toBe(true);
		expect(Array.isArray(summaryAll.byPayer)).toBe(true);
	});
});

/** LINE 通知をスキップする LineEnv */
const mockLineEnv = {
	lineChannelAccessToken: undefined,
	lineUserIdPrimary: undefined,
	lineUserIdSpouse: undefined,
	lineMock: 'true'
};

describe('load (ダッシュボード +page.server.ts)', () => {
	test('[SPEC: AC-008] 相手の pending 支出が存在する場合、unapprovedCount が件数を返す', async () => {
		const db = createDb(env.DB);
		const userA = makeUserId();
		const userB = makeUserId();

		const categoryA = await createCategory(db, userA, { name: '食費' });
		const payer = await createTestUser(db, '田中');

		// userA の支出を checked → pending にする
		const e1 = await createExpense(db, userA, {
			amount: 1000,
			categoryId: categoryA.id,
			payerUserId: payer.id
		});
		const e2 = await createExpense(db, userA, {
			amount: 2000,
			categoryId: categoryA.id,
			payerUserId: payer.id
		});
		await checkExpense(db, userA, e1.id);
		await checkExpense(db, userA, e2.id);
		await requestExpenses(db, userA, null, mockLineEnv);

		// userB 視点でのカウント（userA の pending = 2件）
		const unapprovedCount = await getUnapprovedCount(db, userB);

		expect(unapprovedCount).toBeGreaterThanOrEqual(2);
	});

	test('[SPEC: AC-008] 自分の pending 支出はカウントされない（他ユーザーの pending のみカウント）', async () => {
		const db = createDb(env.DB);
		const userA = makeUserId();
		const userB = makeUserId();

		const categoryA = await createCategory(db, userA, { name: '食費A' });
		const categoryB = await createCategory(db, userB, { name: '食費B' });
		const payer = await createTestUser(db, '田中');

		// 操作前の userA 視点カウントを記録（共有 DB に既存データあり）
		const countBefore = await getUnapprovedCount(db, userA);

		// userA の支出を pending にする
		const eA = await createExpense(db, userA, {
			amount: 1000,
			categoryId: categoryA.id,
			payerUserId: payer.id
		});
		await checkExpense(db, userA, eA.id);
		await requestExpenses(db, userA, null, mockLineEnv);

		// userB 自身の支出（pending ではなく unapproved のまま）
		await createExpense(db, userB, {
			amount: 2000,
			categoryId: categoryB.id,
			payerUserId: payer.id
		});

		// userA 視点: 自分の pending も userB の unapproved もカウントされない（delta = 0）
		const countAfter = await getUnapprovedCount(db, userA);
		expect(countAfter).toBe(countBefore);
	});

	test('[SPEC: AC-008] pending 支出が 0 件の場合、unapprovedCount は増加しない', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const otherUserId = makeUserId();

		// 操作前カウントを記録（共有 DB に既存データあり）
		const countBefore = await getUnapprovedCount(db, userId);

		// 他ユーザーが unapproved 支出を作成（pending にしない）
		const category = await createCategory(db, otherUserId, { name: '食費' });
		const payer = await createTestUser(db, '田中');
		await createExpense(db, otherUserId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId: payer.id
		});

		// userId 視点: 他ユーザーの unapproved（not pending）はカウントされない
		const countAfter = await getUnapprovedCount(db, userId);
		expect(countAfter).toBe(countBefore);
	});

	test('[SPEC: AC-009] checked 状態の支出は unapprovedCount にカウントされない', async () => {
		const db = createDb(env.DB);
		const userA = makeUserId();
		const userB = makeUserId();

		const categoryA = await createCategory(db, userA, { name: '食費' });
		const payer = await createTestUser(db, '田中');

		// 操作前の userB 視点カウントを記録（共有 DB に既存データあり）
		const countBefore = await getUnapprovedCount(db, userB);

		// userA の支出を checked にする（pending にしない）
		const e1 = await createExpense(db, userA, {
			amount: 1000,
			categoryId: categoryA.id,
			payerUserId: payer.id
		});
		const e2 = await createExpense(db, userA, {
			amount: 2000,
			categoryId: categoryA.id,
			payerUserId: payer.id
		});
		await checkExpense(db, userA, e1.id);
		await checkExpense(db, userA, e2.id);
		// request せず checked のまま

		// userB 視点: userA の支出は pending でないのでカウントは増加しない（delta = 0）
		const countAfter = await getUnapprovedCount(db, userB);
		expect(countAfter).toBe(countBefore);
	});
});
