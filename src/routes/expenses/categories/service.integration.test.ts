/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: expenses カテゴリ サービス
 * @module src/routes/expenses/categories/service.integration.test.ts
 * @testType integration
 *
 * @target ./service.ts
 * @spec specs/expenses/spec.md
 * @covers AC-010, AC-011, AC-012, AC-104
 */

import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import { AppError } from '$lib/server/errors';
import { getCategories, createCategory, updateCategory, deleteCategory } from './service';
import { createExpense } from '../service';
import { createPayer } from '../payers/service';

function makeUserId() {
	return crypto.randomUUID();
}

describe('createCategory', () => {
	test('[SPEC: AC-010] カテゴリを登録できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const created = await createCategory(db, userId, { name: '食費' });

		expect(created.id).toBeTruthy();
		expect(created.name).toBe('食費');
		expect(created.userId).toBe(userId);
		expect(created.createdAt).toBeTruthy();
	});

	test('[SPEC: AC-010] 登録したカテゴリが一覧に表示される', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		await createCategory(db, userId, { name: '食費' });
		await createCategory(db, userId, { name: '交通費' });
		await createCategory(db, userId, { name: '光熱費' });

		const result = await getCategories(db, userId);

		expect(result.items).toHaveLength(3);
		expect(result.total).toBe(3);
		const names = result.items.map((c) => c.name);
		expect(names).toContain('食費');
		expect(names).toContain('交通費');
		expect(names).toContain('光熱費');
	});
});

describe('getCategories', () => {
	test('[SPEC: AC-010] 自分のカテゴリのみ取得できる（他ユーザーのカテゴリは含まれない）', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const otherUserId = makeUserId();

		await createCategory(db, userId, { name: '自分のカテゴリ' });
		await createCategory(db, otherUserId, { name: '他人のカテゴリ' });

		const result = await getCategories(db, userId);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].name).toBe('自分のカテゴリ');
		expect(result.items[0].userId).toBe(userId);
	});
});

describe('updateCategory', () => {
	test('[SPEC: AC-011] カテゴリ名を更新できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const created = await createCategory(db, userId, { name: '食費' });
		const updated = await updateCategory(db, userId, created.id, { name: '外食費' });

		expect(updated.id).toBe(created.id);
		expect(updated.name).toBe('外食費');
		expect(updated.userId).toBe(userId);
	});

	test('[SPEC: AC-011] 更新後のカテゴリ名が一覧に反映される', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const created = await createCategory(db, userId, { name: '食費' });
		await updateCategory(db, userId, created.id, { name: '外食費' });

		const result = await getCategories(db, userId);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].name).toBe('外食費');
	});

	test('[SPEC: AC-011] 存在しないカテゴリ ID を指定した場合は NOT_FOUND エラーになる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		await expect(
			updateCategory(db, userId, crypto.randomUUID(), { name: '新しい名前' })
		).rejects.toThrow(AppError);

		try {
			await updateCategory(db, userId, crypto.randomUUID(), { name: '新しい名前' });
		} catch (e) {
			expect(e).toBeInstanceOf(AppError);
			expect((e as AppError).status).toBe(404);
			expect((e as AppError).code).toBe('NOT_FOUND');
		}
	});

	test('[SPEC: AC-011] 他ユーザーのカテゴリを更新しようとした場合は NOT_FOUND エラーになる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const otherUserId = makeUserId();

		const otherCategory = await createCategory(db, otherUserId, { name: '食費' });

		await expect(updateCategory(db, userId, otherCategory.id, { name: '変更後' })).rejects.toThrow(
			AppError
		);
	});
});

describe('deleteCategory', () => {
	test('[SPEC: AC-012] 支出が 0 件のカテゴリを削除できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const created = await createCategory(db, userId, { name: '食費' });
		await deleteCategory(db, userId, created.id);

		const result = await getCategories(db, userId);
		expect(result.items.find((c) => c.id === created.id)).toBeUndefined();
	});

	test('[SPEC: AC-012] 存在しないカテゴリ ID を指定した場合は NOT_FOUND エラーになる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		await expect(deleteCategory(db, userId, crypto.randomUUID())).rejects.toThrow(AppError);

		try {
			await deleteCategory(db, userId, crypto.randomUUID());
		} catch (e) {
			expect(e).toBeInstanceOf(AppError);
			expect((e as AppError).status).toBe(404);
			expect((e as AppError).code).toBe('NOT_FOUND');
		}
	});

	test('[SPEC: AC-012] 他ユーザーのカテゴリを削除しようとした場合は NOT_FOUND エラーになる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const otherUserId = makeUserId();

		const otherCategory = await createCategory(db, otherUserId, { name: '食費' });

		await expect(deleteCategory(db, userId, otherCategory.id)).rejects.toThrow(AppError);
	});

	test('[SPEC: AC-104] 他ユーザーの支出が存在しても自分のカテゴリを削除できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const otherUserId = makeUserId();

		// 自分のカテゴリと支払者
		const myCategory = await createCategory(db, userId, { name: '食費' });
		const myPayer = await createPayer(db, userId, { name: '田中' });

		// 他ユーザーが自分と同じ categoryId を紐付けた支出は作れないが、
		// 削除チェック関数が userId フィルタなしだと他ユーザーの支出でブロックされる。
		// ここでは自分のカテゴリが支出 0 件のときに削除できることを確認する。
		// （他ユーザーが同名カテゴリを持っていても影響しない）
		const otherCategory = await createCategory(db, otherUserId, { name: '食費' });
		const otherPayer = await createPayer(db, otherUserId, { name: '他人' });
		await createExpense(db, otherUserId, {
			amount: 500,
			categoryId: otherCategory.id,
			payerId: otherPayer.id
		});

		// 自分の myCategory には支出がないので削除できる
		await expect(deleteCategory(db, userId, myCategory.id)).resolves.toBeUndefined();
		const result = await getCategories(db, userId);
		expect(result.items.find((c) => c.id === myCategory.id)).toBeUndefined();

		// 自分の支出が存在する場合は CONFLICT になることも確認
		const myCategory2 = await createCategory(db, userId, { name: '交通費' });
		await createExpense(db, userId, {
			amount: 1000,
			categoryId: myCategory2.id,
			payerId: myPayer.id
		});
		await expect(deleteCategory(db, userId, myCategory2.id)).rejects.toMatchObject({
			code: 'CONFLICT'
		});
	});

	test('[SPEC: AC-012] 支出に紐付くカテゴリは削除できず CONFLICT エラーになる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createPayer(db, userId, { name: '田中' });
		await createExpense(db, userId, { amount: 1000, categoryId: category.id, payerId: payer.id });

		await expect(deleteCategory(db, userId, category.id)).rejects.toThrow(AppError);

		try {
			await deleteCategory(db, userId, category.id);
		} catch (e) {
			expect(e).toBeInstanceOf(AppError);
			expect((e as AppError).status).toBe(409);
			expect((e as AppError).code).toBe('CONFLICT');
		}
	});
});
