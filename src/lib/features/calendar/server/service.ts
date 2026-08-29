/**
 * @file サービス: CalendarEvent
 * @module src/lib/features/calendar/server/service.ts
 * @feature calendar
 *
 * @description
 * カレンダー予定機能のビジネスロジックと DB 操作を担う。
 * 終日イベントのみをサポートし、作成者以外による更新・削除は禁止する。
 *
 * @entity CalendarEvent
 *
 * @functions
 * - getEvents     - 月別イベント一覧取得（作成者名 JOIN 付き）
 * - createEvent   - 新規作成
 * - updateEvent   - 更新（FORBIDDEN: 作成者以外）
 * - deleteEvent   - 削除（FORBIDDEN: 作成者以外）
 *
 * @test ./service.integration.test.ts
 */
import { and, asc, eq, gte, lt } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { AppError } from '$lib/server/errors';
import { calendarEvent, user as userTable } from '$lib/server/tables';
import type * as schema from '$lib/server/tables';
import type { EventCreate, EventUpdate } from '../schema';
import type { CalendarEvent } from '../types';
import { formatYearMonth } from '$lib/utils/date';

type Db = DrizzleD1Database<typeof schema>;

const eventSelectFields = {
	id: calendarEvent.id,
	title: calendarEvent.title,
	description: calendarEvent.description,
	date: calendarEvent.date,
	createdByUserId: calendarEvent.createdByUserId,
	createdByName: userTable.name,
	createdAt: calendarEvent.createdAt,
	updatedAt: calendarEvent.updatedAt
};

function nextMonth(month: string): string {
	const [year, mon] = month.split('-').map(Number);
	const next = new Date(year, mon, 1); // mon は 1-indexed のため、そのまま渡すと翌月1日になる
	return `${formatYearMonth(next)}-01`;
}

async function fetchEvent(db: Db, id: string): Promise<CalendarEvent> {
	const row = await db
		.select(eventSelectFields)
		.from(calendarEvent)
		.innerJoin(userTable, eq(calendarEvent.createdByUserId, userTable.id))
		.where(eq(calendarEvent.id, id))
		.get();
	if (!row) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'サーバーエラーが発生しました');
	return row as unknown as CalendarEvent;
}

/**
 * 指定月のイベント一覧を取得する。createdBy ユーザー名を JOIN する。
 */
export async function getEvents(
	db: Db,
	month: string
): Promise<{ items: CalendarEvent[]; total: number; page: number; limit: number }> {
	const monthStart = `${month}-01`;
	const monthEnd = nextMonth(month);
	const where = and(gte(calendarEvent.date, monthStart), lt(calendarEvent.date, monthEnd));

	const rows = await db
		.select(eventSelectFields)
		.from(calendarEvent)
		.innerJoin(userTable, eq(calendarEvent.createdByUserId, userTable.id))
		.where(where)
		.orderBy(asc(calendarEvent.date));

	return {
		items: rows as unknown as CalendarEvent[],
		total: rows.length,
		page: 1,
		limit: rows.length
	};
}

/**
 * イベントを新規作成する。
 */
export async function createEvent(
	db: Db,
	userId: string,
	data: EventCreate
): Promise<CalendarEvent> {
	const id = crypto.randomUUID();
	const now = new Date();

	await db.insert(calendarEvent).values({
		id,
		title: data.title,
		description: data.description ?? null,
		date: data.date,
		createdByUserId: userId,
		createdAt: now,
		updatedAt: now
	});

	return fetchEvent(db, id);
}

/**
 * イベントを更新する。
 * @throws {NOT_FOUND} - 対象 ID が存在しない場合
 * @throws {FORBIDDEN} - 作成者以外が更新しようとした場合
 */
export async function updateEvent(
	db: Db,
	userId: string,
	id: string,
	data: EventUpdate
): Promise<CalendarEvent> {
	const existing = await db.select().from(calendarEvent).where(eq(calendarEvent.id, id)).get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');
	if (existing.createdByUserId !== userId)
		throw new AppError('FORBIDDEN', 403, '作成者以外はこの予定を操作できません');

	await db
		.update(calendarEvent)
		.set({
			title: data.title,
			description:
				data.description !== undefined ? (data.description ?? null) : existing.description,
			date: data.date,
			updatedAt: new Date()
		})
		.where(eq(calendarEvent.id, id));

	return fetchEvent(db, id);
}

/**
 * イベントを削除する。
 * @throws {NOT_FOUND} - 対象 ID が存在しない場合
 * @throws {FORBIDDEN} - 作成者以外が削除しようとした場合
 */
export async function deleteEvent(db: Db, userId: string, id: string): Promise<void> {
	const existing = await db.select().from(calendarEvent).where(eq(calendarEvent.id, id)).get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');
	if (existing.createdByUserId !== userId)
		throw new AppError('FORBIDDEN', 403, '作成者以外はこの予定を操作できません');

	await db.delete(calendarEvent).where(eq(calendarEvent.id, id));
}
