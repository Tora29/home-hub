/**
 * @file 型定義: WorkoutExerciseCategory / WorkoutExercise
 * @module src/lib/features/workout/exercises/types.ts
 * @feature workout/exercises
 *
 * @description
 * exercises サブ機能のコンポーネント間（CategoryManagementCard / ExerciseListCard /
 * WorkoutExercisesPage）で共通する型定義。個別ファイルでの再定義を避ける。
 */

export type Category = { id: string; name: string; createdAt: Date };

export type ExerciseWithCategory = {
	id: string;
	name: string;
	userId: string;
	categoryId: string | null;
	category: { id: string; name: string } | null;
	createdAt: Date;
};
