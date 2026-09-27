/**
 * @file 型定義: WorkoutRecord / Exercise / チャートデータ
 * @module src/lib/features/workout/types.ts
 * @feature workout
 *
 * @description
 * workout 機能で FE/BE 共通して使用する型定義。
 * サーバー（server/service.ts）とクライアントコンポーネントで形状が一致する
 * チャート系・記録系の型をここに集約し、個別ファイルでの再定義を避ける。
 */

/** 記録画面の種目セレクト等で使う種目の最小形（ExerciseWithCategory の部分集合）。 */
export type Exercise = {
	id: string;
	name: string;
	category: { id: string; name: string } | null;
};

/** 筋トレ記録（種目名を JOIN 済み）。service の戻り値・画面表示で共通利用する。 */
export type WorkoutRecord = {
	id: string;
	userId: string;
	exerciseId: string;
	exerciseName: string;
	date: string;
	weight: number;
	reps: number;
	isBodyWeight: boolean;
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
export type WeeklyVolumeBreakdownItem = { exerciseName: string; volume: number };
