/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: Category サービス
 * @module src/routes/expenses/categories/service.integration.test.ts
 * @testType integration
 *
 * @target ./service.ts
 * @spec specs/expenses/spec.md
 * @covers AC-011, AC-012, AC-013, AC-203
 */

import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import { getCategories, createCategory, updateCategory, deleteCategory } from './service';
import { AppError } from '$lib/server/errors';

function makeUserId() {
	return crypto.randomUUID();
}

describe('getCategories', () => {
	test('[SPEC: AC-011] カテゴリ一覧を取得できる // spec:8fe156c1', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		await createCategory(db, userId, { name: '食費' });
		await createCategory(db, userId, { name: '交通費' });

		const result = await getCategories(db, userId);

		expect(result).toHaveProperty('items');
		expect(Array.isArray(result.items)).toBe(true);
		expect(result.items.length).toBeGreaterThanOrEqual(2);
	});
});

describe('createCategory', () => {
	test('[SPEC: AC-011] 正しいカテゴリ名でカテゴリを登録できる // spec:8fe156c1', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const created = await createCategory(db, userId, { name: 'テストカテゴリ' });

		expect(created.name).toBe('テストカテゴリ');
		expect(typeof created.id).toBe('string');
	});

	test('[SPEC: AC-203] カテゴリ名が 50 文字の場合、登録できる // spec:8fe156c1', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const name = 'あ'.repeat(50);

		const created = await createCategory(db, userId, { name });

		expect(created.name).toBe(name);
	});
});

describe('updateCategory', () => {
	test('[SPEC: AC-012] カテゴリ名を更新できる // spec:8fe156c1', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const created = await createCategory(db, userId, { name: '更新前カテゴリ' });
		const updated = await updateCategory(db, userId, created.id, { name: '更新後カテゴリ' });

		expect(updated.name).toBe('更新後カテゴリ');
	});
});

describe('deleteCategory', () => {
	test('[SPEC: AC-013] 支出に紐付いていないカテゴリを削除できる // spec:8fe156c1', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const created = await createCategory(db, userId, { name: '削除用カテゴリ' });

		await expect(deleteCategory(db, userId, created.id)).resolves.toBeUndefined();
	});

	test('[SPEC: AC-013] 存在しないカテゴリを削除しようとすると NOT_FOUND を返す // spec:8fe156c1', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		await expect(deleteCategory(db, userId, 'non-existent-id')).rejects.toBeInstanceOf(AppError);
	});
});
