/**
 * @file データ取得: 筋トレ記録
 * @module src/routes/workout/+page.server.ts
 * @feature workout
 *
 * @description
 * 筋トレ記録一覧画面の初期データをサーバーサイドで取得する。
 * role === 'main' のユーザーのみアクセス可能。
 */
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { getRecords } from '$workout/server/service';
import { getExercises } from '$workout/exercises/server/service';

export const load: PageServerLoad = async ({ locals, platform, url, parent }) => {
	const parentData = await parent();
	if (parentData.userRole !== 'main') error(403, 'アクセス権限がありません');

	const db = createDb(platform!.env.DB);
	const exerciseId = url.searchParams.get('exerciseId') ?? undefined;

	const [recordsResult, exercisesResult] = await Promise.all([
		getRecords(db, locals.user!.id, exerciseId),
		getExercises(db, locals.user!.id)
	]);

	return {
		records: recordsResult,
		exercises: exercisesResult,
		filterExerciseId: exerciseId ?? null
	};
};
