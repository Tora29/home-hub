/**
 * @file テスト: 支出カテゴリスキーマ
 * @module src/lib/features/expenses/categories/schema.test.ts
 * @testType unit
 *
 * @target ./schema.ts
 */
import { describe, test, expect } from 'vitest';
import { categoryCreateSchema, categoryUpdateSchema } from './schema';

describe('categoryCreateSchema', () => {
	test('正しいデータでカテゴリを登録できる', () => {
		const result = categoryCreateSchema.safeParse({ name: '食費' });
		expect(result.success).toBe(true);
		expect(result.data?.name).toBe('食費');
	});

	test('カテゴリ名が空の場合、「カテゴリ名は必須です」エラーが返る', () => {
		const result = categoryCreateSchema.safeParse({ name: '' });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('カテゴリ名は必須です');
	});

	test('カテゴリ名が未入力の場合、エラーが返る', () => {
		const result = categoryCreateSchema.safeParse({});
		expect(result.success).toBe(false);
		const issue = result.error?.issues.find((i) => i.path[0] === 'name');
		expect(issue).toBeDefined();
	});

	test('カテゴリ名が50文字の場合、登録できる', () => {
		const result = categoryCreateSchema.safeParse({ name: 'a'.repeat(50) });
		expect(result.success).toBe(true);
	});

	test('カテゴリ名が51文字の場合、「50文字以内で入力してください」エラーが返る', () => {
		const result = categoryCreateSchema.safeParse({ name: 'a'.repeat(51) });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('50文字以内で入力してください');
	});
});

describe('categoryUpdateSchema', () => {
	test('正しいデータでカテゴリを更新できる', () => {
		const result = categoryUpdateSchema.safeParse({ name: '日用品' });
		expect(result.success).toBe(true);
	});

	test('カテゴリ名が空の場合、「カテゴリ名は必須です」エラーが返る', () => {
		const result = categoryUpdateSchema.safeParse({ name: '' });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('カテゴリ名は必須です');
	});

	test('カテゴリ名が50文字の場合、更新できる', () => {
		const result = categoryUpdateSchema.safeParse({ name: 'あ'.repeat(50) });
		expect(result.success).toBe(true);
	});

	test('カテゴリ名が51文字の場合、「50文字以内で入力してください」エラーが返る', () => {
		const result = categoryUpdateSchema.safeParse({ name: 'あ'.repeat(51) });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('50文字以内で入力してください');
	});
});
