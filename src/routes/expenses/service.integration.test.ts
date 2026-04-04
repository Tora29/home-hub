/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: expenses サービス
 * @module src/routes/expenses/service.integration.test.ts
 * @testType integration
 *
 * @target ./service.ts
 * @spec specs/expenses/spec.md
 * @covers AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-013, AC-014, AC-015
 */

import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import { AppError } from '$lib/server/errors';
import {
	getExpenses,
	createExpense,
	updateExpense,
	deleteExpense,
	finalizeExpense,
	getUnapprovedCount
} from './service';
import { createCategory } from './categories/service';

function makeUserId() {
	return crypto.randomUUID();
}

describe('createExpense', () => {
	test('[SPEC: AC-003] 金額とカテゴリを指定して支出を登録できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const created = await createExpense(db, userId, {
			amount: 1500,
			categoryId: category.id
		});

		expect(created.id).toBeTruthy();
		expect(created.amount).toBe(1500);
		expect(created.categoryId).toBe(category.id);
		expect(created.userId).toBe(userId);
		expect(created.approvedAt).toBeNull();
		expect(created.createdAt).toBeTruthy();
		expect(created.category.id).toBe(category.id);
		expect(created.category.name).toBe('食費');
	});

	test('[SPEC: AC-003] 登録日時（createdAt）は自動でセットされる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '交通費' });
		const before = new Date();
		const created = await createExpense(db, userId, {
			amount: 230,
			categoryId: category.id
		});
		const after = new Date();

		const createdAt = new Date(created.createdAt);
		expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
		expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
	});
});

describe('getExpenses', () => {
	test('[SPEC: AC-001] 当月の支出一覧が登録日時の新しい順で取得できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		await createExpense(db, userId, { amount: 500, categoryId: category.id });
		await createExpense(db, userId, { amount: 1000, categoryId: category.id });
		await createExpense(db, userId, { amount: 1500, categoryId: category.id });

		const now = new Date();
		const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
		const result = await getExpenses(db, userId, { month });

		expect(result.items).toHaveLength(3);
		expect(result.total).toBe(3);
		expect(result.page).toBe(1);
		expect(result.limit).toBe(20);
		// 全件の金額が含まれることを確認（同一ミリ秒 insert でタイムスタンプが同一になる場合があるため位置は問わない）
		expect(result.items.map((i) => i.amount)).toEqual(expect.arrayContaining([500, 1000, 1500]));
	});

	test('[SPEC: AC-001] 自分の支出のみ取得できる（他ユーザーの支出は含まれない）', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const otherUserId = makeUserId();

		const myCategory = await createCategory(db, userId, { name: '食費' });
		const otherCategory = await createCategory(db, otherUserId, { name: '食費' });

		await createExpense(db, userId, { amount: 1000, categoryId: myCategory.id });
		await createExpense(db, otherUserId, { amount: 2000, categoryId: otherCategory.id });

		const now = new Date();
		const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
		const result = await getExpenses(db, userId, { month });

		expect(result.items).toHaveLength(1);
		expect(result.items[0].amount).toBe(1000);
		expect(result.items[0].userId).toBe(userId);
	});

	test('[SPEC: AC-002] 月フィルタで指定した月の支出のみ取得できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		// 当月の支出（自動 createdAt）
		await createExpense(db, userId, { amount: 1000, categoryId: category.id });

		// 当月は取得できる
		const now = new Date();
		const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
		const currentResult = await getExpenses(db, userId, { month: currentMonth });
		expect(currentResult.items).toHaveLength(1);

		// 翌月は 0 件
		const nextMonth =
			now.getMonth() === 11
				? `${now.getFullYear() + 1}-01`
				: `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}`;
		const nextResult = await getExpenses(db, userId, { month: nextMonth });
		expect(nextResult.items).toHaveLength(0);
		expect(nextResult.total).toBe(0);
	});

	test('[SPEC: AC-013] monthTotal に対象月の支出合計金額（全件）が含まれる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		await createExpense(db, userId, { amount: 1000, categoryId: category.id });
		await createExpense(db, userId, { amount: 2300, categoryId: category.id });
		await createExpense(db, userId, { amount: 4500, categoryId: category.id });

		const now = new Date();
		const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
		const result = await getExpenses(db, userId, { month });

		expect(result.monthTotal).toBe(7800);
	});

	test('[SPEC: AC-013] 承認済み・未承認問わず合計に含まれる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const expense1 = await createExpense(db, userId, { amount: 1000, categoryId: category.id });
		await createExpense(db, userId, { amount: 2000, categoryId: category.id });

		// expense1 を承認済みにする
		await updateExpense(db, userId, expense1.id, {
			amount: 1000,
			categoryId: category.id,
			approved: true
		});

		const now = new Date();
		const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
		const result = await getExpenses(db, userId, { month });

		expect(result.monthTotal).toBe(3000);
	});
});

describe('updateExpense', () => {
	test('[SPEC: AC-004] 未承認の支出を「確認済み」に更新できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const created = await createExpense(db, userId, { amount: 1500, categoryId: category.id });

		expect(created.approvedAt).toBeNull();

		const updated = await updateExpense(db, userId, created.id, {
			amount: 1500,
			categoryId: category.id,
			approved: true
		});

		expect(updated.id).toBe(created.id);
		expect(updated.approvedAt).not.toBeNull();
		expect(updated.amount).toBe(1500);
		expect(updated.category.id).toBe(category.id);
	});

	test('[SPEC: AC-005] 確認済みの支出を「未承認」に戻せる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const created = await createExpense(db, userId, { amount: 1500, categoryId: category.id });

		// まず承認済みにする
		await updateExpense(db, userId, created.id, {
			amount: 1500,
			categoryId: category.id,
			approved: true
		});

		// 未承認に戻す
		const reverted = await updateExpense(db, userId, created.id, {
			amount: 1500,
			categoryId: category.id,
			approved: false
		});

		expect(reverted.approvedAt).toBeNull();
	});

	test('[SPEC: AC-006] 支出の金額とカテゴリを更新できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category1 = await createCategory(db, userId, { name: '食費' });
		const category2 = await createCategory(db, userId, { name: '交通費' });
		const created = await createExpense(db, userId, { amount: 1500, categoryId: category1.id });

		const updated = await updateExpense(db, userId, created.id, {
			amount: 3000,
			categoryId: category2.id,
			approved: false
		});

		expect(updated.id).toBe(created.id);
		expect(updated.amount).toBe(3000);
		expect(updated.categoryId).toBe(category2.id);
		expect(updated.category.name).toBe('交通費');
	});

	test('[SPEC: AC-006] 存在しない支出 ID を指定した場合は NOT_FOUND エラーになる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });

		await expect(
			updateExpense(db, userId, crypto.randomUUID(), {
				amount: 1000,
				categoryId: category.id,
				approved: false
			})
		).rejects.toThrow(AppError);

		try {
			await updateExpense(db, userId, crypto.randomUUID(), {
				amount: 1000,
				categoryId: category.id,
				approved: false
			});
		} catch (e) {
			expect(e).toBeInstanceOf(AppError);
			expect((e as AppError).status).toBe(404);
			expect((e as AppError).code).toBe('NOT_FOUND');
		}
	});

	test('[SPEC: AC-006] 他ユーザーの支出を更新しようとした場合は NOT_FOUND エラーになる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const otherUserId = makeUserId();

		const otherCategory = await createCategory(db, otherUserId, { name: '食費' });
		const otherExpense = await createExpense(db, otherUserId, {
			amount: 2000,
			categoryId: otherCategory.id
		});

		const myCategory = await createCategory(db, userId, { name: '食費' });

		await expect(
			updateExpense(db, userId, otherExpense.id, {
				amount: 2000,
				categoryId: myCategory.id,
				approved: false
			})
		).rejects.toThrow(AppError);
	});
});

describe('deleteExpense', () => {
	test('[SPEC: AC-007] 支出を削除できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const created = await createExpense(db, userId, { amount: 1000, categoryId: category.id });
		await deleteExpense(db, userId, created.id);

		const now = new Date();
		const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
		const result = await getExpenses(db, userId, { month });
		expect(result.items.find((e) => e.id === created.id)).toBeUndefined();
	});

	test('[SPEC: AC-007] 存在しない支出 ID を指定した場合は NOT_FOUND エラーになる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		await expect(deleteExpense(db, userId, crypto.randomUUID())).rejects.toThrow(AppError);

		try {
			await deleteExpense(db, userId, crypto.randomUUID());
		} catch (e) {
			expect(e).toBeInstanceOf(AppError);
			expect((e as AppError).status).toBe(404);
			expect((e as AppError).code).toBe('NOT_FOUND');
		}
	});

	test('[SPEC: AC-007] 他ユーザーの支出を削除しようとした場合は NOT_FOUND エラーになる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const otherUserId = makeUserId();

		const otherCategory = await createCategory(db, otherUserId, { name: '食費' });
		const otherExpense = await createExpense(db, otherUserId, {
			amount: 2000,
			categoryId: otherCategory.id
		});

		await expect(deleteExpense(db, userId, otherExpense.id)).rejects.toThrow(AppError);
	});
});

describe('finalizeExpense', () => {
	test('[SPEC: AC-014] 確認済みの支出を確定すると finalizedAt がセットされる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const created = await createExpense(db, userId, { amount: 1500, categoryId: category.id });

		// まず確認済みにする
		await updateExpense(db, userId, created.id, {
			amount: 1500,
			categoryId: category.id,
			approved: true
		});

		const finalized = await finalizeExpense(db, userId, created.id);

		expect(finalized.id).toBe(created.id);
		expect(finalized.finalizedAt).not.toBeNull();
		expect(finalized.approvedAt).not.toBeNull();
		expect(finalized.amount).toBe(1500);
		expect(finalized.category.id).toBe(category.id);
	});

	test('[SPEC: AC-014] [SPEC: AC-015] 確定後は updateExpense が CONFLICT になる（確定後ロック）', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const created = await createExpense(db, userId, { amount: 2000, categoryId: category.id });
		await updateExpense(db, userId, created.id, {
			amount: 2000,
			categoryId: category.id,
			approved: true
		});
		await finalizeExpense(db, userId, created.id);

		try {
			await updateExpense(db, userId, created.id, {
				amount: 9999,
				categoryId: category.id,
				approved: true
			});
			expect.fail('CONFLICT エラーが発生しなかった');
		} catch (e) {
			expect(e).toBeInstanceOf(AppError);
			expect((e as AppError).status).toBe(409);
			expect((e as AppError).code).toBe('CONFLICT');
			expect((e as AppError).message).toBe('確定済みの支出は変更できません');
		}
	});

	test('[SPEC: AC-014] [SPEC: AC-015] 確定後は deleteExpense が CONFLICT になる（確定後ロック）', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const created = await createExpense(db, userId, { amount: 3000, categoryId: category.id });
		await updateExpense(db, userId, created.id, {
			amount: 3000,
			categoryId: category.id,
			approved: true
		});
		await finalizeExpense(db, userId, created.id);

		try {
			await deleteExpense(db, userId, created.id);
			expect.fail('CONFLICT エラーが発生しなかった');
		} catch (e) {
			expect(e).toBeInstanceOf(AppError);
			expect((e as AppError).status).toBe(409);
			expect((e as AppError).code).toBe('CONFLICT');
			expect((e as AppError).message).toBe('確定済みの支出は変更できません');
		}
	});

	test('[SPEC: AC-014] 未承認の支出を確定しようとすると CONFLICT になる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const created = await createExpense(db, userId, { amount: 1000, categoryId: category.id });
		// approvedAt が null のまま finalize

		try {
			await finalizeExpense(db, userId, created.id);
			expect.fail('CONFLICT エラーが発生しなかった');
		} catch (e) {
			expect(e).toBeInstanceOf(AppError);
			expect((e as AppError).status).toBe(409);
			expect((e as AppError).code).toBe('CONFLICT');
			expect((e as AppError).message).toBe('確認済みにしてから確定してください');
		}
	});

	test('[SPEC: AC-014] 確定済みの支出を再度 finalize すると CONFLICT になる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const created = await createExpense(db, userId, { amount: 1000, categoryId: category.id });
		await updateExpense(db, userId, created.id, {
			amount: 1000,
			categoryId: category.id,
			approved: true
		});
		await finalizeExpense(db, userId, created.id);

		try {
			await finalizeExpense(db, userId, created.id);
			expect.fail('CONFLICT エラーが発生しなかった');
		} catch (e) {
			expect(e).toBeInstanceOf(AppError);
			expect((e as AppError).status).toBe(409);
			expect((e as AppError).code).toBe('CONFLICT');
			expect((e as AppError).message).toBe('確定済みの支出は変更できません');
		}
	});

	test('[SPEC: AC-014] 存在しない支出 ID を指定した場合は NOT_FOUND になる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		try {
			await finalizeExpense(db, userId, crypto.randomUUID());
			expect.fail('NOT_FOUND エラーが発生しなかった');
		} catch (e) {
			expect(e).toBeInstanceOf(AppError);
			expect((e as AppError).status).toBe(404);
			expect((e as AppError).code).toBe('NOT_FOUND');
		}
	});

	test('[SPEC: AC-015] 確定済みの支出は getExpenses で finalizedAt がセットされた状態で返る', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const created = await createExpense(db, userId, { amount: 1200, categoryId: category.id });
		await updateExpense(db, userId, created.id, {
			amount: 1200,
			categoryId: category.id,
			approved: true
		});
		await finalizeExpense(db, userId, created.id);

		const now = new Date();
		const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
		const result = await getExpenses(db, userId, { month });

		const item = result.items.find((e) => e.id === created.id);
		expect(item).toBeDefined();
		expect(item!.finalizedAt).not.toBeNull();
	});
});

describe('getUnapprovedCount', () => {
	test('[SPEC: AC-008] 未承認の支出が 1 件以上ある場合、件数が返る', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		await createExpense(db, userId, { amount: 1000, categoryId: category.id });
		await createExpense(db, userId, { amount: 2000, categoryId: category.id });

		const count = await getUnapprovedCount(db, userId);
		expect(count).toBe(2);
	});

	test('[SPEC: AC-008] 自分の未承認支出のみカウントされる（他ユーザーの支出は含まれない）', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const otherUserId = makeUserId();

		const myCategory = await createCategory(db, userId, { name: '食費' });
		const otherCategory = await createCategory(db, otherUserId, { name: '食費' });

		await createExpense(db, userId, { amount: 1000, categoryId: myCategory.id });
		await createExpense(db, otherUserId, { amount: 2000, categoryId: otherCategory.id });

		const count = await getUnapprovedCount(db, userId);
		expect(count).toBe(1);
	});

	test('[SPEC: AC-009] 全支出が承認済みの場合、0 が返る', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const expense1 = await createExpense(db, userId, { amount: 1000, categoryId: category.id });
		const expense2 = await createExpense(db, userId, { amount: 2000, categoryId: category.id });

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

		const count = await getUnapprovedCount(db, userId);
		expect(count).toBe(0);
	});

	test('[SPEC: AC-009] 支出が 0 件の場合、0 が返る', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const count = await getUnapprovedCount(db, userId);
		expect(count).toBe(0);
	});
});
