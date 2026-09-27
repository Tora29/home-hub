/**
 * @file テスト: ダッシュボードスキーマ
 * @module src/lib/features/dashboard/schema.test.ts
 * @testType unit
 *
 * @target ./schema.ts
 */
import { describe, test, expect } from 'vitest';
import { dashboardSummaryQuerySchema } from './schema';

describe('dashboardSummaryQuerySchema', () => {
	test('パラメータ未指定の場合、当月の月別集計（period=month・month 省略）として取得できる', () => {
		const result = dashboardSummaryQuerySchema.safeParse({});
		expect(result.success).toBe(true);
		expect(result.data?.period).toBe('month');
		expect(result.data?.month).toBeUndefined();
	});

	test('period=all で全期間集計を指定できる', () => {
		const result = dashboardSummaryQuerySchema.safeParse({ period: 'all' });
		expect(result.success).toBe(true);
		expect(result.data?.period).toBe('all');
	});

	test('period=month と YYYY-MM 形式の month で指定月の集計を指定できる', () => {
		const result = dashboardSummaryQuerySchema.safeParse({ period: 'month', month: '2024-06' });
		expect(result.success).toBe(true);
		expect(result.data?.month).toBe('2024-06');
	});

	test('period が month / all 以外の場合、VALIDATION_ERROR「期間は month または all を指定してください」が返る', () => {
		const result = dashboardSummaryQuerySchema.safeParse({ period: 'week' });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('期間は month または all を指定してください');
	});

	test('month が YYYY-MM 形式でない場合、VALIDATION_ERROR「月はYYYY-MM形式で入力してください」が返る', () => {
		const result = dashboardSummaryQuerySchema.safeParse({ period: 'month', month: '2024/06' });
		expect(result.success).toBe(false);
		expect(result.error?.issues.map((i) => i.message)).toEqual([
			'月はYYYY-MM形式で入力してください'
		]);
	});

	test('month が 01 月の場合、指定できる', () => {
		const result = dashboardSummaryQuerySchema.safeParse({ period: 'month', month: '2024-01' });
		expect(result.success).toBe(true);
	});

	test('month が 12 月の場合、指定できる', () => {
		const result = dashboardSummaryQuerySchema.safeParse({ period: 'month', month: '2024-12' });
		expect(result.success).toBe(true);
	});

	test('month が 00 月の場合、VALIDATION_ERROR「月は01〜12で入力してください」が返る', () => {
		const result = dashboardSummaryQuerySchema.safeParse({ period: 'month', month: '2024-00' });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('月は01〜12で入力してください');
	});

	test('month が 13 月の場合、VALIDATION_ERROR「月は01〜12で入力してください」が返る', () => {
		const result = dashboardSummaryQuerySchema.safeParse({ period: 'month', month: '2024-13' });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('月は01〜12で入力してください');
	});
});
