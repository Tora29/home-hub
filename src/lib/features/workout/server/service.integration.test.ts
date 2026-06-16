/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: 筋トレ記録サービス
 * @module src/lib/features/workout/server/service.integration.test.ts
 * @testType integration
 *
 * @target ./service.ts
 */
import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import {
	user as userTable,
	workoutExercise,
	workoutRecord,
	bodyWeightRecord
} from '$lib/server/tables';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from '$lib/server/tables';
import {
	getRecords,
	createRecord,
	deleteRecord,
	getChartData,
	getWeeklyVolume,
	upsertBodyWeight
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

async function insertExercise(db: Db, userId: string, name = 'ベンチプレス'): Promise<string> {
	const id = crypto.randomUUID();
	await db.insert(workoutExercise).values({ id, userId, name, createdAt: new Date() });
	return id;
}

async function insertRecord(
	db: Db,
	userId: string,
	exerciseId: string,
	date: string,
	weight: number,
	reps: number
): Promise<string> {
	const id = crypto.randomUUID();
	await db
		.insert(workoutRecord)
		.values({ id, userId, exerciseId, date, weight, reps, createdAt: new Date() });
	return id;
}

async function insertBodyWeight(
	db: Db,
	userId: string,
	date: string,
	weight: number
): Promise<void> {
	await db.insert(bodyWeightRecord).values({
		id: crypto.randomUUID(),
		userId,
		date,
		weight,
		createdAt: new Date()
	});
}

describe('getRecords', () => {
	test('自分の記録のみ取得される', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const otherId = await insertUser(db);
		const exerciseId = await insertExercise(db, userId);
		const otherExerciseId = await insertExercise(db, otherId);

		await insertRecord(db, userId, exerciseId, '2024-01-01', 80, 5);
		await insertRecord(db, otherId, otherExerciseId, '2024-01-01', 60, 8);

		const records = await getRecords(db, userId);
		expect(records).toHaveLength(1);
		expect(records[0].weight).toBe(80);
	});
});

describe('createRecord', () => {
	test('正しいデータで記録を登録できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const exerciseId = await insertExercise(db, userId);

		const created = await createRecord(db, userId, {
			exerciseId,
			date: '2024-01-15',
			weight: 80,
			reps: 5,
			isBodyWeight: false
		});
		expect(created.weight).toBe(80);
		expect(created.reps).toBe(5);
		expect(created.exerciseId).toBe(exerciseId);
	});

	test('存在しない種目IDの場合、NOT_FOUND が返る', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		await expect(
			createRecord(db, userId, {
				exerciseId: 'nonexistent',
				date: '2024-01-15',
				weight: 80,
				reps: 5,
				isBodyWeight: false
			})
		).rejects.toMatchObject({ code: 'NOT_FOUND' });
	});

	test('isBodyWeight=true のとき同日の体重記録が存在すれば、その値で記録できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const exerciseId = await insertExercise(db, userId);

		await upsertBodyWeight(db, userId, { date: '2024-01-15', weight: 72.5 });

		const record = await createRecord(db, userId, {
			exerciseId,
			date: '2024-01-15',
			weight: 0,
			reps: 5,
			isBodyWeight: true
		});
		expect(record.isBodyWeight).toBe(true);
		expect(record.weight).toBe(72); // Math.floor(72.5) = 72
	});

	test('isBodyWeight=true のとき同日の体重記録が存在しない場合、VALIDATION_ERROR になる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const exerciseId = await insertExercise(db, userId);

		await expect(
			createRecord(db, userId, {
				exerciseId,
				date: '2099-01-01',
				weight: 0,
				reps: 5,
				isBodyWeight: true
			})
		).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
	});
});

describe('deleteRecord', () => {
	test('自分の記録を削除できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const exerciseId = await insertExercise(db, userId);
		const recordId = await insertRecord(db, userId, exerciseId, '2024-01-01', 80, 5);

		await expect(deleteRecord(db, userId, recordId)).resolves.toBeUndefined();
	});

	test('他ユーザーの記録は削除できない（NOT_FOUND）', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const otherId = await insertUser(db);
		const exerciseId = await insertExercise(db, userId);
		const recordId = await insertRecord(db, userId, exerciseId, '2024-01-01', 80, 5);

		await expect(deleteRecord(db, otherId, recordId)).rejects.toMatchObject({ code: 'NOT_FOUND' });
	});
});

describe('getChartData', () => {
	test('チャートデータを期間フィルタで取得できる（1ヶ月）', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const exerciseId = await insertExercise(db, userId);

		const today = new Date().toISOString().slice(0, 10);
		await insertRecord(db, userId, exerciseId, today, 80, 5);

		const chartData = await getChartData(db, userId, { exerciseId, period: '1m' });
		expect(chartData.exercisePoints).toHaveLength(1);
		expect(chartData.exercisePoints[0].maxWeight).toBe(80);
	});

	test('同一日付の記録が複数ある場合、最大重量のみ返す', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const exerciseId = await insertExercise(db, userId);

		await insertRecord(db, userId, exerciseId, '2024-01-15', 70, 8);
		await insertRecord(db, userId, exerciseId, '2024-01-15', 80, 5);
		await insertRecord(db, userId, exerciseId, '2024-01-15', 75, 6);

		const chartData = await getChartData(db, userId, { exerciseId, period: 'all' });
		expect(chartData.exercisePoints).toHaveLength(1);
		expect(chartData.exercisePoints[0].maxWeight).toBe(80);
	});

	test('チャートデータに体重データが含まれる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const exerciseId = await insertExercise(db, userId);

		const today = new Date().toISOString().slice(0, 10);
		await insertRecord(db, userId, exerciseId, today, 80, 5);
		await insertBodyWeight(db, userId, today, 72.5);

		const chartData = await getChartData(db, userId, { exerciseId, period: '1m' });
		expect(chartData.bodyWeightPoints).toHaveLength(1);
		expect(chartData.bodyWeightPoints[0].weight).toBe(72.5);
	});
});

describe('upsertBodyWeight', () => {
	test('体重を登録できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		const result = await upsertBodyWeight(db, userId, { date: '2024-01-15', weight: 72.5 });
		expect(result.date).toBe('2024-01-15');
		expect(result.weight).toBe(72.5);
	});

	test('体重を同日に2回登録した場合、2回目の値で上書きされる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		await upsertBodyWeight(db, userId, { date: '2024-01-15', weight: 72.5 });
		const result = await upsertBodyWeight(db, userId, { date: '2024-01-15', weight: 73.0 });
		expect(result.weight).toBe(73.0);
	});
});

describe('getWeeklyVolume', () => {
	test('週間ボリュームが正しく集計される（重量×回数の週合計）', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const exerciseId = await insertExercise(db, userId);

		// 同一週に複数記録
		await insertRecord(db, userId, exerciseId, '2024-01-15', 80, 5); // 400
		await insertRecord(db, userId, exerciseId, '2024-01-16', 60, 8); // 480

		const volumes = await getWeeklyVolume(db, userId, { period: 'all' });
		expect(volumes.length).toBeGreaterThan(0);
		const week = volumes[0];
		expect(week.volume).toBe(880);
	});

	test('週間ボリュームを期間フィルタで取得できる（1ヶ月）', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const exerciseId = await insertExercise(db, userId);

		const today = new Date().toISOString().slice(0, 10);
		await insertRecord(db, userId, exerciseId, today, 80, 5);

		const volumes = await getWeeklyVolume(db, userId, { period: '1m' });
		expect(volumes.length).toBeGreaterThan(0);
	});
});
