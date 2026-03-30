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
 * - POST /expenses → 201 ExpenseWithCategory - 新規作成
 *   @body expenseCreateSchema
 *   @errors 400(VALIDATION_ERROR)
 *
 * @service ./service.ts
 * @schema ./schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AppError } from '$lib/server/errors';
import { createDb } from '$lib/server/db';
import { expenseCreateSchema } from './schema';
import { createExpense, getExpenses } from './service';

/**
 * 指定月の支出一覧を取得する。month 未指定時は当月。
 * @ac AC-001, AC-002
 * @calls getExpenses
 */
export const GET: RequestHandler = async ({ url, locals, platform }) => {
	const month = url.searchParams.get('month') ?? undefined;
	const page = Number(url.searchParams.get('page') ?? 1);
	const limit = Number(url.searchParams.get('limit') ?? 20);

	try {
		const db = createDb(platform!.env.DB);
		const result = await getExpenses(db, locals.user!.id, { month, page, limit });
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
 * 支出を新規作成する。expenseCreateSchema で入力値を検証後、service に委譲する。
 * @ac AC-003, AC-101, AC-102, AC-103, AC-104, AC-105
 * @body expenseCreateSchema
 * @throws VALIDATION_ERROR - 入力値が不正な場合
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const body = await request.json();
	const result = expenseCreateSchema.safeParse(body);
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
		const created = await createExpense(db, locals.user!.id, result.data);
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
