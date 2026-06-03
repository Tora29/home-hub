/**
 * @file テスト: ダッシュボードスキーマ
 * @module src/routes/dashboard/schema.test.ts
 * @testType unit
 *
 * @target ./schema.ts
 */
import { describe, test, expect } from 'vitest';
import { dashboardSummaryQuerySchema } from './schema';

describe('dashboardSummaryQuerySchema', () => {
	test('パラメータなしでデフォルト（period=month）を適用できる', () => {
		const result = dashboardSummaryQuerySchema.safeParse({});
		expect(result.success).toBe(true);
		expect(result.data?.period).toBe('month');
		expect(result.data?.month).toBeUndefined();
	});

	test('period=all でパースできる', () => {
		const result = dashboardSummaryQuerySchema.safeParse({ period: 'all' });
		expect(result.success).toBe(true);
		expect(result.data?.period).toBe('all');
	});

	test('period=month でパースできる', () => {
		const result = dashboardSummaryQuerySchema.safeParse({ period: 'month' });
		expect(result.success).toBe(true);
	});

	test('period が無効値の場合、エラーが返る', () => {
		const result = dashboardSummaryQuerySchema.safeParse({ period: 'week' });
		expect(result.success).toBe(false);
	});

	test('month が YYYY-MM 形式の場合、パースできる', () => {
		const result = dashboardSummaryQuerySchema.safeParse({ period: 'month', month: '2024-06' });
		expect(result.success).toBe(true);
		expect(result.data?.month).toBe('2024-06');
	});

	test('month の形式が YYYY-MM でない場合、エラーが返る', () => {
		const result = dashboardSummaryQuerySchema.safeParse({ period: 'month', month: '2024/06' });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('月はYYYY-MM形式で入力してください');
	});

	test('month の月が00の場合、エラーが返る', () => {
		const result = dashboardSummaryQuerySchema.safeParse({ period: 'month', month: '2024-00' });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('月は01〜12で入力してください');
	});

	test('month の月が13の場合、エラーが返る', () => {
		const result = dashboardSummaryQuerySchema.safeParse({ period: 'month', month: '2024-13' });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('月は01〜12で入力してください');
	});

	test('month が未指定の場合（期間フィルタなし）、パースできる', () => {
		const result = dashboardSummaryQuerySchema.safeParse({ period: 'month' });
		expect(result.success).toBe(true);
		expect(result.data?.month).toBeUndefined();
	});
});
