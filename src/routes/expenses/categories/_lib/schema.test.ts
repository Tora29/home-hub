/**
 * @file テスト: CategorySchema
 * @module src/routes/expenses/categories/_lib/schema.test.ts
 * @testType unit
 *
 * @target ./schema.ts
 * @spec specs/expenses/spec.md
 * @covers AC-107, AC-108, AC-203
 */

import { describe, test, expect } from 'vitest';
import { categoryCreateSchema, categoryUpdateSchema } from './schema';

describe('categoryCreateSchema', () => {
	test('[SPEC: AC-203] カテゴリ名が 50 文字の場合、登録できる // spec:314eef45', () => {
		const name = 'a'.repeat(50);
		const result = categoryCreateSchema.safeParse({ name });
		expect(result.success).toBe(true);
	});

	test('[SPEC: AC-107] カテゴリ名が空の場合は VALIDATION_ERROR になる // spec:abe11e29', () => {
		const result = categoryCreateSchema.safeParse({ name: '' });
		expect(result.success).toBe(false);
		if (!result.success) {
			const nameError = result.error.issues.find((i) => i.path.includes('name'));
			expect(nameError).toBeDefined();
			expect(nameError!.message).toBe('カテゴリ名は必須です');
		}
	});

	test('[SPEC: AC-108] カテゴリ名が 51 文字以上の場合は VALIDATION_ERROR になる // spec:abe11e29', () => {
		const name = 'a'.repeat(51);
		const result = categoryCreateSchema.safeParse({ name });
		expect(result.success).toBe(false);
		if (!result.success) {
			const nameError = result.error.issues.find((i) => i.path.includes('name'));
			expect(nameError).toBeDefined();
			expect(nameError!.message).toBe('50文字以内で入力してください');
		}
	});

	test('[SPEC: AC-108] カテゴリ名が 100 文字の場合は VALIDATION_ERROR になる // spec:abe11e29', () => {
		const name = 'a'.repeat(100);
		const result = categoryCreateSchema.safeParse({ name });
		expect(result.success).toBe(false);
	});

	test('[SPEC: AC-107] name が未指定の場合は VALIDATION_ERROR になる // spec:abe11e29', () => {
		const result = categoryCreateSchema.safeParse({});
		expect(result.success).toBe(false);
	});

	test('カテゴリ名が 1 文字の場合、登録できる', () => {
		const result = categoryCreateSchema.safeParse({ name: 'a' });
		expect(result.success).toBe(true);
	});
});

describe('categoryUpdateSchema', () => {
	test('[SPEC: AC-203] カテゴリ名が 50 文字の場合、更新できる // spec:314eef45', () => {
		const name = 'a'.repeat(50);
		const result = categoryUpdateSchema.safeParse({ name });
		expect(result.success).toBe(true);
	});

	test('[SPEC: AC-107] カテゴリ名が空の場合は VALIDATION_ERROR になる // spec:abe11e29', () => {
		const result = categoryUpdateSchema.safeParse({ name: '' });
		expect(result.success).toBe(false);
		if (!result.success) {
			const nameError = result.error.issues.find((i) => i.path.includes('name'));
			expect(nameError).toBeDefined();
		}
	});

	test('[SPEC: AC-108] カテゴリ名が 51 文字以上の場合は VALIDATION_ERROR になる // spec:abe11e29', () => {
		const name = 'a'.repeat(51);
		const result = categoryUpdateSchema.safeParse({ name });
		expect(result.success).toBe(false);
	});
});
