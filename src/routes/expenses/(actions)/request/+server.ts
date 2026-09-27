/**
 * @file API: 一括承認依頼
 * @module src/routes/expenses/(actions)/request/+server.ts
 * @feature expenses
 *
 * @description
 * 自分の checked 支出を一括で pending にし、相手へ LINE 通知を送信するエンドポイント。
 * LINE 通知はベストエフォート（waitUntil でレスポンス返却後に実行）。
 * user.role 未設定・通知先未設定の場合は DB 更新のみ行い LINE 通知をスキップ。
 *
 * @endpoints
 * - POST /expenses/request → 200 {count} - 一括承認依頼（count = 実際に申請した件数）
 *   @errors 409(CONFLICT)
 *
 * @service $lib/features/expenses/server/workflow.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { handleApiError } from '$lib/server/api-helpers';
import { requestExpenses } from '$expenses/server/workflow';
import { buildLineEnv } from '$expenses/server/line';

/**
 * 自分の checked 支出を一括で pending にし、LINE 通知を送信する。
 * @calls requestExpenses
 * @throws {CONFLICT} - checked 支出が 0 件の場合
 */
export const POST: RequestHandler = async ({ url, locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		const result = await requestExpenses(
			db,
			locals.user!.id,
			{ role: locals.role, lineEnv: buildLineEnv(platform!.env), origin: url.origin },
			(task) => platform!.context.waitUntil(task)
		);
		return json(result);
	} catch (e) {
		return handleApiError(e);
	}
};
