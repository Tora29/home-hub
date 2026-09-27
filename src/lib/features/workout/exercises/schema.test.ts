/**
 * @file テスト: WorkoutExercise / WorkoutExerciseCategory スキーマ
 * @module src/lib/features/workout/exercises/schema.test.ts
 * @testType unit
 *
 * @target ./schema.ts
 */
import { describe, test, expect } from 'vitest';
import type { z } from 'zod';
import { exerciseCreateSchema, exerciseCategoryCreateSchema } from './schema';

/** safeParse 失敗時の最初のメッセージを返す（成功時は undefined）。 */
function firstMessage(result: z.ZodSafeParseResult<unknown>): string | undefined {
	return result.success ? undefined : result.error.issues[0].message;
}

describe('exerciseCreateSchema', () => {
	test('正しいデータで種目を登録できる', () => {
		const result = exerciseCreateSchema.safeParse({ name: 'ベンチプレス', categoryId: 'cat-1' });
		expect(result.success).toBe(true);
	});

	test('categoryId が null の場合、カテゴリなしで登録できる', () => {
		const result = exerciseCreateSchema.safeParse({ name: 'スクワット', categoryId: null });
		expect(result.success).toBe(true);
	});

	test('categoryId が省略された場合、VALIDATION_ERROR「カテゴリの指定は必須です（未設定は null）」が返る', () => {
		const result = exerciseCreateSchema.safeParse({ name: 'スクワット' });
		expect(firstMessage(result)).toBe('カテゴリの指定は必須です（未設定は null）');
	});

	test('categoryId が空文字の場合、VALIDATION_ERROR「カテゴリIDの形式が正しくありません」が返る', () => {
		const result = exerciseCreateSchema.safeParse({ name: 'スクワット', categoryId: '' });
		expect(firstMessage(result)).toBe('カテゴリIDの形式が正しくありません');
	});

	test('種目名が空の場合、VALIDATION_ERROR「種目名は必須です」が返る', () => {
		const result = exerciseCreateSchema.safeParse({ name: '', categoryId: null });
		expect(firstMessage(result)).toBe('種目名は必須です');
	});

	test('種目名が未指定の場合、VALIDATION_ERROR「種目名は必須です」が返る', () => {
		const result = exerciseCreateSchema.safeParse({ categoryId: null });
		expect(firstMessage(result)).toBe('種目名は必須です');
	});

	test('種目名が50文字の場合、登録できる', () => {
		const result = exerciseCreateSchema.safeParse({ name: 'あ'.repeat(50), categoryId: null });
		expect(result.success).toBe(true);
	});

	test('種目名が51文字の場合、VALIDATION_ERROR「50文字以内で入力してください」が返る', () => {
		const result = exerciseCreateSchema.safeParse({ name: 'あ'.repeat(51), categoryId: null });
		expect(firstMessage(result)).toBe('50文字以内で入力してください');
	});
});

describe('exerciseCategoryCreateSchema', () => {
	test('正しいデータでカテゴリを登録できる', () => {
		const result = exerciseCategoryCreateSchema.safeParse({ name: '胸' });
		expect(result.success).toBe(true);
	});

	test('カテゴリ名が空の場合、VALIDATION_ERROR「カテゴリ名は必須です」が返る', () => {
		const result = exerciseCategoryCreateSchema.safeParse({ name: '' });
		expect(firstMessage(result)).toBe('カテゴリ名は必須です');
	});

	test('カテゴリ名が未指定の場合、VALIDATION_ERROR「カテゴリ名は必須です」が返る', () => {
		const result = exerciseCategoryCreateSchema.safeParse({});
		expect(firstMessage(result)).toBe('カテゴリ名は必須です');
	});

	test('カテゴリ名が30文字の場合、登録できる', () => {
		const result = exerciseCategoryCreateSchema.safeParse({ name: 'あ'.repeat(30) });
		expect(result.success).toBe(true);
	});

	test('カテゴリ名が31文字の場合、VALIDATION_ERROR「30文字以内で入力してください」が返る', () => {
		const result = exerciseCategoryCreateSchema.safeParse({ name: 'あ'.repeat(31) });
		expect(firstMessage(result)).toBe('30文字以内で入力してください');
	});
});
