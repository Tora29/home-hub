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
import { createDb } from '$lib/server/db';
import { parseJsonBody, validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
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
	const bodyResult = await parseJsonBody(request);
	if (!bodyResult.ok) return bodyResult.response;

	const result = categoryUpdateSchema.safeParse(bodyResult.data);
	if (!result.success) return validationErrorResponse(result.error.issues);

	try {
		const db = createDb(platform!.env.DB);
		const updated = await updateCategory(db, locals.user!.id, params.id, result.data);
		return json(updated);
	} catch (e) {
		return handleApiError(e);
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
		return handleApiError(e);
	}
};
