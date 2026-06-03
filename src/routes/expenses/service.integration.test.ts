/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: 支出サービス
 * @module src/routes/expenses/service.integration.test.ts
 * @testType integration
 *
 * @target ./service.ts
 */
import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import { expense, expenseCategory, user as userTable } from '$lib/server/tables';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from '$lib/server/tables';
import { eq } from 'drizzle-orm';
import {
	updateExpense,
	deleteExpense,
	checkExpense,
	uncheckExpense,
	requestExpenses,
	cancelExpenses,
	approveExpenses
} from './service';

type Db = DrizzleD1Database<typeof schema>;

async function insertCategory(db: Db, userId: string, name = 'テスト'): Promise<string> {
	const id = crypto.randomUUID();
	await db.insert(expenseCategory).values({ id, userId, name, createdAt: new Date() });
	return id;
}

async function insertUser(db: Db): Promise<string> {
	const id = crypto.randomUUID();
	await db.insert(userTable).values({
		id,
		name: 'テストユーザー',
		email: `${id}@test.example`,
		emailVerified: false,
		createdAt: new Date(),
		updatedAt: new Date()
	});
	return id;
}

async function insertExpense(
	db: Db,
	userId: string,
	categoryId: string,
	status: string = 'unapproved'
): Promise<string> {
	const payerId = await insertUser(db);
	const id = crypto.randomUUID();
	await db.insert(expense).values({
		id,
		userId,
		amount: 1000,
		categoryId,
		payerUserId: payerId,
		status,
		createdAt: new Date()
	});
	return id;
}

describe('updateExpense - 権限チェック', () => {
	test('他ユーザーの支出は更新できない（FORBIDDEN）', async () => {
		const db = createDb(env.DB);
		const ownerUserId = crypto.randomUUID();
		const otherUserId = crypto.randomUUID();
		const categoryId = await insertCategory(db, ownerUserId);
		const expenseId = await insertExpense(db, ownerUserId, categoryId);

		await expect(
			updateExpense(db, otherUserId, expenseId, {
				amount: 500,
				categoryId: 'any',
				payerUserId: 'any'
			})
		).rejects.toMatchObject({ code: 'FORBIDDEN' });
	});

	test('pending の支出は更新できない（CONFLICT）', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();
		const categoryId = await insertCategory(db, userId);
		const expenseId = await insertExpense(db, userId, categoryId, 'pending');

		await expect(
			updateExpense(db, userId, expenseId, {
				amount: 500,
				categoryId: 'any',
				payerUserId: 'any'
			})
		).rejects.toMatchObject({ code: 'CONFLICT' });
	});

	test('approved の支出は更新できない（CONFLICT）', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();
		const categoryId = await insertCategory(db, userId);
		const expenseId = await insertExpense(db, userId, categoryId, 'approved');

		await expect(
			updateExpense(db, userId, expenseId, {
				amount: 500,
				categoryId: 'any',
				payerUserId: 'any'
			})
		).rejects.toMatchObject({ code: 'CONFLICT' });
	});

	test('存在しない支出の更新は NOT_FOUND になる', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();

		await expect(
			updateExpense(db, userId, 'non-existent-id', {
				amount: 500,
				categoryId: 'any',
				payerUserId: 'any'
			})
		).rejects.toMatchObject({ code: 'NOT_FOUND' });
	});
});

describe('deleteExpense - 権限チェック', () => {
	test('他ユーザーの支出は削除できない（FORBIDDEN）', async () => {
		const db = createDb(env.DB);
		const ownerUserId = crypto.randomUUID();
		const otherUserId = crypto.randomUUID();
		const categoryId = await insertCategory(db, ownerUserId);
		const expenseId = await insertExpense(db, ownerUserId, categoryId);

		await expect(deleteExpense(db, otherUserId, expenseId)).rejects.toMatchObject({
			code: 'FORBIDDEN'
		});
	});

	test('pending の支出は削除できない（CONFLICT）', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();
		const categoryId = await insertCategory(db, userId);
		const expenseId = await insertExpense(db, userId, categoryId, 'pending');

		await expect(deleteExpense(db, userId, expenseId)).rejects.toMatchObject({
			code: 'CONFLICT'
		});
	});

	test('approved の支出は削除できない（CONFLICT）', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();
		const categoryId = await insertCategory(db, userId);
		const expenseId = await insertExpense(db, userId, categoryId, 'approved');

		await expect(deleteExpense(db, userId, expenseId)).rejects.toMatchObject({
			code: 'CONFLICT'
		});
	});
});

describe('checkExpense - 権限・状態チェック', () => {
	test('他ユーザーの支出は確認できない（FORBIDDEN）', async () => {
		const db = createDb(env.DB);
		const ownerUserId = crypto.randomUUID();
		const otherUserId = crypto.randomUUID();
		const categoryId = await insertCategory(db, ownerUserId);
		const expenseId = await insertExpense(db, ownerUserId, categoryId);

		await expect(checkExpense(db, otherUserId, expenseId)).rejects.toMatchObject({
			code: 'FORBIDDEN'
		});
	});

	test('checked の支出はさらに確認できない（CONFLICT）', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();
		const categoryId = await insertCategory(db, userId);
		const expenseId = await insertExpense(db, userId, categoryId, 'checked');

		await expect(checkExpense(db, userId, expenseId)).rejects.toMatchObject({
			code: 'CONFLICT'
		});
	});
});

describe('uncheckExpense - 権限・状態チェック', () => {
	test('他ユーザーの支出は確認取消できない（FORBIDDEN）', async () => {
		const db = createDb(env.DB);
		const ownerUserId = crypto.randomUUID();
		const otherUserId = crypto.randomUUID();
		const categoryId = await insertCategory(db, ownerUserId);
		const expenseId = await insertExpense(db, ownerUserId, categoryId, 'checked');

		await expect(uncheckExpense(db, otherUserId, expenseId)).rejects.toMatchObject({
			code: 'FORBIDDEN'
		});
	});

	test('unapproved の支出は確認取消できない（CONFLICT）', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();
		const categoryId = await insertCategory(db, userId);
		const expenseId = await insertExpense(db, userId, categoryId, 'unapproved');

		await expect(uncheckExpense(db, userId, expenseId)).rejects.toMatchObject({
			code: 'CONFLICT'
		});
	});
});

describe('requestExpenses', () => {
	test('checked 支出が0件の場合、CONFLICT が返る', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();

		await expect(requestExpenses(db, userId, 'main', { lineMock: 'true' })).rejects.toMatchObject({
			code: 'CONFLICT'
		});
	});
});

describe('cancelExpenses', () => {
	test('pending 支出が0件の場合、CONFLICT が返る', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();

		await expect(cancelExpenses(db, userId)).rejects.toMatchObject({ code: 'CONFLICT' });
	});
});

describe('approveExpenses', () => {
	test('他ユーザーの pending 支出が承認後 approved になる', async () => {
		const db = createDb(env.DB);
		const approverUserId = crypto.randomUUID();
		const ownerUserId = crypto.randomUUID();
		const categoryId = await insertCategory(db, ownerUserId);
		const expenseId = await insertExpense(db, ownerUserId, categoryId, 'pending');

		await approveExpenses(db, approverUserId, 'main', { lineMock: 'true' });

		const approved = await db.select().from(expense).where(eq(expense.id, expenseId)).get();
		expect(approved?.status).toBe('approved');
	});

	test('自分の pending 支出は承認されず pending のままになる', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();
		const categoryId = await insertCategory(db, userId);
		const ownExpenseId = await insertExpense(db, userId, categoryId, 'pending');

		// 承認対象（他ユーザー）の pending も用意して CONFLICT を回避
		const otherUserId = crypto.randomUUID();
		const otherCatId = await insertCategory(db, otherUserId);
		await insertExpense(db, otherUserId, otherCatId, 'pending');

		await approveExpenses(db, userId, 'main', { lineMock: 'true' });

		// 自分の pending は承認対象外なので pending のまま
		const ownExpense = await db.select().from(expense).where(eq(expense.id, ownExpenseId)).get();
		expect(ownExpense?.status).toBe('pending');
	});
});
