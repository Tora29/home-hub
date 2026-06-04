/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: 種目サービス
 * @module src/routes/workout/exercises/service.integration.test.ts
 * @testType integration
 *
 * @target ./service.ts
 */
import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import { user as userTable, workoutExercise, workoutRecord } from '$lib/server/tables';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from '$lib/server/tables';
import { getExercises, createExercise, updateExercise, deleteExercise } from './service';

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

async function insertExercise(db: Db, userId: string, name = 'ベンチプレス'): Promise<string> {
	const id = crypto.randomUUID();
	await db.insert(workoutExercise).values({ id, userId, name, createdAt: new Date() });
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

describe('getExercises', () => {
	test('自分の種目のみ取得される', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const otherId = await insertUser(db);

		await insertExercise(db, userId, 'ベンチプレス');
		await insertExercise(db, otherId, '他人の種目');

		const result = await getExercises(db, userId);
		expect(result.items).toHaveLength(1);
		expect(result.items[0].name).toBe('ベンチプレス');
	});
});

describe('createExercise', () => {
	test('正しいデータで種目を登録できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		const created = await createExercise(db, userId, { name: 'スクワット' });
		expect(created.name).toBe('スクワット');
		expect(created.userId).toBe(userId);
	});
});

describe('updateExercise', () => {
	test('自分の種目を更新できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		const exerciseId = await insertExercise(db, userId, '旧名称');
		const updated = await updateExercise(db, userId, exerciseId, { name: '新名称' });
		expect(updated.name).toBe('新名称');
	});

	test('他ユーザーの種目は更新できない（NOT_FOUND）', async () => {
		const db = createDb(env.DB);
		const ownerId = await insertUser(db);
		const otherId = await insertUser(db);

		const exerciseId = await insertExercise(db, ownerId);
		await expect(
			updateExercise(db, otherId, exerciseId, { name: '不正更新' })
		).rejects.toMatchObject({ code: 'NOT_FOUND' });
	});
});

describe('deleteExercise', () => {
	test('記録が紐付かない種目は削除できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		const exerciseId = await insertExercise(db, userId);
		await expect(deleteExercise(db, userId, exerciseId)).resolves.toBeUndefined();
	});

	test('紐付く記録がある種目は削除できない（CONFLICT）', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		const exerciseId = await insertExercise(db, userId);
		await insertRecord(db, userId, exerciseId);

		await expect(deleteExercise(db, userId, exerciseId)).rejects.toMatchObject({
			code: 'CONFLICT'
		});
	});

	test('他ユーザーの種目は削除できない（NOT_FOUND）', async () => {
		const db = createDb(env.DB);
		const ownerId = await insertUser(db);
		const otherId = await insertUser(db);

		const exerciseId = await insertExercise(db, ownerId);
		await expect(deleteExercise(db, otherId, exerciseId)).rejects.toMatchObject({
			code: 'NOT_FOUND'
		});
	});
});
