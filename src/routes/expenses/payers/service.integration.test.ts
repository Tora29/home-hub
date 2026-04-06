/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: expenses 支払者 サービス
 * @module src/routes/expenses/payers/service.integration.test.ts
 * @testType integration
 *
 * @target ./service.ts
 * @spec specs/expenses/spec.md
 * @covers AC-035, AC-036, AC-037, AC-038, AC-039
 */

import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import { AppError } from '$lib/server/errors';
import { getPayers, createPayer, updatePayer, deletePayer } from './service';
import { createExpense } from '../service';
import { createCategory } from '../categories/service';

function makeUserId() {
	return crypto.randomUUID();
}

describe('createPayer', () => {
	test('[SPEC: AC-035] 支払者を登録できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const created = await createPayer(db, userId, { name: '田中' });

		expect(created.id).toBeTruthy();
		expect(created.name).toBe('田中');
		expect(created.userId).toBe(userId);
		expect(created.createdAt).toBeTruthy();
	});

	test('[SPEC: AC-039] 登録した支払者が一覧に表示される', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		await createPayer(db, userId, { name: '鈴木' });
		await createPayer(db, userId, { name: '佐藤' });

		const result = await getPayers(db, userId);

		expect(result.items.length).toBe(2);
		expect(result.items.map((p) => p.name)).toEqual(expect.arrayContaining(['鈴木', '佐藤']));
	});

	test('[SPEC: AC-039] 自分の支払者のみ取得できる（他ユーザーの支払者は含まれない）', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const otherUserId = makeUserId();

		await createPayer(db, userId, { name: '自分の支払者' });
		await createPayer(db, otherUserId, { name: '他人の支払者' });

		const result = await getPayers(db, userId);

		expect(result.items.length).toBe(1);
		expect(result.items[0].name).toBe('自分の支払者');
	});
});

describe('updatePayer', () => {
	test('[SPEC: AC-036] 支払者名を更新できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const created = await createPayer(db, userId, { name: '旧名前' });
		const updated = await updatePayer(db, userId, created.id, { name: '新名前' });

		expect(updated.id).toBe(created.id);
		expect(updated.name).toBe('新名前');
	});

	test('[SPEC: AC-036] 更新後の支払者名が一覧に反映される', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const created = await createPayer(db, userId, { name: '山田' });
		await updatePayer(db, userId, created.id, { name: '山田太郎' });

		const result = await getPayers(db, userId);
		const found = result.items.find((p) => p.id === created.id);

		expect(found?.name).toBe('山田太郎');
	});

	test('[SPEC: AC-036] 存在しない支払者 ID を指定した場合は NOT_FOUND エラーになる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		await expect(
			updatePayer(db, userId, 'non-existent-id', { name: '新名前' })
		).rejects.toThrow(AppError);
	});

	test('[SPEC: AC-036] 他ユーザーの支払者を更新しようとした場合は NOT_FOUND エラーになる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const otherUserId = makeUserId();

		const otherPayer = await createPayer(db, otherUserId, { name: '他人の支払者' });

		await expect(
			updatePayer(db, userId, otherPayer.id, { name: '変更後' })
		).rejects.toThrow(AppError);
	});
});

describe('deletePayer', () => {
	test('[SPEC: AC-037] 支出が0件の支払者を削除できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const created = await createPayer(db, userId, { name: '削除対象' });
		await deletePayer(db, userId, created.id);

		const result = await getPayers(db, userId);
		const found = result.items.find((p) => p.id === created.id);
		expect(found).toBeUndefined();
	});

	test('[SPEC: AC-037] 存在しない支払者 ID を指定した場合は NOT_FOUND エラーになる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		await expect(deletePayer(db, userId, 'non-existent-id')).rejects.toThrow(AppError);
	});

	test('[SPEC: AC-037] 他ユーザーの支払者を削除しようとした場合は NOT_FOUND エラーになる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const otherUserId = makeUserId();

		const otherPayer = await createPayer(db, otherUserId, { name: '他人の支払者' });

		await expect(deletePayer(db, userId, otherPayer.id)).rejects.toThrow(AppError);
	});

	test('[SPEC: AC-119] 支出に紐付く支払者は削除できず CONFLICT エラーになる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createPayer(db, userId, { name: '使用中の支払者' });
		await createExpense(db, userId, {
			amount: 1000,
			categoryId: category.id,
			payerId: payer.id
		});

		await expect(deletePayer(db, userId, payer.id)).rejects.toMatchObject({
			code: 'CONFLICT'
		});
	});
});

describe('支払者付き支出 CRUD', () => {
	test('[SPEC: AC-038] 支払者を選択して支出を登録すると、支払者情報が支出に紐付いて保存される', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createPayer(db, userId, { name: '田中' });

		const expense = await createExpense(db, userId, {
			amount: 2000,
			categoryId: category.id,
			payerId: payer.id
		});

		expect(expense.payerId).toBe(payer.id);
		expect(expense.payer.id).toBe(payer.id);
		expect(expense.payer.name).toBe('田中');
	});

	test('[SPEC: AC-039] 支払者を登録するとその支払者を支出作成に使用できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '交通費' });
		const payer1 = await createPayer(db, userId, { name: '佐藤' });
		const payer2 = await createPayer(db, userId, { name: '鈴木' });

		const expense1 = await createExpense(db, userId, {
			amount: 500,
			categoryId: category.id,
			payerId: payer1.id
		});
		const expense2 = await createExpense(db, userId, {
			amount: 800,
			categoryId: category.id,
			payerId: payer2.id
		});

		expect(expense1.payer.name).toBe('佐藤');
		expect(expense2.payer.name).toBe('鈴木');
	});
});
