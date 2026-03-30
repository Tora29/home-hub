/**
 * @file API: 支出 詳細
 * @module src/routes/expenses/[id]/+server.ts
 * @feature expenses
 *
 * @description
 * 支出の更新・削除エンドポイント。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-004, AC-005, AC-006, AC-007, AC-101, AC-102, AC-103, AC-104, AC-105, AC-106
 *
 * @endpoints
 * - PUT /expenses/[id] → 200 ExpenseWithCategory - 更新（金額・カテゴリ・承認状態）
 *   @body expenseUpdateSchema
 *   @errors 400(VALIDATION_ERROR), 404(NOT_FOUND)
 * - DELETE /expenses/[id] → 204 - 削除
 *   @errors 404(NOT_FOUND)
 *
 * @service ../service.ts
 * @schema ../schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AppError } from '$lib/server/errors';
import { createDb } from '$lib/server/db';
import { expenseUpdateSchema } from '../schema';
import { deleteExpense, updateExpense } from '../service';

/**
 * 支出を更新する。expenseUpdateSchema で入力値を検証後、service に委譲する。
 * @ac AC-004, AC-005, AC-006, AC-101, AC-102, AC-103, AC-104, AC-105, AC-106
 * @body expenseUpdateSchema
 * @throws VALIDATION_ERROR - 入力値が不正な場合
 * @throws NOT_FOUND - 該当支出が存在しない場合
 */
export const PUT: RequestHandler = async ({ request, params, locals, platform }) => {
	const body = await request.json();
	const result = expenseUpdateSchema.safeParse(body);
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
		const updated = await updateExpense(db, locals.user!.id, params.id, result.data);
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
 * 支出を削除する。
 * @ac AC-007, AC-106
 * @throws NOT_FOUND - 該当支出が存在しない場合
 */
export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		await deleteExpense(db, locals.user!.id, params.id);
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
