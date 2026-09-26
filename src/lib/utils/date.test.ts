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

describe('getCurrentMonth / formatYearMonth', () => {
	test('JST の月初早朝は UTC では前月でも JST の当月を返す', () => {
		expect(getCurrentMonth(JST_EARLY_MORNING)).toBe('2026-10');
		expect(formatYearMonth(JST_EARLY_MORNING)).toBe('2026-10');
	});

	test('JST の月末深夜は翌月にならない', () => {
		expect(getCurrentMonth(new Date('2026-10-31T14:59:59Z'))).toBe('2026-10');
		expect(getCurrentMonth(new Date('2026-10-31T15:00:00Z'))).toBe('2026-11');
	});
});

describe('getTodayDate / formatMonthDay', () => {
	test('JST の日付を返す', () => {
		expect(getTodayDate(JST_EARLY_MORNING)).toBe('2026-10-01');
		expect(formatMonthDay(JST_EARLY_MORNING)).toBe('10/1');
	});
});

describe('addMonths', () => {
	test('年をまたいで加算・減算できる', () => {
		expect(addMonths('2026-12', 1)).toBe('2027-01');
		expect(addMonths('2026-01', -1)).toBe('2025-12');
		expect(addMonths('2026-10', -13)).toBe('2025-09');
	});
});

describe('getMonthRange', () => {
	test('JST の月初 0 時〜翌月初 0 時を返す', () => {
		const { start, end } = getMonthRange('2026-10');
		expect(start.toISOString()).toBe('2026-09-30T15:00:00.000Z');
		expect(end.toISOString()).toBe('2026-10-31T15:00:00.000Z');
	});

	test('JST の月初早朝に登録した支出が当月の範囲に含まれる', () => {
		const { start, end } = getMonthRange('2026-10');
		expect(JST_EARLY_MORNING >= start && JST_EARLY_MORNING < end).toBe(true);
	});

	test('12 月の範囲は翌年 1 月初で終わる', () => {
		expect(getMonthRange('2026-12').end.toISOString()).toBe('2026-12-31T15:00:00.000Z');
	});
});

describe('generateMonthOptions', () => {
	test('起点月から過去 13 か月分を新しい順に返す', () => {
		const options = generateMonthOptions('2026-01');
		expect(options).toHaveLength(13);
		expect(options[0]).toEqual({ value: '2026-01', label: '2026年01月' });
		expect(options[1].value).toBe('2025-12');
		expect(options[12].value).toBe('2025-01');
	});
});
