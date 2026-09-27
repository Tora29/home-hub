/**
 * @file サービス: Expense
 * @module src/lib/features/expenses/server/service.ts
 * @feature expenses
 *
 * @description
 * 支出の一覧取得・登録・更新・削除（CRUD）を担う。一覧は全ユーザーの支出を返す（世帯合計モデル）。
 * 承認ワークフローは ./workflow.ts、LINE 通知は ./line.ts。
 *
 * @entity Expense
 *
 * @functions
 * - getExpenses    - 一覧取得（月フィルタ・ページネーション・月合計付き・全ユーザー）
 * - getUsers       - 全ユーザー取得（支払者選択用）
 * - createExpense  - 新規作成（status=unapproved。NOT_FOUND: カテゴリ/支払者不在）
 * - updateExpense  - 更新（NOT_FOUND / FORBIDDEN: 他ユーザー / CONFLICT: pending・approved）
 * - deleteExpense  - 削除（NOT_FOUND / FORBIDDEN: 他ユーザー / CONFLICT: pending・approved）
 *
 * @test ./service.integration.test.ts
 */
import { and, count, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { AppError } from '$lib/server/errors';
import { expense, expenseCategory, user as userTable } from '$lib/server/tables';
import { getCurrentMonth, getMonthRange } from '$lib/utils/date';
import type { ExpenseCreate, ExpenseUpdate } from '../schema';
import type { ExpenseWithRelations, User } from '../types';
import {
	type Db,
	expenseSelectFields,
	fetchExpenseWithRelations,
	getOwnedExpenseOrThrow
} from './shared';

type ListOptions = {
	month?: string;
	page?: number;
	limit?: number;
};

/**
 * カテゴリ・支払者の存在を確認する（FK 違反を 500 にしないため）。
 * @throws {NOT_FOUND} - カテゴリまたは支払者が存在しない場合
 */
async function assertCategoryAndPayerExist(db: Db, data: ExpenseCreate): Promise<void> {
	const [category, payer] = await Promise.all([
		db
			.select({ id: expenseCategory.id })
			.from(expenseCategory)
			.where(eq(expenseCategory.id, data.categoryId))
			.get(),
		db.select({ id: userTable.id }).from(userTable).where(eq(userTable.id, data.payerUserId)).get()
	]);
	if (!category) throw new AppError('NOT_FOUND', 404, 'カテゴリが見つかりません');
	if (!payer) throw new AppError('NOT_FOUND', 404, '支払者が見つかりません');
}

/**
 * 指定月の全ユーザーの支出一覧をページネーション付きで取得する。month 未指定時は当月（JST）。
 */
export async function getExpenses(
	db: Db,
	options: ListOptions = {}
): Promise<{
	items: ExpenseWithRelations[];
	total: number;
	page: number;
	limit: number;
	monthTotal: number;
}> {
	const page = options.page ?? 1;
	const limit = Math.min(options.limit ?? 20, 100);
	const month = options.month ?? getCurrentMonth();
	const offset = (page - 1) * limit;

	const { start: monthStart, end: monthEnd } = getMonthRange(month);
	const monthFilter = and(gte(expense.createdAt, monthStart), lt(expense.createdAt, monthEnd));

	const [stats] = await db
		.select({
			total: count(),
			monthTotal: sql<number>`coalesce(sum(${expense.amount}), 0)`.mapWith(Number)
		})
		.from(expense)
		.where(monthFilter);

	const rows = await db
		.select(expenseSelectFields)
		.from(expense)
		.innerJoin(expenseCategory, eq(expense.categoryId, expenseCategory.id))
		.innerJoin(userTable, eq(expense.payerUserId, userTable.id))
		.where(monthFilter)
		.orderBy(desc(expense.createdAt), desc(sql`"Expense".rowid`))
		.limit(limit)
		.offset(offset);

	return {
		// createdAt は Date（JSON 化で ISO 文字列）・status は text カラムのため型を合わせる
		items: rows as unknown as ExpenseWithRelations[],
		total: stats.total,
		page,
		limit,
		monthTotal: stats.monthTotal
	};
}

/**
 * 全ユーザー一覧を取得する（支払者選択用）。
 */
export async function getUsers(db: Db): Promise<User[]> {
	return db
		.select({ id: userTable.id, name: userTable.name, email: userTable.email })
		.from(userTable);
}

/**
 * 支出を新規作成する。status は unapproved で初期化。
 * @throws {NOT_FOUND} - 指定カテゴリまたは支払者が存在しない場合
 */
export async function createExpense(
	db: Db,
	userId: string,
	data: ExpenseCreate
): Promise<ExpenseWithRelations> {
	await assertCategoryAndPayerExist(db, data);

	const id = crypto.randomUUID();
	await db.insert(expense).values({
		id,
		userId,
		amount: data.amount,
		categoryId: data.categoryId,
		payerUserId: data.payerUserId,
		status: 'unapproved',
		createdAt: new Date()
	});

	return fetchExpenseWithRelations(db, id);
}

/**
 * 支出を更新する（PUT = 完全置換）。pending/approved・他ユーザーの支出は変更不可。
 * @throws {NOT_FOUND} - 該当支出・指定カテゴリ・支払者のいずれかが存在しない場合
 * @throws {FORBIDDEN} - 他ユーザーの支出の場合
 * @throws {CONFLICT} - pending/approved の支出の場合
 */
export async function updateExpense(
	db: Db,
	userId: string,
	id: string,
	data: ExpenseUpdate
): Promise<ExpenseWithRelations> {
	const existing = await getOwnedExpenseOrThrow(db, userId, id);
	if (existing.status === 'pending' || existing.status === 'approved')
		throw new AppError('CONFLICT', 409, '申請中または承認済みの支出は変更できません');

	await assertCategoryAndPayerExist(db, data);

	await db
		.update(expense)
		.set({ amount: data.amount, categoryId: data.categoryId, payerUserId: data.payerUserId })
		.where(eq(expense.id, id));

	return fetchExpenseWithRelations(db, id);
}

/**
 * 支出を削除する。pending/approved・他ユーザーの支出は削除不可。
 * @throws {NOT_FOUND} - 該当支出が存在しない場合
 * @throws {FORBIDDEN} - 他ユーザーの支出の場合
 * @throws {CONFLICT} - pending/approved の支出の場合
 */
export async function deleteExpense(db: Db, userId: string, id: string): Promise<void> {
	const existing = await getOwnedExpenseOrThrow(db, userId, id);
	if (existing.status === 'pending' || existing.status === 'approved')
		throw new AppError('CONFLICT', 409, '申請中または承認済みの支出は変更できません');

	await db.delete(expense).where(eq(expense.id, id));
}
