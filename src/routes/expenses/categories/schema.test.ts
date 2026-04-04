/**
 * @file テスト: Expense カテゴリ スキーマ
 * @module src/routes/expense/categories/schema.test.ts
 * @testType unit
 *
 * @target ./schema.ts
 * @spec specs/expenses/spec.md
 * @covers AC-107, AC-108, AC-203
 */

import { describe, test, expect } from 'vitest';
import { categoryCreateSchema, categoryUpdateSchema } from './schema';

describe('categoryCreateSchema', () => {
	describe('正常系', () => {
		test('カテゴリ名が1文字以上50文字以内の場合、登録できる', () => {
			const result = categoryCreateSchema.safeParse({ name: '食費' });
			expect(result.success).toBe(true);
		});

		test('[SPEC: AC-203] カテゴリ名が50文字の場合、登録できる', () => {
			const result = categoryCreateSchema.safeParse({ name: 'あ'.repeat(50) });
			expect(result.success).toBe(true);
		});
	});

	describe('異常系', () => {
		test('[SPEC: AC-107] カテゴリ名が空の場合、「カテゴリ名は必須です」エラーになる', () => {
			const result = categoryCreateSchema.safeParse({ name: '' });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('name'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('カテゴリ名は必須です');
			}
		});

		test('[SPEC: AC-107] カテゴリ名が未指定の場合、バリデーションエラーになる', () => {
			const result = categoryCreateSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		test('[SPEC: AC-108] カテゴリ名が51文字の場合、「50文字以内で入力してください」エラーになる', () => {
			const result = categoryCreateSchema.safeParse({ name: 'あ'.repeat(51) });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('name'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('50文字以内で入力してください');
			}
		});

		test('[SPEC: AC-108] カテゴリ名が100文字の場合、バリデーションエラーになる', () => {
			const result = categoryCreateSchema.safeParse({ name: 'a'.repeat(100) });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('name'));
				expect(issue?.message).toBe('50文字以内で入力してください');
			}
		});
	});
});

describe('categoryUpdateSchema', () => {
	describe('正常系', () => {
		test('カテゴリ名が有効な場合、更新できる', () => {
			const result = categoryUpdateSchema.safeParse({ name: '外食費' });
			expect(result.success).toBe(true);
		});

		test('[SPEC: AC-203] カテゴリ名が50文字の場合、更新できる', () => {
			const result = categoryUpdateSchema.safeParse({ name: 'あ'.repeat(50) });
			expect(result.success).toBe(true);
		});
	});

	describe('異常系', () => {
		test('[SPEC: AC-107] カテゴリ名が空の場合、「カテゴリ名は必須です」エラーになる', () => {
			const result = categoryUpdateSchema.safeParse({ name: '' });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('name'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('カテゴリ名は必須です');
			}
		});

		test('[SPEC: AC-108] カテゴリ名が51文字以上の場合、「50文字以内で入力してください」エラーになる', () => {
			const result = categoryUpdateSchema.safeParse({ name: 'あ'.repeat(51) });
			expect(result.success).toBe(false);
			if (!result.success) {
				const issue = result.error.issues.find((i) => i.path.includes('name'));
				expect(issue).toBeDefined();
				expect(issue?.message).toBe('50文字以内で入力してください');
			}
		});
	});
});
