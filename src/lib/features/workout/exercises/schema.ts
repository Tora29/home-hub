/**
 * @file スキーマ: WorkoutExercise
 * @module src/lib/features/workout/exercises/schema.ts
 * @feature workout
 *
 * @description
 * 筋トレ種目の作成・更新用 Zod バリデーションスキーマ。
 *
 * @schemas
 * - exerciseCreateSchema - 作成用入力
 * - exerciseUpdateSchema - 更新用入力（作成と同一）
 *
 * @types
 * - ExerciseCreate
 * - ExerciseUpdate
 */
import { z } from 'zod';

export const exerciseCreateSchema = z.object({
	name: z.string().min(1, '種目名は必須です').max(50, '50文字以内で入力してください')
});

export const exerciseUpdateSchema = exerciseCreateSchema;

export type ExerciseCreate = z.infer<typeof exerciseCreateSchema>;
export type ExerciseUpdate = z.infer<typeof exerciseUpdateSchema>;
