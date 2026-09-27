/**
 * @file テスト: 日付ユーティリティ
 * @module src/lib/utils/date.test.ts
 * @testType unit
 *
 * @target ./date.ts
 */
import { describe, test, expect } from 'vitest';
import {
	addMonths,
	formatMonthDay,
	formatYearMonth,
	generateMonthOptions,
	getCurrentMonth,
	getMonthRange,
	getTodayDate
} from './date';

// 2026-10-01 08:00 JST（= 2026-09-30 23:00 UTC）。UTC 基準だと前月・前日になる時刻
const JST_EARLY_MORNING = new Date('2026-09-30T23:00:00Z');

describe('getCurrentMonth', () => {
	test('JST の月初早朝（UTC では前月）の場合、JST の当月を取得できる', () => {
		expect(getCurrentMonth(JST_EARLY_MORNING)).toBe('2026-10');
	});

	test('JST の月末 23:59:59 の場合、当月を取得できる', () => {
		expect(getCurrentMonth(new Date('2026-10-31T14:59:59Z'))).toBe('2026-10');
	});

	test('JST の翌月 0:00 の場合、翌月を取得できる', () => {
		expect(getCurrentMonth(new Date('2026-10-31T15:00:00Z'))).toBe('2026-11');
	});
});

describe('formatYearMonth', () => {
	test('JST の月初早朝（UTC では前月）の場合、JST の YYYY-MM に整形できる', () => {
		expect(formatYearMonth(JST_EARLY_MORNING)).toBe('2026-10');
	});
});

describe('getTodayDate', () => {
	test('JST の月初早朝（UTC では前日）の場合、JST の今日を YYYY-MM-DD で取得できる', () => {
		expect(getTodayDate(JST_EARLY_MORNING)).toBe('2026-10-01');
	});
});

describe('formatMonthDay', () => {
	test('JST の月初早朝（UTC では前日）の場合、JST の M/D に整形できる', () => {
		expect(formatMonthDay(JST_EARLY_MORNING)).toBe('10/1');
	});
});

describe('addMonths', () => {
	test('12 月に 1 か月加算する場合、翌年 1 月を取得できる', () => {
		expect(addMonths('2026-12', 1)).toBe('2027-01');
	});

	test('1 月から 1 か月減算する場合、前年 12 月を取得できる', () => {
		expect(addMonths('2026-01', -1)).toBe('2025-12');
	});

	test('13 か月減算する場合、前年の前月を取得できる', () => {
		expect(addMonths('2026-10', -13)).toBe('2025-09');
	});
});

describe('getMonthRange', () => {
	test('JST の月初 0 時〜翌月初 0 時（exclusive）の範囲を取得できる', () => {
		const { start, end } = getMonthRange('2026-10');
		expect(start.toISOString()).toBe('2026-09-30T15:00:00.000Z');
		expect(end.toISOString()).toBe('2026-10-31T15:00:00.000Z');
	});

	test('JST の月初早朝に登録した支出の場合、当月の範囲に含まれる', () => {
		const { start, end } = getMonthRange('2026-10');
		expect(JST_EARLY_MORNING >= start && JST_EARLY_MORNING < end).toBe(true);
	});

	test('12 月の場合、翌年 1 月初（JST）で終わる範囲を取得できる', () => {
		expect(getMonthRange('2026-12').end.toISOString()).toBe('2026-12-31T15:00:00.000Z');
	});
});

describe('generateMonthOptions', () => {
	test('起点月から過去 13 か月分の月選択肢を新しい順に取得できる', () => {
		const options = generateMonthOptions('2026-01');
		expect(options).toHaveLength(13);
		expect(options[0]).toEqual({ value: '2026-01', label: '2026年01月' });
		expect(options[1].value).toBe('2025-12');
		expect(options[12].value).toBe('2025-01');
	});
});
