/**
 * @file データ取得: カレンダー
 * @module src/routes/calendar/+page.server.ts
 * @feature calendar
 *
 * @description
 * カレンダー画面の初期データをサーバーサイドで取得する。
 * 不正な month パラメータは /calendar にリダイレクトする。
 */
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { calendarQuerySchema } from '$calendar/schema';
import { getEvents } from '$calendar/server/service';

export const load: PageServerLoad = async ({ platform, locals, url }) => {
	const db = createDb(platform!.env.DB);

	const rawMonth = url.searchParams.get('month');
	const parsed = calendarQuerySchema.safeParse({ month: rawMonth ?? undefined });
	if (!parsed.success) {
		redirect(302, '/calendar');
	}

	const now = new Date();
	const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	const selectedMonth = parsed.data.month ?? currentMonth;

	const { items: events } = await getEvents(db, selectedMonth);

	return {
		events,
		currentMonth,
		selectedMonth,
		currentUserId: locals.user!.id
	};
};
