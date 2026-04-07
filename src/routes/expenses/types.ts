/**
 * @file 型定義: Expense 共有型
 * @module src/routes/expenses/types.ts
 * @feature expenses
 *
 * @description
 * 支出機能で service・API・コンポーネント間で共有する型定義。
 * サーバー依存なしの純粋な型ファイル。
 */

export type ExpenseCategory = {
	id: string;
	userId: string;
	name: string;
	createdAt: Date;
};

export type ExpensePayer = {
	id: string;
	userId: string;
	name: string;
	createdAt: Date;
};

export type ExpenseWithRelations = {
	id: string;
	userId: string;
	amount: number;
	categoryId: string;
	payerId: string | null;
	approvedAt: Date | null;
	finalizedAt: Date | null;
	createdAt: Date;
	category: ExpenseCategory;
	payer: ExpensePayer | null;
};
