/**
 * @file テスト: 支出一覧画面
 * @module src/routes/expenses/page.svelte.test.ts
 * @testType unit
 *
 * @target ./+page.svelte
 * @spec specs/expenses/spec.md
 * @covers AC-015, AC-111, AC-112, AC-122, AC-123
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

const mockCategory = { id: 'cat-1', userId: 'user-1', name: '食費', createdAt: new Date() };
const mockPayer = { id: 'payer-1', userId: 'user-1', name: '田中', createdAt: new Date() };
const mockPayers = { items: [mockPayer], total: 1, page: 1, limit: 20 };

const mockData = {
	expenses: { items: [], total: 0, page: 1, limit: 20, monthTotal: 0 },
	categories: { items: [mockCategory], total: 1, page: 1, limit: 20 },
	payers: mockPayers,
	currentMonth: '2026-04'
};

const finalizedExpense = {
	id: 'exp-fin-1',
	userId: 'user-1',
	amount: 5000,
	categoryId: 'cat-1',
	payerId: 'payer-1',
	approvedAt: new Date(),
	finalizedAt: new Date(),
	createdAt: new Date(),
	category: mockCategory,
	payer: mockPayer
};

const unapprovedExpense = {
	id: 'exp-unapp-1',
	userId: 'user-1',
	amount: 1000,
	categoryId: 'cat-1',
	payerId: 'payer-1',
	approvedAt: null,
	finalizedAt: null,
	createdAt: new Date(),
	category: mockCategory,
	payer: mockPayer
};

const approvedExpense = {
	id: 'exp-app-1',
	userId: 'user-1',
	amount: 2000,
	categoryId: 'cat-1',
	payerId: 'payer-1',
	approvedAt: new Date(),
	finalizedAt: null,
	createdAt: new Date(),
	category: mockCategory,
	payer: mockPayer
};

const mockDataWithFinalized = {
	...mockData,
	expenses: { items: [finalizedExpense], total: 1, page: 1, limit: 20, monthTotal: 5000 }
};

const mockDataWithUnapproved = {
	...mockData,
	expenses: { items: [unapprovedExpense], total: 1, page: 1, limit: 20, monthTotal: 1000 }
};

const mockDataWithApproved = {
	...mockData,
	expenses: { items: [approvedExpense], total: 1, page: 1, limit: 20, monthTotal: 2000 }
};

describe('+page.svelte - 確定済み行の表示', () => {
	test('[SPEC: AC-015] 確定済みの行には編集・削除・承認ボタンが DOM に存在しない', async () => {
		render(Page, { data: mockDataWithFinalized });

		await expect.element(page.getByTestId('expense-edit-button')).not.toBeInTheDocument();
		await expect.element(page.getByTestId('expense-delete-button')).not.toBeInTheDocument();
		await expect.element(page.getByTestId('expense-approve-button')).not.toBeInTheDocument();
		await expect.element(page.getByTestId('expense-unapprove-button')).not.toBeInTheDocument();
	});

	test('[SPEC: AC-015] 確定済みの行には行メニューボタンが DOM に存在しない', async () => {
		render(Page, { data: mockDataWithFinalized });

		await expect.element(page.getByTestId('expense-menu-button')).not.toBeInTheDocument();
	});

	test('[SPEC: AC-015] 確定済みの行は opacity-60 クラスでグレーアウトされる', async () => {
		render(Page, { data: mockDataWithFinalized });

		await expect.element(page.getByTestId('expense-item')).toHaveClass('opacity-60');
	});
});

describe('+page.svelte - フロントバリデーション', () => {
	test('[SPEC: AC-111] 金額が空のまま確定ボタンを押すと「金額は必須です」がインライン表示される', async () => {
		render(Page, { data: mockData });

		(page.getByRole('button', { name: '支出を登録' }).element() as HTMLButtonElement).click();
		flushSync();
		await expect.element(page.getByTestId('expense-form')).toBeVisible();

		(page.getByRole('button', { name: '確定' }).element() as HTMLButtonElement).click();
		flushSync();

		await expect.element(page.getByTestId('expense-amount-error')).toBeVisible();
		await expect.element(page.getByText('金額は必須です')).toBeVisible();
	});

	test('[SPEC: AC-111] 金額が空のままの場合、サーバー通信は発生しない', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		render(Page, { data: mockData });

		(page.getByRole('button', { name: '支出を登録' }).element() as HTMLButtonElement).click();
		flushSync();
		await expect.element(page.getByTestId('expense-form')).toBeVisible();
		(page.getByRole('button', { name: '確定' }).element() as HTMLButtonElement).click();
		flushSync();

		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('[SPEC: AC-112] カテゴリが未選択のまま確定ボタンを押すと「カテゴリは必須です」がインライン表示される', async () => {
		render(Page, { data: mockData });

		(page.getByRole('button', { name: '支出を登録' }).element() as HTMLButtonElement).click();
		flushSync();
		await expect.element(page.getByTestId('expense-form')).toBeVisible();

		await page.getByRole('textbox').fill('1000');
		(page.getByRole('button', { name: '確定' }).element() as HTMLButtonElement).click();
		flushSync();

		await expect.element(page.getByTestId('expense-category-error')).toBeVisible();
		await expect.element(page.getByText('カテゴリは必須です')).toBeVisible();
	});

	test('[SPEC: AC-112] カテゴリが未選択のままの場合、サーバー通信は発生しない', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		render(Page, { data: mockData });

		(page.getByRole('button', { name: '支出を登録' }).element() as HTMLButtonElement).click();
		flushSync();
		await expect.element(page.getByTestId('expense-form')).toBeVisible();
		await page.getByRole('textbox').fill('1000');
		(page.getByRole('button', { name: '確定' }).element() as HTMLButtonElement).click();
		flushSync();

		expect(fetchMock).not.toHaveBeenCalled();
	});
});

describe('+page.svelte - approve/unapprove エラー表示', () => {
	test('[SPEC: AC-122] 「確認済みにする」が失敗した場合、expense-action-error が表示される', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				json: async () => ({ message: 'サーバーエラーが発生しました' })
			})
		);

		render(Page, { data: mockDataWithUnapproved });

		(page.getByRole('button', { name: '確認済みにする' }).element() as HTMLButtonElement).click();

		await expect.element(page.getByTestId('expense-action-error')).toBeVisible();
		await expect.element(page.getByText('サーバーエラーが発生しました')).toBeVisible();
	});

	test('[SPEC: AC-122] 「確認済みにする」が失敗してもサーバーのメッセージがなければデフォルトメッセージを表示する', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				json: async () => {
					throw new Error('parse error');
				}
			})
		);

		render(Page, { data: mockDataWithUnapproved });

		(page.getByRole('button', { name: '確認済みにする' }).element() as HTMLButtonElement).click();

		await expect.element(page.getByTestId('expense-action-error')).toBeVisible();
		await expect.element(page.getByText('確認済みへの更新に失敗しました')).toBeVisible();
	});

	test('[SPEC: AC-122] 「未承認に戻す」が失敗した場合、expense-action-error が表示される', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				json: async () => ({ message: 'サーバーエラーが発生しました' })
			})
		);

		render(Page, { data: mockDataWithApproved });

		(page.getByRole('button', { name: '未承認に戻す' }).element() as HTMLButtonElement).click();

		await expect.element(page.getByTestId('expense-action-error')).toBeVisible();
		await expect.element(page.getByText('サーバーエラーが発生しました')).toBeVisible();
	});
});

describe('+page.svelte - 一括確定エラー表示', () => {
	test('[SPEC: AC-123] 一括確定が失敗した場合、ダイアログにエラーが表示されダイアログを閉じない', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

		render(Page, { data: mockDataWithApproved });

		// 「確定する（1件）」ボタンでダイアログを開く
		(page.getByTestId('expense-bulk-finalize-button').element() as HTMLButtonElement).click();
		await expect.element(page.getByTestId('expense-finalize-dialog')).toBeInTheDocument();

		// ダイアログ内の確定ボタンをクリック
		(page.getByTestId('expense-finalize-confirm-button').element() as HTMLButtonElement).click();

		// ダイアログが開いたまま、エラーメッセージが表示される
		await expect.element(page.getByTestId('expense-finalize-dialog')).toBeInTheDocument();
		await expect
			.element(page.getByText('1件の確定に失敗しました。再度お試しください。'))
			.toBeVisible();
	});
});
