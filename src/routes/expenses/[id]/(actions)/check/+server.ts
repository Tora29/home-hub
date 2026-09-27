/**
 * @file API: 支出確認
 * @module src/routes/expenses/[id]/(actions)/check/+server.ts
 * @feature expenses
 *
 * @description
 * 支出を確認済みにするエンドポイント（unapproved → checked）。
 * 登録者のみ実行可能。
 *
 * @endpoints
 * - POST /expenses/[id]/check → 200 ExpenseWithRelations - 確認済みに更新
 *   @errors 403(FORBIDDEN), 404(NOT_FOUND), 409(CONFLICT)
 *
 * @service $lib/features/expenses/server/workflow.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { handleApiError } from '$lib/server/api-helpers';
import { checkExpense } from '$expenses/server/workflow';

/**
 * 支出を確認済みにする（unapproved → checked）。
 * @calls checkExpense
 * @throws {NOT_FOUND} - 該当支出が存在しない場合
 * @throws {FORBIDDEN} - 他ユーザーの支出の場合
 * @throws {CONFLICT} - unapproved 以外の支出の場合
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
