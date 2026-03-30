/**
 * @file API: 支出カテゴリ
 * @module src/routes/expenses/categories/+server.ts
 * @feature expenses
 *
 * @description
 * 支出カテゴリの一覧取得・新規登録エンドポイント。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-010, AC-107, AC-108
 *
 * @endpoints
 * - GET /expenses/categories → 200 CategoryList - カテゴリ一覧取得
 * - POST /expenses/categories → 201 Category - カテゴリ登録
 *   @body categoryCreateSchema
 *   @errors 400(VALIDATION_ERROR)
 *
 * @service ./service.ts
 * @schema ./schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AppError } from '$lib/server/errors';
import { createDb } from '$lib/server/db';
import { categoryCreateSchema } from './schema';
import { createCategory, getCategories } from './service';

/**
 * カテゴリ一覧を取得する（全件）。
 * @ac AC-010
 * @calls getCategories
 */
export const GET: RequestHandler = async ({ locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		const result = await getCategories(db, locals.user!.id);
		return json(result);
	} catch (e) {
		if (e instanceof AppError) {
			return json({ code: e.code, message: e.message, fields: e.fields }, { status: e.status });
		}
		console.error(e);
		return json(
			{ code: 'INTERNAL_SERVER_ERROR', message: 'サーバーエラーが発生しました' },
			{ status: 500 }
		);
	}
};

/**
 * カテゴリを新規作成する。categoryCreateSchema で入力値を検証後、service に委譲する。
 * @ac AC-010, AC-107, AC-108
 * @body categoryCreateSchema
 * @throws VALIDATION_ERROR - 入力値が不正な場合
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const body = await request.json();
	const result = categoryCreateSchema.safeParse(body);
	if (!result.success) {
		return json(
			{
				code: 'VALIDATION_ERROR',
				message: '入力値が正しくありません',
				fields: result.error.issues.map((i) => ({
					field: i.path.join('.'),
					message: i.message
				}))
			},
			{ status: 400 }
		);
	}

	try {
		const db = createDb(platform!.env.DB);
		const created = await createCategory(db, locals.user!.id, result.data);
		return json(created, { status: 201 });
	} catch (e) {
		if (e instanceof AppError) {
			return json({ code: e.code, message: e.message, fields: e.fields }, { status: e.status });
		}
		console.error(e);
		return json(
			{ code: 'INTERNAL_SERVER_ERROR', message: 'サーバーエラーが発生しました' },
			{ status: 500 }
		);
	}
};
