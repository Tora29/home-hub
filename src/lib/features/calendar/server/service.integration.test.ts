/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: カレンダーサービス
 * @module src/lib/features/calendar/server/service.integration.test.ts
 * @testType integration
 *
 * @target ./service.ts
 */
import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import { user as userTable } from '$lib/server/tables';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from '$lib/server/tables';
import { getEvents, createEvent, updateEvent, deleteEvent } from './service';

type Db = DrizzleD1Database<typeof schema>;

async function insertUser(db: Db): Promise<string> {
	const id = crypto.randomUUID();
	await db.insert(userTable).values({
		id,
		name: 'テストユーザー',
		email: `${id}@test.example`,
		emailVerified: false,
		createdAt: new Date(),
		updatedAt: new Date()
	});
	return id;
}

describe('getEvents', () => {
	test('指定月のイベント一覧を取得できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const created = await createEvent(db, userId, { title: '7月の予定', date: '2026-07-15' });

		const result = await getEvents(db, '2026-07');
		const found = result.items.find((i) => i.id === created.id);

		expect(found?.title).toBe('7月の予定');
		expect(found?.createdByName).toBe('テストユーザー');
	});

	test('別月のイベントは取得されない', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const created = await createEvent(db, userId, { title: '8月の予定', date: '2026-08-01' });

		const result = await getEvents(db, '2026-07');

		expect(result.items.some((i) => i.id === created.id)).toBe(false);
	});
});

describe('createEvent', () => {
	test('正しいデータでイベントを作成できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		const created = await createEvent(db, userId, {
			title: '新規予定',
			description: '概要テキスト',
			date: '2026-07-11'
		});

		expect(created.title).toBe('新規予定');
		expect(created.description).toBe('概要テキスト');
		expect(created.createdByUserId).toBe(userId);
	});
});

describe('updateEvent', () => {
	test('作成者がイベントを更新できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const created = await createEvent(db, userId, { title: '更新前', date: '2026-07-11' });

		const updated = await updateEvent(db, userId, created.id, {
			title: '更新後',
			date: '2026-07-12'
		});

		expect(updated.title).toBe('更新後');
		expect(updated.date).toBe('2026-07-12');
	});

	test('作成者以外がイベントを更新しようとすると FORBIDDEN が返る', async () => {
		const db = createDb(env.DB);
		const ownerUserId = await insertUser(db);
		const otherUserId = await insertUser(db);
		const created = await createEvent(db, ownerUserId, { title: '予定', date: '2026-07-11' });

		await expect(
			updateEvent(db, otherUserId, created.id, { title: '改変', date: '2026-07-11' })
		).rejects.toMatchObject({ code: 'FORBIDDEN' });
	});

	test('存在しない ID を更新しようとすると NOT_FOUND が返る', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		await expect(
			updateEvent(db, userId, 'non-existent-id', { title: '予定', date: '2026-07-11' })
		).rejects.toMatchObject({ code: 'NOT_FOUND' });
	});
});

describe('deleteEvent', () => {
	test('作成者がイベントを削除できる', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);
		const created = await createEvent(db, userId, { title: '予定', date: '2026-07-11' });

		await deleteEvent(db, userId, created.id);

		const result = await getEvents(db, '2026-07');
		expect(result.items.some((i) => i.id === created.id)).toBe(false);
	});

	test('作成者以外がイベントを削除しようとすると FORBIDDEN が返る', async () => {
		const db = createDb(env.DB);
		const ownerUserId = await insertUser(db);
		const otherUserId = await insertUser(db);
		const created = await createEvent(db, ownerUserId, { title: '予定', date: '2026-07-11' });

		await expect(deleteEvent(db, otherUserId, created.id)).rejects.toMatchObject({
			code: 'FORBIDDEN'
		});
	});

	test('存在しない ID を削除しようとすると NOT_FOUND が返る', async () => {
		const db = createDb(env.DB);
		const userId = await insertUser(db);

		await expect(deleteEvent(db, userId, 'non-existent-id')).rejects.toMatchObject({
			code: 'NOT_FOUND'
		});
	});
});
