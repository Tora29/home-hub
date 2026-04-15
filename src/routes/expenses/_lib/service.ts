/**
 * @file サービス: Expense
 * @module src/routes/expenses/_lib/service.ts
 * @feature expenses
 *
 * @description
 * 支出機能のビジネスロジックと DB 操作を担う。
 * 承認ワークフロー（unapproved → checked → pending → approved）と
 * LINE 通知連携を含む。一覧は全ユーザーの支出を返す（世帯合計モデル）。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-010, AC-013, AC-014
 *
 * @entity Expense
 *
 * @functions
 * - getExpenses          - 一覧取得（月フィルタ・ページネーション付き・全ユーザー）
 * - getUsers             - 全ユーザー取得（支払者選択用）
 * - createExpense        - 新規作成（status=unapproved）
 * - updateExpense        - 更新（FORBIDDEN: 他ユーザー, CONFLICT: pending/approved）
 * - deleteExpense        - 削除（FORBIDDEN: 他ユーザー, CONFLICT: pending/approved）
 * - checkExpense         - 確認（unapproved → checked）
 * - uncheckExpense       - 確認取消（checked → unapproved）
 * - requestExpenses      - 一括承認依頼（checked → pending + LINE 通知）
 * - cancelExpenses       - 一括申請取り消し（pending → checked）
 * - approveExpenses      - 一括承認（相手の pending → approved + LINE 通知）
 * - getUnapprovedCount   - 全期間の未承認件数取得（ダッシュボード用）
 *
 * @test ./service.integration.test.ts
 */
import { and, desc, eq, gte, lt, ne, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { AppError } from '$lib/server/errors';
import { expense, expenseCategory, user as userTable } from '$lib/server/tables';
import type * as schema from '$lib/server/tables';
import type { ExpenseCreate, ExpenseUpdate } from './schema';
import type { ExpenseWithRelations, User } from './types';

type Db = DrizzleD1Database<typeof schema>;

type ListOptions = {
	month?: string;
	page?: number;
	limit?: number;
};

export type LineEnv = {
	lineChannelAccessToken?: string;
	lineUserIdPrimary?: string;
	lineUserIdSpouse?: string;
	lineMock?: string;
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
		id: userTable.id,
		name: userTable.name,
		email: userTable.email
	}
};

async function fetchExpenseWithRelations(db: Db, id: string): Promise<ExpenseWithRelations> {
	const row = await db
		.select(expenseSelectFields)
		.from(expense)
		.innerJoin(expenseCategory, eq(expense.categoryId, expenseCategory.id))
		.leftJoin(userTable, eq(expense.payerUserId, userTable.id))
		.where(eq(expense.id, id))
		.get();
	if (!row) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'サーバーエラーが発生しました');
	return {
		...row,
		payer: row.payer?.id ? (row.payer as User) : null
	} as unknown as ExpenseWithRelations;
}

async function sendLineMessage(
	lineUserId: string,
	message: string,
	lineChannelAccessToken: string
): Promise<void> {
	const res = await fetch('https://api.line.me/v2/bot/message/push', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${lineChannelAccessToken}`
		},
		body: JSON.stringify({
			to: lineUserId,
			messages: [{ type: 'text', text: message }]
		})
	});
	if (!res.ok) {
		throw new AppError(
			'BAD_GATEWAY',
			502,
			'LINE 通知の送信に失敗したため承認フローを完了できませんでした'
		);
	}
}

function resolvePartnerLineUserId(role: string | null, lineEnv: LineEnv): string | undefined {
	if (role === 'main') return lineEnv.lineUserIdSpouse;
	if (role === 'partner') return lineEnv.lineUserIdPrimary;
	return undefined; // role=null → 通知スキップ（AC-119）
}

/**
 * 指定月の全ユーザーの支出一覧をページネーション付きで取得する。month 未指定時は当月。
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
		.leftJoin(userTable, eq(expense.payerUserId, userTable.id))
		.where(monthFilter)
		.orderBy(desc(expense.createdAt))
		.limit(limit)
		.offset(offset);

	return {
		items: rows.map((r) => ({
			...r,
			payer: r.payer?.id ? (r.payer as User) : null
		})) as unknown as ExpenseWithRelations[],
		total: Number(stats.total),
		page,
		limit,
		monthTotal: Number(stats.monthTotal)
	};
}

/**
 * 全ユーザー一覧を取得する（支払者選択用）。
 * @ac AC-003
 */
export async function getUsers(db: Db): Promise<User[]> {
	return db
		.select({ id: userTable.id, name: userTable.name, email: userTable.email })
		.from(userTable);
}

/**
 * 支出を新規作成する。status は unapproved で初期化。
 * @ac AC-003
 * @throws {NOT_FOUND} - 指定カテゴリが存在しない場合
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
 * 支出を更新する。pending/approved は変更不可。他ユーザーの支出は変更不可。
 * @ac AC-006, AC-113, AC-114
 * @throws {NOT_FOUND} - 該当支出が存在しない場合
 * @throws {FORBIDDEN} - 他ユーザーの支出の場合
 * @throws {CONFLICT} - pending/approved の支出の場合
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
		.set({ amount: data.amount, categoryId: data.categoryId, payerUserId: data.payerUserId })
		.where(eq(expense.id, id));

	return fetchExpenseWithRelations(db, id);
}

/**
 * 支出を削除する。pending/approved は変更不可。他ユーザーの支出は変更不可。
 * @ac AC-007, AC-113, AC-114
 * @throws {NOT_FOUND} - 該当支出が存在しない場合
 * @throws {FORBIDDEN} - 他ユーザーの支出の場合
 * @throws {CONFLICT} - pending/approved の支出の場合
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
 * 支出を unapproved → checked に更新する。
 * @ac AC-004, AC-114
 * @throws {NOT_FOUND} - 該当支出が存在しない場合
 * @throws {FORBIDDEN} - 他ユーザーの支出の場合
 * @throws {CONFLICT} - unapproved 以外の支出の場合
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
		throw new AppError('CONFLICT', 409, '確認できる状態の支出ではありません');

	await db.update(expense).set({ status: 'checked' }).where(eq(expense.id, id));

	return fetchExpenseWithRelations(db, id);
}

/**
 * 支出を checked → unapproved に戻す。
 * @ac AC-005, AC-114
 * @throws {NOT_FOUND} - 該当支出が存在しない場合
 * @throws {FORBIDDEN} - 他ユーザーの支出の場合
 * @throws {CONFLICT} - checked 以外の支出の場合
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
		throw new AppError('CONFLICT', 409, '確認取消できる状態の支出ではありません');

	await db.update(expense).set({ status: 'unapproved' }).where(eq(expense.id, id));

	return fetchExpenseWithRelations(db, id);
}

/**
 * 自分の checked 支出を一括で pending に変更し、相手に LINE 通知を送信する。
 * @ac AC-008, AC-115, AC-119, AC-120
 * @throws {CONFLICT} - checked 支出が 0 件の場合
 * @throws {BAD_GATEWAY} - LINE API 失敗の場合
 */
export async function requestExpenses(
	db: Db,
	userId: string,
	currentUserRole: string | null,
	lineEnv: LineEnv
): Promise<{ count: number }> {
	const checkedExpenses = await db
		.select({ id: expense.id })
		.from(expense)
		.where(and(eq(expense.userId, userId), eq(expense.status, 'checked')));

	if (checkedExpenses.length === 0)
		throw new AppError('CONFLICT', 409, '確認済みの支出がありません');

	const partnerLineUserId = resolvePartnerLineUserId(currentUserRole, lineEnv);
	const shouldNotify =
		partnerLineUserId && lineEnv.lineChannelAccessToken && lineEnv.lineMock !== 'true';

	if (shouldNotify) {
		// LINE 失敗時はロールバック（AC-120）
		await db.transaction(async (tx) => {
			await tx
				.update(expense)
				.set({ status: 'pending' })
				.where(and(eq(expense.userId, userId), eq(expense.status, 'checked')));

			await sendLineMessage(
				partnerLineUserId!,
				'承認依頼が届いています。確認してください。',
				lineEnv.lineChannelAccessToken!
			);
		});
	} else {
		// role=null / lineUserId 未設定 / MOCK モード → 通知スキップ（AC-119, AC-125）
		await db
			.update(expense)
			.set({ status: 'pending' })
			.where(and(eq(expense.userId, userId), eq(expense.status, 'checked')));
	}

	return { count: checkedExpenses.length };
}

/**
 * 自分の pending 支出を一括で checked に戻す。
 * @ac AC-009, AC-116
 * @throws {CONFLICT} - pending 支出が 0 件の場合
 */
export async function cancelExpenses(db: Db, userId: string): Promise<{ count: number }> {
	const pendingExpenses = await db
		.select({ id: expense.id })
		.from(expense)
		.where(and(eq(expense.userId, userId), eq(expense.status, 'pending')));

	if (pendingExpenses.length === 0) throw new AppError('CONFLICT', 409, '申請中の支出がありません');

	await db
		.update(expense)
		.set({ status: 'checked' })
		.where(and(eq(expense.userId, userId), eq(expense.status, 'pending')));

	return { count: pendingExpenses.length };
}

/**
 * 自分以外の pending 支出を一括で approved に変更し、相手に LINE 通知を送信する。
 * 自分の pending は対象外（AC-010）。
 * @ac AC-010, AC-118, AC-119, AC-120
 * @throws {CONFLICT} - 承認対象の pending 支出が 0 件の場合
 * @throws {BAD_GATEWAY} - LINE API 失敗の場合
 */
export async function approveExpenses(
	db: Db,
	userId: string,
	currentUserRole: string | null,
	lineEnv: LineEnv
): Promise<{ count: number }> {
	const pendingExpenses = await db
		.select({ id: expense.id })
		.from(expense)
		.where(and(ne(expense.userId, userId), eq(expense.status, 'pending')));

	if (pendingExpenses.length === 0)
		throw new AppError('CONFLICT', 409, '承認できる支出がありません');

	const partnerLineUserId = resolvePartnerLineUserId(currentUserRole, lineEnv);
	const shouldNotify =
		partnerLineUserId && lineEnv.lineChannelAccessToken && lineEnv.lineMock !== 'true';

	if (shouldNotify) {
		// LINE 失敗時はロールバック（AC-120）
		await db.transaction(async (tx) => {
			await tx
				.update(expense)
				.set({ status: 'approved' })
				.where(and(ne(expense.userId, userId), eq(expense.status, 'pending')));

			await sendLineMessage(
				partnerLineUserId!,
				'支出が承認されました。',
				lineEnv.lineChannelAccessToken!
			);
		});
	} else {
		await db
			.update(expense)
			.set({ status: 'approved' })
			.where(and(ne(expense.userId, userId), eq(expense.status, 'pending')));
	}

	return { count: pendingExpenses.length };
}

/**
 * 全期間の自分以外の pending 支出件数を取得する（ダッシュボード警告バナー用）。
 * @ac dashboard/AC-008, dashboard/AC-009
 */
export async function getUnapprovedCount(db: Db, userId: string): Promise<number> {
	const [{ cnt }] = await db
		.select({ cnt: sql<number>`count(*)` })
		.from(expense)
		.where(and(ne(expense.userId, userId), eq(expense.status, 'pending')));

	return Number(cnt);
}
