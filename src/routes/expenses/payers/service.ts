/**
 * @file サービス: ExpensePayer
 * @module src/routes/expenses/payers/service.ts
 * @feature expenses
 *
 * @description
 * 支払者機能のビジネスロジックと DB 操作を担う。
 *
 * @spec specs/expenses/spec.md
 * @acceptance AC-035, AC-036, AC-037, AC-038, AC-039, AC-118, AC-119
 *
 * @entity ExpensePayer
 *
 * @functions
 * - getPayers    - 一覧取得（全件）
 * - createPayer  - 新規作成
 * - updatePayer  - 更新
 * - deletePayer  - 削除
 *
 * @test ./service.integration.test.ts
 */
import { and, eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { AppError } from '$lib/server/errors';
import { expense, expensePayer } from '$lib/server/tables';
import type * as schema from '$lib/server/tables';
import type { PayerCreate, PayerUpdate } from './schema';

type Db = DrizzleD1Database<typeof schema>;

type Payer = {
	id: string;
	userId: string;
	name: string;
	createdAt: Date;
};

/**
 * 支払者一覧を取得する（全件）。
 * @ac AC-035, AC-039
 */
export async function getPayers(
	db: Db,
	userId: string
): Promise<{ items: Payer[]; total: number; page: number; limit: number }> {
	const rows = await db
		.select()
		.from(expensePayer)
		.where(eq(expensePayer.userId, userId))
		.orderBy(expensePayer.createdAt);

	return {
		items: rows as Payer[],
		total: rows.length,
		page: 1,
		limit: rows.length
	};
}

/**
 * 支払者を新規作成する。
 * @ac AC-035
 */
export async function createPayer(db: Db, userId: string, data: PayerCreate): Promise<Payer> {
	const id = crypto.randomUUID();
	const now = new Date();

	const [row] = await db
		.insert(expensePayer)
		.values({ id, userId, name: data.name, createdAt: now })
		.returning();

	return row as Payer;
}

/**
 * 支払者を更新する。
 * @ac AC-036
 * @throws {NOT_FOUND} - 該当支払者が存在しない場合、または他ユーザーの支払者の場合
 */
export async function updatePayer(
	db: Db,
	userId: string,
	id: string,
	data: PayerUpdate
): Promise<Payer> {
	const existing = await db
		.select()
		.from(expensePayer)
		.where(and(eq(expensePayer.id, id), eq(expensePayer.userId, userId)))
		.get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');

	const [row] = await db
		.update(expensePayer)
		.set({ name: data.name })
		.where(and(eq(expensePayer.id, id), eq(expensePayer.userId, userId)))
		.returning();

	return row as Payer;
}

/**
 * 支払者を削除する。紐付く支出が存在する場合は CONFLICT を投げる。
 * @ac AC-037
 * @throws {NOT_FOUND} - 該当支払者が存在しない場合、または他ユーザーの支払者の場合
 * @throws {CONFLICT} - 支払者に紐付く支出が 1 件以上ある場合
 */
export async function deletePayer(db: Db, userId: string, id: string): Promise<void> {
	const existing = await db
		.select()
		.from(expensePayer)
		.where(and(eq(expensePayer.id, id), eq(expensePayer.userId, userId)))
		.get();
	if (!existing) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');

	const [{ linkedCount }] = await db
		.select({ linkedCount: sql<number>`count(*)` })
		.from(expense)
		.where(and(eq(expense.payerId, id), eq(expense.userId, userId)));

	if (Number(linkedCount) > 0) {
		throw new AppError('CONFLICT', 409, 'この支払者は使用中のため削除できません');
	}

	await db
		.delete(expensePayer)
		.where(and(eq(expensePayer.id, id), eq(expensePayer.userId, userId)));
}
