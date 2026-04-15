/**
 * @file テスト: Dashboard スキーマ
 * @module src/routes/dashboard/_lib/schema.test.ts
 * @testType unit
 *
 * @target ./schema.ts
 * @spec specs/dashboard/spec.md
 * @covers AC-101, AC-102
 */

import { describe, test, expect } from 'vitest';
import { dashboardSummaryQuerySchema } from './schema';

describe('dashboardSummaryQuerySchema', () => {
	describe('正常系', () => {
		test('[SPEC: AC-001] デフォルト値で parse できる（period=month）', () => {
			const result = dashboardSummaryQuerySchema.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.period).toBe('month');
			}
		});

		test('[SPEC: AC-001] period=all で month 省略の場合、parse できる', () => {
			const result = dashboardSummaryQuerySchema.safeParse({ period: 'all' });
			expect(result.success).toBe(true);
		});

		test('[SPEC: AC-001] month が 01〜12 の場合、parse できる', () => {
			const result = dashboardSummaryQuerySchema.safeParse({ period: 'month', month: '2026-04' });
			expect(result.success).toBe(true);
		});

		test('[SPEC: AC-001] month が 12 月の場合、parse できる', () => {
			const result = dashboardSummaryQuerySchema.safeParse({ period: 'month', month: '2026-12' });
			expect(result.success).toBe(true);
		});

		test('[SPEC: AC-001] month が 01 月の場合、parse できる', () => {
			const result = dashboardSummaryQuerySchema.safeParse({ period: 'month', month: '2026-01' });
			expect(result.success).toBe(true);
		});
	});

	describe('異常系', () => {
		test('[SPEC: AC-101] period が month・all 以外の場合、バリデーションエラーになる', () => {
			const result = dashboardSummaryQuerySchema.safeParse({ period: 'week' });
			expect(result.success).toBe(false);
		});

		test('[SPEC: AC-102] month が 2026-13 の場合、バリデーションエラーになる', () => {
			const result = dashboardSummaryQuerySchema.safeParse({ period: 'month', month: '2026-13' });
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe('月は01〜12で入力してください');
			}
		});

		test('[SPEC: AC-102] month が 2026-00 の場合、バリデーションエラーになる', () => {
			const result = dashboardSummaryQuerySchema.safeParse({ period: 'month', month: '2026-00' });
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe('月は01〜12で入力してください');
			}
		});

		test('[SPEC: AC-102] month が YYYY-MM 形式でない場合、バリデーションエラーになる', () => {
			const result = dashboardSummaryQuerySchema.safeParse({ period: 'month', month: '2026/04' });
			expect(result.success).toBe(false);
		});
	});
});
