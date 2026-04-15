/**
 * @file API: 一括申請取り消し
 * @module src/routes/expenses/(actions)/cancel/+server.ts
 * @feature expenses
 *
 * @description
 * 自分の pending 支出を一括で checked に戻すエンドポイント。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-009, AC-116
 *
 * @endpoints
 * - POST /expenses/cancel → 200 {count} - 申請取り消し成功
 *   @errors 409(CONFLICT)
 *
 * @service $expenses/_lib/service.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { handleApiError } from '$lib/server/api-helpers';
import { cancelExpenses } from '$expenses/_lib/service';

/**
 * 自分の pending 支出を一括で checked に戻す。
 * @ac AC-009, AC-116
 * @throws CONFLICT - pending 支出が 0 件の場合
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
