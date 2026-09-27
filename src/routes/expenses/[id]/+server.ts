/**
 * @file API: 支出 詳細
 * @module src/routes/expenses/[id]/+server.ts
 * @feature expenses
 *
 * @description
 * 支出の更新・削除エンドポイント。登録者本人の unapproved/checked の支出のみ操作可能。
 *
 * @endpoints
 * - PUT /expenses/[id] → 200 ExpenseWithRelations - 更新（金額・カテゴリ・支払者）
 *   @body expenseUpdateSchema
 *   @errors 400(VALIDATION_ERROR), 403(FORBIDDEN), 404(NOT_FOUND), 409(CONFLICT)
 * - DELETE /expenses/[id] → 204 - 削除
 *   @errors 403(FORBIDDEN), 404(NOT_FOUND), 409(CONFLICT)
 *
 * @service $lib/features/expenses/server/service.ts
 * @schema $lib/features/expenses/schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { parseJsonBody, validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
import { expenseUpdateSchema } from '$expenses/schema';
import { deleteExpense, updateExpense } from '$expenses/server/service';

/**
 * 支出を更新する。expenseUpdateSchema で入力値を検証後、service に委譲する。
 * @calls updateExpense
 * @body expenseUpdateSchema
 * @throws {VALIDATION_ERROR} - 入力値が不正な場合
 * @throws {NOT_FOUND} - 該当支出・指定カテゴリ・支払者のいずれかが存在しない場合
 * @throws {FORBIDDEN} - 他ユーザーの支出の場合
 * @throws {CONFLICT} - pending/approved の支出の場合
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
 * @calls deleteExpense
 * @throws {NOT_FOUND} - 該当支出が存在しない場合
 * @throws {FORBIDDEN} - 他ユーザーの支出の場合
 * @throws {CONFLICT} - pending/approved の支出の場合
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
