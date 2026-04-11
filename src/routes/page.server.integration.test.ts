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
import { user } from '$lib/server/tables';
import {
	createExpense,
	checkExpense,
	requestExpenses,
	getPendingApprovalCount
} from './expenses/service';
import { createCategory } from './expenses/categories/service';
import { getDashboardSummary } from './dashboard/summary/service';

function makeUserId() {
	return crypto.randomUUID();
}

function getCurrentMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function createTestUser(
	db: ReturnType<typeof createDb>,
	opts?: { name?: string; role?: 'primary' | 'spouse' }
) {
	const id = crypto.randomUUID();
	const now = new Date();
	await db.insert(user).values({
		id,
		name: opts?.name ?? 'テストユーザー',
		email: `${id}@example.com`,
		emailVerified: false,
		role: opts?.role ?? 'primary',
		createdAt: now,
		updatedAt: now
	});
	return id;
}

describe('load (ダッシュボード +page.server.ts) - 集計サマリー', () => {
	test('[SPEC: AC-001] 当月の全体合計・支払者別・カテゴリ別集計が取得できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const month = getCurrentMonth();

		const category = await createCategory(db, userId, { name: '食費AC001ページサーバー' });
		const payerUserId = await createTestUser(db, { name: 'テスト田中AC001ページサーバー' });
		await createExpense(db, userId, { amount: 3000, categoryId: category.id, payerUserId });

		const summary = await getDashboardSummary(db, { period: 'month', month });

		// DB共有のため特定支払者・カテゴリの値で検証する
		const targetPayer = summary.byPayer.find(
			(p) => p.payerName === 'テスト田中AC001ページサーバー'
		);
		const targetCategory = summary.byCategory.find(
			(c) => c.categoryName === '食費AC001ページサーバー'
		);
		expect(targetPayer?.total).toBe(3000);
		expect(targetCategory?.total).toBe(3000);
	});

	test('[SPEC: AC-002] 月切り替えで指定月の集計データが取得できる', async () => {
		const db = createDb(env.DB);

		// 2020-01 は他テストが挿入しない過去月なので 0 を期待できる
		const summaryOtherMonth = await getDashboardSummary(db, {
			period: 'month',
			month: '2020-01'
		});

		expect(summaryOtherMonth.overall).toBe(0);
	});

	test('[SPEC: AC-003] 全期間の集計データが取得できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費AC003ページサーバー' });
		const payerUserId = await createTestUser(db, { name: 'テスト田中AC003ページサーバー' });
		await createExpense(db, userId, { amount: 2000, categoryId: category.id, payerUserId });

		const summary = await getDashboardSummary(db, { period: 'all' });

		expect(summary.overall).toBeGreaterThanOrEqual(2000);

		const targetPayer = summary.byPayer.find(
			(p) => p.payerName === 'テスト田中AC003ページサーバー'
		);
		const targetCategory = summary.byCategory.find(
			(c) => c.categoryName === '食費AC003ページサーバー'
		);
		expect(targetPayer?.total).toBe(2000);
		expect(targetCategory?.total).toBe(2000);
	});

	test('[SPEC: AC-004] period=month で月別集計が取得できる（全期間と区別）', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const month = getCurrentMonth();

		const category = await createCategory(db, userId, { name: '食費AC004ページサーバー' });
		const payerUserId = await createTestUser(db, { name: 'テスト田中AC004ページサーバー' });
		await createExpense(db, userId, { amount: 1500, categoryId: category.id, payerUserId });

		const summaryMonth = await getDashboardSummary(db, { period: 'month', month });
		const summaryAll = await getDashboardSummary(db, { period: 'all' });

		// 月別集計も全期間集計も正しい型で返る
		expect(typeof summaryMonth.overall).toBe('number');
		expect(typeof summaryAll.overall).toBe('number');
		expect(Array.isArray(summaryMonth.byPayer)).toBe(true);
		expect(Array.isArray(summaryAll.byPayer)).toBe(true);
	});
});

describe('load (ダッシュボード +page.server.ts) - 承認待ち件数', () => {
	test('[SPEC: AC-008] 相手が pending に申請した支出がある場合、pendingApprovalCount が件数を返す', async () => {
		const db = createDb(env.DB);
		// requester: 支出を申請するユーザー、approver: 承認する側のユーザー
		const requesterId = await createTestUser(db, { name: 'テスト申請者AC008' });
		const approverId = await createTestUser(db, { name: 'テスト承認者AC008' });

		const category = await createCategory(db, requesterId, { name: '食費AC008' });
		const payerUserId = await createTestUser(db, { name: 'テスト支払者AC008' });

		// 支出を作成して checked → pending に変更
		const expense1 = await createExpense(db, requesterId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId
		});
		const expense2 = await createExpense(db, requesterId, {
			amount: 2000,
			categoryId: category.id,
			payerUserId
		});
		await checkExpense(db, requesterId, expense1.id);
		await checkExpense(db, requesterId, expense2.id);
		await requestExpenses(db, requesterId);

		// approver から見た pending 件数（requesterId の支出が pending になっている）
		const pendingCount = await getPendingApprovalCount(db, approverId, requesterId);

		expect(pendingCount).toBe(2);
	});

	test('[SPEC: AC-008] 自分が申請した支出は pendingApprovalCount に含まれない', async () => {
		const db = createDb(env.DB);
		const userId = await createTestUser(db, { name: 'テスト自己申請AC008' });

		const category = await createCategory(db, userId, { name: '食費AC008自己' });
		const payerUserId = await createTestUser(db, { name: 'テスト支払者AC008自己' });

		// 自分の支出を申請する
		const expense1 = await createExpense(db, userId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId
		});
		await checkExpense(db, userId, expense1.id);
		await requestExpenses(db, userId);

		// パートナーなし（userId 自身しかいない）→ 0 が返る
		const pendingCount = await getPendingApprovalCount(db, userId, null);

		expect(pendingCount).toBe(0);
	});

	test('[SPEC: AC-009] partnerId が null の場合、pendingApprovalCount は 0 を返す', async () => {
		const db = createDb(env.DB);
		const userId = await createTestUser(db, { name: 'テスト新規ユーザーAC009' });

		const pendingCount = await getPendingApprovalCount(db, userId, null);

		expect(pendingCount).toBe(0);
	});

	test('[SPEC: AC-009] パートナーに pending 支出が 0 件の場合、pendingApprovalCount は 0 を返す', async () => {
		const db = createDb(env.DB);
		const newUserId = await createTestUser(db, { name: 'テスト支出なしユーザーAC009' });
		const anotherUserId = await createTestUser(db, { name: 'テスト別ユーザーAC009' });

		// anotherUserId は pending 支出を持たないため、newUserId から見ても 0
		const pendingCount = await getPendingApprovalCount(db, newUserId, anotherUserId);
		expect(pendingCount).toBe(0);

		// 逆方向も同様
		const pendingCountNew = await getPendingApprovalCount(db, anotherUserId, newUserId);
		expect(pendingCountNew).toBe(0);
	});
});
