/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: 支出カテゴリサービス
 * @module src/lib/features/expenses/categories/server/service.integration.test.ts
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

async function insertCategory(db: Db, name = 'テスト'): Promise<string> {
	const id = crypto.randomUUID();
	await db.insert(expenseCategory).values({ id, name, createdAt: new Date() });
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

async function insertExpense(db: Db, categoryId: string): Promise<string> {
	const userId = await insertUser(db);
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

describe('getCategories', () => {
	test('全ユーザー共通のカテゴリが取得される', async () => {
		const db = createDb(env.DB);

		await insertCategory(db, '食費');
		await insertCategory(db, '日用品');

		const result = await getCategories(db);
		expect(result.items.length).toBeGreaterThanOrEqual(2);
	});
});

describe('createCategory', () => {
	test('カテゴリを作成できる', async () => {
		const db = createDb(env.DB);

		const created = await createCategory(db, { name: '交通費' });
		expect(created.name).toBe('交通費');
	});
});

describe('updateCategory', () => {
	test('カテゴリを更新できる', async () => {
		const db = createDb(env.DB);

		const categoryId = await insertCategory(db, '旧名称');
		const updated = await updateCategory(db, categoryId, { name: '新名称' });
		expect(updated.name).toBe('新名称');
	});

	test('存在しないカテゴリは更新できない（NOT_FOUND）', async () => {
		const db = createDb(env.DB);

		await expect(updateCategory(db, crypto.randomUUID(), { name: '新名称' })).rejects.toMatchObject(
			{ code: 'NOT_FOUND' }
		);
	});
});

describe('deleteCategory', () => {
	test('支出が紐付くカテゴリは削除できない（CONFLICT）', async () => {
		const db = createDb(env.DB);

		const categoryId = await insertCategory(db);
		await insertExpense(db, categoryId);

		await expect(deleteCategory(db, categoryId)).rejects.toMatchObject({
			code: 'CONFLICT'
		});
	});

	test('支出が紐付かないカテゴリは削除できる', async () => {
		const db = createDb(env.DB);

		const categoryId = await insertCategory(db);

		await expect(deleteCategory(db, categoryId)).resolves.toBeUndefined();
	});
});
