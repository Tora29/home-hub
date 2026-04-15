/**
 * @file スキーマ: ExpenseCategory
 * @module src/routes/expenses/categories/_lib/schema.ts
 * @feature expenses
 *
 * @description
 * 支出カテゴリ機能の Zod バリデーションスキーマ。FE/BE 共通で使用する。
 *
 * @spec specs/expenses/spec.md - Schema セクション
 *
 * @schemas
 * - categoryCreateSchema - 作成用入力
 * - categoryUpdateSchema - 更新用入力
 *
 * @types
 * - CategoryCreate - 作成用入力型
 * - CategoryUpdate - 更新用入力型
 */
import { z } from 'zod';

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
