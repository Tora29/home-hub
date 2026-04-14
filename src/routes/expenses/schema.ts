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
 * - expenseQuerySchema    - 支出一覧クエリ入力
 * - expenseCreateSchema   - 支出作成用入力
 * - expenseUpdateSchema   - 支出更新用入力
 * - categoryCreateSchema  - カテゴリ作成用入力
 * - categoryUpdateSchema  - カテゴリ更新用入力
 *
 * @types
 * - ExpenseCreate   - 支出作成用入力型
 * - ExpenseUpdate   - 支出更新用入力型
 * - CategoryCreate  - カテゴリ作成用入力型
 * - CategoryUpdate  - カテゴリ更新用入力型
 */
import { z } from 'zod';

// ---- 支出一覧クエリスキーマ ----

export const expenseQuerySchema = z.object({
	month: z
		.string()
		.regex(/^\d{4}-\d{2}$/, '月の形式は YYYY-MM です')
		.refine((m) => {
			const mon = Number(m.split('-')[1]);
			return mon >= 1 && mon <= 12;
		}, '月は01〜12で入力してください')
		.optional(),
	page: z.coerce.number().int().min(1, 'page は1以上の整数です').default(1),
	limit: z.coerce.number().int().min(1).max(100, 'limit は1〜100です').default(20)
});

export type ExpenseQuery = z.infer<typeof expenseQuerySchema>;

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
	payerUserId: z
		.string({ error: (iss) => (iss.input === undefined ? '支払者は必須です' : undefined) })
		.min(1, '支払者は必須です')
});

// PUT のため作成・更新は同一スキーマ（承認状態は /check・/uncheck・/request・/cancel・/approve で操作）
export const expenseUpdateSchema = expenseCreateSchema;

export type ExpenseCreate = z.infer<typeof expenseCreateSchema>;
export type ExpenseUpdate = z.infer<typeof expenseUpdateSchema>;
