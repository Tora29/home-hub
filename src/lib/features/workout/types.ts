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

export type Exercise = {
	id: string;
	name: string;
	category: { id: string; name: string } | null;
};

export type WorkoutRecord = {
	id: string;
	exerciseId: string;
	exerciseName: string;
	date: string;
	weight: number;
	reps: number;
	isBodyWeight: boolean;
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
