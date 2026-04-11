/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: expenses サービス
 * @module src/routes/expenses/service.integration.test.ts
 * @testType integration
 *
 * @target ./service.ts
 * @spec specs/expenses/spec.md
 * @covers AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-010, AC-014, AC-113, AC-114, AC-115, AC-116, AC-118
 */

import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import { AppError } from '$lib/server/errors';
import { user as userTable } from '$lib/server/tables';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import {
	getExpenses,
	createExpense,
	updateExpense,
	deleteExpense,
	checkExpense,
	uncheckExpense,
	requestExpenses,
	cancelExpenses,
	approveExpenses,
	getPendingApprovalCount
} from './service';
import { createCategory } from './categories/service';

function makeUserId() {
	return crypto.randomUUID();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createTestUser(db: DrizzleD1Database<any>, id?: string): Promise<string> {
	const userId = id ?? makeUserId();
	await db.insert(userTable).values({
		id: userId,
		name: 'テストユーザー',
		email: `${userId}@test.example`,
		emailVerified: false,
		createdAt: new Date(),
		updatedAt: new Date()
	});
	return userId;
}

function getCurrentMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

describe('createExpense', () => {
	test('[SPEC: AC-003] 金額・カテゴリ・支払者ユーザーを指定して支出を登録できる（status=unapproved）', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, userId, { name: '食費' });
		const created = await createExpense(db, userId, {
			amount: 1500,
			categoryId: category.id,
			payerUserId
		});

		expect(created.id).toBeTruthy();
		expect(created.amount).toBe(1500);
		expect(created.categoryId).toBe(category.id);
		expect(created.userId).toBe(userId);
		expect(created.status).toBe('unapproved');
		expect(created.createdAt).toBeTruthy();
		expect(created.category.id).toBe(category.id);
		expect(created.category.name).toBe('食費');
	});

	test('[SPEC: AC-003] 存在しない支払者ユーザーIDを指定した場合は NOT_FOUND になる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });

		await expect(
			createExpense(db, userId, {
				amount: 1500,
				categoryId: category.id,
				payerUserId: crypto.randomUUID()
			})
		).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
	});

	test('[SPEC: AC-003] 登録日時（createdAt）は自動でセットされる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, userId, { name: '交通費' });
		const before = new Date();
		const created = await createExpense(db, userId, {
			amount: 230,
			categoryId: category.id,
			payerUserId
		});
		const after = new Date();

		const createdAt = new Date(created.createdAt);
		expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
		expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
	});
});

describe('getExpenses', () => {
	test('[SPEC: AC-001] 当月の全ユーザーの支出一覧が取得できる', async () => {
		const db = createDb(env.DB);
		const userId1 = makeUserId();
		const userId2 = makeUserId();
		const payerUserId = await createTestUser(db);

		const category1 = await createCategory(db, userId1, { name: '食費' });
		const category2 = await createCategory(db, userId2, { name: '交通費' });

		await createExpense(db, userId1, { amount: 500, categoryId: category1.id, payerUserId });
		await createExpense(db, userId2, { amount: 1000, categoryId: category2.id, payerUserId });

		const month = getCurrentMonth();
		const result = await getExpenses(db, { month });

		// 全ユーザーの支出が含まれる（userId1 と userId2 の両方）
		const amounts = result.items.map((i) => i.amount);
		expect(amounts).toContain(500);
		expect(amounts).toContain(1000);
	});

	test('[SPEC: AC-002] 月フィルタで指定した月の支出のみ取得できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, userId, { name: '食費' });
		await createExpense(db, userId, { amount: 1000, categoryId: category.id, payerUserId });

		const currentMonth = getCurrentMonth();
		const currentResult = await getExpenses(db, { month: currentMonth });
		expect(currentResult.items.some((i) => i.amount === 1000)).toBe(true);

		// 翌月は 0 件（当ユーザーの支出が含まれない）
		const now = new Date();
		const nextMonth =
			now.getMonth() === 11
				? `${now.getFullYear() + 1}-01`
				: `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}`;
		const nextResult = await getExpenses(db, { month: nextMonth });
		const hasCurrentUserExpense = nextResult.items.some(
			(i) => i.amount === 1000 && i.userId === userId
		);
		expect(hasCurrentUserExpense).toBe(false);
	});

	test('[SPEC: AC-014] monthTotal に当月の世帯合計金額（全ユーザー・全ステータス）が含まれる', async () => {
		const db = createDb(env.DB);
		const userId1 = makeUserId();
		const userId2 = makeUserId();
		const payerUserId = await createTestUser(db);

		const category1 = await createCategory(db, userId1, { name: '食費' });
		const category2 = await createCategory(db, userId2, { name: '食費' });

		// 各ユーザーの支出を登録
		await createExpense(db, userId1, { amount: 1000, categoryId: category1.id, payerUserId });
		await createExpense(db, userId2, { amount: 2000, categoryId: category2.id, payerUserId });

		const month = getCurrentMonth();
		const result = await getExpenses(db, { month });

		// 全ユーザーの合計が monthTotal に含まれる
		expect(result.monthTotal).toBeGreaterThanOrEqual(3000);
	});
});

describe('updateExpense', () => {
	test('[SPEC: AC-006] unapproved の支出の金額・カテゴリ・支払者を更新できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId1 = await createTestUser(db);
		const payerUserId2 = await createTestUser(db);

		const category1 = await createCategory(db, userId, { name: '食費' });
		const category2 = await createCategory(db, userId, { name: '交通費' });
		const created = await createExpense(db, userId, {
			amount: 1500,
			categoryId: category1.id,
			payerUserId: payerUserId1
		});

		const updated = await updateExpense(db, userId, created.id, {
			amount: 3000,
			categoryId: category2.id,
			payerUserId: payerUserId2
		});

		expect(updated.id).toBe(created.id);
		expect(updated.amount).toBe(3000);
		expect(updated.categoryId).toBe(category2.id);
		expect(updated.category.name).toBe('交通費');
	});

	test('[SPEC: AC-006] checked の支出も更新できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, userId, { name: '食費' });
		const created = await createExpense(db, userId, {
			amount: 1500,
			categoryId: category.id,
			payerUserId
		});
		await checkExpense(db, userId, created.id);

		const updated = await updateExpense(db, userId, created.id, {
			amount: 2000,
			categoryId: category.id,
			payerUserId
		});
		expect(updated.amount).toBe(2000);
	});

	test('[SPEC: AC-113] pending の支出は更新不可（409 CONFLICT）', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, userId, { name: '食費' });
		const created = await createExpense(db, userId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId
		});

		// checked → pending に遷移
		await checkExpense(db, userId, created.id);
		await requestExpenses(db, userId);

		try {
			await updateExpense(db, userId, created.id, {
				amount: 9999,
				categoryId: category.id,
				payerUserId
			});
			expect.fail('CONFLICT エラーが発生しなかった');
		} catch (e) {
			expect(e).toBeInstanceOf(AppError);
			expect((e as AppError).status).toBe(409);
			expect((e as AppError).code).toBe('CONFLICT');
			expect((e as AppError).message).toBe('申請中または承認済みの支出は変更できません');
		}
	});

	test('[SPEC: AC-113] approved の支出は更新不可（409 CONFLICT）', async () => {
		const db = createDb(env.DB);
		const requesterId = makeUserId();
		const approverId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, requesterId, { name: '食費' });
		const created = await createExpense(db, requesterId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId
		});

		// checked → pending → approved
		await checkExpense(db, requesterId, created.id);
		await requestExpenses(db, requesterId);
		await approveExpenses(db, approverId, requesterId);

		try {
			await updateExpense(db, requesterId, created.id, {
				amount: 9999,
				categoryId: category.id,
				payerUserId
			});
			expect.fail('CONFLICT エラーが発生しなかった');
		} catch (e) {
			expect(e).toBeInstanceOf(AppError);
			expect((e as AppError).status).toBe(409);
			expect((e as AppError).code).toBe('CONFLICT');
		}
	});

	test('[SPEC: AC-114] 他ユーザーの支出を更新しようとした場合は 403 FORBIDDEN になる', async () => {
		const db = createDb(env.DB);
		const ownerId = makeUserId();
		const otherUserId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, ownerId, { name: '食費' });
		const created = await createExpense(db, ownerId, {
			amount: 2000,
			categoryId: category.id,
			payerUserId
		});

		const myCategory = await createCategory(db, otherUserId, { name: '食費' });

		try {
			await updateExpense(db, otherUserId, created.id, {
				amount: 2000,
				categoryId: myCategory.id,
				payerUserId
			});
			expect.fail('FORBIDDEN エラーが発生しなかった');
		} catch (e) {
			expect(e).toBeInstanceOf(AppError);
			expect((e as AppError).status).toBe(403);
			expect((e as AppError).code).toBe('FORBIDDEN');
		}
	});

	test('[SPEC: AC-006] 存在しない支出 ID の場合は NOT_FOUND になる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, userId, { name: '食費' });

		await expect(
			updateExpense(db, userId, crypto.randomUUID(), {
				amount: 1000,
				categoryId: category.id,
				payerUserId
			})
		).rejects.toMatchObject({ code: 'NOT_FOUND' });
	});

	test('[SPEC: AC-006] 存在しない支払者ユーザーIDへの更新は NOT_FOUND になる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, userId, { name: '食費' });
		const created = await createExpense(db, userId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId
		});

		await expect(
			updateExpense(db, userId, created.id, {
				amount: 1200,
				categoryId: category.id,
				payerUserId: crypto.randomUUID()
			})
		).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
	});
});

describe('deleteExpense', () => {
	test('[SPEC: AC-007] unapproved の支出を削除できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, userId, { name: '食費' });
		const created = await createExpense(db, userId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId
		});
		await deleteExpense(db, userId, created.id);

		const month = getCurrentMonth();
		const result = await getExpenses(db, { month });
		expect(result.items.find((e) => e.id === created.id)).toBeUndefined();
	});

	test('[SPEC: AC-007] checked の支出も削除できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, userId, { name: '食費' });
		const created = await createExpense(db, userId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId
		});
		await checkExpense(db, userId, created.id);
		await deleteExpense(db, userId, created.id);

		const month = getCurrentMonth();
		const result = await getExpenses(db, { month });
		expect(result.items.find((e) => e.id === created.id)).toBeUndefined();
	});

	test('[SPEC: AC-113] pending の支出は削除不可（409 CONFLICT）', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, userId, { name: '食費' });
		const created = await createExpense(db, userId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId
		});

		await checkExpense(db, userId, created.id);
		await requestExpenses(db, userId);

		try {
			await deleteExpense(db, userId, created.id);
			expect.fail('CONFLICT エラーが発生しなかった');
		} catch (e) {
			expect(e).toBeInstanceOf(AppError);
			expect((e as AppError).status).toBe(409);
			expect((e as AppError).code).toBe('CONFLICT');
		}
	});

	test('[SPEC: AC-114] 他ユーザーの支出を削除しようとした場合は 403 FORBIDDEN になる', async () => {
		const db = createDb(env.DB);
		const ownerId = makeUserId();
		const otherUserId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, ownerId, { name: '食費' });
		const created = await createExpense(db, ownerId, {
			amount: 2000,
			categoryId: category.id,
			payerUserId
		});

		try {
			await deleteExpense(db, otherUserId, created.id);
			expect.fail('FORBIDDEN エラーが発生しなかった');
		} catch (e) {
			expect(e).toBeInstanceOf(AppError);
			expect((e as AppError).status).toBe(403);
			expect((e as AppError).code).toBe('FORBIDDEN');
		}
	});

	test('[SPEC: AC-007] 存在しない支出 ID の場合は NOT_FOUND になる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		await expect(deleteExpense(db, userId, crypto.randomUUID())).rejects.toMatchObject({
			code: 'NOT_FOUND'
		});
	});
});

describe('checkExpense', () => {
	test('[SPEC: AC-004] unapproved の支出を checked に更新できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, userId, { name: '食費' });
		const created = await createExpense(db, userId, {
			amount: 1500,
			categoryId: category.id,
			payerUserId
		});

		expect(created.status).toBe('unapproved');

		const updated = await checkExpense(db, userId, created.id);

		expect(updated.id).toBe(created.id);
		expect(updated.status).toBe('checked');
	});

	test('[SPEC: AC-114] 他ユーザーの支出を check しようとした場合は 403 FORBIDDEN になる', async () => {
		const db = createDb(env.DB);
		const ownerId = makeUserId();
		const otherUserId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, ownerId, { name: '食費' });
		const created = await createExpense(db, ownerId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId
		});

		try {
			await checkExpense(db, otherUserId, created.id);
			expect.fail('FORBIDDEN エラーが発生しなかった');
		} catch (e) {
			expect(e).toBeInstanceOf(AppError);
			expect((e as AppError).status).toBe(403);
			expect((e as AppError).code).toBe('FORBIDDEN');
		}
	});

	test('[SPEC: AC-004] checked の支出を再度 check しようとすると 409 CONFLICT になる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, userId, { name: '食費' });
		const created = await createExpense(db, userId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId
		});

		await checkExpense(db, userId, created.id);

		await expect(checkExpense(db, userId, created.id)).rejects.toMatchObject({ code: 'CONFLICT' });
	});
});

describe('uncheckExpense', () => {
	test('[SPEC: AC-005] checked の支出を unapproved に戻せる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, userId, { name: '食費' });
		const created = await createExpense(db, userId, {
			amount: 1500,
			categoryId: category.id,
			payerUserId
		});

		await checkExpense(db, userId, created.id);
		const reverted = await uncheckExpense(db, userId, created.id);

		expect(reverted.status).toBe('unapproved');
	});

	test('[SPEC: AC-114] 他ユーザーの支出を uncheck しようとした場合は 403 FORBIDDEN になる', async () => {
		const db = createDb(env.DB);
		const ownerId = makeUserId();
		const otherUserId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, ownerId, { name: '食費' });
		const created = await createExpense(db, ownerId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId
		});
		await checkExpense(db, ownerId, created.id);

		try {
			await uncheckExpense(db, otherUserId, created.id);
			expect.fail('FORBIDDEN エラーが発生しなかった');
		} catch (e) {
			expect(e).toBeInstanceOf(AppError);
			expect((e as AppError).status).toBe(403);
			expect((e as AppError).code).toBe('FORBIDDEN');
		}
	});

	test('[SPEC: AC-005] unapproved の支出を uncheck しようとすると 409 CONFLICT になる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, userId, { name: '食費' });
		const created = await createExpense(db, userId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId
		});

		await expect(uncheckExpense(db, userId, created.id)).rejects.toMatchObject({
			code: 'CONFLICT'
		});
	});
});

describe('requestApproval', () => {
	test('[SPEC: AC-008] checked の全支出を pending に一括変更できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, userId, { name: '食費' });
		const e1 = await createExpense(db, userId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId
		});
		const e2 = await createExpense(db, userId, {
			amount: 2000,
			categoryId: category.id,
			payerUserId
		});

		await checkExpense(db, userId, e1.id);
		await checkExpense(db, userId, e2.id);

		const result = await requestExpenses(db, userId);

		expect(result).toBe(2);

		const month = getCurrentMonth();
		const expenses = await getExpenses(db, { month });
		const myExpenses = expenses.items.filter((e) => e.userId === userId);
		expect(myExpenses.every((e) => e.status === 'pending')).toBe(true);
	});

	test('[SPEC: AC-115] checked の支出が 0 件の場合、409 CONFLICT になる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		try {
			await requestExpenses(db, userId);
			expect.fail('CONFLICT エラーが発生しなかった');
		} catch (e) {
			expect(e).toBeInstanceOf(AppError);
			expect((e as AppError).status).toBe(409);
			expect((e as AppError).code).toBe('CONFLICT');
			expect((e as AppError).message).toBe('確認済みの支出がありません');
		}
	});
});

describe('cancelRequest', () => {
	test('[SPEC: AC-009] pending の全支出を checked に一括変更できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, userId, { name: '食費' });
		const e1 = await createExpense(db, userId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId
		});
		const e2 = await createExpense(db, userId, {
			amount: 2000,
			categoryId: category.id,
			payerUserId
		});

		await checkExpense(db, userId, e1.id);
		await checkExpense(db, userId, e2.id);
		await requestExpenses(db, userId);

		const result = await cancelExpenses(db, userId);

		expect(result).toBe(2);

		const month = getCurrentMonth();
		const expenses = await getExpenses(db, { month });
		const myExpenses = expenses.items.filter((e) => e.userId === userId);
		expect(myExpenses.every((e) => e.status === 'checked')).toBe(true);
	});

	test('[SPEC: AC-116] pending の支出が 0 件の場合、409 CONFLICT になる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		try {
			await cancelExpenses(db, userId);
			expect.fail('CONFLICT エラーが発生しなかった');
		} catch (e) {
			expect(e).toBeInstanceOf(AppError);
			expect((e as AppError).status).toBe(409);
			expect((e as AppError).code).toBe('CONFLICT');
			expect((e as AppError).message).toBe('申請中の支出がありません');
		}
	});
});

describe('bulkApprove', () => {
	test('[SPEC: AC-010] 承認対象パートナーの pending 支出を全件 approved に変更できる', async () => {
		const db = createDb(env.DB);
		const requesterId = makeUserId();
		const approverId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, requesterId, { name: '食費' });
		const e1 = await createExpense(db, requesterId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId
		});
		const e2 = await createExpense(db, requesterId, {
			amount: 2000,
			categoryId: category.id,
			payerUserId
		});

		await checkExpense(db, requesterId, e1.id);
		await checkExpense(db, requesterId, e2.id);
		await requestExpenses(db, requesterId);

		const result = await approveExpenses(db, approverId, requesterId);

		// requesterId の pending 支出 2 件のみが対象
		expect(result).toBe(2);

		const month = getCurrentMonth();
		const expenses = await getExpenses(db, { month });
		const requesterExpenses = expenses.items.filter((e) => e.userId === requesterId);
		expect(requesterExpenses.every((e) => e.status === 'approved')).toBe(true);
	});

	test('[SPEC: AC-118] 承認対象パートナーの pending 支出が 0 件の場合、409 CONFLICT になる', async () => {
		const db = createDb(env.DB);
		const approverId = makeUserId();
		const partnerId = makeUserId(); // pending 支出を持たないパートナー

		try {
			await approveExpenses(db, approverId, partnerId);
			expect.fail('CONFLICT エラーが発生しなかった');
		} catch (e) {
			expect(e).toBeInstanceOf(AppError);
			expect((e as AppError).status).toBe(409);
			expect((e as AppError).code).toBe('CONFLICT');
			expect((e as AppError).message).toBe('承認できる支出がありません');
		}
	});
});

describe('getPendingApprovalCount', () => {
	test('[SPEC: dashboard/AC-008] 承認対象パートナーの pending 支出が 1 件以上ある場合、件数が返る', async () => {
		const db = createDb(env.DB);
		const requesterId = makeUserId();
		const approverId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, requesterId, { name: '食費' });
		const e1 = await createExpense(db, requesterId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId
		});
		const e2 = await createExpense(db, requesterId, {
			amount: 2000,
			categoryId: category.id,
			payerUserId
		});

		await checkExpense(db, requesterId, e1.id);
		await checkExpense(db, requesterId, e2.id);
		await requestExpenses(db, requesterId);

		const count = await getPendingApprovalCount(db, approverId, requesterId);
		expect(count).toBe(2);
	});

	test('[SPEC: dashboard/AC-009] パートナーが null の場合、0 が返る', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const count = await getPendingApprovalCount(db, userId, null);
		expect(count).toBe(0);
	});

	test('[SPEC: dashboard/AC-009] 全支出が approved になると 0 が返る', async () => {
		const db = createDb(env.DB);
		const requesterId = makeUserId();
		const approverId = makeUserId();
		const payerUserId = await createTestUser(db);

		const category = await createCategory(db, requesterId, { name: '食費' });
		const expense = await createExpense(db, requesterId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId
		});

		await checkExpense(db, requesterId, expense.id);
		await requestExpenses(db, requesterId);
		await approveExpenses(db, approverId, requesterId);

		const count = await getPendingApprovalCount(db, approverId, requesterId);
		expect(count).toBe(0);
	});
});
