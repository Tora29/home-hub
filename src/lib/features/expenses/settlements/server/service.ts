/**
 * @file サービス: 精算額
 * @module src/lib/features/expenses/settlements/server/service.ts
 * @feature expenses
 *
 * @description
 * 夫婦 2 人の月ごとの精算額（承認済み支出の折半）を算出する。精算の記録は持たない（確認のみ）。
 * 差額 = |A の支払合計 − B の支払合計| ÷ 2（1 円未満切り捨て）を、多く払った側が受け取る。
 *
 * @entity Expense
 *
 * @functions
 * - getSettlementSummary - 指定月の精算額取得（支払合計・差額・未承認件数。2 人でない場合は null）
 *
 * @test ./service.integration.test.ts
 */
import { and, count, eq, inArray, ne, gte, lt, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { expense } from '$lib/server/tables';
import type * as schema from '$lib/server/tables';
import { getMonthRange } from '$lib/utils/date';
import type { User } from '../../types';
import type { SettlementMember, SettlementSummary, SettlementTransfer } from '../types';

type Db = DrizzleD1Database<typeof schema>;

/**
 * 2 人の支払合計から差額の支払いを求める。差額 0 円のときは null。
 */
function computeTransfer(members: SettlementMember[]): SettlementTransfer | null {
	const [a, b] = members;
	const amount = Math.floor(Math.abs(a.paid - b.paid) / 2);
	if (amount === 0) return null;
	const [from, to] = a.paid > b.paid ? [b, a] : [a, b];
	return {
		fromUserId: from.userId,
		fromName: from.name,
		toUserId: to.userId,
		toName: to.name,
		amount
	};
}

/**
 * 指定月の精算額を取得する。members は世帯の 2 ユーザー（getUsers の結果）。
 * 集計対象は members が支払者の承認済み支出のみ。未承認の支出は件数のみ返す。
 * members が 2 人でない場合は精算の対象外として null を返す（支出一覧の表示を妨げないため throw しない）。
 */
export async function getSettlementSummary(
	db: Db,
	month: string,
	members: User[]
): Promise<SettlementSummary | null> {
	if (members.length !== 2) return null;

	const { start, end } = getMonthRange(month);
	const monthFilter = and(
		gte(expense.createdAt, start),
		lt(expense.createdAt, end),
		inArray(
			expense.payerUserId,
			members.map((m) => m.id)
		)
	);

	const [paidRows, [{ unapprovedCount }]] = await Promise.all([
		db
			.select({
				payerUserId: expense.payerUserId,
				paid: sql<number>`coalesce(sum(${expense.amount}), 0)`.mapWith(Number),
				approvedCount: count()
			})
			.from(expense)
			.where(and(monthFilter, eq(expense.status, 'approved')))
			.groupBy(expense.payerUserId),
		db
			.select({ unapprovedCount: count() })
			.from(expense)
			.where(and(monthFilter, ne(expense.status, 'approved')))
	]);

	const settlementMembers: SettlementMember[] = members.map((m) => ({
		userId: m.id,
		name: m.name,
		paid: paidRows.find((r) => r.payerUserId === m.id)?.paid ?? 0
	}));

	return {
		month,
		total: settlementMembers.reduce((sum, m) => sum + m.paid, 0),
		members: settlementMembers,
		transfer: computeTransfer(settlementMembers),
		approvedCount: paidRows.reduce((sum, r) => sum + r.approvedCount, 0),
		unapprovedCount
	};
}
