/**
 * @file API: 一括申請取り消し
 * @module src/routes/expenses/(actions)/cancel/+server.ts
 * @feature expenses
 *
 * @description
 * 自分の pending 支出を一括で checked に戻すエンドポイント。
 *
 * @endpoints
 * - POST /expenses/cancel → 200 {count} - 一括申請取り消し（count = 実際に取り消した件数）
 *   @errors 409(CONFLICT)
 *
 * @service $lib/features/expenses/server/workflow.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { handleApiError } from '$lib/server/api-helpers';
import { cancelExpenses } from '$expenses/server/workflow';

/**
 * 自分の pending 支出を一括で checked に戻す。
 * @calls cancelExpenses
 * @throws {CONFLICT} - pending 支出が 0 件の場合
 */
export const POST: RequestHandler = async ({ locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		const result = await cancelExpenses(db, locals.user!.id);
		return json(result);
	} catch (e) {
		return handleApiError(e);
	}
};
