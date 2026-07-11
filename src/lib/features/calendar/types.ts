/**
 * @file 型定義: CalendarEvent 共有型
 * @module src/lib/features/calendar/types.ts
 * @feature calendar
 *
 * @description
 * カレンダー機能で service・API・コンポーネント間で共有する型定義。
 * サーバー依存なしの純粋な型ファイル。
 */

export type CalendarEvent = {
	id: string;
	title: string;
	description: string | null;
	date: string; // YYYY-MM-DD
	createdByUserId: string;
	createdByName: string;
	createdAt: string;
	updatedAt: string;
};

export type CalendarDay = {
	date: string; // YYYY-MM-DD
	isCurrentMonth: boolean;
	isToday: boolean;
	events: CalendarEvent[];
};
