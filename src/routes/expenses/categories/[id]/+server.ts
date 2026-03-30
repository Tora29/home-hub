/**
 * @file API: 支出カテゴリ 詳細
 * @module src/routes/expenses/categories/[id]/+server.ts
 * @feature expenses
 *
 * @description
 * 支出カテゴリの更新・削除エンドポイント。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-011, AC-012, AC-107, AC-108, AC-109, AC-110
 *
 * @endpoints
 * - PUT /expenses/categories/[id] → 200 Category - カテゴリ更新
 *   @body categoryUpdateSchema
 *   @errors 400(VALIDATION_ERROR), 404(NOT_FOUND)
 * - DELETE /expenses/categories/[id] → 204 - カテゴリ削除
 *   @errors 404(NOT_FOUND), 409(CONFLICT)
 *
 * @service ../service.ts
 * @schema ../schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AppError } from '$lib/server/errors';
import { createDb } from '$lib/server/db';
import { categoryUpdateSchema } from '../schema';
import { deleteCategory, updateCategory } from '../service';

/**
 * カテゴリを更新する。categoryUpdateSchema で入力値を検証後、service に委譲する。
 * @ac AC-011, AC-107, AC-108, AC-109
 * @body categoryUpdateSchema
 * @throws VALIDATION_ERROR - 入力値が不正な場合
 * @throws NOT_FOUND - 該当カテゴリが存在しない場合
 */
export const PUT: RequestHandler = async ({ request, params, locals, platform }) => {
	const body = await request.json();
	const result = categoryUpdateSchema.safeParse(body);
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
		const updated = await updateCategory(db, locals.user!.id, params.id, result.data);
		return json(updated);
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
 * カテゴリを削除する。紐付く支出がある場合は 409 を返す。
 * @ac AC-012, AC-109, AC-110
 * @throws NOT_FOUND - 該当カテゴリが存在しない場合
 * @throws CONFLICT - カテゴリに紐付く支出が 1 件以上ある場合
 */
export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		await deleteCategory(db, locals.user!.id, params.id);
		return new Response(null, { status: 204 });
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
