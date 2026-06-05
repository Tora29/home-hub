/**
 * @file テスト: WorkoutExercise スキーマ
 * @module src/routes/workout/exercises/schema.test.ts
 * @testType unit
 *
 * @target ./schema.ts
 */
import { describe, test, expect } from 'vitest';
import { exerciseCreateSchema } from './schema';

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
});
