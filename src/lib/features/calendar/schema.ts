/**
 * @file スキーマ: CalendarEvent
 * @module src/lib/features/calendar/schema.ts
 * @feature calendar
 *
 * @description
 * カレンダー予定機能の Zod バリデーションスキーマ。FE/BE 共通で使用する。
 *
 * @schemas
 * - eventCreateSchema     - イベント作成用入力
 * - eventUpdateSchema     - イベント更新用入力
 * - calendarQuerySchema   - 月別イベント一覧クエリ入力
 *
 * @types
 * - EventCreate    - イベント作成用入力型
 * - EventUpdate    - イベント更新用入力型
 * - CalendarQuery  - 月別イベント一覧クエリ入力型
 */
import { z } from 'zod';

export const eventCreateSchema = z.object({
	title: z.string().min(1, 'タイトルは必須です').max(100, '100文字以内で入力してください'),
	description: z.string().max(500, '500文字以内で入力してください').nullish(),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません')
});

// PUT のため作成・更新は同一スキーマ
export const eventUpdateSchema = eventCreateSchema;

export const calendarQuerySchema = z.object({
	month: z
		.string()
		.regex(/^\d{4}-\d{2}$/, '月の形式は YYYY-MM です')
		.optional()
});

export type EventCreate = z.infer<typeof eventCreateSchema>;
export type EventUpdate = z.infer<typeof eventUpdateSchema>;
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
