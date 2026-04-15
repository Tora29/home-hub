/**
 * @file 型定義: Expense 共有型
 * @module src/routes/expenses/_lib/types.ts
 * @feature expenses
 *
 * @description
 * 支出機能で service・API・コンポーネント間で共有する型定義。
 * openapi.yaml の schema 定義に対応する。サーバー依存なしの純粋な型ファイル。
 */

export type ExpenseStatus = 'unapproved' | 'checked' | 'pending' | 'approved';

export type Category = {
	id: string;
	userId: string;
	name: string;
	createdAt: Date | string;
};

export type User = {
	id: string;
	name: string;
	email: string;
};

export type ExpenseWithRelations = {
	id: string;
	userId: string;
	amount: number;
	categoryId: string;
	payerUserId: string | null;
	status: ExpenseStatus;
	createdAt: string;
	category: Category;
	payer: User | null;
};
