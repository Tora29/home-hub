/**
 * @file API: 支出
 * @module src/routes/expenses/+server.ts
 * @feature expenses
 *
 * @description
 * 支出一覧取得・新規登録エンドポイント。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-001, AC-002, AC-003, AC-101, AC-102, AC-103, AC-104, AC-105
 *
 * @endpoints
 * - GET /expenses → 200 ExpenseList - 一覧取得（月フィルタ・ページネーション）
 *   @query month:string page:number=1 limit:number=20
 * - POST /expenses → 201 ExpenseWithRelations - 新規作成
 *   @body expenseCreateSchema
 *   @errors 400(VALIDATION_ERROR)
 *
 * @service ./_lib/service.ts
 * @schema ./_lib/schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { parseJsonBody, validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
import { expenseCreateSchema, expenseQuerySchema } from '$expenses/_lib/schema';
import { createExpense, getExpenses } from '$expenses/_lib/service';

/**
 * 指定月の支出一覧を取得する。month 未指定時は当月。
 * @ac AC-001, AC-002
 * @calls getExpenses
 */
export const GET: RequestHandler = async ({ url, platform }) => {
	const queryResult = expenseQuerySchema.safeParse({
		month: url.searchParams.get('month') ?? undefined,
		page: url.searchParams.get('page') ?? undefined,
		limit: url.searchParams.get('limit') ?? undefined
	});
	if (!queryResult.success) return validationErrorResponse(queryResult.error.issues);
	const { month, page, limit } = queryResult.data;

	try {
		const db = createDb(platform!.env.DB);
		const result = await getExpenses(db, { month, page, limit });
		return json(result);
	} catch (e) {
		return handleApiError(e);
	}
};

/**
 * 支出を新規作成する。expenseCreateSchema で入力値を検証後、service に委譲する。
 * @ac AC-003, AC-101, AC-102, AC-103, AC-104, AC-105
 * @body expenseCreateSchema
 * @throws VALIDATION_ERROR - 入力値が不正な場合
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const bodyResult = await parseJsonBody(request);
	if (!bodyResult.ok) return bodyResult.response;

	const result = expenseCreateSchema.safeParse(bodyResult.data);
	if (!result.success) return validationErrorResponse(result.error.issues);

	try {
		const db = createDb(platform!.env.DB);
		const created = await createExpense(db, locals.user!.id, result.data);
		return json(created, { status: 201 });
	} catch (e) {
		return handleApiError(e);
	}
};
