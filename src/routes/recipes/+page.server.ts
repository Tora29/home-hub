/**
 * @file データ取得: レシピ一覧
 * @module src/routes/recipes/+page.server.ts
 * @feature recipes
 *
 * @description
 * レシピ一覧画面の初期データをサーバーサイドで取得する。
 * ソートパラメータを URL クエリから受け取り、service に委譲する。
 *
 * @spec specs/recipes/spec.md
 * @acceptance AC-001
 */
import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { listRecipesQuerySchema } from '$recipes/_lib/schema';
import { getRecipes } from '$recipes/_lib/service';

export const load: PageServerLoad = async ({ url, platform, locals }) => {
	const rawQuery = Object.fromEntries(url.searchParams.entries());
	const queryResult = listRecipesQuerySchema.safeParse(rawQuery);
	const query = queryResult.success
		? queryResult.data
		: { page: 1, limit: 20, sort: 'createdAt_desc' as const };

	const db = createDb(platform!.env.DB);
	return await getRecipes(db, locals.user!.id, query);
};
