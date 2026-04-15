/**
 * @file サービス: Dashboard Summary
 * @module src/routes/dashboard/summary/_lib/service.ts
 * @feature dashboard
 *
 * @description
 * ダッシュボード集計サマリーのビジネスロジックと DB 操作を担う。
 * 月別・全期間の支出合計・支払者別合計・カテゴリ別合計を算出する。
 *
 * @spec specs/dashboard/spec.md
 * @acceptance AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-201, AC-202, AC-203
 *
 * @entity DashboardSummary
 *
 * @functions
 * - getDashboardSummary - 集計サマリー取得（月別 / 全期間）
 *
 * @test ./service.integration.test.ts
 */
import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { expense, expenseCategory, user as userTable } from '$lib/server/tables';
import type * as schema from '$lib/server/tables';

type Db = DrizzleD1Database<typeof schema>;

type PayerSummary = {
	payerId: string;
	payerName: string | null;
	total: number;
};

type CategorySummary = {
	categoryId: string;
	categoryName: string;
	total: number;
};

type DashboardSummary = {
	overall: number;
	byPayer: PayerSummary[];
	byCategory: CategorySummary[];
};

type SummaryOptions = {
	period: 'month' | 'all';
	month?: string;
};

/**
 * 集計サマリーを取得する。period=month の場合は指定月、period=all の場合は全期間。
 * @ac AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-201, AC-202, AC-203
 */
export async function getDashboardSummary(
	db: Db,
	userId: string,
	options: SummaryOptions
): Promise<DashboardSummary> {
	const userFilter = eq(expense.userId, userId);

	let periodFilter;
	if (options.period === 'month') {
		const now = new Date();
		const month =
			options.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
		const [year, mon] = month.split('-').map(Number);
		const monthStart = new Date(year, mon - 1, 1);
		const monthEnd = new Date(year, mon, 1);
		periodFilter = and(gte(expense.createdAt, monthStart), lt(expense.createdAt, monthEnd));
	}

	const whereClause = periodFilter ? and(userFilter, periodFilter) : userFilter;

	// 全体合計
	const [overallRow] = await db
		.select({ total: sql<number>`coalesce(sum(${expense.amount}), 0)` })
		.from(expense)
		.where(whereClause);

	// 支払者別合計（多い順）
	// payerUserId が NULL の行は LEFT JOIN で user が null になるため除外される。
	const payerRows = await db
		.select({
			payerId: userTable.id,
			payerName: userTable.name,
			total: sql<number>`coalesce(sum(${expense.amount}), 0)`
		})
		.from(expense)
		.leftJoin(userTable, eq(expense.payerUserId, userTable.id))
		.where(whereClause)
		.groupBy(userTable.id, userTable.name)
		.having(sql`${userTable.id} is not null`)
		.orderBy(desc(sql`sum(${expense.amount})`));

	// カテゴリ別合計（多い順）
	const categoryRows = await db
		.select({
			categoryId: expenseCategory.id,
			categoryName: expenseCategory.name,
			total: sql<number>`coalesce(sum(${expense.amount}), 0)`
		})
		.from(expense)
		.innerJoin(expenseCategory, eq(expense.categoryId, expenseCategory.id))
		.where(whereClause)
		.groupBy(expenseCategory.id, expenseCategory.name)
		.orderBy(desc(sql`sum(${expense.amount})`));

	return {
		overall: Number(overallRow.total),
		byPayer: payerRows.map((r) => ({
			payerId: r.payerId!,
			payerName: r.payerName,
			total: Number(r.total)
		})),
		byCategory: categoryRows.map((r) => ({
			categoryId: r.categoryId,
			categoryName: r.categoryName,
			total: Number(r.total)
		}))
	};
}
