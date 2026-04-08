/**
 * @file テスト: Expense 支払者スキーマ
 * @module src/routes/expenses/payers/schema.test.ts
 * @testType unit
 *
 * @target ./schema.ts
 * @spec specs/expenses/spec.md
 * @covers AC-115, AC-116, AC-117, AC-208
 */

import { describe, test, expect } from 'vitest';
import { payerCreateSchema, payerUpdateSchema } from './schema';
import { expenseCreateSchema } from '../schema';

describe('expenseCreateSchema - 支払者 ID バリデーション', () => {
	describe('異常系', () => {
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

describe('payerCreateSchema', () => {
	describe('正常系', () => {
		test('[SPEC: AC-208] 支払者名が50文字の場合、登録できる', () => {
			const result = payerCreateSchema.safeParse({ name: 'あ'.repeat(50) });
			expect(result.success).toBe(true);
		});

		test('[SPEC: AC-116] 有効な支払者名の場合、登録できる', () => {
			const result = payerCreateSchema.safeParse({ name: '田中' });
			expect(result.success).toBe(true);
		});
	});

	describe('異常系', () => {
		test('[SPEC: AC-116] 支払者名が空の場合、「支払者名は必須です」エラーになる', () => {
			const result = payerCreateSchema.safeParse({ name: '' });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('name'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('支払者名は必須です');
			}
		});

		test('[SPEC: AC-116] 支払者名が未指定の場合、バリデーションエラーになる', () => {
			const result = payerCreateSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		test('[SPEC: AC-117] 支払者名が51文字の場合、「50文字以内で入力してください」エラーになる', () => {
			const result = payerCreateSchema.safeParse({ name: 'あ'.repeat(51) });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('name'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('50文字以内で入力してください');
			}
		});

		test('[SPEC: AC-117] 支払者名が100文字の場合、バリデーションエラーになる', () => {
			const result = payerCreateSchema.safeParse({ name: 'あ'.repeat(100) });
			expect(result.success).toBe(false);
		});
	});
});

describe('payerUpdateSchema', () => {
	describe('正常系', () => {
		test('[SPEC: AC-208] 支払者名が50文字の場合、更新できる', () => {
			const result = payerUpdateSchema.safeParse({ name: 'あ'.repeat(50) });
			expect(result.success).toBe(true);
		});
	});

	describe('異常系', () => {
		test('[SPEC: AC-116] 支払者名が空の場合、「支払者名は必須です」エラーになる', () => {
			const result = payerUpdateSchema.safeParse({ name: '' });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('name'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('支払者名は必須です');
			}
		});

		test('[SPEC: AC-117] 支払者名が51文字以上の場合、「50文字以内で入力してください」エラーになる', () => {
			const result = payerUpdateSchema.safeParse({ name: 'あ'.repeat(51) });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('name'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('50文字以内で入力してください');
			}
		});
	});
});
