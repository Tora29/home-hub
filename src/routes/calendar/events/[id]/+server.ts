/**
 * @file API: カレンダー予定 詳細
 * @module src/routes/calendar/events/[id]/+server.ts
 * @feature calendar
 *
 * @description
 * カレンダー予定の更新・削除エンドポイント。作成者以外の操作は FORBIDDEN。
 *
 * @endpoints
 * - PUT /calendar/events/[id] → 200 CalendarEvent - イベント更新
 *   @body eventUpdateSchema
 *   @errors 400(VALIDATION_ERROR), 403(FORBIDDEN), 404(NOT_FOUND)
 * - DELETE /calendar/events/[id] → 204 - イベント削除
 *   @errors 403(FORBIDDEN), 404(NOT_FOUND)
 *
 * @service ../../../../lib/features/calendar/server/service.ts
 * @schema ../../../../lib/features/calendar/schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { parseJsonBody, validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
import { eventUpdateSchema } from '$calendar/schema';
import { deleteEvent, updateEvent } from '$calendar/server/service';

/**
 * イベントを更新する。eventUpdateSchema で入力値を検証後、service に委譲する。
 * @body eventUpdateSchema
 * @throws VALIDATION_ERROR - 入力値が不正な場合
 * @throws FORBIDDEN - 作成者以外が更新しようとした場合
 * @throws NOT_FOUND - 該当イベントが存在しない場合
 */
export const PUT: RequestHandler = async ({ request, params, locals, platform }) => {
	const bodyResult = await parseJsonBody(request);
	if (!bodyResult.ok) return bodyResult.response;

	const result = eventUpdateSchema.safeParse(bodyResult.data);
	if (!result.success) return validationErrorResponse(result.error.issues);

	try {
		const db = createDb(platform!.env.DB);
		const updated = await updateEvent(db, locals.user!.id, params.id, result.data);
		return json(updated);
	} catch (e) {
		return handleApiError(e);
	}
};

/**
 * イベントを削除する。
 * @throws FORBIDDEN - 作成者以外が削除しようとした場合
 * @throws NOT_FOUND - 該当イベントが存在しない場合
 */
export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	try {
		const db = createDb(platform!.env.DB);
		await deleteEvent(db, locals.user!.id, params.id);
		return new Response(null, { status: 204 });
	} catch (e) {
		return handleApiError(e);
	}
};
