/**
 * @file テスト: Expense スキーマ
 * @module src/routes/expenses/schema.test.ts
 * @testType unit
 *
 * @target ./schema.ts
 * @spec specs/expenses/spec.md
 * @covers AC-101, AC-102, AC-103, AC-104, AC-105, AC-115, AC-121, AC-201, AC-202
 */

import { describe, test, expect } from 'vitest';
import { expenseCreateSchema, expenseUpdateSchema, expenseQuerySchema } from './schema';

describe('expenseCreateSchema', () => {
	describe('正常系', () => {
		test('[SPEC: AC-201] 金額が1の場合、登録できる', () => {
			const result = expenseCreateSchema.safeParse({
				amount: 1,
				categoryId: 'cat-1',
				payerId: 'payer-1'
			});
			expect(result.success).toBe(true);
		});

		test('[SPEC: AC-202] 金額が9,999,999の場合、登録できる', () => {
			const result = expenseCreateSchema.safeParse({
				amount: 9999999,
				categoryId: 'cat-1',
				payerId: 'payer-1'
			});
			expect(result.success).toBe(true);
		});

		test('[SPEC: AC-201] 金額とカテゴリIDと支払者IDが揃っている場合、登録できる', () => {
			const result = expenseCreateSchema.safeParse({
				amount: 5000,
				categoryId: 'cat-abc',
				payerId: 'payer-1'
			});
			expect(result.success).toBe(true);
		});
	});

	describe('異常系', () => {
		test('[SPEC: AC-101] 金額が未入力の場合、「金額は必須です」エラーになる', () => {
			const result = expenseCreateSchema.safeParse({ categoryId: 'cat-1' });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('amount'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('金額は必須です');
			}
		});

		test('[SPEC: AC-102] 金額が0の場合、「1円以上の金額を入力してください」エラーになる', () => {
			const result = expenseCreateSchema.safeParse({ amount: 0, categoryId: 'cat-1' });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('amount'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('1円以上の金額を入力してください');
			}
		});

		test('[SPEC: AC-102] 金額が負の場合、バリデーションエラーになる', () => {
			const result = expenseCreateSchema.safeParse({ amount: -1, categoryId: 'cat-1' });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('amount'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('1円以上の金額を入力してください');
			}
		});

		test('[SPEC: AC-103] 金額が9,999,999を超える場合、「9,999,999円以下の金額を入力してください」エラーになる', () => {
			const result = expenseCreateSchema.safeParse({ amount: 10000000, categoryId: 'cat-1' });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('amount'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('9,999,999円以下の金額を入力してください');
			}
		});

		test('[SPEC: AC-104] 金額が小数の場合、バリデーションエラーになる', () => {
			const result = expenseCreateSchema.safeParse({ amount: 100.5, categoryId: 'cat-1' });
			expect(result.success).toBe(false);
		});

		test('[SPEC: AC-104] 金額が文字列の場合、バリデーションエラーになる', () => {
			const result = expenseCreateSchema.safeParse({ amount: '百円', categoryId: 'cat-1' });
			expect(result.success).toBe(false);
		});

		test('[SPEC: AC-105] カテゴリIDが未指定の場合、「カテゴリは必須です」エラーになる', () => {
			const result = expenseCreateSchema.safeParse({ amount: 1000 });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('categoryId'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('カテゴリは必須です');
			}
		});

		test('[SPEC: AC-105] カテゴリIDが空文字の場合、「カテゴリは必須です」エラーになる', () => {
			const result = expenseCreateSchema.safeParse({ amount: 1000, categoryId: '' });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('categoryId'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('カテゴリは必須です');
			}
		});

		test('[SPEC: AC-115] 支払者IDが未指定の場合、「支払者は必須です」エラーになる', () => {
			const result = expenseCreateSchema.safeParse({ amount: 1000, categoryId: 'cat-1' });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('payerId'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('支払者は必須です');
			}
		});

		test('[SPEC: AC-115] 支払者IDが空文字の場合、「支払者は必須です」エラーになる', () => {
			const result = expenseCreateSchema.safeParse({
				amount: 1000,
				categoryId: 'cat-1',
				payerId: ''
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('payerId'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('支払者は必須です');
			}
		});
	});
});

// expenseUpdateSchema === expenseCreateSchema（承認は /approve・/unapprove で操作）
describe('expenseUpdateSchema', () => {
	describe('正常系', () => {
		test('[SPEC: AC-201] 金額が1の場合、更新できる', () => {
			const result = expenseUpdateSchema.safeParse({
				amount: 1,
				categoryId: 'cat-1',
				payerId: 'payer-1'
			});
			expect(result.success).toBe(true);
		});

		test('[SPEC: AC-202] 金額が9,999,999の場合、更新できる', () => {
			const result = expenseUpdateSchema.safeParse({
				amount: 9999999,
				categoryId: 'cat-1',
				payerId: 'payer-1'
			});
			expect(result.success).toBe(true);
		});
	});

	describe('異常系', () => {
		test('[SPEC: AC-101] 金額が未入力の場合、バリデーションエラーになる', () => {
			const result = expenseUpdateSchema.safeParse({ categoryId: 'cat-1', payerId: 'payer-1' });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('amount'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('金額は必須です');
			}
		});

		test('[SPEC: AC-102] 金額が0の場合、バリデーションエラーになる', () => {
			const result = expenseUpdateSchema.safeParse({
				amount: 0,
				categoryId: 'cat-1',
				payerId: 'payer-1'
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('amount'));
				expect(issue?.message).toBe('1円以上の金額を入力してください');
			}
		});

		test('[SPEC: AC-103] 金額が9,999,999を超える場合、バリデーションエラーになる', () => {
			const result = expenseUpdateSchema.safeParse({
				amount: 10000000,
				categoryId: 'cat-1',
				payerId: 'payer-1'
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('amount'));
				expect(issue?.message).toBe('9,999,999円以下の金額を入力してください');
			}
		});

		test('[SPEC: AC-104] 金額が小数の場合、バリデーションエラーになる', () => {
			const result = expenseUpdateSchema.safeParse({
				amount: 100.5,
				categoryId: 'cat-1',
				payerId: 'payer-1'
			});
			expect(result.success).toBe(false);
		});

		test('[SPEC: AC-105] カテゴリIDが未指定の場合、バリデーションエラーになる', () => {
			const result = expenseUpdateSchema.safeParse({ amount: 1000, payerId: 'payer-1' });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('categoryId'));
				expect(issue?.message).toBe('カテゴリは必須です');
			}
		});

		test('[SPEC: AC-115] 支払者IDが未指定の場合、バリデーションエラーになる', () => {
			const result = expenseUpdateSchema.safeParse({ amount: 1000, categoryId: 'cat-1' });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('payerId'));
				expect(issue?.message).toBe('支払者は必須です');
			}
		});
	});
});

describe('expenseQuerySchema', () => {
	describe('正常系', () => {
		test('[SPEC: AC-001] month が省略された場合、parse できる', () => {
			const result = expenseQuerySchema.safeParse({});
			expect(result.success).toBe(true);
		});

		test('[SPEC: AC-001] month が YYYY-MM 形式かつ 01〜12 の場合、parse できる', () => {
			const result = expenseQuerySchema.safeParse({ month: '2026-04' });
			expect(result.success).toBe(true);
		});

		test('[SPEC: AC-001] month が 12 月の場合、parse できる', () => {
			const result = expenseQuerySchema.safeParse({ month: '2026-12' });
			expect(result.success).toBe(true);
		});

		test('[SPEC: AC-001] month が 01 月の場合、parse できる', () => {
			const result = expenseQuerySchema.safeParse({ month: '2026-01' });
			expect(result.success).toBe(true);
		});
	});

	describe('異常系', () => {
		test('[SPEC: AC-121] month が 2026-13 の場合、バリデーションエラーになる', () => {
			const result = expenseQuerySchema.safeParse({ month: '2026-13' });
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe('月は01〜12で入力してください');
			}
		});

		test('[SPEC: AC-121] month が 2026-00 の場合、バリデーションエラーになる', () => {
			const result = expenseQuerySchema.safeParse({ month: '2026-00' });
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe('月は01〜12で入力してください');
			}
		});

		test('[SPEC: AC-121] month が YYYY-MM 形式でない場合、バリデーションエラーになる', () => {
			const result = expenseQuerySchema.safeParse({ month: '2026/04' });
			expect(result.success).toBe(false);
		});
	});
});
