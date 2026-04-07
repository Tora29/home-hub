/**
 * @file テスト: 日付ユーティリティ
 * @module src/lib/utils/date.test.ts
 * @testType unit
 *
 * @target ./date.ts
 */
import { describe, test, expect } from 'vitest';
import { generateMonthOptions } from './date';

describe('generateMonthOptions', () => {
	test('デフォルトで 13 件返す', () => {
		const options = generateMonthOptions();
		expect(options).toHaveLength(13);
	});

	test('count を指定した分だけ返す', () => {
		expect(generateMonthOptions(3)).toHaveLength(3);
		expect(generateMonthOptions(6)).toHaveLength(6);
	});

	test('先頭が当月、末尾が 12 ヶ月前', () => {
		const now = new Date();
		const options = generateMonthOptions(13);

		const currentYear = now.getFullYear();
		const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
		expect(options[0].value).toBe(`${currentYear}-${currentMonth}`);

		const past = new Date(now.getFullYear(), now.getMonth() - 12, 1);
		const pastYear = past.getFullYear();
		const pastMonth = String(past.getMonth() + 1).padStart(2, '0');
		expect(options[12].value).toBe(`${pastYear}-${pastMonth}`);
	});

	test('value は YYYY-MM 形式', () => {
		const options = generateMonthOptions(3);
		for (const opt of options) {
			expect(opt.value).toMatch(/^\d{4}-\d{2}$/);
		}
	});

	test('label は YYYY年M月 形式', () => {
		const options = generateMonthOptions(1);
		expect(options[0].label).toMatch(/^\d{4}年\d{1,2}月$/);
	});
});
