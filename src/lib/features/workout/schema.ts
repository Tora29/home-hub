/**
 * @file スキーマ: WorkoutRecord / BodyWeightRecord
 * @module src/lib/features/workout/schema.ts
 * @feature workout
 *
 * @description
 * 筋トレ記録・体重記録・グラフ/ボリューム/画面クエリの Zod バリデーションスキーマ。
 * 日付は YYYY-MM-DD 形式かつ実在する日付のみ、月は YYYY-MM 形式かつ 01〜12 のみ許可する。
 *
 * @schemas
 * - recordCreateSchema               - 記録作成用入力（1レコード = 1セット）
 * - bodyWeightCreateSchema           - 体重記録作成用入力
 * - chartQuerySchema                 - グラフデータ取得クエリ
 * - volumeQuerySchema                - 週間ボリュームクエリ
 * - volumeBreakdownQuerySchema       - 週間ボリューム内訳クエリ（weekStart = 月曜日）
 * - workoutPageQuerySchema           - 記録画面のクエリ（種目フィルタ）
 *
 * @types
 * - RecordCreate
 * - BodyWeightCreate
 * - ChartQuery
 * - VolumeQuery
 * - VolumeBreakdownQuery
 * - WorkoutPageQuery
 */
import { z } from 'zod';

/** YYYY-MM-DD が実在する暦日か（2026-02-30 等を弾く）。 */
function isExistingDate(value: string): boolean {
	const [y, m, d] = value.split('-').map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d));
	return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** YYYY-MM-DD が月曜日か。 */
function isMonday(value: string): boolean {
	const [y, m, d] = value.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 1;
}

const dateSchema = z
	.string({
		error: (iss) => (iss.input === undefined ? '日付は必須です' : '日付の形式が正しくありません')
	})
	.regex(/^\d{4}-\d{2}-\d{2}$/, { error: '日付の形式が正しくありません', abort: true })
	.refine(isExistingDate, '存在しない日付です');

const monthSchema = z
	.string({ error: '月の形式は YYYY-MM です' })
	.regex(/^\d{4}-\d{2}$/, { error: '月の形式は YYYY-MM です', abort: true })
	.refine((m) => {
		const mon = Number(m.split('-')[1]);
		return mon >= 1 && mon <= 12;
	}, '月は01〜12で入力してください');

const periodSchema = z
	.enum(['1m', 'year', 'all'], { error: '期間は 1m / year / all のいずれかを指定してください' })
	.default('1m');

export const recordCreateSchema = z
	.object({
		exerciseId: z.string({ error: '種目を選択してください' }).min(1, '種目を選択してください'),
		date: dateSchema,
		weight: z
			.number({
				error: (iss) =>
					iss.input === undefined ? '重量は必須です' : '重量は数値で入力してください'
			})
			.min(0, '重量は0以上で入力してください')
			.max(999, '重量は999以下で入力してください'),
		reps: z
			.number({
				error: (iss) =>
					iss.input === undefined ? '回数は必須です' : '回数は数値で入力してください'
			})
			.int('回数は整数で入力してください')
			.min(1, '回数は1以上で入力してください')
			.max(10, '回数は10以下で入力してください'),
		isBodyWeight: z.boolean({ error: '自重フラグの形式が正しくありません' }).default(false)
	})
	.superRefine((data, ctx) => {
		if (!data.isBodyWeight && data.weight <= 0) {
			ctx.addIssue({
				path: ['weight'],
				code: 'custom',
				message: '重量は0より大きい値を入力してください'
			});
		}
	});

export const bodyWeightCreateSchema = z.object({
	date: dateSchema,
	weight: z
		.number({
			error: (iss) => (iss.input === undefined ? '体重は必須です' : '体重は数値で入力してください')
		})
		.positive('体重は0より大きい値を入力してください')
		.max(300, '体重は300以下で入力してください')
});

export const chartQuerySchema = z.object({
	exerciseId: z.string({ error: '種目IDは必須です' }).min(1, '種目IDは必須です'),
	period: periodSchema,
	month: monthSchema.optional()
});

export const volumeQuerySchema = z.object({
	period: periodSchema,
	month: monthSchema.optional()
});

export const volumeBreakdownQuerySchema = z.object({
	weekStart: dateSchema.refine(isMonday, '週の開始日は月曜日を指定してください')
});

/** 記録画面（GET /workout の SSR）のクエリ。不正値はフィルタなしとして扱う（呼び出し側で判定）。 */
export const workoutPageQuerySchema = z.object({
	exerciseId: z.string().min(1, '種目IDの形式が正しくありません').optional()
});

export type RecordCreate = z.infer<typeof recordCreateSchema>;
export type BodyWeightCreate = z.infer<typeof bodyWeightCreateSchema>;
export type ChartQuery = z.infer<typeof chartQuerySchema>;
export type VolumeQuery = z.infer<typeof volumeQuerySchema>;
export type VolumeBreakdownQuery = z.infer<typeof volumeBreakdownQuerySchema>;
export type WorkoutPageQuery = z.infer<typeof workoutPageQuerySchema>;
