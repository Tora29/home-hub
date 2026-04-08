/**
 * @file スキーマ: Dashboard Summary
 * @module src/routes/dashboard/summary/schema.ts
 * @feature dashboard
 *
 * @description
 * ダッシュボード集計サマリー機能のクエリスキーマ再エクスポート。
 * 本体は ../schema.ts に定義し、summary 配下ではこのファイルを入口にする。
 *
 * @spec specs/dashboard/spec.md - Schema セクション
 */
export { dashboardSummaryQuerySchema, type DashboardSummaryQuery } from '../schema';
