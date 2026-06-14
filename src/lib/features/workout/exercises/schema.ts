/**
 * @file スキーマ: WorkoutExercise / WorkoutExerciseCategory
 * @module src/lib/features/workout/exercises/schema.ts
 * @feature workout
 *
 * @description
 * 筋トレ種目・種目カテゴリの作成・更新用 Zod バリデーションスキーマ。
 *
 * @schemas
 * - exerciseCreateSchema         - 種目作成用入力
 * - exerciseUpdateSchema         - 種目更新用入力（作成と同一）
 * - exerciseCategoryCreateSchema - カテゴリ作成用入力
 * - exerciseCategoryUpdateSchema - カテゴリ更新用入力（作成と同一）
 *
 * @types
 * - ExerciseCreate
 * - ExerciseUpdate
 * - ExerciseCategoryCreate
 * - ExerciseCategoryUpdate
 */
import { z } from 'zod';

export const exerciseCreateSchema = z.object({
	name: z.string().min(1, '種目名は必須です').max(50, '50文字以内で入力してください'),
	categoryId: z.string().nullable().optional()
});

export const exerciseUpdateSchema = exerciseCreateSchema;

export type ExerciseCreate = z.infer<typeof exerciseCreateSchema>;
export type ExerciseUpdate = z.infer<typeof exerciseUpdateSchema>;

export const exerciseCategoryCreateSchema = z.object({
	name: z.string().min(1, 'カテゴリ名は必須です').max(30, '30文字以内で入力してください')
});

export const exerciseCategoryUpdateSchema = exerciseCategoryCreateSchema;

export type ExerciseCategoryCreate = z.infer<typeof exerciseCategoryCreateSchema>;
export type ExerciseCategoryUpdate = z.infer<typeof exerciseCategoryUpdateSchema>;
