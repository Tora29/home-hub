/**
 * @file テスト: Expense スキーマ
 * @module src/routes/expense/schema.test.ts
 * @testType unit
 *
 * @target ./schema.ts
 * @spec specs/expenses/spec.md
 * @covers AC-101, AC-102, AC-103, AC-104, AC-105, AC-201, AC-202
 */

import { describe, it, expect } from 'vitest';
import { expenseCreateSchema, expenseUpdateSchema } from './schema';

describe('expenseCreateSchema', () => {
	describe('正常系', () => {
		it('[SPEC: AC-201] 金額が1の場合、登録できる', () => {
			const result = expenseCreateSchema.safeParse({ amount: 1, categoryId: 'cat-1' });
			expect(result.success).toBe(true);
		});

		it('[SPEC: AC-202] 金額が9,999,999の場合、登録できる', () => {
			const result = expenseCreateSchema.safeParse({ amount: 9999999, categoryId: 'cat-1' });
			expect(result.success).toBe(true);
		});

		it('金額とカテゴリIDが揃っている場合、登録できる', () => {
			const result = expenseCreateSchema.safeParse({ amount: 5000, categoryId: 'cat-abc' });
			expect(result.success).toBe(true);
		});
	});

	describe('異常系', () => {
		it('[SPEC: AC-101] 金額が未入力の場合、「金額は必須です」エラーになる', () => {
			const result = expenseCreateSchema.safeParse({ categoryId: 'cat-1' });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('amount'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('金額は必須です');
			}
		});

		it('[SPEC: AC-102] 金額が0の場合、「1円以上の金額を入力してください」エラーになる', () => {
			const result = expenseCreateSchema.safeParse({ amount: 0, categoryId: 'cat-1' });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('amount'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('1円以上の金額を入力してください');
			}
		});

		it('[SPEC: AC-102] 金額が負の場合、バリデーションエラーになる', () => {
			const result = expenseCreateSchema.safeParse({ amount: -1, categoryId: 'cat-1' });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('amount'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('1円以上の金額を入力してください');
			}
		});

		it('[SPEC: AC-103] 金額が9,999,999を超える場合、「9,999,999円以下の金額を入力してください」エラーになる', () => {
			const result = expenseCreateSchema.safeParse({ amount: 10000000, categoryId: 'cat-1' });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('amount'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('9,999,999円以下の金額を入力してください');
			}
		});

		it('[SPEC: AC-104] 金額が小数の場合、バリデーションエラーになる', () => {
			const result = expenseCreateSchema.safeParse({ amount: 100.5, categoryId: 'cat-1' });
			expect(result.success).toBe(false);
		});

		it('[SPEC: AC-104] 金額が文字列の場合、バリデーションエラーになる', () => {
			const result = expenseCreateSchema.safeParse({ amount: '百円', categoryId: 'cat-1' });
			expect(result.success).toBe(false);
		});

		it('[SPEC: AC-105] カテゴリIDが未指定の場合、「カテゴリは必須です」エラーになる', () => {
			const result = expenseCreateSchema.safeParse({ amount: 1000 });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('categoryId'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('カテゴリは必須です');
			}
		});

		it('[SPEC: AC-105] カテゴリIDが空文字の場合、「カテゴリは必須です」エラーになる', () => {
			const result = expenseCreateSchema.safeParse({ amount: 1000, categoryId: '' });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('categoryId'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('カテゴリは必須です');
			}
		});
	});
});

describe('expenseUpdateSchema', () => {
	describe('正常系', () => {
		it('[SPEC: AC-201] 金額が1の場合、更新できる', () => {
			const result = expenseUpdateSchema.safeParse({
				amount: 1,
				categoryId: 'cat-1',
				approved: false
			});
			expect(result.success).toBe(true);
		});

		it('[SPEC: AC-202] 金額が9,999,999の場合、更新できる', () => {
			const result = expenseUpdateSchema.safeParse({
				amount: 9999999,
				categoryId: 'cat-1',
				approved: true
			});
			expect(result.success).toBe(true);
		});

		it('approved が true の場合、更新できる', () => {
			const result = expenseUpdateSchema.safeParse({
				amount: 500,
				categoryId: 'cat-1',
				approved: true
			});
			expect(result.success).toBe(true);
		});

		it('approved が false の場合、更新できる', () => {
			const result = expenseUpdateSchema.safeParse({
				amount: 500,
				categoryId: 'cat-1',
				approved: false
			});
			expect(result.success).toBe(true);
		});
	});

	describe('異常系', () => {
		it('[SPEC: AC-101] 金額が未入力の場合、バリデーションエラーになる', () => {
			const result = expenseUpdateSchema.safeParse({ categoryId: 'cat-1', approved: false });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('amount'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('金額は必須です');
			}
		});

		it('[SPEC: AC-102] 金額が0の場合、バリデーションエラーになる', () => {
			const result = expenseUpdateSchema.safeParse({
				amount: 0,
				categoryId: 'cat-1',
				approved: false
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('amount'));
				expect(issue?.message).toBe('1円以上の金額を入力してください');
			}
		});

		it('[SPEC: AC-103] 金額が9,999,999を超える場合、バリデーションエラーになる', () => {
			const result = expenseUpdateSchema.safeParse({
				amount: 10000000,
				categoryId: 'cat-1',
				approved: false
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('amount'));
				expect(issue?.message).toBe('9,999,999円以下の金額を入力してください');
			}
		});

		it('[SPEC: AC-104] 金額が小数の場合、バリデーションエラーになる', () => {
			const result = expenseUpdateSchema.safeParse({
				amount: 100.5,
				categoryId: 'cat-1',
				approved: false
			});
			expect(result.success).toBe(false);
		});

		it('[SPEC: AC-105] カテゴリIDが未指定の場合、バリデーションエラーになる', () => {
			const result = expenseUpdateSchema.safeParse({ amount: 1000, approved: false });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('categoryId'));
				expect(issue?.message).toBe('カテゴリは必須です');
			}
		});
	});
});
