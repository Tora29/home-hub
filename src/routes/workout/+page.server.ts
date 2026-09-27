/**
 * @file データ取得: 筋トレ記録
 * @module src/routes/workout/+page.server.ts
 * @feature workout
 *
 * @description
 * 筋トレ記録画面の初期データ（記録一覧・種目一覧・本日の体重・本日の日付）をサーバーサイドで取得する。
 * role === 'main' のユーザーのみアクセス可能（それ以外は 403）。
 * exerciseId クエリは workoutPageQuerySchema で検証し、不正値はフィルタなしとして扱う。
 * today は JST 基準でサーバー計算し、クライアントでの再計算による SSR/CSR のずれを防ぐ。
 */
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { workoutPageQuerySchema } from '$workout/schema';
import { getRecords, getTodayBodyWeight } from '$workout/server/service';
import { getExercises } from '$workout/exercises/server/service';
import { getTodayDate } from '$lib/utils/date';

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	if (locals.role !== 'main') error(403, 'アクセス権限がありません');

	const query = workoutPageQuerySchema.safeParse({
		exerciseId: url.searchParams.get('exerciseId') ?? undefined
	});
	const exerciseId = query.success ? query.data.exerciseId : undefined;

	const db = createDb(platform!.env.DB);
	const userId = locals.user!.id;
	const today = getTodayDate();

	const [records, exercises, todayBodyWeight] = await Promise.all([
		getRecords(db, userId, exerciseId),
		getExercises(db, userId),
		getTodayBodyWeight(db, userId, today)
	]);

	return {
		records,
		exercises,
		filterExerciseId: exerciseId ?? null,
		todayBodyWeight,
		today
	};
};
