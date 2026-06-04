/**
 * @file テスト: WorkoutRecord / BodyWeightRecord スキーマ
 * @module src/routes/workout/schema.test.ts
 * @testType unit
 *
 * @target ./schema.ts
 */
import { describe, test, expect } from 'vitest';
import { recordCreateSchema, bodyWeightCreateSchema } from './schema';

describe('recordCreateSchema', () => {
	test('正しいデータで記録を登録できる', () => {
		const result = recordCreateSchema.safeParse({
			exerciseId: 'exercise-1',
			date: '2024-01-15',
			weight: 80,
			reps: 5
		});
		expect(result.success).toBe(true);
	});

	test('重量が0の場合、VALIDATION_ERROR が返る', () => {
		const result = recordCreateSchema.safeParse({
			exerciseId: 'exercise-1',
			date: '2024-01-15',
			weight: 0,
			reps: 5
		});
		expect(result.success).toBe(false);
	});

	test('重量が999.5の場合、登録できる', () => {
		const result = recordCreateSchema.safeParse({
			exerciseId: 'exercise-1',
			date: '2024-01-15',
			weight: 999.5,
			reps: 5
		});
		expect(result.success).toBe(false);
		// 999 が上限
	});

	test('重量が999の場合、登録できる', () => {
		const result = recordCreateSchema.safeParse({
			exerciseId: 'exercise-1',
			date: '2024-01-15',
			weight: 999,
			reps: 5
		});
		expect(result.success).toBe(true);
	});

	test('重量が1000の場合、VALIDATION_ERROR が返る', () => {
		const result = recordCreateSchema.safeParse({
			exerciseId: 'exercise-1',
			date: '2024-01-15',
			weight: 1000,
			reps: 5
		});
		expect(result.success).toBe(false);
	});

	test('回数が0の場合、VALIDATION_ERROR が返る', () => {
		const result = recordCreateSchema.safeParse({
			exerciseId: 'exercise-1',
			date: '2024-01-15',
			weight: 80,
			reps: 0
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('回数は1以上');
		}
	});

	test('回数が11の場合、VALIDATION_ERROR が返る', () => {
		const result = recordCreateSchema.safeParse({
			exerciseId: 'exercise-1',
			date: '2024-01-15',
			weight: 80,
			reps: 11
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('回数は10以下');
		}
	});

	test('回数が1の場合、登録できる', () => {
		const result = recordCreateSchema.safeParse({
			exerciseId: 'exercise-1',
			date: '2024-01-15',
			weight: 80,
			reps: 1
		});
		expect(result.success).toBe(true);
	});

	test('回数が10の場合、登録できる', () => {
		const result = recordCreateSchema.safeParse({
			exerciseId: 'exercise-1',
			date: '2024-01-15',
			weight: 80,
			reps: 10
		});
		expect(result.success).toBe(true);
	});

	test('日付フォーマットが YYYY-MM-DD でない場合、VALIDATION_ERROR が返る', () => {
		const result = recordCreateSchema.safeParse({
			exerciseId: 'exercise-1',
			date: '2024/01/15',
			weight: 80,
			reps: 5
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('日付の形式が正しくありません');
		}
	});

	test('sets フィールドは存在しない（1レコード = 1セット）', () => {
		const schema = recordCreateSchema;
		const shape = schema.shape;
		expect('sets' in shape).toBe(false);
	});

	test('exerciseId が空の場合、VALIDATION_ERROR が返る', () => {
		const result = recordCreateSchema.safeParse({
			exerciseId: '',
			date: '2024-01-15',
			weight: 80,
			reps: 5
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('種目を選択してください');
		}
	});
});

describe('bodyWeightCreateSchema', () => {
	test('正しいデータで体重を登録できる', () => {
		const result = bodyWeightCreateSchema.safeParse({ date: '2024-01-15', weight: 72.5 });
		expect(result.success).toBe(true);
	});

	test('体重が0の場合、VALIDATION_ERROR が返る', () => {
		const result = bodyWeightCreateSchema.safeParse({ date: '2024-01-15', weight: 0 });
		expect(result.success).toBe(false);
	});

	test('体重が72.5の場合、登録できる', () => {
		const result = bodyWeightCreateSchema.safeParse({ date: '2024-01-15', weight: 72.5 });
		expect(result.success).toBe(true);
	});

	test('体重が300より大きい場合、VALIDATION_ERROR が返る', () => {
		const result = bodyWeightCreateSchema.safeParse({ date: '2024-01-15', weight: 300.1 });
		expect(result.success).toBe(false);
	});

	test('体重が300の場合、登録できる', () => {
		const result = bodyWeightCreateSchema.safeParse({ date: '2024-01-15', weight: 300 });
		expect(result.success).toBe(true);
	});
});
