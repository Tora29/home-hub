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

export type ExpenseUser = {
	id: string;
	name: string;
	email: string;
};

export type ExpensePayer = ExpenseUser;

export type ExpenseStatus = 'unapproved' | 'checked' | 'pending' | 'approved';

export type ExpenseWithRelations = {
	id: string;
	userId: string;
	amount: number;
	categoryId: string;
	payerUserId: string | null;
	status: ExpenseStatus;
	createdAt: Date;
	category: ExpenseCategory;
	payer: ExpenseUser | null;
};
