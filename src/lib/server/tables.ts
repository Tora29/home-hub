/**
 * @file テーブル定義: Drizzle テーブル定義
 * @module src/lib/server/tables.ts
 *
 * @description
 * Cloudflare D1（SQLite）のテーブル定義。
 * Better Auth テーブルとアプリ固有テーブルを含む。
 * INDEX / UNIQUE は第 3 引数で宣言（既存の手書き分はマイグレーション SQL と名前・カラムを一致させている）。
 * 0001_init 由来の Tag / Dish / DishTag は 0020_drop_legacy_dish で削除済み（drizzle-kit 管理外だったため未宣言）。
 *
 * @schemas
 * - user, session, account, verification — Better Auth 管理テーブル
 * - expenseCategory                     — 支出カテゴリテーブル
 * - expense                             — 支出テーブル（payerUserId + status 含む）
 * - workoutExerciseCategory             — 筋トレ種目カテゴリテーブル
 * - workoutExercise                     — 筋トレ種目テーブル（role=main ユーザー限定）
 * - workoutRecord                       — 筋トレ記録テーブル（1レコード = 1セット）
 * - bodyWeightRecord                    — 体重記録テーブル（同日upsert）
 */
import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ---- Better Auth テーブル ----

export const user = sqliteTable(
	'User',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		email: text('email').notNull(),
		emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull(),
		image: text('image'),
		role: text('role'),
		// lineUserId カラムは未使用のため宣言から外した（DB からの DROP は次リリースの migration で行う）
		createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
		updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull()
	},
	// 0001_init で作成済みの UNIQUE INDEX（名前を一致させて差分を出さない）
	(t) => [uniqueIndex('User_email_key').on(t.email)]
);

export const session = sqliteTable(
	'Session',
	{
		id: text('id').primaryKey(),
		expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
		token: text('token').notNull(),
		createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
		updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
		ipAddress: text('ipAddress'),
		userAgent: text('userAgent'),
		userId: text('userId')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(t) => [uniqueIndex('Session_token_key').on(t.token)]
);

export const account = sqliteTable('Account', {
	id: text('id').primaryKey(),
	accountId: text('accountId').notNull(),
	providerId: text('providerId').notNull(),
	userId: text('userId')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('accessToken'),
	refreshToken: text('refreshToken'),
	idToken: text('idToken'),
	accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }),
	refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp' }),
	scope: text('scope'),
	password: text('password'),
	createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull()
});

export const verification = sqliteTable('Verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
	createdAt: integer('createdAt', { mode: 'timestamp' }),
	updatedAt: integer('updatedAt', { mode: 'timestamp' })
});

// ---- アプリ固有テーブル ----

export const expenseCategory = sqliteTable('ExpenseCategory', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	createdAt: integer('createdAt', { mode: 'timestamp' }).notNull()
});

export const expense = sqliteTable(
	'Expense',
	{
		id: text('id').primaryKey(),
		userId: text('userId')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		amount: integer('amount').notNull(),
		categoryId: text('categoryId')
			.notNull()
			.references(() => expenseCategory.id, { onDelete: 'restrict' }),
		payerUserId: text('payerUserId')
			.notNull()
			.references(() => user.id, { onDelete: 'restrict' }),
		status: text('status').notNull().default('unapproved'),
		createdAt: integer('createdAt', { mode: 'timestamp' }).notNull()
	},
	(t) => [
		// 月フィルタ（createdAt 範囲）+ createdAt 降順ソート
		index('Expense_createdAt_idx').on(t.createdAt),
		// 承認フロー: status = ? AND userId (= | !=) ?
		index('Expense_status_userId_idx').on(t.status, t.userId),
		// カテゴリ削除時の参照件数カウント・FK(restrict) チェック
		index('Expense_categoryId_idx').on(t.categoryId)
	]
);

export const workoutExerciseCategory = sqliteTable(
	'WorkoutExerciseCategory',
	{
		id: text('id').primaryKey(),
		userId: text('userId')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		createdAt: integer('createdAt', { mode: 'timestamp' }).notNull()
	},
	(t) => [index('idx_workout_exercise_category_userId').on(t.userId)]
);

export const workoutExercise = sqliteTable(
	'WorkoutExercise',
	{
		id: text('id').primaryKey(),
		userId: text('userId')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		categoryId: text('categoryId').references(() => workoutExerciseCategory.id, {
			onDelete: 'set null'
		}),
		createdAt: integer('createdAt', { mode: 'timestamp' }).notNull()
	},
	(t) => [
		index('idx_workout_exercise_userId').on(t.userId),
		index('idx_workout_exercise_categoryId').on(t.categoryId)
	]
);

export const workoutRecord = sqliteTable(
	'WorkoutRecord',
	{
		id: text('id').primaryKey(),
		userId: text('userId')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		exerciseId: text('exerciseId')
			.notNull()
			.references(() => workoutExercise.id, { onDelete: 'restrict' }),
		date: text('date').notNull(), // YYYY-MM-DD
		weight: real('weight').notNull(), // kg（自重時は同日の bodyWeightRecord.weight を Math.floor して使用）
		reps: integer('reps').notNull(), // 1〜10（このレコード1セット分の回数）
		isBodyWeight: integer('isBodyWeight', { mode: 'boolean' }).notNull().default(false), // 自重種目フラグ
		createdAt: integer('createdAt', { mode: 'timestamp' }).notNull()
	},
	(t) => [
		index('idx_workout_record_userId').on(t.userId),
		index('idx_workout_record_exerciseId').on(t.exerciseId),
		index('idx_workout_record_date').on(t.date)
	]
);

export const bodyWeightRecord = sqliteTable(
	'BodyWeightRecord',
	{
		id: text('id').primaryKey(),
		userId: text('userId')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		date: text('date').notNull(), // YYYY-MM-DD
		weight: real('weight').notNull(), // kg（例: 72.3）
		createdAt: integer('createdAt', { mode: 'timestamp' }).notNull()
	},
	(t) => [
		// 同日は upsert で 1 レコードに保つ
		uniqueIndex('uq_body_weight_user_date').on(t.userId, t.date),
		index('idx_body_weight_userId').on(t.userId)
	]
);
