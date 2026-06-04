/**
 * @file データ取得: 種目管理
 * @module src/routes/workout/exercises/+page.server.ts
 * @feature workout
 *
 * @description
 * 種目管理画面の初期データをサーバーサイドで取得する。
 * role === 'main' のユーザーのみアクセス可能。
 */
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { getExercises } from '$workout/exercises/service';

export const load: PageServerLoad = async ({ locals, platform, parent }) => {
	const parentData = await parent();
	if (parentData.userRole !== 'main') error(403, 'アクセス権限がありません');

	const db = createDb(platform!.env.DB);
	const exercises = await getExercises(db, locals.user!.id);
	return { exercises };
};
