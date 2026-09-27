/**
 * @file テスト: 支出サービス（CRUD・一覧）
 * @module src/lib/features/expenses/server/service.integration.test.ts
 * @testType integration
 *
 * @target ./service.ts
 */
/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { createDb } from '$lib/server/db';
import { expense, expenseCategory, user as userTable } from '$lib/server/tables';
import { createExpense, deleteExpense, getExpenses, getUsers, updateExpense } from './service';
import type { Db } from './shared';

async function insertCategory(db: Db, name = 'テスト'): Promise<string> {
	const id = crypto.randomUUID();
	await db.insert(expenseCategory).values({ id, name, createdAt: new Date() });
	return id;
}

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

async function insertExpense(
	db: Db,
	values: {
		userId: string;
		categoryId: string;
		payerUserId: string;
		status?: string;
		amount?: number;
		createdAt?: Date;
	}
): Promise<string> {
	const id = crypto.randomUUID();
	await db.insert(expense).values({
		id,
		userId: values.userId,
		amount: values.amount ?? 1000,
		categoryId: values.categoryId,
		payerUserId: values.payerUserId,
		status: values.status ?? 'unapproved',
		createdAt: values.createdAt ?? new Date()
	});
	return id;
}

/** 自分の支出を 1 件用意する（登録者 = 支払者）。 */
async function setupOwnExpense(db: Db, status = 'unapproved') {
	const userId = await insertUser(db);
	const categoryId = await insertCategory(db);
	const expenseId = await insertExpense(db, { userId, categoryId, payerUserId: userId, status });
	return { userId, categoryId, expenseId };
}

describe('getExpenses', () => {
	test('指定月（JST）の全ユーザーの支出と月合計を取得できる', async () => {
		const db = createDb(env.DB);
		const userA = await insertUser(db);
		const userB = await insertUser(db);
		const categoryId = await insertCategory(db, '食費');
		const inMonthA = await insertExpense(db, {
			userId: userA,
			categoryId,
			payerUserId: userA,
			amount: 1200,
			createdAt: new Date('2001-03-01T00:00:00+09:00')
		});
		const inMonthB = await insertExpense(db, {
			userId: userB,
			categoryId,
			payerUserId: userB,
			amount: 800,
			createdAt: new Date('2001-03-31T23:59:59+09:00')
		});
		// 月外（前月末・翌月初）は含まれない
		await insertExpense(db, {
			userId: userA,
			categoryId,
			payerUserId: userA,
			amount: 5000,
			createdAt: new Date('2001-02-28T23:59:59+09:00')
		});
		await insertExpense(db, {
			userId: userA,
			categoryId,
			payerUserId: userA,
			amount: 5000,
			createdAt: new Date('2001-04-01T00:00:00+09:00')
		});

		const result = await getExpenses(db, { month: '2001-03' });

		expect(result.items.map((e) => e.id)).toEqual([inMonthB, inMonthA]);
		expect(result.total).toBe(2);
		expect(result.monthTotal).toBe(2000);
		expect(result.page).toBe(1);
		expect(result.limit).toBe(20);
		expect(result.items[1]).toMatchObject({
			amount: 1200,
			status: 'unapproved',
			category: { id: categoryId, name: '食費' },
			payer: { id: userA, name: 'テストユーザー' }
		});
	});

	test('支出がない月の場合、空の一覧と月合計0を取得できる', async () => {
		const db = createDb(env.DB);

		const result = await getExpenses(db, { month: '2001-06' });

		expect(result.items).toEqual([]);
		expect(result.total).toBe(0);
		expect(result.monthTotal).toBe(0);
	});

	test('ページ番号・件数を指定して一覧をページ分割して取得できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const categoryId = await insertCategory(db);
		const ids: string[] = [];
		for (let day = 1; day <= 3; day++) {
			ids.push(
				await insertExpense(db, {
					userId,
					categoryId,
					payerUserId: userId,
					amount: 100,
					createdAt: new Date(`2001-05-0${day}T12:00:00+09:00`)
				})
			);
		}

		const page2 = await getExpenses(db, { month: '2001-05', page: 2, limit: 2 });

		// 新しい順: [day3, day2] / [day1]
		expect(page2.items.map((e) => e.id)).toEqual([ids[0]]);
		expect(page2.total).toBe(3);
		expect(page2.monthTotal).toBe(300);
		expect(page2.page).toBe(2);
		expect(page2.limit).toBe(2);
	});

	test('登録日時が同一秒の場合、後から登録した支出が先頭になる順で取得できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const categoryId = await insertCategory(db);
		const sameSecond = new Date('2001-07-10T12:00:00+09:00');
		const ids: string[] = [];
		for (let i = 0; i < 3; i++) {
			ids.push(
				await insertExpense(db, { userId, categoryId, payerUserId: userId, createdAt: sameSecond })
			);
		}

		const result = await getExpenses(db, { month: '2001-07' });

		expect(result.items.map((e) => e.id)).toEqual([...ids].reverse());
	});
});

describe('getUsers', () => {
	test('支払者の選択肢として全ユーザーを取得できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db, '支払者候補');

		const users = await getUsers(db);

		expect(users).toContainEqual({
			id: userId,
			name: '支払者候補',
			email: `${userId}@test.example`
		});
	});
});

describe('createExpense', () => {
	test('正しいデータで支出を登録できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const payerUserId = await insertUser(db, '支払者');
		const categoryId = await insertCategory(db, '日用品');

		const created = await createExpense(db, userId, { amount: 3000, categoryId, payerUserId });

		expect(created).toMatchObject({
			userId,
			amount: 3000,
			status: 'unapproved',
			category: { id: categoryId, name: '日用品' },
			payer: { id: payerUserId, name: '支払者' }
		});
		const saved = await db.select().from(expense).where(eq(expense.id, created.id)).get();
		expect(saved?.status).toBe('unapproved');
	});

	test('カテゴリが存在しない場合、NOT_FOUND「カテゴリが見つかりません」が返る', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		await expect(
			createExpense(db, userId, {
				amount: 1000,
				categoryId: crypto.randomUUID(),
				payerUserId: userId
			})
		).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'カテゴリが見つかりません' });
	});

	test('支払者が存在しない場合、NOT_FOUND「支払者が見つかりません」が返る', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const categoryId = await insertCategory(db);

		await expect(
			createExpense(db, userId, { amount: 1000, categoryId, payerUserId: crypto.randomUUID() })
		).rejects.toMatchObject({ code: 'NOT_FOUND', message: '支払者が見つかりません' });
	});
});

describe('updateExpense', () => {
	test('自分の未承認の支出を更新できる', async () => {
		const db = createDb(env.DB);
		const { userId, expenseId } = await setupOwnExpense(db);
		const newCategoryId = await insertCategory(db, '交通費');
		const newPayerId = await insertUser(db, '新しい支払者');

		const updated = await updateExpense(db, userId, expenseId, {
			amount: 4200,
			categoryId: newCategoryId,
			payerUserId: newPayerId
		});

		expect(updated).toMatchObject({
			id: expenseId,
			amount: 4200,
			category: { id: newCategoryId, name: '交通費' },
			payer: { id: newPayerId, name: '新しい支払者' }
		});
	});

	test('自分の確認済みの支出を更新できる', async () => {
		const db = createDb(env.DB);
		const { userId, categoryId, expenseId } = await setupOwnExpense(db, 'checked');

		const updated = await updateExpense(db, userId, expenseId, {
			amount: 500,
			categoryId,
			payerUserId: userId
		});

		expect(updated.amount).toBe(500);
		expect(updated.status).toBe('checked');
	});

	test('他ユーザーの支出の場合、FORBIDDEN が返る', async () => {
		const db = createDb(env.DB);
		const { categoryId, expenseId, userId } = await setupOwnExpense(db);
		const otherUserId = await insertUser(db);

		await expect(
			updateExpense(db, otherUserId, expenseId, { amount: 500, categoryId, payerUserId: userId })
		).rejects.toMatchObject({ code: 'FORBIDDEN' });
	});

	test('申請中の支出の場合、CONFLICT が返る', async () => {
		const db = createDb(env.DB);
		const { userId, categoryId, expenseId } = await setupOwnExpense(db, 'pending');

		await expect(
			updateExpense(db, userId, expenseId, { amount: 500, categoryId, payerUserId: userId })
		).rejects.toMatchObject({ code: 'CONFLICT' });
	});

	test('承認済みの支出の場合、CONFLICT が返る', async () => {
		const db = createDb(env.DB);
		const { userId, categoryId, expenseId } = await setupOwnExpense(db, 'approved');

		await expect(
			updateExpense(db, userId, expenseId, { amount: 500, categoryId, payerUserId: userId })
		).rejects.toMatchObject({ code: 'CONFLICT' });
	});

	test('存在しない支出の場合、NOT_FOUND が返る', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		await expect(
			updateExpense(db, userId, crypto.randomUUID(), {
				amount: 500,
				categoryId: 'any',
				payerUserId: 'any'
			})
		).rejects.toMatchObject({ code: 'NOT_FOUND' });
	});

	test('変更先のカテゴリが存在しない場合、NOT_FOUND「カテゴリが見つかりません」が返る', async () => {
		const db = createDb(env.DB);
		const { userId, expenseId } = await setupOwnExpense(db);

		await expect(
			updateExpense(db, userId, expenseId, {
				amount: 500,
				categoryId: crypto.randomUUID(),
				payerUserId: userId
			})
		).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'カテゴリが見つかりません' });
	});

	test('変更先の支払者が存在しない場合、NOT_FOUND「支払者が見つかりません」が返る', async () => {
		const db = createDb(env.DB);
		const { userId, categoryId, expenseId } = await setupOwnExpense(db);

		await expect(
			updateExpense(db, userId, expenseId, {
				amount: 500,
				categoryId,
				payerUserId: crypto.randomUUID()
			})
		).rejects.toMatchObject({ code: 'NOT_FOUND', message: '支払者が見つかりません' });
	});
});

describe('deleteExpense', () => {
	test('自分の未承認の支出を削除できる', async () => {
		const db = createDb(env.DB);
		const { userId, expenseId } = await setupOwnExpense(db);

		await deleteExpense(db, userId, expenseId);

		const deleted = await db.select().from(expense).where(eq(expense.id, expenseId)).get();
		expect(deleted).toBeUndefined();
	});

	test('他ユーザーの支出の場合、FORBIDDEN が返る', async () => {
		const db = createDb(env.DB);
		const { expenseId } = await setupOwnExpense(db);
		const otherUserId = await insertUser(db);

		await expect(deleteExpense(db, otherUserId, expenseId)).rejects.toMatchObject({
			code: 'FORBIDDEN'
		});
	});

	test('申請中の支出の場合、CONFLICT が返る', async () => {
		const db = createDb(env.DB);
		const { userId, expenseId } = await setupOwnExpense(db, 'pending');

		await expect(deleteExpense(db, userId, expenseId)).rejects.toMatchObject({
			code: 'CONFLICT'
		});
	});

	test('承認済みの支出の場合、CONFLICT が返る', async () => {
		const db = createDb(env.DB);
		const { userId, expenseId } = await setupOwnExpense(db, 'approved');

		await expect(deleteExpense(db, userId, expenseId)).rejects.toMatchObject({
			code: 'CONFLICT'
		});
	});

	test('存在しない支出の場合、NOT_FOUND が返る', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		await expect(deleteExpense(db, userId, crypto.randomUUID())).rejects.toMatchObject({
			code: 'NOT_FOUND'
		});
	});
});
