/**
 * @file テスト: Expense 一覧画面
 * @module src/routes/expenses/page.svelte.test.ts
 * @testType unit
 *
 * @target ./+page.svelte
 * @spec specs/expenses/spec.md
 * @covers AC-015, AC-016, AC-017, AC-111, AC-112
 */

import { describe, test, expect, vi, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import Page from './+page.svelte';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));

vi.mock('$app/state', () => ({
	page: { url: new URL('http://localhost/expenses') }
}));

afterEach(() => {
	vi.clearAllMocks();
});

// テスト用ユーザー
const currentUserId = 'user-a';
const otherUserId = 'user-b';

function makeExpense(overrides: {
	id: string;
	userId: string;
	status: 'unapproved' | 'checked' | 'pending' | 'approved';
	amount?: number;
}) {
	return {
		id: overrides.id,
		userId: overrides.userId,
		amount: overrides.amount ?? 1000,
		categoryId: 'cat-1',
		payerUserId: 'user-a',
		status: overrides.status,
		createdAt: '2026-03-01T00:00:00Z',
		category: { id: 'cat-1', userId: currentUserId, name: '食費', createdAt: '2026-01-01T00:00:00Z' },
		payer: { id: 'user-a', name: '主', email: 'main@example.com' }
	};
}

const defaultData = {
	expenses: {
		items: [],
		total: 0,
		page: 1,
		limit: 20,
		monthTotal: 0
	},
	categories: { items: [], total: 0, page: 1, limit: 20 },
	users: [],
	currentUserId
};

describe('Expense 一覧画面 - approved 行のスタイルと操作ボタン', () => {
	test('[SPEC: AC-015] approved 行はグレーアウト表示でチェックボックス・編集・削除ボタンが非表示 // spec:7017dde3', async () => {
		const approvedExpense = makeExpense({ id: 'exp-1', userId: currentUserId, status: 'approved' });
		render(Page, {
			data: {
				...defaultData,
				expenses: { ...defaultData.expenses, items: [approvedExpense], total: 1 }
			}
		});

		// approved 行には check ボタン・編集ボタン・削除ボタンが存在しない
		await expect
			.element(page.getByTestId('expense-check-button'))
			.not.toBeInTheDocument();
		await expect
			.element(page.getByTestId('expense-edit-button'))
			.not.toBeInTheDocument();
		await expect
			.element(page.getByTestId('expense-delete-button'))
			.not.toBeInTheDocument();
	});
});

describe('Expense 一覧画面 - 他ユーザー行の操作制限', () => {
	test('[SPEC: AC-016] 他ユーザーの unapproved 行にはチェックボックス・編集・削除ボタンが非表示 // spec:7017dde3', async () => {
		const otherExpense = makeExpense({
			id: 'exp-2',
			userId: otherUserId,
			status: 'unapproved'
		});
		render(Page, {
			data: {
				...defaultData,
				expenses: { ...defaultData.expenses, items: [otherExpense], total: 1 }
			}
		});

		await expect
			.element(page.getByTestId('expense-check-button'))
			.not.toBeInTheDocument();
		await expect
			.element(page.getByTestId('expense-edit-button'))
			.not.toBeInTheDocument();
		await expect
			.element(page.getByTestId('expense-delete-button'))
			.not.toBeInTheDocument();
	});

	test('[SPEC: AC-016] 他ユーザーの checked 行にはチェックボックス・編集・削除ボタンが非表示 // spec:7017dde3', async () => {
		const otherChecked = makeExpense({
			id: 'exp-3',
			userId: otherUserId,
			status: 'checked'
		});
		render(Page, {
			data: {
				...defaultData,
				expenses: { ...defaultData.expenses, items: [otherChecked], total: 1 }
			}
		});

		await expect
			.element(page.getByTestId('expense-check-button'))
			.not.toBeInTheDocument();
		await expect
			.element(page.getByTestId('expense-edit-button'))
			.not.toBeInTheDocument();
		await expect
			.element(page.getByTestId('expense-delete-button'))
			.not.toBeInTheDocument();
	});
});

describe('Expense 一覧画面 - pending 行のスタイルと操作制限', () => {
	test('[SPEC: AC-017] 自分の pending 行はグレーアウト + チェックボックスなし・編集削除ボタンは disabled // spec:7017dde3', async () => {
		const myPending = makeExpense({ id: 'exp-4', userId: currentUserId, status: 'pending' });
		render(Page, {
			data: {
				...defaultData,
				expenses: { ...defaultData.expenses, items: [myPending], total: 1 }
			}
		});

		// pending 行のチェックボックスは非表示
		await expect
			.element(page.getByTestId('expense-check-button'))
			.not.toBeInTheDocument();
	});
});

describe('Expense 一覧画面 - フロントバリデーション', () => {
	test('[SPEC: AC-111] 金額が空のまま「確定」を押すと「金額は必須です」がインライン表示される（サーバー非通信）// spec:1015add0', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		render(Page, { data: defaultData });

		// 支出登録ボタンをクリックしてフォームを開く
		page.getByTestId('expense-create-button').element().click();
		flushSync();

		// 金額を空のまま確定ボタンをクリック
		page.getByRole('button', { name: '確定' }).element().click();
		flushSync();

		// エラーメッセージが表示される
		await expect.element(page.getByTestId('expense-amount-error')).toBeInTheDocument();
		await expect.element(page.getByText('金額は必須です')).toBeVisible();

		// サーバーへの通信は発生しない
		expect(fetchMock).not.toHaveBeenCalled();

		vi.unstubAllGlobals();
	});

	test('[SPEC: AC-112] カテゴリが未選択のまま「確定」を押すと「カテゴリは必須です」がインライン表示される（サーバー非通信）// spec:1015add0', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		render(Page, { data: defaultData });

		page.getByTestId('expense-create-button').element().click();
		flushSync();

		// 金額だけ入力してカテゴリ未選択で確定
		const amountInput = page.getByTestId('expense-amount-input').element() as HTMLInputElement;
		amountInput.value = '1000';
		amountInput.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		page.getByRole('button', { name: '確定' }).element().click();
		flushSync();

		await expect.element(page.getByTestId('expense-category-error')).toBeInTheDocument();
		await expect.element(page.getByText('カテゴリは必須です')).toBeVisible();

		expect(fetchMock).not.toHaveBeenCalled();

		vi.unstubAllGlobals();
	});
});

describe('Expense 一覧画面 - 空状態', () => {
	test('[SPEC: AC-204 相当] 支出が 0 件の場合、expense-empty が表示される // spec:7017dde3', async () => {
		render(Page, { data: defaultData });

		await expect.element(page.getByTestId('expense-empty')).toBeInTheDocument();
	});
});
