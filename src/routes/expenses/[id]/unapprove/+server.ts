/**
 * @file API: 支出承認取消
 * @module src/routes/expenses/[id]/unapprove/+server.ts
 * @feature expenses
 *
 * @description
 * 確認済みの支出を未承認に戻すエンドポイント。
 * approvedAt を null にリセットする。確定済みの支出には操作不可。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-005
 *
 * @endpoints
 * - POST /expenses/[id]/unapprove → 200 ExpenseWithRelations - 支出承認取消
 *   @errors 404(NOT_FOUND), 409(CONFLICT)
 *
 * @service ../../service.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { handleApiError } from '$lib/server/api-helpers';
import { unapproveExpense } from '../../service';

/**
 * 確認済みの支出を未承認に戻す。
 * @ac AC-005
 * @throws NOT_FOUND - 該当支出が存在しない場合
 * @throws CONFLICT - 確定済みの支出の場合
 */
export const POST: RequestHandler = async ({ params, locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		const unapproved = await unapproveExpense(db, locals.user!.id, params.id);
		return json(unapproved);
	} catch (e) {
		return handleApiError(e);
	}
};
