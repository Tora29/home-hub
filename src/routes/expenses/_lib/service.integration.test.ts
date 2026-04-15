/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: Expense サービス
 * @module src/routes/expenses/_lib/service.integration.test.ts
 * @testType integration
 *
 * @target ./service.ts
 * @spec specs/expenses/spec.md
 * @covers AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-010, AC-014, AC-119, AC-125
 */

import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import {
	getExpenses,
	createExpense,
	updateExpense,
	deleteExpense,
	checkExpense,
	uncheckExpense,
	requestExpenses,
	cancelExpenses,
	approveExpenses,
	getUnapprovedCount
} from './service';
import { createCategory } from '$expenses/categories/_lib/service';
import { user as userTable } from '$lib/server/tables';

function makeUserId() {
	return crypto.randomUUID();
}

function getCurrentMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function createTestUser(
	db: ReturnType<typeof createDb>,
	name: string,
	role?: 'main' | 'partner' | null
) {
	const id = crypto.randomUUID();
	const now = new Date();
	await db.insert(userTable).values({
		id,
		name,
		email: `${id}@example.com`,
		emailVerified: false,
		createdAt: now,
		updatedAt: now,
		...(role !== undefined ? { role } : {})
	});
	return { id, name };
}

/** LINE 通知をスキップする LineEnv（LINE_MOCK=true） */
const mockLineEnv = {
	lineChannelAccessToken: undefined,
	lineUserIdPrimary: undefined,
	lineUserIdSpouse: undefined,
	lineMock: 'true'
};

describe('getExpenses', () => {
	test('[SPEC: AC-001] 当月支出一覧をページネーション形式で取得できる // spec:8c1c46fd', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const month = getCurrentMonth();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createTestUser(db, '田中');

		await createExpense(db, userId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId: payer.id
		});

		const result = await getExpenses(db, { month });

		expect(result).toHaveProperty('items');
		expect(result).toHaveProperty('total');
		expect(result).toHaveProperty('page');
		expect(result).toHaveProperty('limit');
		expect(result).toHaveProperty('monthTotal');
		expect(Array.isArray(result.items)).toBe(true);
		expect(result.total).toBeGreaterThanOrEqual(1);
	});

	test('[SPEC: AC-002] 月フィルタで指定月の支出一覧を取得できる // spec:c4cbc954', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createTestUser(db, '田中');

		await createExpense(db, userId, {
			amount: 5000,
			categoryId: category.id,
			payerUserId: payer.id
		});

		const currentMonth = getCurrentMonth();
		const currentResult = await getExpenses(db, { month: currentMonth });
		const pastResult = await getExpenses(db, { month: '2020-01' });

		expect(currentResult.total).toBeGreaterThanOrEqual(1);
		expect(pastResult.total).toBe(0);
	});

	test('[SPEC: AC-014] 世帯合計金額（全ユーザー・全ステータス）を返す // spec:6b44fff0', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const month = getCurrentMonth();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createTestUser(db, '田中');

		await createExpense(db, userId, {
			amount: 3000,
			categoryId: category.id,
			payerUserId: payer.id
		});

		const result = await getExpenses(db, { month });

		expect(typeof result.monthTotal).toBe('number');
		expect(result.monthTotal).toBeGreaterThanOrEqual(3000);
	});
});

describe('createExpense', () => {
	test('[SPEC: AC-003] 正しいデータで支出を作成できる（初期状態は unapproved）// spec:8c1c46fd', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createTestUser(db, '田中');

		const created = await createExpense(db, userId, {
			amount: 1500,
			categoryId: category.id,
			payerUserId: payer.id
		});

		expect(created.amount).toBe(1500);
		expect(created.status).toBe('unapproved');
		expect(created.categoryId).toBe(category.id);
		expect(typeof created.id).toBe('string');
	});

	test('[SPEC: AC-201] 金額が 1 の場合、登録できる // spec:8c1c46fd', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createTestUser(db, '田中');

		const created = await createExpense(db, userId, {
			amount: 1,
			categoryId: category.id,
			payerUserId: payer.id
		});

		expect(created.amount).toBe(1);
	});

	test('[SPEC: AC-202] 金額が 9999999 の場合、登録できる // spec:8c1c46fd', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createTestUser(db, '田中');

		const created = await createExpense(db, userId, {
			amount: 9999999,
			categoryId: category.id,
			payerUserId: payer.id
		});

		expect(created.amount).toBe(9999999);
	});
});

describe('checkExpense / uncheckExpense', () => {
	test('[SPEC: AC-004] unapproved の支出を check すると status が checked になる // spec:495b580c', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createTestUser(db, '田中');

		const created = await createExpense(db, userId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId: payer.id
		});

		const checked = await checkExpense(db, userId, created.id);

		expect(checked.status).toBe('checked');
	});

	test('[SPEC: AC-005] checked の支出を uncheck すると status が unapproved に戻る // spec:495b580c', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createTestUser(db, '田中');

		const created = await createExpense(db, userId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId: payer.id
		});

		await checkExpense(db, userId, created.id);
		const unchecked = await uncheckExpense(db, userId, created.id);

		expect(unchecked.status).toBe('unapproved');
	});
});

describe('updateExpense', () => {
	test('[SPEC: AC-006] unapproved の支出の金額・カテゴリ・支払者を更新できる // spec:8c1c46fd', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const category2 = await createCategory(db, userId, { name: '交通費' });
		const payer = await createTestUser(db, '田中');

		const created = await createExpense(db, userId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId: payer.id
		});

		const updated = await updateExpense(db, userId, created.id, {
			amount: 2500,
			categoryId: category2.id,
			payerUserId: payer.id
		});

		expect(updated.amount).toBe(2500);
		expect(updated.categoryId).toBe(category2.id);
	});
});

describe('deleteExpense', () => {
	test('[SPEC: AC-007] unapproved の支出を削除できる // spec:8c1c46fd', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createTestUser(db, '田中');

		const created = await createExpense(db, userId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId: payer.id
		});

		await deleteExpense(db, userId, created.id);

		const result = await getExpenses(db, { month: getCurrentMonth() });
		const found = result.items.find((e) => e.id === created.id);
		expect(found).toBeUndefined();
	});
});

describe('requestExpenses / cancelExpenses', () => {
	test('[SPEC: AC-008] 自分の checked 支出を一括で pending に変更できる // spec:8c1c46fd', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createTestUser(db, '田中');

		const created = await createExpense(db, userId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId: payer.id
		});

		await checkExpense(db, userId, created.id);
		const result = await requestExpenses(db, userId, null, mockLineEnv);

		expect(result.count).toBe(1);

		// DB 上の status が pending に変更されていることを確認
		const after = await getExpenses(db, { month: getCurrentMonth() });
		const expense = after.items.find((e) => e.id === created.id);
		expect(expense?.status).toBe('pending');
	});

	test('[SPEC: AC-009] 自分の pending 支出を一括で checked に戻せる // spec:8c1c46fd', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createTestUser(db, '田中');

		const created = await createExpense(db, userId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId: payer.id
		});

		await checkExpense(db, userId, created.id);
		await requestExpenses(db, userId, null, mockLineEnv);
		const result = await cancelExpenses(db, userId);

		expect(result.count).toBe(1);

		// DB 上の status が checked に戻っていることを確認
		const after = await getExpenses(db, { month: getCurrentMonth() });
		const expense = after.items.find((e) => e.id === created.id);
		expect(expense?.status).toBe('checked');
	});
});

describe('approveExpenses', () => {
	test('[SPEC: AC-010] 相手の pending 支出を一括で approved に変更できる（自分の pending は対象外）// spec:8c1c46fd', async () => {
		const db = createDb(env.DB);
		const userA = makeUserId();
		const userB = makeUserId();

		const categoryA = await createCategory(db, userA, { name: '食費A' });
		const categoryB = await createCategory(db, userB, { name: '食費B' });
		const payerA = await createTestUser(db, '主');
		const payerB = await createTestUser(db, '妻');

		// userA の支出を checked → pending
		const expenseA = await createExpense(db, userA, {
			amount: 1000,
			categoryId: categoryA.id,
			payerUserId: payerA.id
		});
		await checkExpense(db, userA, expenseA.id);
		await requestExpenses(db, userA, null, mockLineEnv);

		// userB 自身の支出も pending にしておく（approve 対象外になることを確認）
		const expenseB = await createExpense(db, userB, {
			amount: 2000,
			categoryId: categoryB.id,
			payerUserId: payerB.id
		});
		await checkExpense(db, userB, expenseB.id);
		await requestExpenses(db, userB, null, mockLineEnv);

		// userB が approve を実行（userA の pending のみ approved になる）
		const result = await approveExpenses(db, userB, null, mockLineEnv);

		expect(result.count).toBeGreaterThanOrEqual(1);

		// userA の支出が approved になっていることを確認
		const after = await getExpenses(db, { month: getCurrentMonth() });
		const approvedExpense = after.items.find((e) => e.id === expenseA.id);
		expect(approvedExpense?.status).toBe('approved');

		// userB 自身の支出は pending のまま（自分の支出は approved 対象外）
		const selfExpense = after.items.find((e) => e.id === expenseB.id);
		expect(selfExpense?.status).toBe('pending');
	});
});

describe('getUnapprovedCount', () => {
	test('[SPEC: AC-010] 自分以外の pending 支出件数を取得できる // spec:8c1c46fd', async () => {
		const db = createDb(env.DB);
		const userA = makeUserId();
		const userB = makeUserId();

		const categoryA = await createCategory(db, userA, { name: '食費A' });
		const categoryB = await createCategory(db, userB, { name: '食費B' });
		const payer = await createTestUser(db, '田中');

		// 操作前のカウントを記録（共有 DB に既存データあり）
		const countForA_before = await getUnapprovedCount(db, userA);
		const countForB_before = await getUnapprovedCount(db, userB);

		// userA の支出を checked → pending
		const e1 = await createExpense(db, userA, {
			amount: 1000,
			categoryId: categoryA.id,
			payerUserId: payer.id
		});
		const e2 = await createExpense(db, userA, {
			amount: 2000,
			categoryId: categoryA.id,
			payerUserId: payer.id
		});
		await checkExpense(db, userA, e1.id);
		await checkExpense(db, userA, e2.id);
		await requestExpenses(db, userA, null, mockLineEnv);

		// userB 視点でのカウント: userA の pending 2件分増加
		const countForB_after = await getUnapprovedCount(db, userB);
		expect(countForB_after - countForB_before).toBeGreaterThanOrEqual(2);

		// userA 視点のカウント: 自分の pending は対象外 → delta = 0
		const countForA_after = await getUnapprovedCount(db, userA);
		expect(countForA_after).toBe(countForA_before);

		// categoryB の作成（未使用変数解消）
		void categoryB;
	});

	test('[SPEC: AC-119] LINE_CHANNEL_ACCESS_TOKEN 未設定で request すると DB 更新のみ実行（通知スキップ）// spec:dcc4fcc7', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createTestUser(db, '田中');

		const created = await createExpense(db, userId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId: payer.id
		});
		await checkExpense(db, userId, created.id);

		// LINE_CHANNEL_ACCESS_TOKEN 未設定でも成功する（AC-125）
		const result = await requestExpenses(db, userId, 'main', {
			lineChannelAccessToken: undefined,
			lineUserIdPrimary: 'line-user-primary',
			lineUserIdSpouse: 'line-user-spouse',
			lineMock: undefined
		});

		expect(result.count).toBe(1);

		// DB 上の status が pending に変更されていることを確認
		const after = await getExpenses(db, { month: getCurrentMonth() });
		const expense = after.items.find((e) => e.id === created.id);
		expect(expense?.status).toBe('pending');
	});

	test('[SPEC: AC-119] LINE_CHANNEL_ACCESS_TOKEN 未設定で approve すると DB 更新のみ実行（通知スキップ）// spec:a5975b23', async () => {
		const db = createDb(env.DB);
		const userA = makeUserId();
		const userB = makeUserId();

		const categoryA = await createCategory(db, userA, { name: '食費A' });
		const payer = await createTestUser(db, '田中');

		// userA の支出を pending に
		const created = await createExpense(db, userA, {
			amount: 1000,
			categoryId: categoryA.id,
			payerUserId: payer.id
		});
		await checkExpense(db, userA, created.id);
		await requestExpenses(db, userA, null, mockLineEnv);

		// LINE_CHANNEL_ACCESS_TOKEN 未設定でも approve が成功する（AC-125）
		const result = await approveExpenses(db, userB, 'partner', {
			lineChannelAccessToken: undefined,
			lineUserIdPrimary: 'line-user-primary',
			lineUserIdSpouse: 'line-user-spouse',
			lineMock: undefined
		});

		expect(result.count).toBeGreaterThanOrEqual(1);

		// DB 上の status が approved に変更されていることを確認
		const after = await getExpenses(db, { month: getCurrentMonth() });
		const expense = after.items.find((e) => e.id === created.id);
		expect(expense?.status).toBe('approved');
	});

	test('[SPEC: AC-119] user.role が null の場合、LINE 通知をスキップして DB 更新を継続する', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createTestUser(db, '田中');

		const created = await createExpense(db, userId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId: payer.id
		});
		await checkExpense(db, userId, created.id);

		// role=null + LINE トークン設定済み → 通知先を解決できないためスキップ（AC-119）
		const result = await requestExpenses(db, userId, null, {
			lineChannelAccessToken: 'valid-token',
			lineUserIdPrimary: 'line-primary',
			lineUserIdSpouse: 'line-spouse',
			lineMock: undefined
		});

		expect(result.count).toBe(1);

		// DB は更新されている
		const after = await getExpenses(db, { month: getCurrentMonth() });
		const updated = after.items.find((e) => e.id === created.id);
		expect(updated?.status).toBe('pending');
	});

	test('[SPEC: AC-125] 通知先 LINE ユーザー ID が未設定の場合、エラーにせず DB 更新を継続する', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const category = await createCategory(db, userId, { name: '食費' });
		const payer = await createTestUser(db, '田中');

		const created = await createExpense(db, userId, {
			amount: 1000,
			categoryId: category.id,
			payerUserId: payer.id
		});
		await checkExpense(db, userId, created.id);

		// token は設定済みだが通知先 LINE ユーザー ID が未設定 → 通知スキップ（AC-125）
		const result = await requestExpenses(db, userId, 'main', {
			lineChannelAccessToken: 'valid-token',
			lineUserIdPrimary: undefined,
			lineUserIdSpouse: undefined,
			lineMock: undefined
		});

		expect(result.count).toBe(1);

		// DB は更新されている
		const after = await getExpenses(db, { month: getCurrentMonth() });
		const updated = after.items.find((e) => e.id === created.id);
		expect(updated?.status).toBe('pending');
	});
});
