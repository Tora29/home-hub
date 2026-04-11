/**
 * @file サービス: Expense
 * @module src/routes/expenses/service.ts
 * @feature expenses
 *
 * @description
 * 支出機能のビジネスロジックと DB 操作を担う。
 * 一覧は全ユーザー（世帯合計）を対象とする。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-010, AC-014
 *
 * @entity Expense
 *
 * @functions
 * - getExpenses            - 一覧取得（月フィルタ・ページネーション・全ユーザー）
 * - createExpense          - 新規作成
 * - updateExpense          - 更新（金額・カテゴリ・支払者）
 * - deleteExpense          - 削除
 * - checkExpense           - 確認（unapproved → checked）
 * - uncheckExpense         - 確認取消（checked → unapproved）
 * - requestExpenses        - 一括承認依頼（自分の checked → pending）
 * - cancelExpenses         - 一括申請取り消し（自分の pending → checked）
 * - approveExpenses        - 一括承認（相手の pending → approved）
 * - getPendingApprovalCount - 全期間の承認待ち件数取得（ダッシュボード用）
 *
 * @test ./service.integration.test.ts
 */
import { and, desc, eq, gte, lt, ne, sql, type ExtractTablesWithRelations } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { D1Result } from '@cloudflare/workers-types';
import { AppError } from '$lib/server/errors';
import { expense, expenseCategory, user } from '$lib/server/tables';
import type * as schema from '$lib/server/tables';
import type { ExpenseCreate, ExpenseUpdate } from './schema';
import type { ExpenseWithRelations } from './types';

// BaseSQLiteDatabase は DrizzleD1Database・SQLiteTransaction 双方の共通基底型。
// transaction コールバック内でも同一の関数が使えるようにするため union ではなくこの型を使う。
type Db = BaseSQLiteDatabase<
	'async',
	D1Result,
	typeof schema,
	ExtractTablesWithRelations<typeof schema>
>;

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
	payerUserId: expense.payerUserId,
	status: expense.status,
	createdAt: expense.createdAt,
	category: {
		id: expenseCategory.id,
		userId: expenseCategory.userId,
		name: expenseCategory.name,
		createdAt: expenseCategory.createdAt
	},
	payer: {
		id: user.id,
		name: user.name,
		email: user.email
	}
};

async function fetchExpenseWithRelations(db: Db, id: string): Promise<ExpenseWithRelations> {
	const row = await db
		.select(expenseSelectFields)
		.from(expense)
		.innerJoin(expenseCategory, eq(expense.categoryId, expenseCategory.id))
		.leftJoin(user, eq(expense.payerUserId, user.id))
		.where(eq(expense.id, id))
		.get();
	if (!row) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'サーバーエラーが発生しました');
	return row as ExpenseWithRelations;
}

/**
 * 全ユーザーの指定月の支出一覧をページネーション付きで取得する。month 未指定時は当月。
 * @ac AC-001, AC-002, AC-014
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
	const now = new Date();
	const month =
		options.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	const offset = (page - 1) * limit;

	const [year, mon] = month.split('-').map(Number);
	const monthStart = new Date(year, mon - 1, 1);
	const monthEnd = new Date(year, mon, 1);
	const monthFilter = and(gte(expense.createdAt, monthStart), lt(expense.createdAt, monthEnd));

	const [stats] = await db
		.select({
			total: sql<number>`count(*)`,
			monthTotal: sql<number>`coalesce(sum(${expense.amount}), 0)`
		})
		.from(expense)
		.where(monthFilter);

	const rows = await db
		.select(expenseSelectFields)
		.from(expense)
		.innerJoin(expenseCategory, eq(expense.categoryId, expenseCategory.id))
		.leftJoin(user, eq(expense.payerUserId, user.id))
		.where(monthFilter)
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
 * 支出を新規作成する。status は unapproved で作成する。
 * @ac AC-003
 * @throws {NOT_FOUND} - 指定カテゴリが存在しない場合、または自分以外のカテゴリの場合
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

	const id = crypto.randomUUID();
	const now = new Date();

	await db.insert(expense).values({
		id,
		userId,
		amount: data.amount,
		categoryId: data.categoryId,
		payerUserId: data.payerUserId,
		status: 'unapproved',
		createdAt: now
	});

	return fetchExpenseWithRelations(db, id);
}

/**
 * 支出を更新する。pending/approved の支出は変更不可。他ユーザーの支出は変更不可。
 * @ac AC-006, AC-113, AC-114
 * @throws {NOT_FOUND} - 該当支出が存在しない場合
 * @throws {CONFLICT} - pending または approved の支出の場合
 * @throws {FORBIDDEN} - 他ユーザーの支出の場合
 */
export async function updateExpense(
	db: Db,
	userId: string,
	id: string,
	data: ExpenseUpdate
): Promise<ExpenseWithRelations> {
	const existing = await db.select().from(expense).where(eq(expense.id, id)).get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');
	if (existing.userId !== userId)
		throw new AppError('FORBIDDEN', 403, '他のユーザーの支出は操作できません');
	if (existing.status === 'pending' || existing.status === 'approved')
		throw new AppError('CONFLICT', 409, '申請中または承認済みの支出は変更できません');

	const category = await db
		.select()
		.from(expenseCategory)
		.where(and(eq(expenseCategory.id, data.categoryId), eq(expenseCategory.userId, userId)))
		.get();
	if (!category) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');

	await db
		.update(expense)
		.set({
			amount: data.amount,
			categoryId: data.categoryId,
			payerUserId: data.payerUserId
		})
		.where(eq(expense.id, id));

	return fetchExpenseWithRelations(db, id);
}

/**
 * 支出を削除する。pending/approved の支出は削除不可。他ユーザーの支出は削除不可。
 * @ac AC-007, AC-113, AC-114
 * @throws {NOT_FOUND} - 該当支出が存在しない場合
 * @throws {CONFLICT} - pending または approved の支出の場合
 * @throws {FORBIDDEN} - 他ユーザーの支出の場合
 */
export async function deleteExpense(db: Db, userId: string, id: string): Promise<void> {
	const existing = await db.select().from(expense).where(eq(expense.id, id)).get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');
	if (existing.userId !== userId)
		throw new AppError('FORBIDDEN', 403, '他のユーザーの支出は操作できません');
	if (existing.status === 'pending' || existing.status === 'approved')
		throw new AppError('CONFLICT', 409, '申請中または承認済みの支出は変更できません');

	await db.delete(expense).where(eq(expense.id, id));
}

/**
 * unapproved の支出を checked に更新する。自分の支出のみ操作可。
 * @ac AC-004, AC-114
 * @throws {NOT_FOUND} - 該当支出が存在しない場合
 * @throws {FORBIDDEN} - 他ユーザーの支出の場合
 * @throws {CONFLICT} - unapproved 以外の場合
 */
export async function checkExpense(
	db: Db,
	userId: string,
	id: string
): Promise<ExpenseWithRelations> {
	const existing = await db.select().from(expense).where(eq(expense.id, id)).get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');
	if (existing.userId !== userId)
		throw new AppError('FORBIDDEN', 403, '他のユーザーの支出は操作できません');
	if (existing.status !== 'unapproved')
		throw new AppError('CONFLICT', 409, '未承認の支出のみ確認できます');

	await db.update(expense).set({ status: 'checked' }).where(eq(expense.id, id));

	return fetchExpenseWithRelations(db, id);
}

/**
 * checked の支出を unapproved に戻す。自分の支出のみ操作可。
 * @ac AC-005, AC-114
 * @throws {NOT_FOUND} - 該当支出が存在しない場合
 * @throws {FORBIDDEN} - 他ユーザーの支出の場合
 * @throws {CONFLICT} - checked 以外の場合
 */
export async function uncheckExpense(
	db: Db,
	userId: string,
	id: string
): Promise<ExpenseWithRelations> {
	const existing = await db.select().from(expense).where(eq(expense.id, id)).get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');
	if (existing.userId !== userId)
		throw new AppError('FORBIDDEN', 403, '他のユーザーの支出は操作できません');
	if (existing.status !== 'checked')
		throw new AppError('CONFLICT', 409, '確認済みの支出のみ取り消せます');

	await db.update(expense).set({ status: 'unapproved' }).where(eq(expense.id, id));

	return fetchExpenseWithRelations(db, id);
}

/**
 * 自分の checked 支出を全件 pending に変更する。
 * @ac AC-008, AC-115
 * @throws {CONFLICT} - checked 支出が 0 件の場合
 */
export async function requestExpenses(db: Db, userId: string): Promise<number> {
	const checked = await db
		.select({ id: expense.id })
		.from(expense)
		.where(and(eq(expense.userId, userId), eq(expense.status, 'checked')));

	if (checked.length === 0) throw new AppError('CONFLICT', 409, '確認済みの支出がありません');

	await db
		.update(expense)
		.set({ status: 'pending' })
		.where(and(eq(expense.userId, userId), eq(expense.status, 'checked')));

	return checked.length;
}

/**
 * 自分の pending 支出を全件 checked に戻す。
 * @ac AC-009, AC-116
 * @throws {CONFLICT} - pending 支出が 0 件の場合
 */
export async function cancelExpenses(db: Db, userId: string): Promise<number> {
	const pending = await db
		.select({ id: expense.id })
		.from(expense)
		.where(and(eq(expense.userId, userId), eq(expense.status, 'pending')));

	if (pending.length === 0) throw new AppError('CONFLICT', 409, '申請中の支出がありません');

	await db
		.update(expense)
		.set({ status: 'checked' })
		.where(and(eq(expense.userId, userId), eq(expense.status, 'pending')));

	return pending.length;
}

/**
 * パートナーの pending 支出を全件 approved に変更する。0件の場合は CONFLICT を throw する。
 * @ac AC-010, AC-118
 * @throws {CONFLICT} - パートナーの pending 支出が 0 件の場合
 */
export async function approveExpenses(db: Db, userId: string, partnerId: string): Promise<number> {
	const pending = await db
		.select({ id: expense.id })
		.from(expense)
		.where(and(eq(expense.userId, partnerId), eq(expense.status, 'pending')));

	if (pending.length === 0) throw new AppError('CONFLICT', 409, '承認できる支出がありません');

	await db
		.update(expense)
		.set({ status: 'approved' })
		.where(and(eq(expense.userId, partnerId), eq(expense.status, 'pending')));

	return pending.length;
}

/**
 * 全期間の承認待ち件数を取得する（パートナーからの pending 支出）。ダッシュボード警告バナー用。
 * @ac dashboard/AC-008, dashboard/AC-009
 */
export async function getPendingApprovalCount(
	db: Db,
	userId: string,
	partnerId: string | null
): Promise<number> {
	if (!partnerId) return 0;
	const [{ cnt }] = await db
		.select({ cnt: sql<number>`count(*)` })
		.from(expense)
		.where(and(eq(expense.userId, partnerId), eq(expense.status, 'pending')));

	return Number(cnt);
}

/**
 * 支出一覧画面の支払者選択用に全ユーザー一覧を取得する。
 * @ac AC-003, AC-006
 */
export async function getUsers(
	db: Db,
	_userId: string
): Promise<Array<{ id: string; name: string; email: string }>> {
	return db.select({ id: user.id, name: user.name, email: user.email }).from(user);
}

/**
 * 一括操作ボタン表示判定用のカウントを取得する。
 * @ac AC-008, AC-009, AC-010
 */
export async function getBulkCounts(
	db: Db,
	userId: string,
	partnerId: string | null
): Promise<{ myChecked: number; myPending: number; othersPending: number }> {
	const [checked] = await db
		.select({ cnt: sql<number>`count(*)` })
		.from(expense)
		.where(and(eq(expense.userId, userId), eq(expense.status, 'checked')));

	const [pending] = await db
		.select({ cnt: sql<number>`count(*)` })
		.from(expense)
		.where(and(eq(expense.userId, userId), eq(expense.status, 'pending')));

	if (!partnerId) {
		return {
			myChecked: Number(checked.cnt),
			myPending: Number(pending.cnt),
			othersPending: 0
		};
	}

	const [partnerPending] = await db
		.select({ cnt: sql<number>`count(*)` })
		.from(expense)
		.where(and(eq(expense.userId, partnerId), eq(expense.status, 'pending')));

	return {
		myChecked: Number(checked.cnt),
		myPending: Number(pending.cnt),
		othersPending: Number(partnerPending.cnt)
	};
}

/**
 * パートナーユーザーの ID を返す。ロールが設定されている場合は対応ロールで検索し、
 * 未設定（移行期）の場合は自分以外の最初のユーザーを返す。パートナーが存在しない場合は null。
 */
export async function getPartnerUserId(db: Db, userId: string): Promise<string | null> {
	const currentUser = await db
		.select({ role: user.role })
		.from(user)
		.where(eq(user.id, userId))
		.get();

	if (currentUser?.role) {
		const partnerRole = currentUser.role === 'primary' ? 'spouse' : 'primary';
		const partner = await db
			.select({ id: user.id })
			.from(user)
			.where(eq(user.role, partnerRole))
			.get();
		return partner?.id ?? null;
	}

	// ロール未設定（移行期）: 自分以外の最初のユーザーをパートナーとみなす
	const partner = await db
		.select({ id: user.id })
		.from(user)
		.where(ne(user.id, userId))
		.limit(1)
		.get();
	return partner?.id ?? null;
}
