/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: データ取得 ダッシュボード
 * @module src/routes/page.server.integration.test.ts
 * @testType integration
 *
 * @target ./+page.server.ts
 * @spec specs/expenses/spec.md
 * @covers AC-008, AC-009
 */

import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import { createExpense, updateExpense, getUnapprovedCount } from './expenses/service';
import { createCategory } from './expenses/categories/service';

function makeUserId() {
	return crypto.randomUUID();
}

describe('load (ダッシュボード +page.server.ts)', () => {
	test('[SPEC: AC-008] 全期間の未承認支出が 1 件以上ある場合、unapprovedCount が件数を返す', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		await createExpense(db, userId, { amount: 1000, categoryId: category.id });
		await createExpense(db, userId, { amount: 2000, categoryId: category.id });

		const unapprovedCount = await getUnapprovedCount(db, userId);

		expect(unapprovedCount).toBe(2);
	});

	test('[SPEC: AC-008] 自分の未承認支出のみカウントされる（他ユーザーの支出は含まれない）', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const otherUserId = makeUserId();

		const myCategory = await createCategory(db, userId, { name: '食費' });
		const otherCategory = await createCategory(db, otherUserId, { name: '食費' });

		await createExpense(db, userId, { amount: 1000, categoryId: myCategory.id });
		await createExpense(db, otherUserId, { amount: 2000, categoryId: otherCategory.id });

		const unapprovedCount = await getUnapprovedCount(db, userId);

		expect(unapprovedCount).toBe(1);
	});

	test('[SPEC: AC-008] 全期間（複数月）の未承認支出をカウントする', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '家賃' });
		// 複数件の未承認支出を登録（createdAt は自動で当月になるが件数は正しくカウントされる）
		await createExpense(db, userId, { amount: 50000, categoryId: category.id });
		await createExpense(db, userId, { amount: 3000, categoryId: category.id });
		await createExpense(db, userId, { amount: 1500, categoryId: category.id });

		const unapprovedCount = await getUnapprovedCount(db, userId);

		// 全件が未承認のため 3 件返る
		expect(unapprovedCount).toBe(3);
	});

	test('[SPEC: AC-009] 全支出が承認済みになると unapprovedCount が 0 を返す', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const expense1 = await createExpense(db, userId, { amount: 1000, categoryId: category.id });
		const expense2 = await createExpense(db, userId, { amount: 2000, categoryId: category.id });

		// 全件を承認済みにする
		await updateExpense(db, userId, expense1.id, {
			amount: 1000,
			categoryId: category.id,
			approved: true
		});
		await updateExpense(db, userId, expense2.id, {
			amount: 2000,
			categoryId: category.id,
			approved: true
		});

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
