/**
 * @file データ取得: 種目管理
 * @module src/routes/workout/exercises/+page.server.ts
 * @feature workout
 *
 * @description
 * 種目管理画面の初期データ（種目一覧・カテゴリ一覧）をサーバーサイドで取得する。
 * role === 'main' のユーザーのみアクセス可能（それ以外は 403）。
 */
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { getExercises, getExerciseCategories } from '$workout/exercises/server/service';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (locals.role !== 'main') error(403, 'アクセス権限がありません');

	const db = createDb(platform!.env.DB);
	const [exercises, categories] = await Promise.all([
		getExercises(db, locals.user!.id),
		getExerciseCategories(db, locals.user!.id)
	]);
	return { exercises, categories };
};
