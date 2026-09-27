/**
 * @file スキーマ: Dashboard
 * @module src/lib/features/dashboard/schema.ts
 * @feature dashboard
 *
 * @description
 * ダッシュボード集計のクエリパラメータ Zod バリデーションスキーマ。
 * 画面 URL（`/?period=&month=`）と集計 API（`/dashboard/summary`）の両方で使用する。
 *
 * @schemas
 * - dashboardSummaryQuerySchema - 集計サマリー取得クエリパラメータ
 *
 * @types
 * - DashboardSummaryQuery - 集計サマリー取得クエリ型
 */
import { z } from 'zod';

export const dashboardSummaryQuerySchema = z.object({
	period: z
		.enum(['month', 'all'], { error: '期間は month または all を指定してください' })
		.default('month'),
	month: z
		.string({ error: '月は文字列で指定してください' })
		// 形式不正時は月範囲チェックを行わない（同一フィールドにエラーを重複させない）
		.regex(/^\d{4}-\d{2}$/, { error: '月はYYYY-MM形式で入力してください', abort: true })
		.refine((m) => {
			const mon = Number(m.split('-')[1]);
			return mon >= 1 && mon <= 12;
		}, '月は01〜12で入力してください')
		.optional()
});

export type DashboardSummaryQuery = z.infer<typeof dashboardSummaryQuerySchema>;
