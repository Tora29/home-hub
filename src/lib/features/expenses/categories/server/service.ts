/**
 * @file サービス: ExpenseCategory
 * @module src/lib/features/expenses/categories/server/service.ts
 * @feature expenses
 *
 * @description
 * 支出カテゴリ機能のビジネスロジックと DB 操作を担う。
 *
 * @entity ExpenseCategory
 *
 * @functions
 * - getCategories   - 一覧取得（全件・作成順）
 * - createCategory  - 新規作成
 * - updateCategory  - 更新（NOT_FOUND: 不在）
 * - deleteCategory  - 削除（NOT_FOUND: 不在 / CONFLICT: 支出が紐付く）
 *
 * @test ./service.integration.test.ts
 */
import { count, eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { AppError } from '$lib/server/errors';
import { expense, expenseCategory } from '$lib/server/tables';
import type * as schema from '$lib/server/tables';
import type { CategoryCreate, CategoryUpdate } from '../schema';
import type { Category } from '../../types';

type Db = DrizzleD1Database<typeof schema>;

/**
 * カテゴリ一覧を取得する（全件・全ユーザー共通）。
 */
export async function getCategories(
	db: Db
): Promise<{ items: Category[]; total: number; page: number; limit: number }> {
	const rows = await db
		.select()
		.from(expenseCategory)
		.orderBy(expenseCategory.createdAt, sql`"ExpenseCategory".rowid`);

	return {
		items: rows as Category[],
		total: rows.length,
		page: 1,
		limit: rows.length
	};
}

/**
 * カテゴリを新規作成する（全ユーザー共通）。
 */
export async function createCategory(db: Db, data: CategoryCreate): Promise<Category> {
	const id = crypto.randomUUID();
	const now = new Date();

	const [row] = await db
		.insert(expenseCategory)
		.values({ id, name: data.name, createdAt: now })
		.returning();

	return row as Category;
}

/**
 * カテゴリを更新する（全ユーザー共通）。
 * @throws {NOT_FOUND} - 該当カテゴリが存在しない場合
 */
export async function updateCategory(db: Db, id: string, data: CategoryUpdate): Promise<Category> {
	const existing = await db.select().from(expenseCategory).where(eq(expenseCategory.id, id)).get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');

	const [row] = await db
		.update(expenseCategory)
		.set({ name: data.name })
		.where(eq(expenseCategory.id, id))
		.returning();

	return row as Category;
}

/**
 * カテゴリを削除する。いずれかのユーザーの支出が紐付く場合は CONFLICT を投げる。
 * @throws {NOT_FOUND} - 該当カテゴリが存在しない場合
 * @throws {CONFLICT} - カテゴリに紐付く支出が 1 件以上ある場合
 */
export async function deleteCategory(db: Db, id: string): Promise<void> {
	const existing = await db.select().from(expenseCategory).where(eq(expenseCategory.id, id)).get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');

	const [{ linkedCount }] = await db
		.select({ linkedCount: count() })
		.from(expense)
		.where(eq(expense.categoryId, id));

	if (linkedCount > 0) {
		throw new AppError('CONFLICT', 409, 'このカテゴリは使用中のため削除できません');
	}

	await db.delete(expenseCategory).where(eq(expenseCategory.id, id));
}
