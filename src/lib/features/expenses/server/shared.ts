/**
 * @file ヘルパー: 支出サービス共通クエリ
 * @module src/lib/features/expenses/server/shared.ts
 * @feature expenses
 *
 * @description
 * service.ts（CRUD）と workflow.ts（承認ワークフロー）で共有する DB 型・SELECT 定義・
 * 存在/所有者チェックをまとめる。feature 外からは import しない。
 */
import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { AppError } from '$lib/server/errors';
import { expense, expenseCategory, user as userTable } from '$lib/server/tables';
import type * as schema from '$lib/server/tables';
import type { ExpenseWithRelations } from '../types';

export type Db = DrizzleD1Database<typeof schema>;

export const expenseSelectFields = {
	id: expense.id,
	userId: expense.userId,
	amount: expense.amount,
	categoryId: expense.categoryId,
	payerUserId: expense.payerUserId,
	status: expense.status,
	createdAt: expense.createdAt,
	category: {
		id: expenseCategory.id,
		name: expenseCategory.name,
		createdAt: expenseCategory.createdAt
	},
	payer: {
		id: userTable.id,
		name: userTable.name,
		email: userTable.email
	}
};

/**
 * カテゴリ・支払者を JOIN した支出を 1 件取得する（payerUserId は NOT NULL + FK のため INNER JOIN）。
 * @throws {INTERNAL_SERVER_ERROR} - 直前に書き込んだ支出が取得できない場合
 */
export async function fetchExpenseWithRelations(db: Db, id: string): Promise<ExpenseWithRelations> {
	const row = await db
		.select(expenseSelectFields)
		.from(expense)
		.innerJoin(expenseCategory, eq(expense.categoryId, expenseCategory.id))
		.innerJoin(userTable, eq(expense.payerUserId, userTable.id))
		.where(eq(expense.id, id))
		.get();
	if (!row) throw new AppError('INTERNAL_SERVER_ERROR', 500, 'サーバーエラーが発生しました');
	// createdAt は Date（JSON 化で ISO 文字列）・status は text カラムのため型を合わせる
	return row as unknown as ExpenseWithRelations;
}

/**
 * 既存支出を取得し、存在チェック・所有者チェックを行う。
 * @throws {NOT_FOUND} - 該当支出が存在しない場合
 * @throws {FORBIDDEN} - 他ユーザーの支出の場合
 */
export async function getOwnedExpenseOrThrow(
	db: Db,
	userId: string,
	id: string
): Promise<typeof expense.$inferSelect> {
	const existing = await db.select().from(expense).where(eq(expense.id, id)).get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');
	if (existing.userId !== userId)
		throw new AppError('FORBIDDEN', 403, '他のユーザーの支出は操作できません');
	return existing;
}
