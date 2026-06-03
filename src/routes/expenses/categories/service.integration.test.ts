/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: 支出カテゴリサービス
 * @module src/routes/expenses/categories/service.integration.test.ts
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
import { getCategories, createCategory, updateCategory, deleteCategory } from './service';

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

async function insertExpense(db: Db, userId: string, categoryId: string): Promise<string> {
	const payerId = await insertUser(db);
	const id = crypto.randomUUID();
	await db.insert(expense).values({
		id,
		userId,
		amount: 1000,
		categoryId,
		payerUserId: payerId,
		status: 'unapproved',
		createdAt: new Date()
	});
	return id;
}

describe('getCategories - 権限チェック', () => {
	test('他ユーザーのカテゴリは取得されない', async () => {
		const db = createDb(env.DB);
		const ownerUserId = crypto.randomUUID();
		const otherUserId = crypto.randomUUID();

		await insertCategory(db, ownerUserId, '食費');
		await insertCategory(db, ownerUserId, '日用品');

		const result = await getCategories(db, otherUserId);
		expect(result.items).toHaveLength(0);
	});

	test('自分のカテゴリのみ取得される', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();
		const otherUserId = crypto.randomUUID();

		await insertCategory(db, userId, '食費');
		await insertCategory(db, otherUserId, '他人の経費');

		const result = await getCategories(db, userId);
		expect(result.items).toHaveLength(1);
		expect(result.items[0].name).toBe('食費');
	});
});

describe('createCategory', () => {
	test('カテゴリを作成できる', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();

		const created = await createCategory(db, userId, { name: '交通費' });
		expect(created.name).toBe('交通費');
		expect(created.userId).toBe(userId);
	});
});

describe('updateCategory - 権限チェック', () => {
	test('他ユーザーのカテゴリは更新できない（NOT_FOUND）', async () => {
		const db = createDb(env.DB);
		const ownerUserId = crypto.randomUUID();
		const otherUserId = crypto.randomUUID();

		const categoryId = await insertCategory(db, ownerUserId);

		await expect(
			updateCategory(db, otherUserId, categoryId, { name: '新名称' })
		).rejects.toMatchObject({ code: 'NOT_FOUND' });
	});

	test('自分のカテゴリを更新できる', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();

		const categoryId = await insertCategory(db, userId, '旧名称');
		const updated = await updateCategory(db, userId, categoryId, { name: '新名称' });
		expect(updated.name).toBe('新名称');
	});
});

describe('deleteCategory - 権限・制約チェック', () => {
	test('他ユーザーのカテゴリは削除できない（NOT_FOUND）', async () => {
		const db = createDb(env.DB);
		const ownerUserId = crypto.randomUUID();
		const otherUserId = crypto.randomUUID();

		const categoryId = await insertCategory(db, ownerUserId);

		await expect(deleteCategory(db, otherUserId, categoryId)).rejects.toMatchObject({
			code: 'NOT_FOUND'
		});
	});

	test('支出が紐付くカテゴリは削除できない（CONFLICT）', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();

		const categoryId = await insertCategory(db, userId);
		await insertExpense(db, userId, categoryId);

		await expect(deleteCategory(db, userId, categoryId)).rejects.toMatchObject({
			code: 'CONFLICT'
		});
	});

	test('支出が紐付かないカテゴリは削除できる', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();

		const categoryId = await insertCategory(db, userId);

		await expect(deleteCategory(db, userId, categoryId)).resolves.toBeUndefined();
	});
});
