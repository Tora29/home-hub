/**
 * @file データ取得: レシピ詳細
 * @module src/routes/recipes/[id]/+page.server.ts
 * @feature recipes
 *
 * @description
 * レシピ詳細画面の初期データをサーバーサイドで取得する。
 *
 * @spec specs/recipes/spec.md
 * @acceptance AC-003
 */
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { AppError } from '$lib/server/errors';
import { getRecipeById } from '$recipes/_lib/service';

export const load: PageServerLoad = async ({ params, platform, locals }) => {
	try {
		const db = createDb(platform!.env.DB);
		const recipe = await getRecipeById(db, locals.user!.id, params.id);
		return { recipe };
	} catch (e) {
		if (e instanceof AppError && e.status === 404) {
			error(404, '該当データが見つかりません');
		}
		throw e;
	}
};
