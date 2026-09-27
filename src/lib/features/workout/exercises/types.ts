/**
 * @file 型定義: WorkoutExerciseCategory / WorkoutExercise
 * @module src/lib/features/workout/exercises/types.ts
 * @feature workout
 *
 * @description
 * exercises サブ機能の service（server/service.ts）とコンポーネント間
 * （CategoryManagementCard / ExerciseListCard / WorkoutExercisesPage）で共通する型定義。
 * 個別ファイルでの再定義を避ける。
 */

export type ExerciseCategory = {
	id: string;
	userId: string;
	name: string;
	createdAt: Date;
};

export type ExerciseWithCategory = {
	id: string;
	userId: string;
	name: string;
	categoryId: string | null;
	category: { id: string; name: string } | null;
	createdAt: Date;
};
