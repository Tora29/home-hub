/**
 * @file 型定義: Dashboard 共有型
 * @module src/lib/features/dashboard/types.ts
 * @feature dashboard
 *
 * @description
 * ダッシュボード機能で service・API・コンポーネント間で共有する型定義。
 * サーバー依存なしの純粋な型ファイル。
 */

export type PayerSummary = {
	payerId: string;
	payerName: string | null;
	total: number;
};

export type CategorySummary = {
	categoryId: string;
	categoryName: string;
	total: number;
	byPayer: PayerSummary[];
};

export type DashboardSummary = {
	overall: number;
	byPayer: PayerSummary[];
	byCategory: CategorySummary[];
};
