/**
 * @file テスト: WorkoutExercise / WorkoutExerciseCategory スキーマ
 * @module src/lib/features/workout/exercises/schema.test.ts
 * @testType unit
 *
 * @target ./schema.ts
 */
import { describe, test, expect } from 'vitest';
import { exerciseCreateSchema, exerciseCategoryCreateSchema } from './schema';

describe('exerciseCreateSchema', () => {
	test('正しいデータで種目を登録できる', () => {
		const result = exerciseCreateSchema.safeParse({ name: 'ベンチプレス' });
		expect(result.success).toBe(true);
	});

	test('種目名が空の場合、VALIDATION_ERROR「種目名は必須です」が返る', () => {
		const result = exerciseCreateSchema.safeParse({ name: '' });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('種目名は必須です');
		}
	});

	test('種目名が50文字の場合、登録できる', () => {
		const result = exerciseCreateSchema.safeParse({ name: 'あ'.repeat(50) });
		expect(result.success).toBe(true);
	});

	test('種目名が51文字の場合、VALIDATION_ERROR が返る', () => {
		const result = exerciseCreateSchema.safeParse({ name: 'あ'.repeat(51) });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('50文字以内で入力してください');
		}
	});

	test('name フィールドが欠けている場合、VALIDATION_ERROR が返る', () => {
		const result = exerciseCreateSchema.safeParse({});
		expect(result.success).toBe(false);
	});

	test('categoryId が null の場合、登録できる', () => {
		const result = exerciseCreateSchema.safeParse({ name: 'スクワット', categoryId: null });
		expect(result.success).toBe(true);
	});

	test('categoryId が文字列の場合、登録できる', () => {
		const result = exerciseCreateSchema.safeParse({ name: 'スクワット', categoryId: 'cat-id-123' });
		expect(result.success).toBe(true);
	});

	test('categoryId が undefined（省略）の場合、登録できる', () => {
		const result = exerciseCreateSchema.safeParse({ name: 'スクワット' });
		expect(result.success).toBe(true);
	});
});

describe('exerciseCategoryCreateSchema', () => {
	test('正しいデータでカテゴリを登録できる', () => {
		const result = exerciseCategoryCreateSchema.safeParse({ name: '胸' });
		expect(result.success).toBe(true);
	});

	test('カテゴリ名が空の場合、VALIDATION_ERROR「カテゴリ名は必須です」が返る', () => {
		const result = exerciseCategoryCreateSchema.safeParse({ name: '' });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('カテゴリ名は必須です');
		}
	});

	test('カテゴリ名が30文字の場合、登録できる', () => {
		const result = exerciseCategoryCreateSchema.safeParse({ name: 'あ'.repeat(30) });
		expect(result.success).toBe(true);
	});

	test('カテゴリ名が31文字の場合、VALIDATION_ERROR が返る', () => {
		const result = exerciseCategoryCreateSchema.safeParse({ name: 'あ'.repeat(31) });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('30文字以内で入力してください');
		}
	});

	test('name フィールドが欠けている場合、VALIDATION_ERROR が返る', () => {
		const result = exerciseCategoryCreateSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});
