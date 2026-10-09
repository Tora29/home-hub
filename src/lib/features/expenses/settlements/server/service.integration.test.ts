/**
 * @file テスト: 月次精算サービス
 * @module src/lib/features/expenses/settlements/server/service.integration.test.ts
 * @testType integration
 *
 * @target ./service.ts
 */
/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { createDb } from '$lib/server/db';
import { expense, expenseCategory, user as userTable } from '$lib/server/tables';
import type * as schema from '$lib/server/tables';
import { addMonths, getCurrentMonth, getMonthRange } from '$lib/utils/date';
import type { User } from '../../types';
import { getSettlementSummary } from './service';

type Db = DrizzleD1Database<typeof schema>;

// 各テストは新規ユーザーで集計するため他テストの支出は混ざらない。月は前後月の除外確認用に過去月を使う
function pastMonth(): string {
	return addMonths(getCurrentMonth(), -24);
}

async function insertUser(db: Db, name: string): Promise<User> {
	const id = crypto.randomUUID();
	const email = `${id}@test.example`;
	await db.insert(userTable).values({
		id,
		name,
		email,
		emailVerified: false,
		createdAt: new Date(),
		updatedAt: new Date()
	});
	return { id, name, email };
}

/** 世帯の 2 ユーザーを作成する（テストごとに新規作成し、他テストの支出を集計に混ぜない）。 */
async function insertMembers(db: Db): Promise<[User, User]> {
	return [await insertUser(db, '夫'), await insertUser(db, '妻')];
}

let categoryId: string | undefined;
async function getCategoryId(db: Db): Promise<string> {
	if (!categoryId) {
		categoryId = crypto.randomUUID();
		await db
			.insert(expenseCategory)
			.values({ id: categoryId, name: 'テスト', createdAt: new Date() });
	}
	return categoryId;
}

/** 指定月（JST）の 1 日後に登録された支出を作成する。 */
async function insertExpense(
	db: Db,
	payer: User,
	amount: number,
	month: string,
	status = 'approved'
): Promise<void> {
	await db.insert(expense).values({
		id: crypto.randomUUID(),
		userId: payer.id,
		amount,
		categoryId: await getCategoryId(db),
		payerUserId: payer.id,
		status,
		createdAt: new Date(getMonthRange(month).start.getTime() + 24 * 60 * 60 * 1000)
	});
}

/** 2 人分の精算額を取得する（null の場合はテスト失敗）。 */
async function getSummary(db: Db, month: string, members: User[]) {
	const summary = await getSettlementSummary(db, month, members);
	if (!summary) throw new Error('精算額が取得できませんでした');
	return summary;
}

describe('getSettlementSummary', () => {
	test('承認済み支出の支払合計から、少なく払った側が差額の半分を支払う精算額を算出できる', async () => {
		const db = createDb(env.DB);
		const [husband, wife] = await insertMembers(db);
		const month = pastMonth();
		await insertExpense(db, husband, 30000, month);
		await insertExpense(db, husband, 5000, month);
		await insertExpense(db, wife, 10000, month);

		const summary = await getSummary(db, month, [husband, wife]);

		expect(summary.total).toBe(45000);
		expect(summary.members).toEqual([
			{ userId: husband.id, name: '夫', paid: 35000 },
			{ userId: wife.id, name: '妻', paid: 10000 }
		]);
		expect(summary.transfer).toEqual({
			fromUserId: wife.id,
			fromName: '妻',
			toUserId: husband.id,
			toName: '夫',
			amount: 12500
		});
		expect(summary.approvedCount).toBe(3);
	});

	test('差額が奇数円の場合、精算額は 1 円未満を切り捨てる', async () => {
		const db = createDb(env.DB);
		const [husband, wife] = await insertMembers(db);
		const month = pastMonth();
		await insertExpense(db, husband, 1001, month);

		const summary = await getSummary(db, month, [husband, wife]);
		expect(summary.transfer?.amount).toBe(500);
	});

	test('支払合計が同額の場合、差額の支払いはない', async () => {
		const db = createDb(env.DB);
		const [husband, wife] = await insertMembers(db);
		const month = pastMonth();
		await insertExpense(db, husband, 8000, month);
		await insertExpense(db, wife, 8000, month);

		const summary = await getSummary(db, month, [husband, wife]);
		expect(summary.transfer).toBeNull();
	});

	test('未承認・前後の月の支出は精算額に含めず、未承認は件数のみ返す', async () => {
		const db = createDb(env.DB);
		const [husband, wife] = await insertMembers(db);
		const month = pastMonth();
		await insertExpense(db, husband, 4000, month);
		await insertExpense(db, wife, 9999, month, 'pending');
		await insertExpense(db, wife, 9999, addMonths(month, -1));
		await insertExpense(db, wife, 9999, addMonths(month, 1));

		const summary = await getSummary(db, month, [husband, wife]);
		expect(summary.total).toBe(4000);
		expect(summary.transfer).toMatchObject({ fromUserId: wife.id, amount: 2000 });
		expect(summary.unapprovedCount).toBe(1);
	});

	test('ユーザーが 2 人でない場合、精算の対象外として null が返る', async () => {
		const db = createDb(env.DB);
		const [husband] = await insertMembers(db);

		expect(await getSettlementSummary(db, pastMonth(), [husband])).toBeNull();
	});
});
