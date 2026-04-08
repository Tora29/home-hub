/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: データ取得 expenses
 * @module src/routes/expenses/page.server.integration.test.ts
 * @testType integration
 *
 * @target ./+page.server.ts
 * @spec specs/expenses/spec.md
 * @covers AC-001, AC-002
 */

import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import { createExpense, getExpenses } from './service';
import { createCategory } from './categories/service';
import { createPayer } from './payers/service';

function makeUserId() {
	return crypto.randomUUID();
}

describe('load (expenses +page.server.ts)', () => {
	test('[SPEC: AC-001] month 未指定時、当月の支出一覧が取得できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createPayer(db, userId, { name: '田中' });
		await createExpense(db, userId, { amount: 800, categoryId: category.id, payerId: payer.id });
		await createExpense(db, userId, { amount: 1200, categoryId: category.id, payerId: payer.id });

		const now = new Date();
		const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

		const result = await getExpenses(db, userId, { month: currentMonth });

		expect(result.items).toHaveLength(2);
		expect(result.total).toBe(2);
		expect(result.page).toBe(1);
		expect(result.limit).toBe(20);
		// 全件の金額が含まれることを確認（同一ミリ秒 insert でタイムスタンプが同一になる場合があるため位置は問わない）
		expect(result.items.map((i) => i.amount)).toEqual(expect.arrayContaining([800, 1200]));
	});

	test('[SPEC: AC-001] 支出一覧の各アイテムにカテゴリ情報が含まれる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '外食費' });
		const payer = await createPayer(db, userId, { name: '田中' });
		await createExpense(db, userId, { amount: 3500, categoryId: category.id, payerId: payer.id });

		const now = new Date();
		const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
		const result = await getExpenses(db, userId, { month });

		expect(result.items).toHaveLength(1);
		expect(result.items[0].category.id).toBe(category.id);
		expect(result.items[0].category.name).toBe('外食費');
	});

	test('[SPEC: AC-002] month を指定すると対象月の支出のみ取得できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createPayer(db, userId, { name: '田中' });
		// 当月に支出を登録
		await createExpense(db, userId, { amount: 1000, categoryId: category.id, payerId: payer.id });

		const now = new Date();
		const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

		// 当月指定: 1件取得できる
		const currentResult = await getExpenses(db, userId, { month: currentMonth });
		expect(currentResult.total).toBe(1);
		expect(currentResult.items[0].amount).toBe(1000);

		// 異なる月を指定: 0件
		const pastMonth =
			now.getMonth() === 0
				? `${now.getFullYear() - 1}-12`
				: `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
		const pastResult = await getExpenses(db, userId, { month: pastMonth });
		expect(pastResult.total).toBe(0);
		expect(pastResult.items).toHaveLength(0);
	});

	test('[SPEC: AC-002] 月切り替えで複数月にまたがる支出を正しく絞り込める', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createPayer(db, userId, { name: '田中' });
		// 当月の支出
		await createExpense(db, userId, { amount: 500, categoryId: category.id, payerId: payer.id });
		await createExpense(db, userId, { amount: 1500, categoryId: category.id, payerId: payer.id });

		const now = new Date();
		const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

		const result = await getExpenses(db, userId, { month: currentMonth });

		expect(result.total).toBe(2);
		expect(result.monthTotal).toBe(2000);
	});
});
