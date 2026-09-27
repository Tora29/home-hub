/**
 * @file テスト: 筋トレ記録サービス
 * @module src/lib/features/workout/server/service.integration.test.ts
 * @testType integration
 *
 * @target ./service.ts
 */
/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { and, eq } from 'drizzle-orm';
import { createDb } from '$lib/server/db';
import { getTodayDate } from '$lib/utils/date';
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
	getWeeklyVolumeBreakdown,
	getTodayBodyWeight,
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
	test('自分の記録のみ取得できる', async () => {
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

	test('exerciseId 指定で該当種目の記録のみ日付降順で取得できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const benchId = await insertExercise(db, userId, 'ベンチプレス');
		const squatId = await insertExercise(db, userId, 'スクワット');

		await insertRecord(db, userId, benchId, '2024-01-01', 80, 5);
		await insertRecord(db, userId, benchId, '2024-01-08', 82.5, 5);
		await insertRecord(db, userId, squatId, '2024-01-08', 100, 5);

		const records = await getRecords(db, userId, benchId);
		expect(records.map((r) => r.date)).toEqual(['2024-01-08', '2024-01-01']);
		expect(records.every((r) => r.exerciseName === 'ベンチプレス')).toBe(true);
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

	test('他ユーザーの種目IDの場合、NOT_FOUND が返る', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const otherId = await insertUser(db);
		const otherExerciseId = await insertExercise(db, otherId);

		await expect(
			createRecord(db, userId, {
				exerciseId: otherExerciseId,
				date: '2024-01-15',
				weight: 80,
				reps: 5,
				isBodyWeight: false
			})
		).rejects.toMatchObject({ code: 'NOT_FOUND' });
	});

	test('isBodyWeight=true で同日の体重記録がある場合、体重（小数切り捨て）を重量として記録できる', async () => {
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

	test('isBodyWeight=true で同日の体重記録がない場合、VALIDATION_ERROR が返る', async () => {
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
		expect(await getRecords(db, userId)).toHaveLength(0);
	});

	test('他ユーザーの記録を削除しようとした場合、NOT_FOUND が返る', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const otherId = await insertUser(db);
		const exerciseId = await insertExercise(db, userId);
		const recordId = await insertRecord(db, userId, exerciseId, '2024-01-01', 80, 5);

		await expect(deleteRecord(db, otherId, recordId)).rejects.toMatchObject({ code: 'NOT_FOUND' });
	});
});

describe('getChartData', () => {
	test('period=1m で当月の日別最大重量を取得できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const exerciseId = await insertExercise(db, userId);

		const today = getTodayDate();
		await insertRecord(db, userId, exerciseId, today, 80, 5);

		const chartData = await getChartData(db, userId, { exerciseId, period: '1m' });
		expect(chartData.exercisePoints).toHaveLength(1);
		expect(chartData.exercisePoints[0].maxWeight).toBe(80);
	});

	test('同一日付の記録が複数ある場合、最大重量を1点として取得できる', async () => {
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

	test('同期間の体重データも取得できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const exerciseId = await insertExercise(db, userId);

		const today = getTodayDate();
		await insertRecord(db, userId, exerciseId, today, 80, 5);
		await insertBodyWeight(db, userId, today, 72.5);

		const chartData = await getChartData(db, userId, { exerciseId, period: '1m' });
		expect(chartData.bodyWeightPoints).toHaveLength(1);
		expect(chartData.bodyWeightPoints[0].weight).toBe(72.5);
	});

	test('他ユーザーの種目IDの場合、NOT_FOUND が返る', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const otherId = await insertUser(db);
		const otherExerciseId = await insertExercise(db, otherId);

		await expect(
			getChartData(db, userId, { exerciseId: otherExerciseId, period: 'all' })
		).rejects.toMatchObject({ code: 'NOT_FOUND' });
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

	test('同日に2回登録した場合、1レコードのまま2回目の値で上書きできる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		const first = await upsertBodyWeight(db, userId, { date: '2024-01-15', weight: 72.5 });
		const second = await upsertBodyWeight(db, userId, { date: '2024-01-15', weight: 73.0 });
		expect(second.id).toBe(first.id);
		expect(second.weight).toBe(73.0);

		const rows = await db
			.select()
			.from(bodyWeightRecord)
			.where(and(eq(bodyWeightRecord.userId, userId), eq(bodyWeightRecord.date, '2024-01-15')));
		expect(rows).toHaveLength(1);
		expect(rows[0].weight).toBe(73.0);
	});

	test('別ユーザーの同日体重は上書きせずに登録できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const otherId = await insertUser(db);

		await upsertBodyWeight(db, otherId, { date: '2024-01-15', weight: 60 });
		await upsertBodyWeight(db, userId, { date: '2024-01-15', weight: 72.5 });

		expect(await getTodayBodyWeight(db, otherId, '2024-01-15')).toBe(60);
		expect(await getTodayBodyWeight(db, userId, '2024-01-15')).toBe(72.5);
	});
});

describe('getTodayBodyWeight', () => {
	test('指定日の体重を取得できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		await insertBodyWeight(db, userId, '2024-01-15', 72.5);

		expect(await getTodayBodyWeight(db, userId, '2024-01-15')).toBe(72.5);
	});

	test('指定日の体重記録がない場合、null を取得できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		await insertBodyWeight(db, userId, '2024-01-14', 72.5);

		expect(await getTodayBodyWeight(db, userId, '2024-01-15')).toBeNull();
	});
});

describe('getWeeklyVolume', () => {
	test('同一週の記録を重量×回数の合計で集計できる', async () => {
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

	test('period=1m で当月の週間ボリュームを取得できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const exerciseId = await insertExercise(db, userId);

		await insertRecord(db, userId, exerciseId, getTodayDate(), 80, 5);

		const volumes = await getWeeklyVolume(db, userId, { period: '1m' });
		expect(volumes.length).toBeGreaterThan(0);
	});

	test('period=1m の場合、月末日の記録を含み翌月1日の記録を除いて集計できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const exerciseId = await insertExercise(db, userId);

		await insertRecord(db, userId, exerciseId, '2098-10-31', 100, 1); // 対象（金曜）
		await insertRecord(db, userId, exerciseId, '2098-11-01', 50, 1); // 対象外（翌月・同週の土曜）

		const volumes = await getWeeklyVolume(db, userId, { period: '1m', month: '2098-10' });
		expect(volumes.reduce((sum, v) => sum + v.volume, 0)).toBe(100);
	});
});

describe('getWeeklyVolumeBreakdown', () => {
	test('指定週（月曜始まり）の種目別ボリュームを降順で取得できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const benchId = await insertExercise(db, userId, 'ベンチプレス');
		const squatId = await insertExercise(db, userId, 'スクワット');

		// 2024-01-15（月）〜 2024-01-21（日）が対象週
		await insertRecord(db, userId, benchId, '2024-01-15', 80, 5); // 400
		await insertRecord(db, userId, benchId, '2024-01-21', 60, 5); // 300
		await insertRecord(db, userId, squatId, '2024-01-17', 100, 8); // 800
		await insertRecord(db, userId, squatId, '2024-01-22', 100, 5); // 翌週（対象外）
		await insertRecord(db, userId, benchId, '2024-01-14', 80, 5); // 前週（対象外）

		const breakdown = await getWeeklyVolumeBreakdown(db, userId, '2024-01-15');
		expect(breakdown).toEqual([
			{ exerciseName: 'スクワット', volume: 800 },
			{ exerciseName: 'ベンチプレス', volume: 700 }
		]);
	});

	test('他ユーザーの記録を含めずに取得できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const otherId = await insertUser(db);
		const otherExerciseId = await insertExercise(db, otherId);
		await insertRecord(db, otherId, otherExerciseId, '2024-01-15', 80, 5);

		expect(await getWeeklyVolumeBreakdown(db, userId, '2024-01-15')).toEqual([]);
	});
});
