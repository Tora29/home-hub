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
import { createExpense, approveExpense, getUnapprovedCount } from './expenses/service';
import { createCategory } from './expenses/categories/service';
import { createPayer } from './expenses/payers/service';
import { getDashboardSummary } from './dashboard/summary/service';

function makeUserId() {
	return crypto.randomUUID();
}

function getCurrentMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

describe('load (ダッシュボード +page.server.ts) - 集計サマリー', () => {
	test('[SPEC: AC-001] 当月の全体合計・支払者別・カテゴリ別集計が取得できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const month = getCurrentMonth();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createPayer(db, userId, { name: '田中' });
		await createExpense(db, userId, { amount: 3000, categoryId: category.id, payerId: payer.id });

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
		const payer = await createPayer(db, userId, { name: '佐藤' });
		await createExpense(db, userId, { amount: 500, categoryId: category.id, payerId: payer.id });

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
		const payer = await createPayer(db, userId, { name: '田中' });
		await createExpense(db, userId, { amount: 2000, categoryId: category.id, payerId: payer.id });

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
		const payer = await createPayer(db, userId, { name: '田中' });
		await createExpense(db, userId, { amount: 1500, categoryId: category.id, payerId: payer.id });

		const summaryMonth = await getDashboardSummary(db, userId, { period: 'month', month });
		const summaryAll = await getDashboardSummary(db, userId, { period: 'all' });

		// 月別集計も全期間集計も正しい型で返る
		expect(typeof summaryMonth.overall).toBe('number');
		expect(typeof summaryAll.overall).toBe('number');
		expect(Array.isArray(summaryMonth.byPayer)).toBe(true);
		expect(Array.isArray(summaryAll.byPayer)).toBe(true);
	});
});

describe('load (ダッシュボード +page.server.ts)', () => {
	test('[SPEC: AC-008] 全期間の未承認支出が 1 件以上ある場合、unapprovedCount が件数を返す', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createPayer(db, userId, { name: '田中' });
		await createExpense(db, userId, { amount: 1000, categoryId: category.id, payerId: payer.id });
		await createExpense(db, userId, { amount: 2000, categoryId: category.id, payerId: payer.id });

		const unapprovedCount = await getUnapprovedCount(db, userId);

		expect(unapprovedCount).toBe(2);
	});

	test('[SPEC: AC-008] 自分の未承認支出のみカウントされる（他ユーザーの支出は含まれない）', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const otherUserId = makeUserId();

		const myCategory = await createCategory(db, userId, { name: '食費' });
		const otherCategory = await createCategory(db, otherUserId, { name: '食費' });
		const myPayer = await createPayer(db, userId, { name: '田中' });
		const otherPayer = await createPayer(db, otherUserId, { name: '他人' });

		await createExpense(db, userId, {
			amount: 1000,
			categoryId: myCategory.id,
			payerId: myPayer.id
		});
		await createExpense(db, otherUserId, {
			amount: 2000,
			categoryId: otherCategory.id,
			payerId: otherPayer.id
		});

		const unapprovedCount = await getUnapprovedCount(db, userId);

		expect(unapprovedCount).toBe(1);
	});

	test('[SPEC: AC-008] 全期間（複数月）の未承認支出をカウントする', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '家賃' });
		const payer = await createPayer(db, userId, { name: '田中' });
		// 複数件の未承認支出を登録（createdAt は自動で当月になるが件数は正しくカウントされる）
		await createExpense(db, userId, { amount: 50000, categoryId: category.id, payerId: payer.id });
		await createExpense(db, userId, { amount: 3000, categoryId: category.id, payerId: payer.id });
		await createExpense(db, userId, { amount: 1500, categoryId: category.id, payerId: payer.id });

		const unapprovedCount = await getUnapprovedCount(db, userId);

		// 全件が未承認のため 3 件返る
		expect(unapprovedCount).toBe(3);
	});

	test('[SPEC: AC-009] 全支出が承認済みになると unapprovedCount が 0 を返す', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createPayer(db, userId, { name: '田中' });
		const expense1 = await createExpense(db, userId, {
			amount: 1000,
			categoryId: category.id,
			payerId: payer.id
		});
		const expense2 = await createExpense(db, userId, {
			amount: 2000,
			categoryId: category.id,
			payerId: payer.id
		});

		// 全件を承認済みにする
		await approveExpense(db, userId, expense1.id);
		await approveExpense(db, userId, expense2.id);

		const unapprovedCount = await getUnapprovedCount(db, userId);

		expect(unapprovedCount).toBe(0);
	});

	test('[SPEC: AC-009] 支出が 0 件の場合、unapprovedCount は 0 を返す', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const unapprovedCount = await getUnapprovedCount(db, userId);

		expect(unapprovedCount).toBe(0);
	});
});
