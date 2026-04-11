/**
 * @file API: 支出確認
 * @module src/routes/expenses/[id]/check/+server.ts
 * @feature expenses
 *
 * @description
 * unapproved の支出を checked に更新する。自分の支出のみ操作可。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-004, AC-114
 *
 * @endpoints
 * - POST /expenses/[id]/check → 200 ExpenseWithRelations - 支出確認
 *   @errors 403(FORBIDDEN) 404(NOT_FOUND) 409(CONFLICT)
 *
 * @service ../../service.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { handleApiError } from '$lib/server/api-helpers';
import { checkExpense } from '../../service';

/**
 * unapproved の支出を checked に更新する。
 * @ac AC-004, AC-114
 * @throws FORBIDDEN - 他ユーザーの支出の場合
 * @throws NOT_FOUND - 該当支出が存在しない場合
 * @throws CONFLICT - unapproved 以外の場合
 */
export const POST: RequestHandler = async ({ params, locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		const updated = await checkExpense(db, locals.user!.id, params.id);
		return json(updated);
	} catch (e) {
		return handleApiError(e);
	}
};
