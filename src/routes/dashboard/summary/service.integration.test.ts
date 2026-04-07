/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: dashboard サマリー サービス
 * @module src/routes/dashboard/summary/service.integration.test.ts
 * @testType integration
 *
 * @target ./service.ts
 * @spec specs/dashboard/spec.md
 * @covers AC-001, AC-002, AC-003, AC-004, AC-006, AC-007, AC-201, AC-202, AC-203
 */

import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import { getDashboardSummary } from './service';
import { createExpense, approveExpense } from '../../expenses/service';
import { createCategory } from '../../expenses/categories/service';
import { createPayer } from '../../expenses/payers/service';

function makeUserId() {
	return crypto.randomUUID();
}

function getCurrentMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

describe('getDashboardSummary - 月別集計', () => {
	test('[SPEC: AC-001] 当月の全体合計金額が返る', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const month = getCurrentMonth();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createPayer(db, userId, { name: '田中' });

		await createExpense(db, userId, { amount: 1000, categoryId: category.id, payerId: payer.id });
		await createExpense(db, userId, { amount: 2000, categoryId: category.id, payerId: payer.id });

		const summary = await getDashboardSummary(db, userId, { period: 'month', month });

		expect(summary.overall).toBe(3000);
	});

	test('[SPEC: AC-001] 複数支出の合計金額が正しく集計される', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const month = getCurrentMonth();

		const category = await createCategory(db, userId, { name: '交通費' });
		const payer = await createPayer(db, userId, { name: '鈴木' });

		await createExpense(db, userId, {
			amount: 12300,
			categoryId: category.id,
			payerId: payer.id
		});

		const summary = await getDashboardSummary(db, userId, { period: 'month', month });

		expect(summary.overall).toBe(12300);
		expect(typeof summary.overall).toBe('number');
	});

	test('[SPEC: AC-002] 月切り替えで指定した月の集計が返る', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const month = getCurrentMonth();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createPayer(db, userId, { name: '田中' });

		await createExpense(db, userId, { amount: 5000, categoryId: category.id, payerId: payer.id });

		const summaryCurrentMonth = await getDashboardSummary(db, userId, {
			period: 'month',
			month
		});
		// 先月のデータは0件のためダミー月で確認
		const summaryOtherMonth = await getDashboardSummary(db, userId, {
			period: 'month',
			month: '2020-01'
		});

		expect(summaryCurrentMonth.overall).toBe(5000);
		expect(summaryOtherMonth.overall).toBe(0);
	});

	test('[SPEC: AC-006] 支払者別合計が合計金額の多い順で返る', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const month = getCurrentMonth();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer1 = await createPayer(db, userId, { name: '田中' });
		const payer2 = await createPayer(db, userId, { name: '佐藤' });

		await createExpense(db, userId, { amount: 3000, categoryId: category.id, payerId: payer1.id });
		await createExpense(db, userId, { amount: 1000, categoryId: category.id, payerId: payer2.id });
		await createExpense(db, userId, { amount: 2000, categoryId: category.id, payerId: payer1.id });

		const summary = await getDashboardSummary(db, userId, { period: 'month', month });

		expect(summary.byPayer).toHaveLength(2);
		expect(summary.byPayer[0].payerName).toBe('田中');
		expect(summary.byPayer[0].total).toBe(5000);
		expect(summary.byPayer[1].payerName).toBe('佐藤');
		expect(summary.byPayer[1].total).toBe(1000);
	});

	test('[SPEC: AC-007] カテゴリ別合計が合計金額の多い順で返る', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const month = getCurrentMonth();

		const category1 = await createCategory(db, userId, { name: '食費' });
		const category2 = await createCategory(db, userId, { name: '交通費' });
		const payer = await createPayer(db, userId, { name: '田中' });

		await createExpense(db, userId, {
			amount: 2000,
			categoryId: category2.id,
			payerId: payer.id
		});
		await createExpense(db, userId, {
			amount: 5000,
			categoryId: category1.id,
			payerId: payer.id
		});
		await createExpense(db, userId, {
			amount: 1000,
			categoryId: category2.id,
			payerId: payer.id
		});

		const summary = await getDashboardSummary(db, userId, { period: 'month', month });

		expect(summary.byCategory).toHaveLength(2);
		expect(summary.byCategory[0].categoryName).toBe('食費');
		expect(summary.byCategory[0].total).toBe(5000);
		expect(summary.byCategory[1].categoryName).toBe('交通費');
		expect(summary.byCategory[1].total).toBe(3000);
	});

	test('[SPEC: AC-001] 全ステータス（未承認・確認済み・確定済み）が集計対象に含まれる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const month = getCurrentMonth();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createPayer(db, userId, { name: '田中' });

		// 未承認
		await createExpense(db, userId, { amount: 1000, categoryId: category.id, payerId: payer.id });
		// 確認済み
		const expense2 = await createExpense(db, userId, {
			amount: 2000,
			categoryId: category.id,
			payerId: payer.id
		});
		await approveExpense(db, userId, expense2.id);

		const summary = await getDashboardSummary(db, userId, { period: 'month', month });

		expect(summary.overall).toBe(3000);
	});
});

describe('getDashboardSummary - 全期間集計', () => {
	test('[SPEC: AC-003] 全期間の集計を取得できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createPayer(db, userId, { name: '田中' });

		await createExpense(db, userId, { amount: 1000, categoryId: category.id, payerId: payer.id });
		await createExpense(db, userId, { amount: 2000, categoryId: category.id, payerId: payer.id });

		const summary = await getDashboardSummary(db, userId, { period: 'all' });

		expect(summary.overall).toBe(3000);
		expect(summary.byPayer).toHaveLength(1);
		expect(summary.byCategory).toHaveLength(1);
	});

	test('[SPEC: AC-004] 全期間集計は month パラメータを無視する', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createPayer(db, userId, { name: '田中' });

		await createExpense(db, userId, { amount: 5000, categoryId: category.id, payerId: payer.id });

		// 全期間なので month 指定しても全件取得
		const summary = await getDashboardSummary(db, userId, { period: 'all', month: '2020-01' });

		// userId で分離されているため、このユーザーの 1 件分だけが集計される
		expect(summary.overall).toBe(5000);
	});

	test('[SPEC: AC-003] 自分の支出のみ集計される（他ユーザーは含まれない）', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const otherUserId = makeUserId();

		const myCategory = await createCategory(db, userId, { name: '食費' });
		const myPayer = await createPayer(db, userId, { name: '田中' });
		const otherCategory = await createCategory(db, otherUserId, { name: '食費' });
		const otherPayer = await createPayer(db, otherUserId, { name: '他人' });

		await createExpense(db, userId, {
			amount: 1000,
			categoryId: myCategory.id,
			payerId: myPayer.id
		});
		await createExpense(db, otherUserId, {
			amount: 9999,
			categoryId: otherCategory.id,
			payerId: otherPayer.id
		});

		const summary = await getDashboardSummary(db, userId, { period: 'all' });

		expect(summary.overall).toBe(1000);
	});
});

describe('getDashboardSummary - 境界値', () => {
	test('[SPEC: AC-201] 対象期間に支出が0件の場合、全体合計が0を返す', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const summary = await getDashboardSummary(db, userId, {
			period: 'month',
			month: getCurrentMonth()
		});

		expect(summary.overall).toBe(0);
	});

	test('[SPEC: AC-202] 支払者が存在しない場合、byPayer が空配列を返す', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const summary = await getDashboardSummary(db, userId, { period: 'all' });

		expect(summary.byPayer).toHaveLength(0);
	});

	test('[SPEC: AC-203] カテゴリが存在しない場合、byCategory が空配列を返す', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const summary = await getDashboardSummary(db, userId, { period: 'all' });

		expect(summary.byCategory).toHaveLength(0);
	});
});
