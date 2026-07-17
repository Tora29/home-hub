/**
 * @file サービス: WorkoutExercise / WorkoutExerciseCategory
 * @module src/lib/features/workout/exercises/server/service.ts
 * @feature workout
 *
 * @description
 * 筋トレ種目・種目カテゴリ機能のビジネスロジックと DB 操作を担う。
 *
 * @entity WorkoutExercise, WorkoutExerciseCategory
 *
 * @functions
 * - getExerciseCategories    - カテゴリ一覧取得
 * - createExerciseCategory   - カテゴリ新規作成
 * - updateExerciseCategory   - カテゴリ更新
 * - deleteExerciseCategory   - カテゴリ削除
 * - getExercises             - 種目一覧取得（カテゴリ JOIN）
 * - createExercise           - 種目新規作成
 * - updateExercise           - 種目更新
 * - deleteExercise           - 種目削除（紐付く記録がある場合は CONFLICT）
 *
 * @test ./service.integration.test.ts
 */
import { and, eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { AppError } from '$lib/server/errors';
import { workoutExercise, workoutExerciseCategory, workoutRecord } from '$lib/server/tables';
import type * as schema from '$lib/server/tables';
import type {
	ExerciseCreate,
	ExerciseUpdate,
	ExerciseCategoryCreate,
	ExerciseCategoryUpdate
} from '../schema';

type Db = DrizzleD1Database<typeof schema>;

type ExerciseCategory = {
	id: string;
	userId: string;
	name: string;
	createdAt: Date;
};

type ExerciseWithCategory = {
	id: string;
	userId: string;
	name: string;
	categoryId: string | null;
	category: { id: string; name: string } | null;
	createdAt: Date;
};

/**
 * getExercises / createExercise / updateExercise で共通利用する SELECT 列リスト
 * （カテゴリを LEFT JOIN で含む）。
 */
const exerciseSelectFields = {
	id: workoutExercise.id,
	userId: workoutExercise.userId,
	name: workoutExercise.name,
	categoryId: workoutExercise.categoryId,
	categoryJoinId: workoutExerciseCategory.id,
	categoryName: workoutExerciseCategory.name,
	createdAt: workoutExercise.createdAt
};

/**
 * exerciseSelectFields で取得した行を ExerciseWithCategory 形式にマッピングする。
 */
function mapExerciseRow(row: {
	id: string;
	userId: string;
	name: string;
	categoryId: string | null;
	categoryJoinId: string | null;
	categoryName: string | null;
	createdAt: Date;
}): ExerciseWithCategory {
	return {
		id: row.id,
		userId: row.userId,
		name: row.name,
		categoryId: row.categoryId,
		category: row.categoryJoinId ? { id: row.categoryJoinId, name: row.categoryName! } : null,
		createdAt: row.createdAt
	};
}

/**
 * カテゴリ一覧を取得する（全件・createdAt 昇順）。
 */
export async function getExerciseCategories(db: Db, userId: string): Promise<ExerciseCategory[]> {
	const rows = await db
		.select()
		.from(workoutExerciseCategory)
		.where(eq(workoutExerciseCategory.userId, userId))
		.orderBy(workoutExerciseCategory.createdAt);

	return rows as ExerciseCategory[];
}

/**
 * カテゴリを新規作成する。
 */
export async function createExerciseCategory(
	db: Db,
	userId: string,
	data: ExerciseCategoryCreate
): Promise<ExerciseCategory> {
	const id = crypto.randomUUID();
	const now = new Date();

	const [row] = await db
		.insert(workoutExerciseCategory)
		.values({ id, userId, name: data.name, createdAt: now })
		.returning();

	return row as ExerciseCategory;
}

/**
 * カテゴリを更新する。
 * @throws {NOT_FOUND} - 該当カテゴリが存在しない・他ユーザーの場合
 */
export async function updateExerciseCategory(
	db: Db,
	userId: string,
	id: string,
	data: ExerciseCategoryUpdate
): Promise<ExerciseCategory> {
	const existing = await db
		.select()
		.from(workoutExerciseCategory)
		.where(and(eq(workoutExerciseCategory.id, id), eq(workoutExerciseCategory.userId, userId)))
		.get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');

	const [row] = await db
		.update(workoutExerciseCategory)
		.set({ name: data.name })
		.where(and(eq(workoutExerciseCategory.id, id), eq(workoutExerciseCategory.userId, userId)))
		.returning();

	return row as ExerciseCategory;
}

/**
 * カテゴリを削除する。紐付く種目の categoryId は DB FK (set null) で自動的に null になる。
 * @throws {NOT_FOUND} - 該当カテゴリが存在しない・他ユーザーの場合
 */
export async function deleteExerciseCategory(db: Db, userId: string, id: string): Promise<void> {
	const existing = await db
		.select()
		.from(workoutExerciseCategory)
		.where(and(eq(workoutExerciseCategory.id, id), eq(workoutExerciseCategory.userId, userId)))
		.get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');

	await db
		.delete(workoutExerciseCategory)
		.where(and(eq(workoutExerciseCategory.id, id), eq(workoutExerciseCategory.userId, userId)));
}

/**
 * 種目一覧を取得する（全件・カテゴリ JOIN）。
 */
export async function getExercises(
	db: Db,
	userId: string
): Promise<{ items: ExerciseWithCategory[]; total: number; page: number; limit: number }> {
	const rows = await db
		.select(exerciseSelectFields)
		.from(workoutExercise)
		.leftJoin(workoutExerciseCategory, eq(workoutExercise.categoryId, workoutExerciseCategory.id))
		.where(eq(workoutExercise.userId, userId))
		.orderBy(workoutExercise.createdAt);

	const items = rows.map(mapExerciseRow);

	return {
		items,
		total: items.length,
		page: 1,
		limit: items.length
	};
}

/**
 * 種目を新規作成する。
 */
export async function createExercise(
	db: Db,
	userId: string,
	data: ExerciseCreate
): Promise<ExerciseWithCategory> {
	const id = crypto.randomUUID();
	const now = new Date();

	await db.insert(workoutExercise).values({
		id,
		userId,
		name: data.name,
		categoryId: data.categoryId ?? null,
		createdAt: now
	});

	const row = await db
		.select(exerciseSelectFields)
		.from(workoutExercise)
		.leftJoin(workoutExerciseCategory, eq(workoutExercise.categoryId, workoutExerciseCategory.id))
		.where(eq(workoutExercise.id, id))
		.get();

	return mapExerciseRow(row!);
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
): Promise<ExerciseWithCategory> {
	const existing = await db
		.select()
		.from(workoutExercise)
		.where(and(eq(workoutExercise.id, id), eq(workoutExercise.userId, userId)))
		.get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');

	await db
		.update(workoutExercise)
		.set({
			name: data.name,
			categoryId: data.categoryId !== undefined ? data.categoryId : existing.categoryId
		})
		.where(and(eq(workoutExercise.id, id), eq(workoutExercise.userId, userId)));

	const row = await db
		.select(exerciseSelectFields)
		.from(workoutExercise)
		.leftJoin(workoutExerciseCategory, eq(workoutExercise.categoryId, workoutExerciseCategory.id))
		.where(eq(workoutExercise.id, id))
		.get();

	return mapExerciseRow(row!);
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
