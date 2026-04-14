/**
 * @file API: 一括承認依頼
 * @module src/routes/expenses/request/+server.ts
 * @feature expenses
 *
 * @description
 * 自分の checked 支出を一括で pending にし、パートナーへ LINE 通知を送信するエンドポイント。
 * LINE API 失敗時は DB 更新をロールバックし 502 を返す。
 * user.role 未設定・通知先未設定の場合は DB 更新を継続し LINE 通知をスキップ。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-008, AC-115, AC-118, AC-119, AC-125
 *
 * @endpoints
 * - POST /expenses/request → 200 {count} - 承認依頼成功
 *   @errors 409(CONFLICT), 502(BAD_GATEWAY)
 *
 * @service ../service.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { handleApiError } from '$lib/server/api-helpers';
import { user as userTable } from '$lib/server/tables';
import { eq } from 'drizzle-orm';
import { requestExpenses } from '../service';

/**
 * 自分の checked 支出を一括で pending にし、LINE 通知を送信する。
 * @ac AC-008, AC-115, AC-118, AC-119, AC-125
 * @throws CONFLICT - checked 支出が 0 件の場合
 * @throws BAD_GATEWAY - LINE API 呼び出し失敗の場合
 */
export const POST: RequestHandler = async ({ locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		const userId = locals.user!.id;

		const userRow = await db
			.select({ role: userTable.role })
			.from(userTable)
			.where(eq(userTable.id, userId))
			.get();

		const result = await requestExpenses(db, userId, userRow?.role ?? null, {
			lineChannelAccessToken: platform!.env.LINE_CHANNEL_ACCESS_TOKEN,
			lineUserIdPrimary: platform!.env.LINE_USER_ID_PRIMARY,
			lineUserIdSpouse: platform!.env.LINE_USER_ID_SPOUSE,
			lineMock: platform!.env.LINE_MOCK
		});
		return json(result);
	} catch (e) {
		return handleApiError(e);
	}
};
