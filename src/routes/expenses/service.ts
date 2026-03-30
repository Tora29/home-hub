/**
 * @file サービス: Expense
 * @module src/routes/expenses/service.ts
 * @feature expenses
 *
 * @description
 * 支出機能のビジネスロジックと DB 操作を担う。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-013
 *
 * @entity Expense
 *
 * @functions
 * - getExpenses          - 一覧取得（月フィルタ・ページネーション付き）
 * - createExpense        - 新規作成
 * - updateExpense        - 更新（承認フラグ含む）
 * - deleteExpense        - 削除
 * - getUnapprovedCount   - 全期間の未承認件数取得（ダッシュボード用）
 *
 * @test ./service.integration.test.ts
 */
import { and, desc, eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { AppError } from '$lib/server/errors';
import { expense, expenseCategory } from '$lib/server/tables';
import type * as schema from '$lib/server/tables';
import type { ExpenseCreate, ExpenseUpdate } from './schema';

type Db = DrizzleD1Database<typeof schema>;

type Category = {
	id: string;
	userId: string;
	name: string;
	createdAt: Date;
};

type ExpenseWithCategory = {
	id: string;
	userId: string;
	amount: number;
	categoryId: string;
	approvedAt: Date | null;
	createdAt: Date;
	category: Category;
};

type ListOptions = {
	month?: string;
	page?: number;
	limit?: number;
};

/**
 * 指定月の支出一覧をページネーション付きで取得する。month 未指定時は当月。
 * @ac AC-001, AC-002, AC-013
 */
export async function getExpenses(
	db: Db,
	userId: string,
	options: ListOptions = {}
): Promise<{
	items: ExpenseWithCategory[];
	total: number;
	page: number;
	limit: number;
	monthTotal: number;
}> {
	const page = options.page ?? 1;
	const limit = Math.min(options.limit ?? 20, 100);
	const now = new Date();
	const month =
		options.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	const offset = (page - 1) * limit;

	const monthFilter = sql`strftime('%Y-%m', datetime(${expense.createdAt}, 'unixepoch')) = ${month}`;
	const userFilter = eq(expense.userId, userId);

	const [stats] = await db
		.select({
			total: sql<number>`count(*)`,
			monthTotal: sql<number>`coalesce(sum(${expense.amount}), 0)`
		})
		.from(expense)
		.where(and(userFilter, monthFilter));

	const rows = await db
		.select({
			id: expense.id,
			userId: expense.userId,
			amount: expense.amount,
			categoryId: expense.categoryId,
			approvedAt: expense.approvedAt,
			createdAt: expense.createdAt,
			category: {
				id: expenseCategory.id,
				userId: expenseCategory.userId,
				name: expenseCategory.name,
				createdAt: expenseCategory.createdAt
			}
		})
		.from(expense)
		.innerJoin(expenseCategory, eq(expense.categoryId, expenseCategory.id))
		.where(and(userFilter, monthFilter))
		.orderBy(desc(expense.createdAt))
		.limit(limit)
		.offset(offset);

	return {
		items: rows as ExpenseWithCategory[],
		total: Number(stats.total),
		page,
		limit,
		monthTotal: Number(stats.monthTotal)
	};
}

/**
 * 支出を新規作成する。
 * @ac AC-003
 */
export async function createExpense(
	db: Db,
	userId: string,
	data: ExpenseCreate
): Promise<ExpenseWithCategory> {
	const id = crypto.randomUUID();
	const now = new Date();

	await db.insert(expense).values({
		id,
		userId,
		amount: data.amount,
		categoryId: data.categoryId,
		approvedAt: null,
		createdAt: now
	});

	const row = await db
		.select({
			id: expense.id,
			userId: expense.userId,
			amount: expense.amount,
			categoryId: expense.categoryId,
			approvedAt: expense.approvedAt,
			createdAt: expense.createdAt,
			category: {
				id: expenseCategory.id,
				userId: expenseCategory.userId,
				name: expenseCategory.name,
				createdAt: expenseCategory.createdAt
			}
		})
		.from(expense)
		.innerJoin(expenseCategory, eq(expense.categoryId, expenseCategory.id))
		.where(eq(expense.id, id))
		.get();

	if (!row) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'サーバーエラーが発生しました');
	return row as ExpenseWithCategory;
}

/**
 * 支出を更新する。approved が true の場合は approvedAt に現在日時をセット、false の場合は null にする。
 * @ac AC-004, AC-005, AC-006
 * @throws {NOT_FOUND} - 該当支出が存在しない場合、または他ユーザーの支出の場合
 */
export async function updateExpense(
	db: Db,
	userId: string,
	id: string,
	data: ExpenseUpdate
): Promise<ExpenseWithCategory> {
	const existing = await db
		.select()
		.from(expense)
		.where(and(eq(expense.id, id), eq(expense.userId, userId)))
		.get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');

	const now = new Date();
	const approvedAt = data.approved ? now : null;

	await db
		.update(expense)
		.set({
			amount: data.amount,
			categoryId: data.categoryId,
			approvedAt
		})
		.where(and(eq(expense.id, id), eq(expense.userId, userId)));

	const row = await db
		.select({
			id: expense.id,
			userId: expense.userId,
			amount: expense.amount,
			categoryId: expense.categoryId,
			approvedAt: expense.approvedAt,
			createdAt: expense.createdAt,
			category: {
				id: expenseCategory.id,
				userId: expenseCategory.userId,
				name: expenseCategory.name,
				createdAt: expenseCategory.createdAt
			}
		})
		.from(expense)
		.innerJoin(expenseCategory, eq(expense.categoryId, expenseCategory.id))
		.where(eq(expense.id, id))
		.get();

	if (!row) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'サーバーエラーが発生しました');
	return row as ExpenseWithCategory;
}

/**
 * 支出を削除する。
 * @ac AC-007
 * @throws {NOT_FOUND} - 該当支出が存在しない場合、または他ユーザーの支出の場合
 */
export async function deleteExpense(db: Db, userId: string, id: string): Promise<void> {
	const existing = await db
		.select()
		.from(expense)
		.where(and(eq(expense.id, id), eq(expense.userId, userId)))
		.get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');

	await db.delete(expense).where(and(eq(expense.id, id), eq(expense.userId, userId)));
}

/**
 * 全期間の未承認支出件数を取得する（ダッシュボード警告バナー用）。
 * @ac AC-008, AC-009
 */
export async function getUnapprovedCount(db: Db, userId: string): Promise<number> {
	const [{ cnt }] = await db
		.select({ cnt: sql<number>`count(*)` })
		.from(expense)
		.where(and(eq(expense.userId, userId), sql`${expense.approvedAt} IS NULL`));

	return Number(cnt);
}
