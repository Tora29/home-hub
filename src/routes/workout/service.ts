/**
 * @file サービス: WorkoutRecord / BodyWeightRecord
 * @module src/routes/workout/service.ts
 * @feature workout
 *
 * @description
 * 筋トレ記録・体重記録・チャートデータ取得のビジネスロジックと DB 操作を担う。
 *
 * @entity WorkoutRecord, BodyWeightRecord
 *
 * @functions
 * - getRecords         - 記録一覧取得（全件・日付降順・種目フィルタ付き）
 * - createRecord       - 記録新規作成（1レコード = 1セット）
 * - deleteRecord       - 記録削除
 * - getChartData       - 種目別チャートデータ取得（日別最大重量 + 体重）
 * - getWeeklyVolume    - 週間ボリューム集計
 * - upsertBodyWeight   - 体重登録（同日upsert）
 *
 * @test ./service.integration.test.ts
 */
import { and, asc, desc, eq, gte, lt, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { AppError } from '$lib/server/errors';
import { bodyWeightRecord, workoutExercise, workoutRecord } from '$lib/server/tables';
import type * as schema from '$lib/server/tables';
import type { BodyWeightCreate, ChartQuery, RecordCreate, VolumeQuery } from './schema';

type Db = DrizzleD1Database<typeof schema>;

export type WorkoutRecord = {
	id: string;
	userId: string;
	exerciseId: string;
	exerciseName: string;
	date: string;
	weight: number;
	reps: number;
	createdAt: Date;
};

export type ChartPoint = { date: string; maxWeight: number };
export type BodyWeightPoint = { date: string; weight: number };
export type ChartData = {
	exercise: { id: string; name: string };
	exercisePoints: ChartPoint[];
	bodyWeightPoints: BodyWeightPoint[];
};
export type WeeklyVolumePoint = { weekStart: string; volume: number };

function periodToRange(
	period: string,
	month?: string
): { start: string | null; end: string | null } {
	const d = new Date();
	if (period === '1m') {
		const m = month ?? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		const [y, mo] = m.split('-').map(Number);
		const end = new Date(y, mo, 1); // 翌月1日（exclusive）
		return { start: `${m}-01`, end: end.toISOString().slice(0, 10) };
	}
	if (period === 'year') {
		const y = month ? Number(month.split('-')[0]) : d.getFullYear();
		return { start: `${y}-01-01`, end: `${y + 1}-01-01` };
	}
	return { start: null, end: null }; // 'all'
}

/**
 * 記録一覧を取得する（全件・日付降順）。exerciseId 指定時は該当種目のみ返す。
 */
export async function getRecords(
	db: Db,
	userId: string,
	exerciseId?: string
): Promise<WorkoutRecord[]> {
	const conditions = [eq(workoutRecord.userId, userId)];
	if (exerciseId) conditions.push(eq(workoutRecord.exerciseId, exerciseId));

	const rows = await db
		.select({
			id: workoutRecord.id,
			userId: workoutRecord.userId,
			exerciseId: workoutRecord.exerciseId,
			exerciseName: workoutExercise.name,
			date: workoutRecord.date,
			weight: workoutRecord.weight,
			reps: workoutRecord.reps,
			createdAt: workoutRecord.createdAt
		})
		.from(workoutRecord)
		.innerJoin(workoutExercise, eq(workoutRecord.exerciseId, workoutExercise.id))
		.where(and(...conditions))
		.orderBy(desc(workoutRecord.date), desc(sql`"WorkoutRecord".rowid`));

	return rows as WorkoutRecord[];
}

/**
 * 記録を新規作成する。
 * @throws {NOT_FOUND} - exerciseId に該当する種目が存在しない場合
 */
export async function createRecord(
	db: Db,
	userId: string,
	data: RecordCreate
): Promise<WorkoutRecord> {
	const exercise = await db
		.select()
		.from(workoutExercise)
		.where(and(eq(workoutExercise.id, data.exerciseId), eq(workoutExercise.userId, userId)))
		.get();
	if (!exercise) throw new AppError('NOT_FOUND', 404, '該当種目が見つかりません');

	const id = crypto.randomUUID();
	const now = new Date();

	await db.insert(workoutRecord).values({
		id,
		userId,
		exerciseId: data.exerciseId,
		date: data.date,
		weight: data.weight,
		reps: data.reps,
		createdAt: now
	});

	const row = await db
		.select({
			id: workoutRecord.id,
			userId: workoutRecord.userId,
			exerciseId: workoutRecord.exerciseId,
			exerciseName: workoutExercise.name,
			date: workoutRecord.date,
			weight: workoutRecord.weight,
			reps: workoutRecord.reps,
			createdAt: workoutRecord.createdAt
		})
		.from(workoutRecord)
		.innerJoin(workoutExercise, eq(workoutRecord.exerciseId, workoutExercise.id))
		.where(eq(workoutRecord.id, id))
		.get();

	if (!row) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'サーバーエラーが発生しました');
	return row as WorkoutRecord;
}

/**
 * 記録を削除する。
 * @throws {NOT_FOUND} - 該当データなし or 他ユーザーのもの
 */
export async function deleteRecord(db: Db, userId: string, id: string): Promise<void> {
	const existing = await db
		.select()
		.from(workoutRecord)
		.where(and(eq(workoutRecord.id, id), eq(workoutRecord.userId, userId)))
		.get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');

	await db
		.delete(workoutRecord)
		.where(and(eq(workoutRecord.id, id), eq(workoutRecord.userId, userId)));
}

/**
 * 特定種目の期間別チャートデータを取得する。
 * 同一日付の最大重量を1点として返す。体重データも同期間で取得して返す。
 * @throws {NOT_FOUND} - exerciseId に該当する種目が存在しない場合
 */
export async function getChartData(db: Db, userId: string, query: ChartQuery): Promise<ChartData> {
	const exercise = await db
		.select()
		.from(workoutExercise)
		.where(and(eq(workoutExercise.id, query.exerciseId), eq(workoutExercise.userId, userId)))
		.get();
	if (!exercise) throw new AppError('NOT_FOUND', 404, '該当種目が見つかりません');

	const { start, end } = periodToRange(query.period, query.month);
	const dateConditions = [
		eq(workoutRecord.userId, userId),
		eq(workoutRecord.exerciseId, query.exerciseId)
	];
	const bodyWeightConditions = [eq(bodyWeightRecord.userId, userId)];

	if (start) {
		dateConditions.push(gte(workoutRecord.date, start));
		bodyWeightConditions.push(gte(bodyWeightRecord.date, start));
	}
	if (end) {
		dateConditions.push(lt(workoutRecord.date, end));
		bodyWeightConditions.push(lt(bodyWeightRecord.date, end));
	}

	const exerciseRows = await db
		.select({
			date: workoutRecord.date,
			maxWeight: sql<number>`max(${workoutRecord.weight})`
		})
		.from(workoutRecord)
		.where(and(...dateConditions))
		.groupBy(workoutRecord.date)
		.orderBy(asc(workoutRecord.date));

	const bodyWeightRows = await db
		.select({
			date: bodyWeightRecord.date,
			weight: bodyWeightRecord.weight
		})
		.from(bodyWeightRecord)
		.where(and(...bodyWeightConditions))
		.orderBy(asc(bodyWeightRecord.date));

	return {
		exercise: { id: exercise.id, name: exercise.name },
		exercisePoints: exerciseRows.map((r) => ({ date: r.date, maxWeight: Number(r.maxWeight) })),
		bodyWeightPoints: bodyWeightRows.map((r) => ({ date: r.date, weight: Number(r.weight) }))
	};
}

/**
 * 週間ボリューム（全種目合計の重量×回数）を取得する。週の区切りは月曜始まり。
 */
export async function getWeeklyVolume(
	db: Db,
	userId: string,
	query: VolumeQuery
): Promise<WeeklyVolumePoint[]> {
	const { start, end } = periodToRange(query.period, query.month);
	const conditions = [eq(workoutRecord.userId, userId)];
	if (start) conditions.push(gte(workoutRecord.date, start));
	if (end) conditions.push(lt(workoutRecord.date, end));

	const rows = await db
		.select({
			weekStart: sql<string>`strftime('%Y-%W', ${workoutRecord.date})`,
			volume: sql<number>`sum(${workoutRecord.weight} * ${workoutRecord.reps})`
		})
		.from(workoutRecord)
		.where(and(...conditions))
		.groupBy(sql`strftime('%Y-%W', ${workoutRecord.date})`)
		.orderBy(asc(sql`strftime('%Y-%W', ${workoutRecord.date})`));

	return rows.map((r) => ({ weekStart: r.weekStart, volume: Number(r.volume) }));
}

/**
 * 体重を登録する（同日の既存レコードがあれば上書き）。
 */
export async function upsertBodyWeight(
	db: Db,
	userId: string,
	data: BodyWeightCreate
): Promise<{ id: string; date: string; weight: number }> {
	const existing = await db
		.select()
		.from(bodyWeightRecord)
		.where(and(eq(bodyWeightRecord.userId, userId), eq(bodyWeightRecord.date, data.date)))
		.get();

	if (existing) {
		await db
			.update(bodyWeightRecord)
			.set({ weight: data.weight })
			.where(and(eq(bodyWeightRecord.userId, userId), eq(bodyWeightRecord.date, data.date)));
		return { id: existing.id, date: data.date, weight: data.weight };
	}

	const id = crypto.randomUUID();
	await db.insert(bodyWeightRecord).values({
		id,
		userId,
		date: data.date,
		weight: data.weight,
		createdAt: new Date()
	});
	return { id, date: data.date, weight: data.weight };
}
