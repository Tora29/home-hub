/**
 * @file サービス: WorkoutExercise
 * @module src/lib/features/workout/exercises/server/service.ts
 * @feature workout
 *
 * @description
 * 筋トレ種目機能のビジネスロジックと DB 操作を担う。
 *
 * @entity WorkoutExercise
 *
 * @functions
 * - getExercises   - 一覧取得（全件）
 * - createExercise - 新規作成
 * - updateExercise - 更新
 * - deleteExercise - 削除（紐付く記録がある場合は CONFLICT）
 *
 * @test ./service.integration.test.ts
 */
import { and, eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { AppError } from '$lib/server/errors';
import { workoutExercise, workoutRecord } from '$lib/server/tables';
import type * as schema from '$lib/server/tables';
import type { ExerciseCreate, ExerciseUpdate } from '../schema';

type Db = DrizzleD1Database<typeof schema>;

type Exercise = {
	id: string;
	userId: string;
	name: string;
	createdAt: Date;
};

/**
 * 種目一覧を取得する（全件）。
 */
export async function getExercises(
	db: Db,
	userId: string
): Promise<{ items: Exercise[]; total: number; page: number; limit: number }> {
	const rows = await db
		.select()
		.from(workoutExercise)
		.where(eq(workoutExercise.userId, userId))
		.orderBy(workoutExercise.createdAt);

	return {
		items: rows as Exercise[],
		total: rows.length,
		page: 1,
		limit: rows.length
	};
}

/**
 * 種目を新規作成する。
 */
export async function createExercise(
	db: Db,
	userId: string,
	data: ExerciseCreate
): Promise<Exercise> {
	const id = crypto.randomUUID();
	const now = new Date();

	const [row] = await db
		.insert(workoutExercise)
		.values({ id, userId, name: data.name, createdAt: now })
		.returning();

	return row as Exercise;
}

/**
 * 種目を更新する。
 * @throws {NOT_FOUND} - 該当種目が存在しない場合、または他ユーザーの種目の場合
 */
export async function updateExercise(
	db: Db,
	userId: string,
	id: string,
	data: ExerciseUpdate
): Promise<Exercise> {
	const existing = await db
		.select()
		.from(workoutExercise)
		.where(and(eq(workoutExercise.id, id), eq(workoutExercise.userId, userId)))
		.get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');

	const [row] = await db
		.update(workoutExercise)
		.set({ name: data.name })
		.where(and(eq(workoutExercise.id, id), eq(workoutExercise.userId, userId)))
		.returning();

	return row as Exercise;
}

/**
 * 種目を削除する。紐付く記録が存在する場合は CONFLICT を投げる。
 * @throws {NOT_FOUND} - 該当種目が存在しない場合、または他ユーザーの種目の場合
 * @throws {CONFLICT} - 種目に紐付く記録が 1 件以上ある場合
 */
export async function deleteExercise(db: Db, userId: string, id: string): Promise<void> {
	const existing = await db
		.select()
		.from(workoutExercise)
		.where(and(eq(workoutExercise.id, id), eq(workoutExercise.userId, userId)))
		.get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');

	const [{ linkedCount }] = await db
		.select({ linkedCount: sql<number>`count(*)` })
		.from(workoutRecord)
		.where(eq(workoutRecord.exerciseId, id));

	if (Number(linkedCount) > 0) {
		throw new AppError('CONFLICT', 409, 'この種目には記録が紐付いているため削除できません');
	}

	await db
		.delete(workoutExercise)
		.where(and(eq(workoutExercise.id, id), eq(workoutExercise.userId, userId)));
}
