/**
 * @file テスト: WorkoutRecord / BodyWeightRecord / クエリスキーマ
 * @module src/lib/features/workout/schema.test.ts
 * @testType unit
 *
 * @target ./schema.ts
 */
import { describe, test, expect } from 'vitest';
import type { z } from 'zod';
import {
	recordCreateSchema,
	bodyWeightCreateSchema,
	chartQuerySchema,
	volumeQuerySchema,
	volumeBreakdownQuerySchema,
	workoutPageQuerySchema
} from './schema';

const validRecord = { exerciseId: 'exercise-1', date: '2024-01-15', weight: 80, reps: 5 };

/** safeParse 失敗時の最初のメッセージを返す（成功時は undefined）。 */
function firstMessage(result: z.ZodSafeParseResult<unknown>): string | undefined {
	return result.success ? undefined : result.error.issues[0].message;
}

describe('recordCreateSchema', () => {
	test('正しいデータで記録を登録できる', () => {
		const result = recordCreateSchema.safeParse(validRecord);
		expect(result.success).toBe(true);
	});

	test('isBodyWeight を省略した場合、false として登録できる', () => {
		const result = recordCreateSchema.safeParse(validRecord);
		expect(result.success && result.data.isBodyWeight).toBe(false);
	});

	test('isBodyWeight=true の場合、重量0で登録できる', () => {
		const result = recordCreateSchema.safeParse({ ...validRecord, weight: 0, isBodyWeight: true });
		expect(result.success).toBe(true);
	});

	test('isBodyWeight=false で重量が0の場合、VALIDATION_ERROR「重量は0より大きい値を入力してください」が返る', () => {
		const result = recordCreateSchema.safeParse({ ...validRecord, weight: 0, isBodyWeight: false });
		expect(firstMessage(result)).toBe('重量は0より大きい値を入力してください');
	});

	test('重量が999の場合、登録できる', () => {
		const result = recordCreateSchema.safeParse({ ...validRecord, weight: 999 });
		expect(result.success).toBe(true);
	});

	test('重量が999.5の場合、VALIDATION_ERROR「重量は999以下で入力してください」が返る', () => {
		const result = recordCreateSchema.safeParse({ ...validRecord, weight: 999.5 });
		expect(firstMessage(result)).toBe('重量は999以下で入力してください');
	});

	test('重量が未指定の場合、VALIDATION_ERROR「重量は必須です」が返る', () => {
		const result = recordCreateSchema.safeParse({ ...validRecord, weight: undefined });
		expect(firstMessage(result)).toBe('重量は必須です');
	});

	test('重量が文字列の場合、VALIDATION_ERROR「重量は数値で入力してください」が返る', () => {
		const result = recordCreateSchema.safeParse({ ...validRecord, weight: '80' });
		expect(firstMessage(result)).toBe('重量は数値で入力してください');
	});

	test('回数が1の場合、登録できる', () => {
		const result = recordCreateSchema.safeParse({ ...validRecord, reps: 1 });
		expect(result.success).toBe(true);
	});

	test('回数が10の場合、登録できる', () => {
		const result = recordCreateSchema.safeParse({ ...validRecord, reps: 10 });
		expect(result.success).toBe(true);
	});

	test('回数が0の場合、VALIDATION_ERROR「回数は1以上で入力してください」が返る', () => {
		const result = recordCreateSchema.safeParse({ ...validRecord, reps: 0 });
		expect(firstMessage(result)).toBe('回数は1以上で入力してください');
	});

	test('回数が11の場合、VALIDATION_ERROR「回数は10以下で入力してください」が返る', () => {
		const result = recordCreateSchema.safeParse({ ...validRecord, reps: 11 });
		expect(firstMessage(result)).toBe('回数は10以下で入力してください');
	});

	test('回数が小数の場合、VALIDATION_ERROR「回数は整数で入力してください」が返る', () => {
		const result = recordCreateSchema.safeParse({ ...validRecord, reps: 5.5 });
		expect(firstMessage(result)).toBe('回数は整数で入力してください');
	});

	test('exerciseId が空の場合、VALIDATION_ERROR「種目を選択してください」が返る', () => {
		const result = recordCreateSchema.safeParse({ ...validRecord, exerciseId: '' });
		expect(firstMessage(result)).toBe('種目を選択してください');
	});

	test('日付フォーマットが YYYY-MM-DD でない場合、VALIDATION_ERROR「日付の形式が正しくありません」が返る', () => {
		const result = recordCreateSchema.safeParse({ ...validRecord, date: '2024/01/15' });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues).toHaveLength(1);
			expect(result.error.issues[0].message).toBe('日付の形式が正しくありません');
		}
	});

	test('存在しない日付（2026-02-30）の場合、VALIDATION_ERROR「存在しない日付です」が返る', () => {
		const result = recordCreateSchema.safeParse({ ...validRecord, date: '2026-02-30' });
		expect(firstMessage(result)).toBe('存在しない日付です');
	});

	test('閏日（2024-02-29）の場合、登録できる', () => {
		const result = recordCreateSchema.safeParse({ ...validRecord, date: '2024-02-29' });
		expect(result.success).toBe(true);
	});

	test('日付が未指定の場合、VALIDATION_ERROR「日付は必須です」が返る', () => {
		const result = recordCreateSchema.safeParse({ ...validRecord, date: undefined });
		expect(firstMessage(result)).toBe('日付は必須です');
	});
});

describe('bodyWeightCreateSchema', () => {
	test('正しいデータで体重を登録できる', () => {
		const result = bodyWeightCreateSchema.safeParse({ date: '2024-01-15', weight: 72.5 });
		expect(result.success).toBe(true);
	});

	test('体重が0の場合、VALIDATION_ERROR「体重は0より大きい値を入力してください」が返る', () => {
		const result = bodyWeightCreateSchema.safeParse({ date: '2024-01-15', weight: 0 });
		expect(firstMessage(result)).toBe('体重は0より大きい値を入力してください');
	});

	test('体重が300の場合、登録できる', () => {
		const result = bodyWeightCreateSchema.safeParse({ date: '2024-01-15', weight: 300 });
		expect(result.success).toBe(true);
	});

	test('体重が300.1の場合、VALIDATION_ERROR「体重は300以下で入力してください」が返る', () => {
		const result = bodyWeightCreateSchema.safeParse({ date: '2024-01-15', weight: 300.1 });
		expect(firstMessage(result)).toBe('体重は300以下で入力してください');
	});

	test('体重が未指定の場合、VALIDATION_ERROR「体重は必須です」が返る', () => {
		const result = bodyWeightCreateSchema.safeParse({ date: '2024-01-15' });
		expect(firstMessage(result)).toBe('体重は必須です');
	});

	test('存在しない日付（2026-04-31）の場合、VALIDATION_ERROR「存在しない日付です」が返る', () => {
		const result = bodyWeightCreateSchema.safeParse({ date: '2026-04-31', weight: 72.5 });
		expect(firstMessage(result)).toBe('存在しない日付です');
	});
});

describe('chartQuerySchema', () => {
	test('exerciseId のみ指定の場合、period=1m として取得できる', () => {
		const result = chartQuerySchema.safeParse({ exerciseId: 'ex-1' });
		expect(result.success && result.data.period).toBe('1m');
	});

	test('period=year・month=2024-01 で取得できる', () => {
		const result = chartQuerySchema.safeParse({
			exerciseId: 'ex-1',
			period: 'year',
			month: '2024-01'
		});
		expect(result.success).toBe(true);
	});

	test('exerciseId が未指定の場合、VALIDATION_ERROR「種目IDは必須です」が返る', () => {
		const result = chartQuerySchema.safeParse({ period: '1m' });
		expect(firstMessage(result)).toBe('種目IDは必須です');
	});

	test('period が 1y の場合、VALIDATION_ERROR「期間は 1m / year / all のいずれかを指定してください」が返る', () => {
		const result = chartQuerySchema.safeParse({ exerciseId: 'ex-1', period: '1y' });
		expect(firstMessage(result)).toBe('期間は 1m / year / all のいずれかを指定してください');
	});

	test('month が 2024-13 の場合、VALIDATION_ERROR「月は01〜12で入力してください」が返る', () => {
		const result = chartQuerySchema.safeParse({ exerciseId: 'ex-1', month: '2024-13' });
		expect(firstMessage(result)).toBe('月は01〜12で入力してください');
	});

	test('month が 2024-00 の場合、VALIDATION_ERROR「月は01〜12で入力してください」が返る', () => {
		const result = chartQuerySchema.safeParse({ exerciseId: 'ex-1', month: '2024-00' });
		expect(firstMessage(result)).toBe('月は01〜12で入力してください');
	});
});

describe('volumeQuerySchema', () => {
	test('パラメータ未指定の場合、period=1m として取得できる', () => {
		const result = volumeQuerySchema.safeParse({});
		expect(result.success && result.data.period).toBe('1m');
	});

	test('period=all で取得できる', () => {
		const result = volumeQuerySchema.safeParse({ period: 'all' });
		expect(result.success).toBe(true);
	});

	test('month が YYYY-M 形式の場合、VALIDATION_ERROR「月の形式は YYYY-MM です」が返る', () => {
		const result = volumeQuerySchema.safeParse({ month: '2024-1' });
		expect(firstMessage(result)).toBe('月の形式は YYYY-MM です');
	});

	test('month が 2024-12 の場合、取得できる', () => {
		const result = volumeQuerySchema.safeParse({ month: '2024-12' });
		expect(result.success).toBe(true);
	});
});

describe('volumeBreakdownQuerySchema', () => {
	test('weekStart が月曜日（2024-01-15）の場合、取得できる', () => {
		const result = volumeBreakdownQuerySchema.safeParse({ weekStart: '2024-01-15' });
		expect(result.success).toBe(true);
	});

	test('weekStart が火曜日の場合、VALIDATION_ERROR「週の開始日は月曜日を指定してください」が返る', () => {
		const result = volumeBreakdownQuerySchema.safeParse({ weekStart: '2024-01-16' });
		expect(firstMessage(result)).toBe('週の開始日は月曜日を指定してください');
	});

	test('weekStart が YYYY-WW 形式の場合、VALIDATION_ERROR「日付の形式が正しくありません」が返る', () => {
		const result = volumeBreakdownQuerySchema.safeParse({ weekStart: '2024-03' });
		expect(firstMessage(result)).toBe('日付の形式が正しくありません');
	});
});

describe('workoutPageQuerySchema', () => {
	test('exerciseId 指定で種目フィルタできる', () => {
		const result = workoutPageQuerySchema.safeParse({ exerciseId: 'ex-1' });
		expect(result.success && result.data.exerciseId).toBe('ex-1');
	});

	test('exerciseId 未指定の場合、フィルタなしで取得できる', () => {
		const result = workoutPageQuerySchema.safeParse({});
		expect(result.success && result.data.exerciseId).toBeUndefined();
	});

	test('exerciseId が空文字の場合、VALIDATION_ERROR「種目IDの形式が正しくありません」が返る', () => {
		const result = workoutPageQuerySchema.safeParse({ exerciseId: '' });
		expect(firstMessage(result)).toBe('種目IDの形式が正しくありません');
	});
});
