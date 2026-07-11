/**
 * @file テスト: カレンダースキーマ
 * @module src/lib/features/calendar/schema.test.ts
 * @testType unit
 *
 * @target ./schema.ts
 */
import { describe, test, expect } from 'vitest';
import { eventCreateSchema, calendarQuerySchema } from './schema';

describe('eventCreateSchema', () => {
	const validData = { title: 'テスト予定', date: '2026-07-11' };

	test('正しいデータでイベントを作成できる', () => {
		const result = eventCreateSchema.safeParse(validData);
		expect(result.success).toBe(true);
	});

	test('タイトルが空の場合、VALIDATION_ERROR「タイトルは必須です」が返る', () => {
		const result = eventCreateSchema.safeParse({ ...validData, title: '' });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('タイトルは必須です');
	});

	test('タイトルが100文字の場合、登録できる', () => {
		const result = eventCreateSchema.safeParse({ ...validData, title: 'あ'.repeat(100) });
		expect(result.success).toBe(true);
	});

	test('タイトルが101文字の場合、VALIDATION_ERROR が返る', () => {
		const result = eventCreateSchema.safeParse({ ...validData, title: 'あ'.repeat(101) });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('100文字以内で入力してください');
	});

	test('概要が500文字の場合、登録できる', () => {
		const result = eventCreateSchema.safeParse({ ...validData, description: 'あ'.repeat(500) });
		expect(result.success).toBe(true);
	});

	test('概要が501文字の場合、VALIDATION_ERROR が返る', () => {
		const result = eventCreateSchema.safeParse({ ...validData, description: 'あ'.repeat(501) });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('500文字以内で入力してください');
	});

	test('概要が未指定の場合、登録できる', () => {
		const result = eventCreateSchema.safeParse(validData);
		expect(result.success).toBe(true);
	});

	test('概要が null の場合、登録できる', () => {
		const result = eventCreateSchema.safeParse({ ...validData, description: null });
		expect(result.success).toBe(true);
	});

	test('日付の形式が YYYY-MM-DD 以外の場合、VALIDATION_ERROR が返る', () => {
		const result = eventCreateSchema.safeParse({ ...validData, date: '2026/07/11' });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('日付の形式が正しくありません');
	});

	test('日付が未入力の場合、VALIDATION_ERROR が返る', () => {
		const result = eventCreateSchema.safeParse({ title: 'テスト予定' });
		expect(result.success).toBe(false);
	});
});

describe('calendarQuerySchema', () => {
	test('パラメータなしでパースできる', () => {
		const result = calendarQuerySchema.safeParse({});
		expect(result.success).toBe(true);
		expect(result.data?.month).toBeUndefined();
	});

	test('正しい月形式（YYYY-MM）でパースできる', () => {
		const result = calendarQuerySchema.safeParse({ month: '2026-07' });
		expect(result.success).toBe(true);
		expect(result.data?.month).toBe('2026-07');
	});

	test('月の形式が YYYY-MM でない場合、VALIDATION_ERROR が返る', () => {
		const result = calendarQuerySchema.safeParse({ month: '2026/07' });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('月の形式は YYYY-MM です');
	});
});
