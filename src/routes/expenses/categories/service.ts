/**
 * @file サービス: ExpenseCategory
 * @module src/routes/expenses/categories/service.ts
 * @feature expenses
 *
 * @description
 * 支出カテゴリ機能のビジネスロジックと DB 操作を担う。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-010, AC-011, AC-012, AC-107, AC-108, AC-109, AC-110
 *
 * @entity ExpenseCategory
 *
 * @functions
 * - getCategories   - 一覧取得（全件）
 * - createCategory  - 新規作成
 * - updateCategory  - 更新
 * - deleteCategory  - 削除
 *
 * @test ./service.integration.test.ts
 */
import { and, eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { AppError } from '$lib/server/errors';
import { expense, expenseCategory } from '$lib/server/tables';
import type * as schema from '$lib/server/tables';
import type { CategoryCreate, CategoryUpdate } from './schema';

type Db = DrizzleD1Database<typeof schema>;

type Category = {
	id: string;
	userId: string;
	name: string;
	createdAt: Date;
};

/**
 * カテゴリ一覧を取得する（全件）。
 * @ac AC-010
 */
export async function getCategories(
	db: Db,
	userId: string
): Promise<{ items: Category[]; total: number; page: number; limit: number }> {
	const rows = await db
		.select()
		.from(expenseCategory)
		.where(eq(expenseCategory.userId, userId))
		.orderBy(expenseCategory.createdAt);

	return {
		items: rows as Category[],
		total: rows.length,
		page: 1,
		limit: rows.length || 20
	};
}

/**
 * カテゴリを新規作成する。
 * @ac AC-010
 */
export async function createCategory(
	db: Db,
	userId: string,
	data: CategoryCreate
): Promise<Category> {
	const id = crypto.randomUUID();
	const now = new Date();

	const [row] = await db
		.insert(expenseCategory)
		.values({ id, userId, name: data.name, createdAt: now })
		.returning();

	return row as Category;
}

/**
 * カテゴリを更新する。
 * @ac AC-011
 * @throws {NOT_FOUND} - 該当カテゴリが存在しない場合、または他ユーザーのカテゴリの場合
 */
export async function updateCategory(
	db: Db,
	userId: string,
	id: string,
	data: CategoryUpdate
): Promise<Category> {
	const existing = await db
		.select()
		.from(expenseCategory)
		.where(and(eq(expenseCategory.id, id), eq(expenseCategory.userId, userId)))
		.get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');

	const [row] = await db
		.update(expenseCategory)
		.set({ name: data.name })
		.where(and(eq(expenseCategory.id, id), eq(expenseCategory.userId, userId)))
		.returning();

	return row as Category;
}

/**
 * カテゴリを削除する。紐付く支出が存在する場合は CONFLICT を投げる。
 * @ac AC-012
 * @throws {NOT_FOUND} - 該当カテゴリが存在しない場合、または他ユーザーのカテゴリの場合
 * @throws {CONFLICT} - カテゴリに紐付く支出が 1 件以上ある場合
 */
export async function deleteCategory(db: Db, userId: string, id: string): Promise<void> {
	const existing = await db
		.select()
		.from(expenseCategory)
		.where(and(eq(expenseCategory.id, id), eq(expenseCategory.userId, userId)))
		.get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');

	const [{ linkedCount }] = await db
		.select({ linkedCount: sql<number>`count(*)` })
		.from(expense)
		.where(eq(expense.categoryId, id));

	if (Number(linkedCount) > 0) {
		throw new AppError('CONFLICT', 409, 'このカテゴリは使用中のため削除できません');
	}

	await db
		.delete(expenseCategory)
		.where(and(eq(expenseCategory.id, id), eq(expenseCategory.userId, userId)));
}
