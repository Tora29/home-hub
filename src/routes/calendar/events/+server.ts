/**
 * @file API: カレンダー予定
 * @module src/routes/calendar/events/+server.ts
 * @feature calendar
 *
 * @description
 * カレンダー予定一覧取得・新規登録エンドポイント。
 *
 * @endpoints
 * - GET /calendar/events → 200 { items: CalendarEvent[], total, page, limit } - 月別イベント一覧
 *   @query month:string（省略時は当月）
 * - POST /calendar/events → 201 CalendarEvent - イベント作成
 *   @body eventCreateSchema
 *   @errors 400(VALIDATION_ERROR)
 *
 * @service ../../../lib/features/calendar/server/service.ts
 * @schema ../../../lib/features/calendar/schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { parseJsonBody, validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
import { calendarQuerySchema, eventCreateSchema } from '$calendar/schema';
import { createEvent, getEvents } from '$calendar/server/service';
import { getCurrentMonth } from '$lib/utils/date';

/**
 * 指定月のイベント一覧を取得する。month 未指定時は当月。
 * @calls getEvents
 */
export const GET: RequestHandler = async ({ url, platform }) => {
	const queryResult = calendarQuerySchema.safeParse({
		month: url.searchParams.get('month') ?? undefined
	});
	if (!queryResult.success) return validationErrorResponse(queryResult.error.issues);

	const month = queryResult.data.month ?? getCurrentMonth();

	try {
		const db = createDb(platform!.env.DB);
		const result = await getEvents(db, month);
		return json(result);
	} catch (e) {
		return handleApiError(e);
	}
};

/**
 * イベントを新規作成する。eventCreateSchema で入力値を検証後、service に委譲する。
 * @body eventCreateSchema
 * @throws VALIDATION_ERROR - 入力値が不正な場合
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const bodyResult = await parseJsonBody(request);
	if (!bodyResult.ok) return bodyResult.response;

	const result = eventCreateSchema.safeParse(bodyResult.data);
	if (!result.success) return validationErrorResponse(result.error.issues);

	try {
		const db = createDb(platform!.env.DB);
		const created = await createEvent(db, locals.user!.id, result.data);
		return json(created, { status: 201 });
	} catch (e) {
		return handleApiError(e);
	}
};
