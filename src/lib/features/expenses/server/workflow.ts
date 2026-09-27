/**
 * @file サービス: 支出承認ワークフロー
 * @module src/lib/features/expenses/server/workflow.ts
 * @feature expenses
 *
 * @description
 * 支出の状態遷移（unapproved → checked → pending → approved）を担う。
 * 一括承認依頼・一括承認では相手ユーザーへ LINE 通知を送る（ベストエフォート、./line.ts）。
 *
 * @entity Expense
 *
 * @functions
 * - checkExpense        - 確認（unapproved → checked）
 * - uncheckExpense      - 確認取消（checked → unapproved）
 * - requestExpenses     - 自分の checked を一括で pending にし、相手に LINE 通知
 * - cancelExpenses      - 自分の pending を一括で checked に戻す
 * - approveExpenses     - 自分以外の pending を一括で approved にし、相手に LINE 通知
 * - getUnapprovedCount  - 自分以外の pending 件数（全期間。ダッシュボード・一括承認ボタン用）
 *
 * @test ./workflow.integration.test.ts
 */
import { and, eq, ne } from 'drizzle-orm';
import { AppError } from '$lib/server/errors';
import { expense } from '$lib/server/tables';
import type { ExpenseWithRelations } from '../types';
import { type Defer, type LineEnv, notifyPartnerBestEffort } from './line';
import { type Db, fetchExpenseWithRelations, getOwnedExpenseOrThrow } from './shared';

/** LINE 通知の宛先・本文組み立てに必要な情報。origin は通知本文のリンク先（例: `url.origin`）。 */
export type NotifyContext = {
	role: string | null;
	lineEnv: LineEnv;
	origin: string;
};

/** defer 指定時はレスポンス返却後に実行させ、未指定時は完了まで待つ。 */
async function runNotification(task: Promise<void>, defer?: Defer): Promise<void> {
	if (defer) defer(task);
	else await task;
}

/**
 * 支出を unapproved → checked に更新する。
 * @throws {NOT_FOUND} - 該当支出が存在しない場合
 * @throws {FORBIDDEN} - 他ユーザーの支出の場合
 * @throws {CONFLICT} - unapproved 以外の支出の場合
 */
export async function checkExpense(
	db: Db,
	userId: string,
	id: string
): Promise<ExpenseWithRelations> {
	const existing = await getOwnedExpenseOrThrow(db, userId, id);
	if (existing.status !== 'unapproved')
		throw new AppError('CONFLICT', 409, '確認できる状態の支出ではありません');

	await db.update(expense).set({ status: 'checked' }).where(eq(expense.id, id));

	return fetchExpenseWithRelations(db, id);
}

/**
 * 支出を checked → unapproved に戻す。
 * @throws {NOT_FOUND} - 該当支出が存在しない場合
 * @throws {FORBIDDEN} - 他ユーザーの支出の場合
 * @throws {CONFLICT} - checked 以外の支出の場合
 */
export async function uncheckExpense(
	db: Db,
	userId: string,
	id: string
): Promise<ExpenseWithRelations> {
	const existing = await getOwnedExpenseOrThrow(db, userId, id);
	if (existing.status !== 'checked')
		throw new AppError('CONFLICT', 409, '確認取消できる状態の支出ではありません');

	await db.update(expense).set({ status: 'unapproved' }).where(eq(expense.id, id));

	return fetchExpenseWithRelations(db, id);
}

/**
 * 自分の checked 支出を一括で pending に変更し、相手に LINE 通知を送信する。
 * count は実際に更新した件数。LINE 通知はベストエフォート（失敗してもロールバックしない）。
 * defer 指定時は通知をレスポンス返却後に実行する。
 * @throws {CONFLICT} - checked 支出が 0 件の場合
 */
export async function requestExpenses(
	db: Db,
	userId: string,
	notify: NotifyContext,
	defer?: Defer
): Promise<{ count: number }> {
	// DB 更新を先行（状態の正確性を優先）。returning で実更新件数を得る
	const updated = await db
		.update(expense)
		.set({ status: 'pending' })
		.where(and(eq(expense.userId, userId), eq(expense.status, 'checked')))
		.returning({ id: expense.id });

	if (updated.length === 0) throw new AppError('CONFLICT', 409, '確認済みの支出がありません');

	await runNotification(
		notifyPartnerBestEffort(
			notify.lineEnv,
			notify.role,
			`承認依頼が届いています。確認してください。\n${notify.origin}/expenses`
		),
		defer
	);

	return { count: updated.length };
}

/**
 * 自分の pending 支出を一括で checked に戻す。count は実際に更新した件数。
 * @throws {CONFLICT} - pending 支出が 0 件の場合
 */
export async function cancelExpenses(db: Db, userId: string): Promise<{ count: number }> {
	const updated = await db
		.update(expense)
		.set({ status: 'checked' })
		.where(and(eq(expense.userId, userId), eq(expense.status, 'pending')))
		.returning({ id: expense.id });

	if (updated.length === 0) throw new AppError('CONFLICT', 409, '申請中の支出がありません');

	return { count: updated.length };
}

/**
 * 自分以外の pending 支出を一括で approved に変更し、相手に LINE 通知を送信する。
 * 自分の pending は対象外。count は実際に更新した件数。LINE 通知はベストエフォート。
 * defer 指定時は通知をレスポンス返却後に実行する。
 * @throws {CONFLICT} - 承認対象の pending 支出が 0 件の場合
 */
export async function approveExpenses(
	db: Db,
	userId: string,
	notify: NotifyContext,
	defer?: Defer
): Promise<{ count: number }> {
	const updated = await db
		.update(expense)
		.set({ status: 'approved' })
		.where(and(ne(expense.userId, userId), eq(expense.status, 'pending')))
		.returning({ id: expense.id });

	if (updated.length === 0) throw new AppError('CONFLICT', 409, '承認できる支出がありません');

	await runNotification(
		notifyPartnerBestEffort(
			notify.lineEnv,
			notify.role,
			`支出が承認されました。\n${notify.origin}/expenses`
		),
		defer
	);

	return { count: updated.length };
}

/**
 * 自分以外のユーザーの pending 支出件数を全期間で取得する（承認待ち件数）。
 */
export async function getUnapprovedCount(db: Db, userId: string): Promise<number> {
	return db.$count(expense, and(ne(expense.userId, userId), eq(expense.status, 'pending')));
}
