/**
 * @file API: 支出 詳細
 * @module src/routes/expenses/[id]/+server.ts
 * @feature expenses
 *
 * @description
 * 支出の更新・削除エンドポイント。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-004, AC-005, AC-006, AC-007, AC-101, AC-102, AC-103, AC-104, AC-105, AC-106, AC-113
 *
 * @endpoints
 * - PUT /expenses/[id] → 200 ExpenseWithRelations - 更新（金額・カテゴリ・支払者）
 *   @body expenseUpdateSchema
 *   @errors 400(VALIDATION_ERROR), 404(NOT_FOUND), 409(CONFLICT)
 * - DELETE /expenses/[id] → 204 - 削除
 *   @errors 404(NOT_FOUND), 409(CONFLICT)
 *
 * @service ../service.ts
 * @schema ../schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { parseJsonBody, validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
import { expenseUpdateSchema } from '../schema';
import { deleteExpense, updateExpense } from '../service';

/**
 * 支出を更新する。expenseUpdateSchema で入力値を検証後、service に委譲する。
 * @ac AC-004, AC-005, AC-006, AC-101, AC-102, AC-103, AC-104, AC-105, AC-106, AC-113
 * @body expenseUpdateSchema
 * @throws VALIDATION_ERROR - 入力値が不正な場合
 * @throws NOT_FOUND - 該当支出が存在しない場合
 * @throws CONFLICT - 申請中または承認済みの支出の場合
 */
export const PUT: RequestHandler = async ({ request, params, locals, platform }) => {
	const bodyResult = await parseJsonBody(request);
	if (!bodyResult.ok) return bodyResult.response;

	const result = expenseUpdateSchema.safeParse(bodyResult.data);
	if (!result.success) return validationErrorResponse(result.error.issues);

	try {
		const db = createDb(platform!.env.DB);
		const updated = await updateExpense(db, locals.user!.id, params.id, result.data);
		return json(updated);
	} catch (e) {
		return handleApiError(e);
	}
};

/**
 * 支出を削除する。
 * @ac AC-007, AC-106, AC-113
 * @throws NOT_FOUND - 該当支出が存在しない場合
 * @throws CONFLICT - 申請中または承認済みの支出の場合
 */
export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		await deleteExpense(db, locals.user!.id, params.id);
		return new Response(null, { status: 204 });
	} catch (e) {
		return handleApiError(e);
	}
};
