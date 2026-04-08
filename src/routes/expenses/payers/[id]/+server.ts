/**
 * @file API: 支払者詳細
 * @module src/routes/expenses/payers/[id]/+server.ts
 * @feature expenses
 *
 * @description
 * 支払者更新・削除エンドポイント。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-036, AC-037, AC-116, AC-117, AC-118, AC-119
 *
 * @endpoints
 * - PUT /expenses/payers/[id] → 200 Payer - 支払者更新
 *   @body payerUpdateSchema
 *   @errors 400(VALIDATION_ERROR), 404(NOT_FOUND)
 * - DELETE /expenses/payers/[id] → 204 - 支払者削除
 *   @errors 404(NOT_FOUND), 409(CONFLICT)
 *
 * @service ../service.ts
 * @schema ../schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { parseJsonBody, validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
import { payerUpdateSchema } from '../schema';
import { updatePayer, deletePayer } from '../service';

/**
 * 支払者を更新する。payerUpdateSchema で入力値を検証後、service に委譲する。
 * @ac AC-036, AC-116, AC-117, AC-118
 * @body payerUpdateSchema
 * @throws VALIDATION_ERROR - 入力値が不正な場合
 * @throws NOT_FOUND - 該当支払者が存在しない場合
 */
export const PUT: RequestHandler = async ({ request, params, locals, platform }) => {
	const bodyResult = await parseJsonBody(request);
	if (!bodyResult.ok) return bodyResult.response;

	const result = payerUpdateSchema.safeParse(bodyResult.data);
	if (!result.success) return validationErrorResponse(result.error.issues);

	try {
		const db = createDb(platform!.env.DB);
		const updated = await updatePayer(db, locals.user!.id, params.id, result.data);
		return json(updated);
	} catch (e) {
		return handleApiError(e);
	}
};

/**
 * 支払者を削除する。紐付く支出がある場合は CONFLICT を返す。
 * @ac AC-037, AC-118, AC-119
 * @throws NOT_FOUND - 該当支払者が存在しない場合
 * @throws CONFLICT - 支払者に紐付く支出がある場合
 */
export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		await deletePayer(db, locals.user!.id, params.id);
		return new Response(null, { status: 204 });
	} catch (e) {
		return handleApiError(e);
	}
};
