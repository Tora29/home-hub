/**
 * @file API: 一括承認依頼
 * @module src/routes/expenses/(actions)/request/+server.ts
 * @feature expenses
 *
 * @description
 * 自分の checked 支出を一括で pending にし、パートナーへ LINE 通知を送信するエンドポイント。
 * LINE 通知はベストエフォート。失敗してもロールバックせず console.error にログするのみ。
 * user.role 未設定・通知先未設定の場合は DB 更新を継続し LINE 通知をスキップ。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-008, AC-115, AC-118, AC-119, AC-125
 *
 * @endpoints
 * - POST /expenses/request → 200 {count} - 承認依頼成功
 *   @errors 409(CONFLICT)
 *
 * @service $expenses/service.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { handleApiError } from '$lib/server/api-helpers';
import { requestExpenses, buildLineEnv, getUserRole } from '$expenses/server/service';

/**
 * 自分の checked 支出を一括で pending にし、LINE 通知を送信する。
 * @ac AC-008, AC-115, AC-118, AC-119, AC-125
 * @throws CONFLICT - checked 支出が 0 件の場合
 */
export const POST: RequestHandler = async ({ locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		const userId = locals.user!.id;
		const role = await getUserRole(db, userId);
		const result = await requestExpenses(db, userId, role, buildLineEnv(platform!.env));
		return json(result);
	} catch (e) {
		return handleApiError(e);
	}
};
