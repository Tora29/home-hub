/**
 * @file API: 一括承認依頼
 * @module src/routes/expenses/request/+server.ts
 * @feature expenses
 *
 * @description
 * 自分の checked 支出を全件 pending に変更し、相手へ LINE 通知を送信する。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-008, AC-115, AC-119, AC-120
 *
 * @endpoints
 * - POST /expenses/request → 200 {count} - 一括承認依頼
 *   @errors 409(CONFLICT) 502(BAD_GATEWAY)
 *
 * @service ../service.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { handleApiError } from '$lib/server/api-helpers';
import { sendLineMessage, getLineUserId, getOppositeRole } from '$lib/server/line';
import { requestExpenses } from '../service';

/**
 * 自分の checked 支出を全件 pending に変更し、相手へ LINE 通知を送信する。
 * @ac AC-008, AC-115, AC-119, AC-120
 * @throws CONFLICT - checked 支出が 0 件の場合
 * @throws BAD_GATEWAY - LINE API 失敗時
 */
export const POST: RequestHandler = async ({ locals, platform }) => {
	const currentUser = locals.user!;
	const role = currentUser.role as 'primary' | 'spouse' | null;
	const env = platform!.env;

	// role が設定されている場合のみ LINE 通知先を解決する。
	// role=null ユーザーは通知なしで DB 操作を続行する（backfill 移行期や 3 人目以降に対応）。
	const oppositeRole = role ? getOppositeRole(role) : null;
	const toLineUserId = oppositeRole ? getLineUserId(env, oppositeRole) : undefined;

	// role が設定されていて LINE トークンもあるが宛先 ID が未設定の場合のみ設定ミスとして 409
	if (oppositeRole && !toLineUserId && env.LINE_CHANNEL_ACCESS_TOKEN) {
		return json(
			{ code: 'CONFLICT', message: 'LINE 宛先ユーザー ID が設定されていません' },
			{ status: 409 }
		);
	}

	try {
		const db = createDb(platform!.env.DB);
		// DB 更新を先に実行する。LINE 送信失敗時も DB 更新は維持する（spec AC-120）。
		const count = await requestExpenses(db, currentUser.id);

		if (toLineUserId) {
			await sendLineMessage(
				env,
				toLineUserId,
				`${currentUser.name} から承認依頼が ${count} 件届いています。`
			);
		}

		return json({ count });
	} catch (e) {
		return handleApiError(e);
	}
};
