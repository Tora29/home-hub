/**
 * @file サービス: Expense
 * @module src/routes/expenses/service.ts
 * @feature expenses
 *
 * @description
 * 支出機能のビジネスロジックと DB 操作を担う。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-013, AC-014, AC-015
 *
 * @entity Expense
 *
 * @functions
 * - getExpenses          - 一覧取得（月フィルタ・ページネーション付き）
 * - createExpense        - 新規作成
 * - updateExpense        - 更新（承認フラグ含む）
 * - deleteExpense        - 削除
 * - finalizeExpense      - 確定（確認済み → 確定済み）
 * - approveExpense       - 承認（未承認 → 確認済み）
 * - unapproveExpense     - 承認取消（確認済み → 未承認）
 * - getUnapprovedCount   - 全期間の未承認件数取得（ダッシュボード用）
 *
 * @test ./service.integration.test.ts
 */
import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { AppError } from '$lib/server/errors';
import { expense, expenseCategory, expensePayer } from '$lib/server/tables';
import type * as schema from '$lib/server/tables';
import type { ExpenseCreate, ExpenseUpdate } from './schema';
import type { ExpenseWithRelations } from './types';

type Db = DrizzleD1Database<typeof schema>;

type ListOptions = {
	month?: string;
	page?: number;
	limit?: number;
};

const expenseSelectFields = {
	id: expense.id,
	userId: expense.userId,
	amount: expense.amount,
	categoryId: expense.categoryId,
	payerId: expense.payerId,
	approvedAt: expense.approvedAt,
	finalizedAt: expense.finalizedAt,
	createdAt: expense.createdAt,
	category: {
		id: expenseCategory.id,
		userId: expenseCategory.userId,
		name: expenseCategory.name,
		createdAt: expenseCategory.createdAt
	},
	payer: {
		id: expensePayer.id,
		userId: expensePayer.userId,
		name: expensePayer.name,
		createdAt: expensePayer.createdAt
	}
};

async function fetchExpenseWithRelations(db: Db, id: string): Promise<ExpenseWithRelations> {
	const row = await db
		.select(expenseSelectFields)
		.from(expense)
		.innerJoin(expenseCategory, eq(expense.categoryId, expenseCategory.id))
		.leftJoin(expensePayer, eq(expense.payerId, expensePayer.id))
		.where(eq(expense.id, id))
		.get();
	if (!row) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'サーバーエラーが発生しました');
	return row as ExpenseWithRelations;
}

/**
 * 指定月の支出一覧をページネーション付きで取得する。month 未指定時は当月。
 * @ac AC-001, AC-002, AC-013
 */
export async function getExpenses(
	db: Db,
	userId: string,
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
	const now = new Date();
	const month =
		options.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	const offset = (page - 1) * limit;

	const [year, mon] = month.split('-').map(Number);
	const monthStart = new Date(year, mon - 1, 1);
	const monthEnd = new Date(year, mon, 1);
	const monthFilter = and(gte(expense.createdAt, monthStart), lt(expense.createdAt, monthEnd));
	const userFilter = eq(expense.userId, userId);

	const [stats] = await db
		.select({
			total: sql<number>`count(*)`,
			monthTotal: sql<number>`coalesce(sum(${expense.amount}), 0)`
		})
		.from(expense)
		.where(and(userFilter, monthFilter));

	const rows = await db
		.select(expenseSelectFields)
		.from(expense)
		.innerJoin(expenseCategory, eq(expense.categoryId, expenseCategory.id))
		.leftJoin(expensePayer, eq(expense.payerId, expensePayer.id))
		.where(and(userFilter, monthFilter))
		.orderBy(desc(expense.createdAt))
		.limit(limit)
		.offset(offset);

	return {
		items: rows as ExpenseWithRelations[],
		total: Number(stats.total),
		page,
		limit,
		monthTotal: Number(stats.monthTotal)
	};
}

/**
 * 支出を新規作成する。
 * @ac AC-003
 * @throws {NOT_FOUND} - 指定カテゴリまたは支払者が存在しない、または他ユーザーのものの場合
 */
export async function createExpense(
	db: Db,
	userId: string,
	data: ExpenseCreate
): Promise<ExpenseWithRelations> {
	const category = await db
		.select()
		.from(expenseCategory)
		.where(and(eq(expenseCategory.id, data.categoryId), eq(expenseCategory.userId, userId)))
		.get();
	if (!category) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');

	const payer = await db
		.select()
		.from(expensePayer)
		.where(and(eq(expensePayer.id, data.payerId), eq(expensePayer.userId, userId)))
		.get();
	if (!payer) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');

	const id = crypto.randomUUID();
	const now = new Date();

	await db.insert(expense).values({
		id,
		userId,
		amount: data.amount,
		categoryId: data.categoryId,
		payerId: data.payerId,
		approvedAt: null,
		createdAt: now
	});

	return fetchExpenseWithRelations(db, id);
}

/**
 * 支出を更新する。承認操作は /approve・/unapprove エンドポイントで行う。
 * @ac AC-006, AC-113
 * @throws {NOT_FOUND} - 該当支出が存在しない場合、または他ユーザーの支出の場合
 * @throws {CONFLICT} - 確定済みの支出の場合
 */
export async function updateExpense(
	db: Db,
	userId: string,
	id: string,
	data: ExpenseUpdate
): Promise<ExpenseWithRelations> {
	const existing = await db
		.select()
		.from(expense)
		.where(and(eq(expense.id, id), eq(expense.userId, userId)))
		.get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');
	if (existing.finalizedAt) throw new AppError('CONFLICT', 409, '確定済みの支出は変更できません');

	const category = await db
		.select()
		.from(expenseCategory)
		.where(and(eq(expenseCategory.id, data.categoryId), eq(expenseCategory.userId, userId)))
		.get();
	if (!category) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');

	const payer = await db
		.select()
		.from(expensePayer)
		.where(and(eq(expensePayer.id, data.payerId), eq(expensePayer.userId, userId)))
		.get();
	if (!payer) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');

	await db
		.update(expense)
		.set({
			amount: data.amount,
			categoryId: data.categoryId,
			payerId: data.payerId
		})
		.where(and(eq(expense.id, id), eq(expense.userId, userId)));

	return fetchExpenseWithRelations(db, id);
}

/**
 * 支出を削除する。
 * @ac AC-007, AC-113
 * @throws {NOT_FOUND} - 該当支出が存在しない場合、または他ユーザーの支出の場合
 * @throws {CONFLICT} - 確定済みの支出の場合
 */
export async function deleteExpense(db: Db, userId: string, id: string): Promise<void> {
	const existing = await db
		.select()
		.from(expense)
		.where(and(eq(expense.id, id), eq(expense.userId, userId)))
		.get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');
	if (existing.finalizedAt) throw new AppError('CONFLICT', 409, '確定済みの支出は変更できません');

	await db.delete(expense).where(and(eq(expense.id, id), eq(expense.userId, userId)));
}

/**
 * 確認済みの支出を確定する（確定後は変更不可）。
 * @ac AC-014
 * @throws {NOT_FOUND} - 該当支出が存在しない場合、または他ユーザーの支出の場合
 * @throws {CONFLICT} - すでに確定済みの場合、または未承認の場合
 */
export async function finalizeExpense(
	db: Db,
	userId: string,
	id: string
): Promise<ExpenseWithRelations> {
	const existing = await db
		.select()
		.from(expense)
		.where(and(eq(expense.id, id), eq(expense.userId, userId)))
		.get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');
	if (existing.finalizedAt) throw new AppError('CONFLICT', 409, '確定済みの支出は変更できません');
	if (!existing.approvedAt)
		throw new AppError('CONFLICT', 409, '確認済みにしてから確定してください');

	const now = new Date();
	await db
		.update(expense)
		.set({ finalizedAt: now })
		.where(and(eq(expense.id, id), eq(expense.userId, userId)));

	return fetchExpenseWithRelations(db, id);
}

/**
 * 未承認の支出を確認済みに更新する。
 * @ac AC-004
 * @throws {NOT_FOUND} - 該当支出が存在しない場合
 * @throws {CONFLICT} - 確定済みの支出の場合
 */
export async function approveExpense(
	db: Db,
	userId: string,
	id: string
): Promise<ExpenseWithRelations> {
	const existing = await db
		.select()
		.from(expense)
		.where(and(eq(expense.id, id), eq(expense.userId, userId)))
		.get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');
	if (existing.finalizedAt) throw new AppError('CONFLICT', 409, '確定済みの支出は変更できません');

	const now = new Date();
	await db
		.update(expense)
		.set({ approvedAt: now })
		.where(and(eq(expense.id, id), eq(expense.userId, userId)));

	return fetchExpenseWithRelations(db, id);
}

/**
 * 確認済みの支出を未承認に戻す。
 * @ac AC-005
 * @throws {NOT_FOUND} - 該当支出が存在しない場合
 * @throws {CONFLICT} - 確定済みの支出の場合
 */
export async function unapproveExpense(
	db: Db,
	userId: string,
	id: string
): Promise<ExpenseWithRelations> {
	const existing = await db
		.select()
		.from(expense)
		.where(and(eq(expense.id, id), eq(expense.userId, userId)))
		.get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');
	if (existing.finalizedAt) throw new AppError('CONFLICT', 409, '確定済みの支出は変更できません');

	await db
		.update(expense)
		.set({ approvedAt: null })
		.where(and(eq(expense.id, id), eq(expense.userId, userId)));

	return fetchExpenseWithRelations(db, id);
}

/**
 * 全期間の未承認支出件数を取得する（ダッシュボード警告バナー用）。
 * @ac dashboard/AC-008, dashboard/AC-009
 */
export async function getUnapprovedCount(db: Db, userId: string): Promise<number> {
	const [{ cnt }] = await db
		.select({ cnt: sql<number>`count(*)` })
		.from(expense)
		.where(and(eq(expense.userId, userId), sql`${expense.approvedAt} IS NULL`));

	return Number(cnt);
}
