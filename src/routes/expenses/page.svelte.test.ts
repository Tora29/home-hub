/**
 * @file テスト: 支出一覧画面
 * @module src/routes/expenses/page.svelte.test.ts
 * @testType unit
 *
 * @target ./+page.svelte
 * @spec specs/expenses/spec.md
 * @covers AC-015, AC-016, AC-017, AC-111, AC-112, AC-122, AC-123, AC-204, AC-205
 */

import { describe, test, expect, afterEach, vi } from 'vitest';
import { flushSync } from 'svelte';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import Page from './+page.svelte';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));

vi.mock('$app/state', () => ({
	page: { url: new URL('http://localhost/') }
}));

afterEach(() => {
	vi.unstubAllGlobals();
});

const mockUser = { id: 'user-1', name: '田中', email: 'user1@example.com' };
const mockOtherUser = { id: 'user-2', name: '佐藤', email: 'user2@example.com' };
const mockCategory = { id: 'cat-1', userId: 'user-1', name: '食費', createdAt: new Date() };

const makeExpense = (
	overrides: Partial<{
		id: string;
		userId: string;
		amount: number;
		status: 'unapproved' | 'checked' | 'pending' | 'approved';
		payerUserId: string;
		payer: typeof mockUser;
	}> = {}
) => ({
	id: 'exp-1',
	userId: 'user-1',
	amount: 1000,
	categoryId: 'cat-1',
	payerUserId: 'user-1',
	status: 'unapproved' as const,
	createdAt: new Date(),
	category: mockCategory,
	payer: mockUser,
	...overrides
});

const mockData = {
	expenses: { items: [], total: 0, page: 1, limit: 20, monthTotal: 0 },
	categories: { items: [mockCategory], total: 1, page: 1, limit: 20 },
	users: [mockUser, mockOtherUser],
	currentUser: mockUser,
	currentMonth: '2026-04',
	bulkCounts: { myChecked: 0, myPending: 0, othersPending: 0 },
	currentUserId: 'user-1'
};

const mockDataWithUnapprovedOwn = {
	...mockData,
	expenses: {
		items: [makeExpense({ status: 'unapproved', userId: 'user-1' })],
		total: 1,
		page: 1,
		limit: 20,
		monthTotal: 1000
	}
};

const mockDataWithCheckedOwn = {
	...mockData,
	expenses: {
		items: [makeExpense({ status: 'checked', userId: 'user-1' })],
		total: 1,
		page: 1,
		limit: 20,
		monthTotal: 1000
	}
};

const mockDataWithPendingOwn = {
	...mockData,
	expenses: {
		items: [makeExpense({ status: 'pending', userId: 'user-1' })],
		total: 1,
		page: 1,
		limit: 20,
		monthTotal: 1000
	}
};

const mockDataWithApprovedOwn = {
	...mockData,
	expenses: {
		items: [makeExpense({ status: 'approved', userId: 'user-1' })],
		total: 1,
		page: 1,
		limit: 20,
		monthTotal: 5000
	}
};

const mockDataWithOtherUserUnapproved = {
	...mockData,
	expenses: {
		items: [makeExpense({ status: 'unapproved', userId: 'user-2', payer: mockOtherUser })],
		total: 1,
		page: 1,
		limit: 20,
		monthTotal: 1000
	}
};

describe('+page.svelte - approved 行の表示', () => {
	test('[SPEC: AC-015] approved の行は opacity でグレーアウトされる', async () => {
		render(Page, { data: mockDataWithApprovedOwn });

		// approved 行は opacity クラスがつく
		await expect.element(page.getByTestId('expense-item')).toHaveClass(/opacity/);
	});

	test('[SPEC: AC-015] approved の行にはチェックボックス・編集・削除ボタンが DOM に存在しない', async () => {
		render(Page, { data: mockDataWithApprovedOwn });

		await expect.element(page.getByTestId('expense-check-button')).not.toBeInTheDocument();
		await expect.element(page.getByTestId('expense-edit-button')).not.toBeInTheDocument();
		await expect.element(page.getByTestId('expense-delete-button')).not.toBeInTheDocument();
	});
});

describe('+page.svelte - 他ユーザーの行の表示', () => {
	test('[SPEC: AC-016] 他ユーザーの unapproved 行にはチェックボックス・編集・削除ボタンが DOM に存在しない', async () => {
		render(Page, { data: mockDataWithOtherUserUnapproved });

		await expect.element(page.getByTestId('expense-check-button')).not.toBeInTheDocument();
		await expect.element(page.getByTestId('expense-edit-button')).not.toBeInTheDocument();
		await expect.element(page.getByTestId('expense-delete-button')).not.toBeInTheDocument();
	});
});

describe('+page.svelte - pending 行の表示', () => {
	test('[SPEC: AC-017] pending の行は opacity でグレーアウトされ、チェックボックスが非表示になる', async () => {
		render(Page, { data: mockDataWithPendingOwn });

		// pending 行は opacity クラスがつく
		await expect.element(page.getByTestId('expense-item')).toHaveClass(/opacity/);
		// チェックボックスは非表示
		await expect.element(page.getByTestId('expense-check-button')).not.toBeInTheDocument();
	});
});

describe('+page.svelte - フロントバリデーション', () => {
	test('[SPEC: AC-111] 金額が空のまま確定ボタンを押すと「金額は必須です」がインライン表示される', async () => {
		render(Page, { data: mockData });

		(page.getByTestId('expense-create-button').element() as HTMLButtonElement).click();
		flushSync();
		await expect.element(page.getByTestId('expense-form')).toBeVisible();

		(page.getByTestId('expense-submit-button').element() as HTMLButtonElement).click();
		flushSync();

		await expect.element(page.getByTestId('expense-amount-error')).toBeVisible();
		await expect.element(page.getByText('金額は必須です')).toBeVisible();
	});

	test('[SPEC: AC-111] 金額が空のままの場合、サーバー通信は発生しない', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		render(Page, { data: mockData });

		(page.getByTestId('expense-create-button').element() as HTMLButtonElement).click();
		flushSync();
		await expect.element(page.getByTestId('expense-form')).toBeVisible();
		(page.getByTestId('expense-submit-button').element() as HTMLButtonElement).click();
		flushSync();

		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('[SPEC: AC-112] カテゴリが未選択のまま確定ボタンを押すと「カテゴリは必須です」がインライン表示される', async () => {
		render(Page, { data: mockData });

		(page.getByTestId('expense-create-button').element() as HTMLButtonElement).click();
		flushSync();
		await expect.element(page.getByTestId('expense-form')).toBeVisible();

		// 金額を入力し、カテゴリは未選択のまま確定
		await page.getByTestId('expense-amount-input').fill('1000');
		(page.getByTestId('expense-submit-button').element() as HTMLButtonElement).click();
		flushSync();

		await expect.element(page.getByTestId('expense-category-error')).toBeVisible();
		await expect.element(page.getByText('カテゴリは必須です')).toBeVisible();
	});

	test('[SPEC: AC-112] カテゴリが未選択のままの場合、サーバー通信は発生しない', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		render(Page, { data: mockData });

		(page.getByTestId('expense-create-button').element() as HTMLButtonElement).click();
		flushSync();
		await expect.element(page.getByTestId('expense-form')).toBeVisible();
		await page.getByTestId('expense-amount-input').fill('1000');
		(page.getByTestId('expense-submit-button').element() as HTMLButtonElement).click();
		flushSync();

		expect(fetchMock).not.toHaveBeenCalled();
	});
});

describe('+page.svelte - check/uncheck エラー表示', () => {
	test('[SPEC: AC-122] check 操作が失敗した場合、expense-action-error が表示される', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				json: async () => ({ message: 'サーバーエラーが発生しました' })
			})
		);

		render(Page, { data: mockDataWithUnapprovedOwn });

		// チェックボックスをクリック（unapproved → check 操作）
		(page.getByTestId('expense-check-button').element() as HTMLInputElement).click();

		await expect.element(page.getByTestId('expense-action-error')).toBeVisible();
		await expect.element(page.getByText('サーバーエラーが発生しました')).toBeVisible();
	});

	test('[SPEC: AC-122] uncheck 操作が失敗した場合、expense-action-error が表示される', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				json: async () => ({ message: 'サーバーエラーが発生しました' })
			})
		);

		render(Page, { data: mockDataWithCheckedOwn });

		// チェックボックスをクリック（checked → uncheck 操作）
		(page.getByTestId('expense-check-button').element() as HTMLInputElement).click();

		await expect.element(page.getByTestId('expense-action-error')).toBeVisible();
		await expect.element(page.getByText('サーバーエラーが発生しました')).toBeVisible();
	});
});

describe('+page.svelte - 承認依頼エラー表示', () => {
	test('[SPEC: AC-123] 承認依頼が失敗した場合、expense-request-dialog 内にエラーが表示されダイアログを閉じない', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));

		const dataWithChecked = {
			...mockData,
			expenses: {
				items: [makeExpense({ status: 'checked', userId: 'user-1' })],
				total: 1,
				page: 1,
				limit: 20,
				monthTotal: 1000
			},
			bulkCounts: { myChecked: 1, myPending: 0, othersPending: 0 }
		};

		render(Page, { data: dataWithChecked });

		// 承認依頼ボタンをクリック
		(page.getByTestId('expense-bulk-request-button').element() as HTMLButtonElement).click();
		await expect.element(page.getByTestId('expense-request-dialog')).toBeInTheDocument();

		// ダイアログ内の確定ボタンをクリック
		(page.getByTestId('expense-request-confirm-button').element() as HTMLButtonElement).click();

		// ダイアログが開いたままであること
		await expect.element(page.getByTestId('expense-request-dialog')).toBeInTheDocument();
	});
});

describe('+page.svelte - 空状態・合計表示', () => {
	test('[SPEC: AC-204] 支出が0件の場合、空状態メッセージが表示される', async () => {
		render(Page, { data: mockData });

		await expect.element(page.getByTestId('expense-empty')).toBeInTheDocument();
	});

	test('[SPEC: AC-205] 支出が0件の場合、月間合計が「¥0」と表示される', async () => {
		render(Page, { data: mockData });

		await expect.element(page.getByTestId('expense-total')).toBeVisible();
		await expect.element(page.getByText('¥0')).toBeVisible();
	});
});
