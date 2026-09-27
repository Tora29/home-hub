/**
 * @file API: 支出
 * @module src/routes/expenses/+server.ts
 * @feature expenses
 *
 * @description
 * 支出一覧取得・新規登録エンドポイント。一覧は全ユーザーの支出（世帯合計）。
 *
 * @endpoints
 * - GET /expenses → 200 {items: ExpenseWithRelations[], total, page, limit, monthTotal} - 一覧取得（月フィルタ・ページネーション）
 *   @query month:string(YYYY-MM)=当月 page:number=1 limit:number=20
 *   @errors 400(VALIDATION_ERROR)
 * - POST /expenses → 201 ExpenseWithRelations - 新規作成（status=unapproved）
 *   @body expenseCreateSchema
 *   @errors 400(VALIDATION_ERROR), 404(NOT_FOUND)
 *
 * @service $lib/features/expenses/server/service.ts
 * @schema $lib/features/expenses/schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { parseJsonBody, validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
import { expenseCreateSchema, expenseQuerySchema } from '$expenses/schema';
import { createExpense, getExpenses } from '$expenses/server/service';

/**
 * 指定月の支出一覧を取得する。expenseQuerySchema でクエリを検証後、service に委譲する。month 未指定時は当月。
 * @calls getExpenses
 * @throws {VALIDATION_ERROR} - クエリパラメータが不正な場合
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
 * @calls createExpense
 * @body expenseCreateSchema
 * @throws {VALIDATION_ERROR} - 入力値が不正な場合
 * @throws {NOT_FOUND} - 指定カテゴリまたは支払者が存在しない場合
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
