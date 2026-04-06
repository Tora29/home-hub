/**
 * @file スキーマ: Dashboard
 * @module src/routes/dashboard/schema.ts
 * @feature dashboard
 *
 * @description
 * ダッシュボード集計 API のクエリパラメータ Zod バリデーションスキーマ。FE/BE 共通で使用する。
 *
 * @spec specs/dashboard/spec.md - Schema セクション
 *
 * @schemas
 * - dashboardSummaryQuerySchema - 集計サマリー取得クエリパラメータ
 *
 * @types
 * - DashboardSummaryQuery - 集計サマリークエリパラメータ型
 */
import { z } from 'zod';

export const dashboardSummaryQuerySchema = z.object({
	period: z.enum(['month', 'all']).default('month'),
	month: z
		.string()
		.regex(/^\d{4}-\d{2}$/, '月はYYYY-MM形式で入力してください')
		.optional()
});

export type DashboardSummaryQuery = z.infer<typeof dashboardSummaryQuerySchema>;
