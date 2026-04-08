/**
 * @file API: 支出承認
 * @module src/routes/expenses/[id]/approve/+server.ts
 * @feature expenses
 *
 * @description
 * 未承認の支出を確認済みに更新するエンドポイント。
 * approvedAt に現在日時をセットする。確定済みの支出には操作不可。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-004
 *
 * @endpoints
 * - POST /expenses/[id]/approve → 200 ExpenseWithRelations - 支出承認
 *   @errors 404(NOT_FOUND), 409(CONFLICT)
 *
 * @service ../../service.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { handleApiError } from '$lib/server/api-helpers';
import { approveExpense } from '../../service';

/**
 * 未承認の支出を確認済みに更新する。
 * @ac AC-004
 * @throws NOT_FOUND - 該当支出が存在しない場合
 * @throws CONFLICT - 確定済みの支出の場合
 */
export const POST: RequestHandler = async ({ params, locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		const approved = await approveExpense(db, locals.user!.id, params.id);
		return json(approved);
	} catch (e) {
		return handleApiError(e);
	}
};
