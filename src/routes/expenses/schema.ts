/**
 * @file スキーマ: Expense / Category / Payer
 * @module src/routes/expenses/schema.ts
 * @feature expenses
 *
 * @description
 * 支出・カテゴリ・支払者機能の Zod バリデーションスキーマ。FE/BE 共通で使用する。
 *
 * @spec specs/expenses/spec.md - Schema セクション
 *
 * @schemas
 * - expenseCreateSchema   - 支出作成用入力
 * - expenseUpdateSchema   - 支出更新用入力
 * - categoryCreateSchema  - カテゴリ作成用入力
 * - categoryUpdateSchema  - カテゴリ更新用入力
 * - payerCreateSchema     - 支払者作成用入力
 * - payerUpdateSchema     - 支払者更新用入力
 *
 * @types
 * - ExpenseCreate   - 支出作成用入力型
 * - ExpenseUpdate   - 支出更新用入力型
 * - CategoryCreate  - カテゴリ作成用入力型
 * - CategoryUpdate  - カテゴリ更新用入力型
 * - PayerCreate     - 支払者作成用入力型
 * - PayerUpdate     - 支払者更新用入力型
 */
import { z } from 'zod';

// ---- 支出スキーマ ----

export const expenseCreateSchema = z.object({
	amount: z
		.number({ error: (iss) => (iss.input === undefined ? '金額は必須です' : undefined) })
		.int()
		.min(1, '1円以上の金額を入力してください')
		.max(9999999, '9,999,999円以下の金額を入力してください'),
	categoryId: z
		.string({ error: (iss) => (iss.input === undefined ? 'カテゴリは必須です' : undefined) })
		.min(1, 'カテゴリは必須です'),
	payerId: z
		.string({ error: (iss) => (iss.input === undefined ? '支払者は必須です' : undefined) })
		.min(1, '支払者は必須です')
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
	payerId: z
		.string({ error: (iss) => (iss.input === undefined ? '支払者は必須です' : undefined) })
		.min(1, '支払者は必須です')
});

export type ExpenseCreate = z.infer<typeof expenseCreateSchema>;
export type ExpenseUpdate = z.infer<typeof expenseUpdateSchema>;

// ---- カテゴリスキーマ ----

export const categoryCreateSchema = z.object({
	name: z
		.string({ error: (iss) => (iss.input === undefined ? 'カテゴリ名は必須です' : undefined) })
		.min(1, 'カテゴリ名は必須です')
		.max(50, '50文字以内で入力してください')
});

export const categoryUpdateSchema = z.object({
	name: z
		.string({ error: (iss) => (iss.input === undefined ? 'カテゴリ名は必須です' : undefined) })
		.min(1, 'カテゴリ名は必須です')
		.max(50, '50文字以内で入力してください')
});

export type CategoryCreate = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;

// ---- 支払者スキーマ ----

export const payerCreateSchema = z.object({
	name: z
		.string({ error: (iss) => (iss.input === undefined ? '支払者名は必須です' : undefined) })
		.min(1, '支払者名は必須です')
		.max(50, '50文字以内で入力してください')
});

export const payerUpdateSchema = z.object({
	name: z
		.string({ error: (iss) => (iss.input === undefined ? '支払者名は必須です' : undefined) })
		.min(1, '支払者名は必須です')
		.max(50, '50文字以内で入力してください')
});

export type PayerCreate = z.infer<typeof payerCreateSchema>;
export type PayerUpdate = z.infer<typeof payerUpdateSchema>;
