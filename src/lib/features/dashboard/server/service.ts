/**
 * @file サービス: Dashboard Summary
 * @module src/lib/features/dashboard/server/service.ts
 * @feature dashboard
 *
 * @description
 * ダッシュボード集計サマリーのビジネスロジックと DB 操作を担う。
 * 全ユーザー（世帯）分を合算した月別・全期間の支出合計・支払者別合計・カテゴリ別合計を算出する。
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
import { and, desc, eq, gte, lt, sql, type SQL } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { expense, expenseCategory, user as userTable } from '$lib/server/tables';
import type * as schema from '$lib/server/tables';
import { getCurrentMonth } from '$lib/utils/date';
import type { DashboardSummary } from '../types';

type Db = DrizzleD1Database<typeof schema>;

type SummaryOptions = {
	period: 'month' | 'all';
	month?: string;
};

// 支出金額合計の SQL 式（NULL 時は 0）。複数の集計クエリで共通利用する。
const totalExpr = sql<number>`coalesce(sum(${expense.amount}), 0)`;

/**
 * 集計サマリーを取得する。period=month の場合は指定月、period=all の場合は全期間。
 * 集計対象は全ユーザー（世帯）の支出。
 * @ac AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-201, AC-202, AC-203
 */
export async function getDashboardSummary(
	db: Db,
	options: SummaryOptions
): Promise<DashboardSummary> {
	let whereClause: SQL | undefined;
	if (options.period === 'month') {
		const month = options.month ?? getCurrentMonth();
		const [year, mon] = month.split('-').map(Number);
		const monthStart = new Date(year, mon - 1, 1);
		const monthEnd = new Date(year, mon, 1);
		whereClause = and(gte(expense.createdAt, monthStart), lt(expense.createdAt, monthEnd));
	}

	// 全体合計
	const [overallRow] = await db.select({ total: totalExpr }).from(expense).where(whereClause);

	// 支払者別合計（多い順）
	const payerRows = await db
		.select({
			payerId: userTable.id,
			payerName: userTable.name,
			total: totalExpr
		})
		.from(expense)
		.innerJoin(userTable, eq(expense.payerUserId, userTable.id))
		.where(whereClause)
		.groupBy(userTable.id, userTable.name)
		.orderBy(desc(sql`sum(${expense.amount})`));

	// カテゴリ別合計（多い順）
	const categoryRows = await db
		.select({
			categoryId: expenseCategory.id,
			categoryName: expenseCategory.name,
			total: totalExpr
		})
		.from(expense)
		.innerJoin(expenseCategory, eq(expense.categoryId, expenseCategory.id))
		.where(whereClause)
		.groupBy(expenseCategory.id, expenseCategory.name)
		.orderBy(desc(sql`sum(${expense.amount})`));

	// カテゴリ×支払者の内訳（多い順）
	const categoryPayerRows = await db
		.select({
			categoryId: expenseCategory.id,
			payerId: userTable.id,
			payerName: userTable.name,
			total: totalExpr
		})
		.from(expense)
		.innerJoin(expenseCategory, eq(expense.categoryId, expenseCategory.id))
		.innerJoin(userTable, eq(expense.payerUserId, userTable.id))
		.where(whereClause)
		.groupBy(expenseCategory.id, userTable.id, userTable.name)
		.orderBy(desc(sql`sum(${expense.amount})`));

	return {
		overall: Number(overallRow.total),
		byPayer: payerRows.map((r) => ({
			payerId: r.payerId,
			payerName: r.payerName,
			total: Number(r.total)
		})),
		byCategory: categoryRows.map((r) => ({
			categoryId: r.categoryId,
			categoryName: r.categoryName,
			total: Number(r.total),
			byPayer: categoryPayerRows
				.filter((p) => p.categoryId === r.categoryId)
				.map((p) => ({
					payerId: p.payerId,
					payerName: p.payerName,
					total: Number(p.total)
				}))
		}))
	};
}
