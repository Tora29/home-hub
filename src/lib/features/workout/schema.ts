/**
 * @file スキーマ: WorkoutRecord / BodyWeightRecord
 * @module src/lib/features/workout/schema.ts
 * @feature workout
 *
 * @description
 * 筋トレ記録・体重記録・グラフクエリの Zod バリデーションスキーマ。
 *
 * @schemas
 * - recordCreateSchema      - 記録作成用入力（1レコード = 1セット）
 * - bodyWeightCreateSchema  - 体重記録作成用入力
 * - chartQuerySchema        - グラフデータ取得クエリ
 * - volumeQuerySchema       - 週間ボリュームクエリ
 *
 * @types
 * - RecordCreate
 * - BodyWeightCreate
 * - ChartQuery
 * - VolumeQuery
 */
import { z } from 'zod';

export const recordCreateSchema = z
	.object({
		exerciseId: z.string().min(1, '種目を選択してください'),
		date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません'),
		weight: z
			.number({ error: () => '重量は必須です' })
			.min(0, '重量は0以上で入力してください')
			.max(999, '重量は999以下で入力してください'),
		reps: z
			.number({ error: () => '回数は必須です' })
			.int()
			.min(1, '回数は1以上')
			.max(10, '回数は10以下'),
		isBodyWeight: z.boolean().default(false)
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
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません'),
	weight: z
		.number({ error: () => '体重は必須です' })
		.positive('体重は0より大きい値を入力してください')
		.max(300, '体重は300以下で入力してください')
});

export const chartQuerySchema = z.object({
	exerciseId: z.string().min(1, '種目IDは必須です'),
	period: z.enum(['1m', 'year', 'all']).default('1m'),
	month: z
		.string()
		.regex(/^\d{4}-\d{2}$/, '月の形式は YYYY-MM です')
		.optional()
});

export const volumeQuerySchema = z.object({
	period: z.enum(['1m', 'year', 'all']).default('1m'),
	month: z
		.string()
		.regex(/^\d{4}-\d{2}$/, '月の形式は YYYY-MM です')
		.optional()
});

export type RecordCreate = z.infer<typeof recordCreateSchema>;
export type BodyWeightCreate = z.infer<typeof bodyWeightCreateSchema>;
export type ChartQuery = z.infer<typeof chartQuerySchema>;
export type VolumeQuery = z.infer<typeof volumeQuerySchema>;
