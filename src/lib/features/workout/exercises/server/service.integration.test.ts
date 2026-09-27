/**
 * @file テスト: 種目・カテゴリサービス
 * @module src/lib/features/workout/exercises/server/service.integration.test.ts
 * @testType integration
 *
 * @target ./service.ts
 */
/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import {
	user as userTable,
	workoutExercise,
	workoutExerciseCategory,
	workoutRecord
} from '$lib/server/tables';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from '$lib/server/tables';
import {
	getExercises,
	createExercise,
	updateExercise,
	deleteExercise,
	getExerciseCategories,
	createExerciseCategory,
	updateExerciseCategory,
	deleteExerciseCategory
} from './service';

type Db = DrizzleD1Database<typeof schema>;

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

async function insertCategory(db: Db, userId: string, name = '胸'): Promise<string> {
	const id = crypto.randomUUID();
	await db.insert(workoutExerciseCategory).values({ id, userId, name, createdAt: new Date() });
	return id;
}

async function insertExercise(
	db: Db,
	userId: string,
	name = 'ベンチプレス',
	categoryId: string | null = null
): Promise<string> {
	const id = crypto.randomUUID();
	await db.insert(workoutExercise).values({ id, userId, name, categoryId, createdAt: new Date() });
	return id;
}

async function insertRecord(db: Db, userId: string, exerciseId: string): Promise<string> {
	const id = crypto.randomUUID();
	await db.insert(workoutRecord).values({
		id,
		userId,
		exerciseId,
		date: '2024-01-01',
		weight: 80,
		reps: 5,
		createdAt: new Date()
	});
	return id;
}

// --- カテゴリ ---

describe('getExerciseCategories', () => {
	test('自分のカテゴリのみ作成順で取得できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const otherId = await insertUser(db);

		await insertCategory(db, userId, '胸');
		await insertCategory(db, userId, '背中');
		await insertCategory(db, otherId, '他人のカテゴリ');

		const categories = await getExerciseCategories(db, userId);
		expect(categories.map((c) => c.name)).toEqual(['胸', '背中']);
	});
});

describe('createExerciseCategory', () => {
	test('正しいデータでカテゴリを作成できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		const created = await createExerciseCategory(db, userId, { name: '胸' });
		expect(created.name).toBe('胸');
		expect(created.userId).toBe(userId);
	});
});

describe('updateExerciseCategory', () => {
	test('正しいデータでカテゴリを更新できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		const categoryId = await insertCategory(db, userId, '胸');
		const updated = await updateExerciseCategory(db, userId, categoryId, { name: '大胸筋' });
		expect(updated.name).toBe('大胸筋');
	});

	test('存在しない ID の場合、NOT_FOUND が返る', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		await expect(
			updateExerciseCategory(db, userId, 'nonexistent-id', { name: '胸' })
		).rejects.toMatchObject({ code: 'NOT_FOUND' });
	});

	test('他ユーザーのカテゴリを更新しようとした場合、NOT_FOUND が返る', async () => {
		const db = createDb(env.DB);
		const ownerId = await insertUser(db);
		const otherId = await insertUser(db);

		const categoryId = await insertCategory(db, ownerId, '胸');
		await expect(
			updateExerciseCategory(db, otherId, categoryId, { name: '不正更新' })
		).rejects.toMatchObject({ code: 'NOT_FOUND' });
	});
});

describe('deleteExerciseCategory', () => {
	test('カテゴリを削除できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		const categoryId = await insertCategory(db, userId, '胸');
		await expect(deleteExerciseCategory(db, userId, categoryId)).resolves.toBeUndefined();

		const categories = await getExerciseCategories(db, userId);
		expect(categories).toHaveLength(0);
	});

	test('カテゴリを削除した場合、紐付く種目をカテゴリなしにできる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		const categoryId = await insertCategory(db, userId, '胸');
		await insertExercise(db, userId, 'ベンチプレス', categoryId);

		await deleteExerciseCategory(db, userId, categoryId);

		const result = await getExercises(db, userId);
		expect(result.items[0].categoryId).toBeNull();
		expect(result.items[0].category).toBeNull();
	});

	test('他ユーザーのカテゴリを削除しようとした場合、NOT_FOUND が返る', async () => {
		const db = createDb(env.DB);
		const ownerId = await insertUser(db);
		const otherId = await insertUser(db);

		const categoryId = await insertCategory(db, ownerId, '胸');
		await expect(deleteExerciseCategory(db, otherId, categoryId)).rejects.toMatchObject({
			code: 'NOT_FOUND'
		});
	});
});

// --- 種目 ---

describe('getExercises', () => {
	test('自分の種目のみ取得できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const otherId = await insertUser(db);

		await insertExercise(db, userId, 'ベンチプレス');
		await insertExercise(db, otherId, '他人の種目');

		const result = await getExercises(db, userId);
		expect(result.items).toHaveLength(1);
		expect(result.items[0].name).toBe('ベンチプレス');
	});

	test('categoryId を持つ種目をカテゴリ付きで取得できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		const categoryId = await insertCategory(db, userId, '胸');
		await insertExercise(db, userId, 'ベンチプレス', categoryId);

		const result = await getExercises(db, userId);
		expect(result.items[0].category).not.toBeNull();
		expect(result.items[0].category?.name).toBe('胸');
		expect(result.items[0].categoryId).toBe(categoryId);
	});

	test('categoryId が null の種目をカテゴリなしで取得できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		await insertExercise(db, userId, 'ベンチプレス', null);

		const result = await getExercises(db, userId);
		expect(result.items[0].category).toBeNull();
		expect(result.items[0].categoryId).toBeNull();
	});
});

describe('createExercise', () => {
	test('正しいデータで種目を登録できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		const created = await createExercise(db, userId, { name: 'スクワット', categoryId: null });
		expect(created.name).toBe('スクワット');
		expect(created.userId).toBe(userId);
		expect(created.category).toBeNull();
	});

	test('categoryId を指定して種目を登録できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		const categoryId = await insertCategory(db, userId, '脚');
		const created = await createExercise(db, userId, { name: 'スクワット', categoryId });
		expect(created.categoryId).toBe(categoryId);
		expect(created.category?.name).toBe('脚');
	});

	test('他ユーザーのカテゴリを指定した場合、NOT_FOUND が返る', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const otherId = await insertUser(db);
		const otherCategoryId = await insertCategory(db, otherId, '他人のカテゴリ');

		await expect(
			createExercise(db, userId, { name: 'スクワット', categoryId: otherCategoryId })
		).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'カテゴリが見つかりません' });
		expect((await getExercises(db, userId)).items).toHaveLength(0);
	});

	test('存在しないカテゴリを指定した場合、NOT_FOUND が返る', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		await expect(
			createExercise(db, userId, { name: 'スクワット', categoryId: 'nonexistent' })
		).rejects.toMatchObject({ code: 'NOT_FOUND' });
	});
});

describe('updateExercise', () => {
	test('自分の種目の名前とカテゴリを更新できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const categoryId = await insertCategory(db, userId, '胸');

		const exerciseId = await insertExercise(db, userId, '旧名称');
		const updated = await updateExercise(db, userId, exerciseId, { name: '新名称', categoryId });
		expect(updated.name).toBe('新名称');
		expect(updated.category?.name).toBe('胸');
	});

	test('categoryId=null を送った場合、カテゴリを解除できる（PUT 完全置換）', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const categoryId = await insertCategory(db, userId, '胸');
		const exerciseId = await insertExercise(db, userId, 'ベンチプレス', categoryId);

		const updated = await updateExercise(db, userId, exerciseId, {
			name: 'ベンチプレス',
			categoryId: null
		});
		expect(updated.categoryId).toBeNull();
		expect(updated.category).toBeNull();
	});

	test('他ユーザーの種目を更新しようとした場合、NOT_FOUND が返る', async () => {
		const db = createDb(env.DB);
		const ownerId = await insertUser(db);
		const otherId = await insertUser(db);

		const exerciseId = await insertExercise(db, ownerId);
		await expect(
			updateExercise(db, otherId, exerciseId, { name: '不正更新', categoryId: null })
		).rejects.toMatchObject({ code: 'NOT_FOUND' });
	});

	test('他ユーザーのカテゴリを指定した場合、NOT_FOUND が返る', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const otherId = await insertUser(db);
		const exerciseId = await insertExercise(db, userId, 'ベンチプレス');
		const otherCategoryId = await insertCategory(db, otherId, '他人のカテゴリ');

		await expect(
			updateExercise(db, userId, exerciseId, { name: 'ベンチプレス', categoryId: otherCategoryId })
		).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'カテゴリが見つかりません' });

		const result = await getExercises(db, userId);
		expect(result.items[0].categoryId).toBeNull();
	});
});

describe('deleteExercise', () => {
	test('記録が紐付かない種目は削除できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		const exerciseId = await insertExercise(db, userId);
		await expect(deleteExercise(db, userId, exerciseId)).resolves.toBeUndefined();
		expect((await getExercises(db, userId)).items).toHaveLength(0);
	});

	test('紐付く記録がある種目を削除しようとした場合、CONFLICT が返る', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		const exerciseId = await insertExercise(db, userId);
		await insertRecord(db, userId, exerciseId);

		await expect(deleteExercise(db, userId, exerciseId)).rejects.toMatchObject({
			code: 'CONFLICT'
		});
	});

	test('他ユーザーの種目を削除しようとした場合、NOT_FOUND が返る', async () => {
		const db = createDb(env.DB);
		const ownerId = await insertUser(db);
		const otherId = await insertUser(db);

		const exerciseId = await insertExercise(db, ownerId);
		await expect(deleteExercise(db, otherId, exerciseId)).rejects.toMatchObject({
			code: 'NOT_FOUND'
		});
	});
});
