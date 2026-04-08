/**
 * @file API: 支出確定
 * @module src/routes/expenses/[id]/finalize/+server.ts
 * @feature expenses
 *
 * @description
 * 確認済みの支出を確定済みに更新するエンドポイント。
 * 確定後は編集・削除・承認状態変更が不可となる。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-014, AC-113, AC-114
 *
 * @endpoints
 * - POST /expenses/[id]/finalize → 200 ExpenseWithRelations - 支出確定
 *   @errors 404(NOT_FOUND), 409(CONFLICT)
 *
 * @service ../../service.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { handleApiError } from '$lib/server/api-helpers';
import { finalizeExpense } from '../../service';

/**
 * 確認済みの支出を確定する。未承認または確定済みの場合は 409 を返す。
 * @ac AC-014, AC-113, AC-114
 * @throws CONFLICT - 確定済みの場合（「確定済みの支出は変更できません」）
 * @throws CONFLICT - 未承認の場合（「確認済みにしてから確定してください」）
 * @throws NOT_FOUND - 該当支出が存在しない場合
 */
export const POST: RequestHandler = async ({ params, locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		const finalized = await finalizeExpense(db, locals.user!.id, params.id);
		return json(finalized);
	} catch (e) {
		return handleApiError(e);
	}
};
