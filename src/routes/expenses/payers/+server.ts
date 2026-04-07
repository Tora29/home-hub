/**
 * @file API: 支払者
 * @module src/routes/expenses/payers/+server.ts
 * @feature expenses
 *
 * @description
 * 支払者一覧取得・新規作成エンドポイント。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-035, AC-116, AC-117
 *
 * @endpoints
 * - GET /expenses/payers → 200 { items: Payer[], total, page, limit } - 支払者一覧取得
 * - POST /expenses/payers → 201 Payer - 支払者新規作成
 *   @body payerCreateSchema
 *   @errors 400(VALIDATION_ERROR)
 *
 * @service ./service.ts
 * @schema ./schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { parseJsonBody, validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
import { payerCreateSchema } from './schema';
import { getPayers, createPayer } from './service';

/**
 * 支払者一覧を取得する。
 * @ac AC-035
 * @calls getPayers
 */
export const GET: RequestHandler = async ({ locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		const result = await getPayers(db, locals.user!.id);
		return json(result);
	} catch (e) {
		return handleApiError(e);
	}
};

/**
 * 支払者を新規作成する。payerCreateSchema で入力値を検証後、service に委譲する。
 * @ac AC-035, AC-116, AC-117
 * @body payerCreateSchema
 * @throws VALIDATION_ERROR - 入力値が不正な場合
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const bodyResult = await parseJsonBody(request);
	if (!bodyResult.ok) return bodyResult.response;

	const result = payerCreateSchema.safeParse(bodyResult.data);
	if (!result.success) return validationErrorResponse(result.error.issues);

	try {
		const db = createDb(platform!.env.DB);
		const created = await createPayer(db, locals.user!.id, result.data);
		return json(created, { status: 201 });
	} catch (e) {
		return handleApiError(e);
	}
};
