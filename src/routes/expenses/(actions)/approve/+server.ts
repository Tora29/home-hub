/**
 * @file API: 一括承認
 * @module src/routes/expenses/(actions)/approve/+server.ts
 * @feature expenses
 *
 * @description
 * 相手（自分以外）の pending 支出を一括で approved にし、相手へ LINE 通知を送信するエンドポイント。
 * 自分の pending 支出は対象外。LINE 通知はベストエフォート（waitUntil でレスポンス返却後に実行）。
 * user.role 未設定・通知先未設定の場合は DB 更新のみ行い LINE 通知をスキップ。
 *
 * @endpoints
 * - POST /expenses/approve → 200 {count} - 一括承認（count = 実際に承認した件数）
 *   @errors 409(CONFLICT)
 *
 * @service $lib/features/expenses/server/workflow.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { handleApiError } from '$lib/server/api-helpers';
import { approveExpenses } from '$expenses/server/workflow';
import { buildLineEnv } from '$expenses/server/line';

/**
 * 相手の pending 支出を一括で approved にし、LINE 通知を送信する。
 * @calls approveExpenses
 * @throws {CONFLICT} - 承認対象の pending 支出が 0 件の場合
 */
export const POST: RequestHandler = async ({ url, locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		const result = await approveExpenses(
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
