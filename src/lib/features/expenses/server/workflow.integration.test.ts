/**
 * @file テスト: 支出承認ワークフロー
 * @module src/lib/features/expenses/server/workflow.integration.test.ts
 * @testType integration
 *
 * @target ./workflow.ts
 */
/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { eq, inArray } from 'drizzle-orm';
import { createDb } from '$lib/server/db';
import { expense, expenseCategory, user as userTable } from '$lib/server/tables';
import {
	approveExpenses,
	cancelExpenses,
	checkExpense,
	getUnapprovedCount,
	requestExpenses,
	uncheckExpense,
	type NotifyContext
} from './workflow';
import type { Db } from './shared';

// LINE 送信はスキップ（通知ロジックは line.test.ts で検証）
const notify: NotifyContext = {
	role: 'main',
	lineEnv: { lineMock: 'true' },
	origin: 'http://localhost'
};

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

let categoryId: string | undefined;
async function getCategoryId(db: Db): Promise<string> {
	if (!categoryId) {
		categoryId = crypto.randomUUID();
		await db
			.insert(expenseCategory)
			.values({ id: categoryId, name: 'テスト', createdAt: new Date() });
	}
	return categoryId;
}

async function insertExpense(db: Db, userId: string, status = 'unapproved'): Promise<string> {
	const id = crypto.randomUUID();
	await db.insert(expense).values({
		id,
		userId,
		amount: 1000,
		categoryId: await getCategoryId(db),
		payerUserId: userId,
		status,
		createdAt: new Date()
	});
	return id;
}

async function statusOf(db: Db, id: string): Promise<string | undefined> {
	return (await db.select({ status: expense.status }).from(expense).where(eq(expense.id, id)).get())
		?.status;
}

describe('checkExpense', () => {
	test('自分の未承認の支出を確認済みにできる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const expenseId = await insertExpense(db, userId);

		const updated = await checkExpense(db, userId, expenseId);

		expect(updated.status).toBe('checked');
		expect(await statusOf(db, expenseId)).toBe('checked');
	});

	test('他ユーザーの支出の場合、FORBIDDEN が返る', async () => {
		const db = createDb(env.DB);
		const ownerId = await insertUser(db);
		const otherId = await insertUser(db);
		const expenseId = await insertExpense(db, ownerId);

		await expect(checkExpense(db, otherId, expenseId)).rejects.toMatchObject({
			code: 'FORBIDDEN'
		});
	});

	test('確認済みの支出の場合、CONFLICT が返る', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const expenseId = await insertExpense(db, userId, 'checked');

		await expect(checkExpense(db, userId, expenseId)).rejects.toMatchObject({ code: 'CONFLICT' });
	});

	test('存在しない支出の場合、NOT_FOUND が返る', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		await expect(checkExpense(db, userId, crypto.randomUUID())).rejects.toMatchObject({
			code: 'NOT_FOUND'
		});
	});
});

describe('uncheckExpense', () => {
	test('自分の確認済みの支出を未承認に戻せる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const expenseId = await insertExpense(db, userId, 'checked');

		const updated = await uncheckExpense(db, userId, expenseId);

		expect(updated.status).toBe('unapproved');
		expect(await statusOf(db, expenseId)).toBe('unapproved');
	});

	test('他ユーザーの支出の場合、FORBIDDEN が返る', async () => {
		const db = createDb(env.DB);
		const ownerId = await insertUser(db);
		const otherId = await insertUser(db);
		const expenseId = await insertExpense(db, ownerId, 'checked');

		await expect(uncheckExpense(db, otherId, expenseId)).rejects.toMatchObject({
			code: 'FORBIDDEN'
		});
	});

	test('未承認の支出の場合、CONFLICT が返る', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const expenseId = await insertExpense(db, userId, 'unapproved');

		await expect(uncheckExpense(db, userId, expenseId)).rejects.toMatchObject({
			code: 'CONFLICT'
		});
	});
});

describe('requestExpenses', () => {
	test('自分の確認済みの支出だけを一括で承認依頼でき、依頼件数が返る', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const otherId = await insertUser(db);
		const checked1 = await insertExpense(db, userId, 'checked');
		const checked2 = await insertExpense(db, userId, 'checked');
		const ownUnapproved = await insertExpense(db, userId, 'unapproved');
		const otherChecked = await insertExpense(db, otherId, 'checked');

		const result = await requestExpenses(db, userId, notify);

		expect(result).toEqual({ count: 2 });
		expect(await statusOf(db, checked1)).toBe('pending');
		expect(await statusOf(db, checked2)).toBe('pending');
		expect(await statusOf(db, ownUnapproved)).toBe('unapproved');
		expect(await statusOf(db, otherChecked)).toBe('checked');
	});

	test('defer を指定した場合、LINE 通知をレスポンス後の実行に委ねられる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		await insertExpense(db, userId, 'checked');
		const deferred: Promise<unknown>[] = [];

		await requestExpenses(db, userId, notify, (task) => deferred.push(task));

		expect(deferred).toHaveLength(1);
		await Promise.all(deferred);
	});

	test('確認済みの支出が0件の場合、CONFLICT が返る', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		await insertExpense(db, userId, 'unapproved');

		await expect(requestExpenses(db, userId, notify)).rejects.toMatchObject({ code: 'CONFLICT' });
	});
});

describe('cancelExpenses', () => {
	test('自分の申請中の支出を一括で確認済みに戻せ、取消件数が返る', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const otherId = await insertUser(db);
		const pending1 = await insertExpense(db, userId, 'pending');
		const pending2 = await insertExpense(db, userId, 'pending');
		const otherPending = await insertExpense(db, otherId, 'pending');

		const result = await cancelExpenses(db, userId);

		expect(result).toEqual({ count: 2 });
		expect(await statusOf(db, pending1)).toBe('checked');
		expect(await statusOf(db, pending2)).toBe('checked');
		expect(await statusOf(db, otherPending)).toBe('pending');
	});

	test('申請中の支出が0件の場合、CONFLICT が返る', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		await expect(cancelExpenses(db, userId)).rejects.toMatchObject({ code: 'CONFLICT' });
	});
});

describe('approveExpenses', () => {
	test('相手の申請中の支出を一括で承認でき、承認件数が返る（自分の申請中は対象外）', async () => {
		const db = createDb(env.DB);
		const approverId = await insertUser(db);
		const ownerId = await insertUser(db);
		const partnerPending = await insertExpense(db, ownerId, 'pending');
		const partnerChecked = await insertExpense(db, ownerId, 'checked');
		const ownPending = await insertExpense(db, approverId, 'pending');
		const expectedCount = await getUnapprovedCount(db, approverId);

		const result = await approveExpenses(db, approverId, notify);

		expect(result).toEqual({ count: expectedCount });
		expect(await statusOf(db, partnerPending)).toBe('approved');
		expect(await statusOf(db, partnerChecked)).toBe('checked');
		expect(await statusOf(db, ownPending)).toBe('pending');
		expect(await getUnapprovedCount(db, approverId)).toBe(0);
	});

	test('承認できる相手の申請中の支出が0件の場合、CONFLICT が返る', async () => {
		const db = createDb(env.DB);
		const approverId = await insertUser(db);
		// 他ユーザーの pending を先に全件承認して 0 件の状態を作る
		const pendingIds = (
			await db.select({ id: expense.id }).from(expense).where(eq(expense.status, 'pending'))
		).map((r) => r.id);
		if (pendingIds.length > 0)
			await db.update(expense).set({ status: 'approved' }).where(inArray(expense.id, pendingIds));
		await insertExpense(db, approverId, 'pending');

		await expect(approveExpenses(db, approverId, notify)).rejects.toMatchObject({
			code: 'CONFLICT'
		});
	});
});

describe('getUnapprovedCount', () => {
	test('自分以外のユーザーの申請中の支出件数を取得できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const partnerId = await insertUser(db);
		const before = await getUnapprovedCount(db, userId);

		await insertExpense(db, partnerId, 'pending');
		await insertExpense(db, partnerId, 'pending');
		await insertExpense(db, partnerId, 'checked');
		await insertExpense(db, partnerId, 'approved');
		await insertExpense(db, userId, 'pending');

		expect((await getUnapprovedCount(db, userId)) - before).toBe(2);
	});
});
