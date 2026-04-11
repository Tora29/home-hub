/**
 * @file API: 一括申請取り消し
 * @module src/routes/expenses/cancel/+server.ts
 * @feature expenses
 *
 * @description
 * 自分の pending 支出を全件 checked に戻す。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-009, AC-116
 *
 * @endpoints
 * - POST /expenses/cancel → 200 {count} - 一括申請取り消し
 *   @errors 409(CONFLICT)
 *
 * @service ../service.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { handleApiError } from '$lib/server/api-helpers';
import { cancelExpenses } from '../service';

/**
 * 自分の pending 支出を全件 checked に戻す。
 * @ac AC-009, AC-116
 * @throws CONFLICT - pending 支出が 0 件の場合
 */
export const POST: RequestHandler = async ({ locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		const count = await cancelExpenses(db, locals.user!.id);
		return json({ count });
	} catch (e) {
		return handleApiError(e);
	}
};
