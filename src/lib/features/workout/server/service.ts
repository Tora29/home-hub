/**
 * @file サービス: WorkoutRecord / BodyWeightRecord
 * @module src/lib/features/workout/server/service.ts
 * @feature workout
 *
 * @description
 * 筋トレ記録・体重記録・チャートデータ取得のビジネスロジックと DB 操作を担う。
 *
 * @entity WorkoutRecord, BodyWeightRecord
 *
 * @functions
 * - getRecords               - 記録一覧取得（全件・日付降順・種目フィルタ付き）
 * - createRecord             - 記録新規作成（1レコード = 1セット。自重時は同日体重を採用）
 * - deleteRecord             - 記録削除
 * - getChartData             - 種目別チャートデータ取得（日別最大重量 + 体重）
 * - getWeeklyVolume          - 週間ボリューム集計（月曜始まり）
 * - getWeeklyVolumeBreakdown - 指定週の種目別ボリューム内訳
 * - getTodayBodyWeight       - 指定日の体重取得
 * - upsertBodyWeight         - 体重登録（同日 upsert）
 *
 * @test ./service.integration.test.ts
 */
import { and, asc, desc, eq, gte, lt, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { AppError } from '$lib/server/errors';
import { bodyWeightRecord, workoutExercise, workoutRecord } from '$lib/server/tables';
import type * as schema from '$lib/server/tables';
import { addMonths, getCurrentMonth } from '$lib/utils/date';
import type { BodyWeightCreate, ChartQuery, RecordCreate, VolumeQuery } from '../schema';
import type {
	ChartData,
	WeeklyVolumeBreakdownItem,
	WeeklyVolumePoint,
	WorkoutRecord
} from '../types';

type Db = DrizzleD1Database<typeof schema>;

/**
 * getRecords / createRecord で共通利用する SELECT 列リスト（種目名を JOIN で含む）。
 */
const workoutRecordSelectFields = {
	id: workoutRecord.id,
	userId: workoutRecord.userId,
	exerciseId: workoutRecord.exerciseId,
	exerciseName: workoutExercise.name,
	date: workoutRecord.date,
	weight: workoutRecord.weight,
	reps: workoutRecord.reps,
	isBodyWeight: workoutRecord.isBodyWeight,
	createdAt: workoutRecord.createdAt
};

/**
 * 日付カラムから月曜日始まりの週キー（YYYY-MM-DD）を算出する SQL 式を生成する。
 * %w: 0=日〜6=土 → (x+6)%7 日戻すと月曜になる。
 */
function mondayExpr(dateColumn: typeof workoutRecord.date) {
	return sql`date(${dateColumn}, '-' || ((cast(strftime('%w', ${dateColumn}) as integer) + 6) % 7) || ' days')`;
}

function periodToRange(
	period: string,
	month?: string
): { start: string | null; end: string | null } {
	const current = getCurrentMonth();
	if (period === '1m') {
		const m = month ?? current;
		return { start: `${m}-01`, end: `${addMonths(m, 1)}-01` }; // 翌月1日（exclusive）
	}
	if (period === 'year') {
		const y = Number((month ?? current).split('-')[0]);
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
		.select(workoutRecordSelectFields)
		.from(workoutRecord)
		.innerJoin(workoutExercise, eq(workoutRecord.exerciseId, workoutExercise.id))
		.where(and(...conditions))
		.orderBy(desc(workoutRecord.date), desc(sql`"WorkoutRecord".rowid`));

	return rows;
}

/**
 * 記録を新規作成する。isBodyWeight=true のとき同日の体重記録を weight に上書き保存する。
 * @throws {NOT_FOUND} - exerciseId に該当する自分の種目が存在しない場合
 * @throws {VALIDATION_ERROR} - isBodyWeight=true かつ同日の体重記録がない場合
 * @throws {INTERNAL_SERVER_ERROR} - 作成直後の再取得に失敗した場合
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

	// 自重モード: 同日の体重記録を解決して weight に上書き
	let resolvedWeight = data.weight;
	if (data.isBodyWeight) {
		const bwRecord = await db
			.select()
			.from(bodyWeightRecord)
			.where(and(eq(bodyWeightRecord.userId, userId), eq(bodyWeightRecord.date, data.date)))
			.get();
		if (!bwRecord) {
			throw new AppError(
				'VALIDATION_ERROR',
				400,
				'同日の体重が記録されていません。先に体重を記録してください'
			);
		}
		resolvedWeight = Math.floor(bwRecord.weight);
	}

	const id = crypto.randomUUID();
	const now = new Date();

	await db.insert(workoutRecord).values({
		id,
		userId,
		exerciseId: data.exerciseId,
		date: data.date,
		weight: resolvedWeight,
		reps: data.reps,
		isBodyWeight: data.isBodyWeight,
		createdAt: now
	});

	const row = await db
		.select(workoutRecordSelectFields)
		.from(workoutRecord)
		.innerJoin(workoutExercise, eq(workoutRecord.exerciseId, workoutExercise.id))
		.where(eq(workoutRecord.id, id))
		.get();

	if (!row) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'サーバーエラーが発生しました');
	return row;
}

/**
 * 記録を削除する。
 * @throws {NOT_FOUND} - 該当データなし or 他ユーザーのもの（存在を隠蔽）
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
 * @throws {NOT_FOUND} - exerciseId に該当する自分の種目が存在しない場合
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
			maxWeight: sql<number>`max(${workoutRecord.weight})`.mapWith(Number)
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
		exercisePoints: exerciseRows,
		bodyWeightPoints: bodyWeightRows
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

	const weekExpr = mondayExpr(workoutRecord.date);

	return db
		.select({
			weekStart: sql<string>`${weekExpr}`,
			volume: sql<number>`sum(${workoutRecord.weight} * ${workoutRecord.reps})`.mapWith(Number)
		})
		.from(workoutRecord)
		.where(and(...conditions))
		.groupBy(weekExpr)
		.orderBy(asc(weekExpr));
}

/**
 * 指定週の種目別ボリューム内訳を取得する。ボリューム降順で返す。
 * @param weekStart - 月曜日の日付文字列（例: '2025-06-09'）
 */
export async function getWeeklyVolumeBreakdown(
	db: Db,
	userId: string,
	weekStart: string
): Promise<WeeklyVolumeBreakdownItem[]> {
	return db
		.select({
			exerciseName: workoutExercise.name,
			volume: sql<number>`sum(${workoutRecord.weight} * ${workoutRecord.reps})`.mapWith(Number)
		})
		.from(workoutRecord)
		.innerJoin(workoutExercise, eq(workoutRecord.exerciseId, workoutExercise.id))
		.where(
			and(eq(workoutRecord.userId, userId), sql`${mondayExpr(workoutRecord.date)} = ${weekStart}`)
		)
		.groupBy(workoutExercise.name)
		.orderBy(desc(sql`sum(${workoutRecord.weight} * ${workoutRecord.reps})`));
}

/**
 * 指定日の体重を取得する。記録がない場合は null を返す。
 */
export async function getTodayBodyWeight(
	db: Db,
	userId: string,
	date: string
): Promise<number | null> {
	const row = await db
		.select({ weight: bodyWeightRecord.weight })
		.from(bodyWeightRecord)
		.where(and(eq(bodyWeightRecord.userId, userId), eq(bodyWeightRecord.date, date)))
		.get();
	return row?.weight ?? null;
}

/**
 * 体重を登録する。同日の既存レコードがあれば weight を上書きする
 * （UNIQUE(userId, date) = uq_body_weight_user_date への ON CONFLICT で 1 クエリ化）。
 */
export async function upsertBodyWeight(
	db: Db,
	userId: string,
	data: BodyWeightCreate
): Promise<{ id: string; date: string; weight: number }> {
	const [row] = await db
		.insert(bodyWeightRecord)
		.values({
			id: crypto.randomUUID(),
			userId,
			date: data.date,
			weight: data.weight,
			createdAt: new Date()
		})
		.onConflictDoUpdate({
			target: [bodyWeightRecord.userId, bodyWeightRecord.date],
			set: { weight: data.weight }
		})
		.returning({
			id: bodyWeightRecord.id,
			date: bodyWeightRecord.date,
			weight: bodyWeightRecord.weight
		});
	return row;
}
