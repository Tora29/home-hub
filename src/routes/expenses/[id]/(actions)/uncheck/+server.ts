/**
 * @file API: 支出確認取消
 * @module src/routes/expenses/[id]/(actions)/uncheck/+server.ts
 * @feature expenses
 *
 * @description
 * 支出の確認を取り消すエンドポイント（checked → unapproved）。
 * 登録者のみ実行可能。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-005, AC-106, AC-114
 *
 * @endpoints
 * - POST /expenses/[id]/uncheck → 200 ExpenseWithRelations - 確認取消
 *   @errors 403(FORBIDDEN), 404(NOT_FOUND), 409(CONFLICT)
 *
 * @service $expenses/_lib/service.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { handleApiError } from '$lib/server/api-helpers';
import { uncheckExpense } from '$expenses/_lib/service';

/**
 * 支出の確認を取り消す（checked → unapproved）。
 * @ac AC-005, AC-106, AC-114
 * @throws FORBIDDEN - 他ユーザーの支出の場合
 * @throws NOT_FOUND - 該当支出が存在しない場合
 * @throws CONFLICT - checked 以外の支出の場合
 */
export const POST: RequestHandler = async ({ params, locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		const updated = await uncheckExpense(db, locals.user!.id, params.id);
		return json(updated);
	} catch (e) {
		return handleApiError(e);
	}
};
