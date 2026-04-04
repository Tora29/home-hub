/**
 * @file スキーマ: Expense / Category
 * @module src/routes/expenses/schema.ts
 * @feature expenses
 *
 * @description
 * 支出・カテゴリ機能の Zod バリデーションスキーマ。FE/BE 共通で使用する。
 *
 * @spec specs/expenses/spec.md - Schema セクション
 *
 * @schemas
 * - expenseCreateSchema   - 支出作成用入力
 * - expenseUpdateSchema   - 支出更新用入力
 *
 * @types
 * - ExpenseCreate  - 支出作成用入力型
 * - ExpenseUpdate  - 支出更新用入力型
 */
import { z } from 'zod';

export const expenseCreateSchema = z.object({
	amount: z
		.number({ error: (iss) => (iss.input === undefined ? '金額は必須です' : undefined) })
		.int()
		.min(1, '1円以上の金額を入力してください')
		.max(9999999, '9,999,999円以下の金額を入力してください'),
	categoryId: z
		.string({ error: (iss) => (iss.input === undefined ? 'カテゴリは必須です' : undefined) })
		.min(1, 'カテゴリは必須です')
});

export const expenseUpdateSchema = z.object({
	amount: z
		.number({ error: (iss) => (iss.input === undefined ? '金額は必須です' : undefined) })
		.int()
		.min(1, '1円以上の金額を入力してください')
		.max(9999999, '9,999,999円以下の金額を入力してください'),
	categoryId: z
		.string({ error: (iss) => (iss.input === undefined ? 'カテゴリは必須です' : undefined) })
		.min(1, 'カテゴリは必須です'),
	approved: z.boolean()
});

export type ExpenseCreate = z.infer<typeof expenseCreateSchema>;
export type ExpenseUpdate = z.infer<typeof expenseUpdateSchema>;
