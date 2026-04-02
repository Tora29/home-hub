/**
 * @file テスト: 支出一覧画面
 * @module src/routes/expenses/page.svelte.test.ts
 * @testType unit
 *
 * @target ./+page.svelte
 * @spec specs/expenses/spec.md
 * @covers AC-015, AC-016, AC-017, AC-018, AC-019, AC-020, AC-111, AC-112
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import Page from './+page.svelte';

afterEach(() => {
	vi.unstubAllGlobals();
});

const mockCategory = { id: 'cat-1', userId: 'user-1', name: '食費', createdAt: new Date() };

const unapprovedExpense = {
	id: 'exp-unapproved',
	userId: 'user-1',
	amount: 1000,
	categoryId: 'cat-1',
	approvedAt: null,
	finalizedAt: null,
	createdAt: new Date('2026-03-01T09:00:00Z'),
	category: mockCategory
};

const approvedExpense = {
	id: 'exp-approved',
	userId: 'user-1',
	amount: 2000,
	categoryId: 'cat-1',
	approvedAt: new Date('2026-03-01T10:00:00Z'),
	finalizedAt: null,
	createdAt: new Date('2026-03-01T08:00:00Z'),
	category: mockCategory
};

const mockDataWithUnapproved = {
	expenses: {
		items: [unapprovedExpense],
		total: 1,
		page: 1,
		limit: 20,
		monthTotal: 1000
	},
	categories: { items: [mockCategory], total: 1, page: 1, limit: 20 }
};

const mockDataWithApproved = {
	expenses: {
		items: [approvedExpense],
		total: 1,
		page: 1,
		limit: 20,
		monthTotal: 2000
	},
	categories: { items: [mockCategory], total: 1, page: 1, limit: 20 }
};

const mockData = {
	expenses: { items: [], total: 0, page: 1, limit: 20, monthTotal: 0 },
	categories: {
		items: [mockCategory],
		total: 1,
		page: 1,
		limit: 20
	}
};

const finalizedExpense = {
	id: 'exp-1',
	userId: 'user-1',
	amount: 3000,
	categoryId: 'cat-1',
	approvedAt: new Date('2026-03-01T10:00:00Z'),
	finalizedAt: new Date('2026-03-02T10:00:00Z'),
	createdAt: new Date('2026-03-01T09:00:00Z'),
	category: mockCategory
};

const mockDataWithFinalized = {
	expenses: {
		items: [finalizedExpense],
		total: 1,
		page: 1,
		limit: 20,
		monthTotal: 3000
	},
	categories: { items: [mockCategory], total: 1, page: 1, limit: 20 }
};

describe('+page.svelte - モバイル行メニューの開閉', () => {
	// expense-menu-button はモバイル（md: 未満）のみ表示。scaffold-fe 実装後に GREEN になる。

	it('[SPEC: AC-016] 未承認行の expense-menu-button をタップすると expense-menu が表示される', async () => {
		render(Page, { data: mockDataWithUnapproved });

		await expect.element(page.getByTestId('expense-menu')).not.toBeInTheDocument();
		await page.getByTestId('expense-menu-button').click();
		await expect.element(page.getByTestId('expense-menu')).toBeVisible();
	});

	it('[SPEC: AC-017] expense-menu 表示中にメニュー外をクリックすると expense-menu が閉じる', async () => {
		render(Page, { data: mockDataWithUnapproved });

		await page.getByTestId('expense-menu-button').click();
		await expect.element(page.getByTestId('expense-menu')).toBeVisible();

		// メニュー外をクリック
		await page.getByTestId('expense-list').click();
		await expect.element(page.getByTestId('expense-menu')).not.toBeVisible();
	});
});

describe('+page.svelte - モバイル行メニューの表示制御', () => {
	// expense-menu-button はモバイル（md: 未満）のみ表示。scaffold-fe 実装後に GREEN になる。

	it('[SPEC: AC-018] 未承認行のメニューには「確認済みにする」のみが表示される', async () => {
		render(Page, { data: mockDataWithUnapproved });

		await page.getByTestId('expense-menu-button').click();

		await expect.element(page.getByTestId('expense-approve-button')).toBeVisible();
		await expect.element(page.getByTestId('expense-unapprove-button')).not.toBeInTheDocument();
		await expect.element(page.getByTestId('expense-finalize-button')).not.toBeInTheDocument();
	});

	it('[SPEC: AC-019] 確認済み（未確定）行のメニューには「未承認に戻す」と「確定対象にする」が表示される', async () => {
		render(Page, { data: mockDataWithApproved });

		await page.getByTestId('expense-menu-button').click();

		await expect.element(page.getByTestId('expense-unapprove-button')).toBeVisible();
		await expect.element(page.getByTestId('expense-finalize-button')).toBeVisible();
		await expect.element(page.getByTestId('expense-approve-button')).not.toBeInTheDocument();
	});

	it('[SPEC: AC-020] 確定済み行には expense-menu-button が表示されない', async () => {
		render(Page, { data: mockDataWithFinalized });

		await expect.element(page.getByTestId('expense-item')).toBeVisible();
		await expect.element(page.getByTestId('expense-menu-button')).not.toBeInTheDocument();
	});
});

describe('+page.svelte - 確定済み支出の表示制御', () => {
	it('[SPEC: AC-015] 確定済みの支出行には編集ボタンが表示されない', async () => {
		render(Page, { data: mockDataWithFinalized });

		await expect.element(page.getByTestId('expense-item')).toBeVisible();
		await expect.element(page.getByTestId('expense-edit-button')).not.toBeInTheDocument();
	});

	it('[SPEC: AC-015] 確定済みの支出行には削除ボタンが表示されない', async () => {
		render(Page, { data: mockDataWithFinalized });

		await expect.element(page.getByTestId('expense-item')).toBeVisible();
		await expect.element(page.getByTestId('expense-delete-button')).not.toBeInTheDocument();
	});

	it('[SPEC: AC-015] 確定済みの支出行には未承認に戻すボタンが表示されない', async () => {
		render(Page, { data: mockDataWithFinalized });

		await expect.element(page.getByTestId('expense-item')).toBeVisible();
		await expect.element(page.getByTestId('expense-unapprove-button')).not.toBeInTheDocument();
	});

	it('[SPEC: AC-015] 確定済みの支出行には確認済みボタンも表示されない', async () => {
		render(Page, { data: mockDataWithFinalized });

		await expect.element(page.getByTestId('expense-item')).toBeVisible();
		await expect.element(page.getByTestId('expense-approve-button')).not.toBeInTheDocument();
	});

	it('[SPEC: AC-015] 確定済みの支出行には確定ボタンも表示されない', async () => {
		render(Page, { data: mockDataWithFinalized });

		await expect.element(page.getByTestId('expense-item')).toBeVisible();
		await expect.element(page.getByTestId('expense-finalize-button')).not.toBeInTheDocument();
	});

	it('[SPEC: AC-015] 確定済みの支出行はグレーアウトされる', async () => {
		render(Page, { data: mockDataWithFinalized });

		const item = page.getByTestId('expense-item');
		await expect.element(item).toBeVisible();
		await expect.element(item).toHaveClass('opacity-60');
	});
});

describe('+page.svelte - フロントバリデーション', () => {
	it('[SPEC: AC-111] 金額が空のまま確定ボタンを押すと「金額は必須です」がインライン表示される', async () => {
		render(Page, { data: mockData });

		// 登録ボタンをクリックしてフォームダイアログを開く
		await page.getByTestId('expense-create-button').click();

		// 金額を入力せずに確定ボタンをクリック
		await page.getByTestId('expense-submit-button').click();

		await expect.element(page.getByTestId('expense-amount-error')).toBeVisible();
		await expect.element(page.getByText('金額は必須です')).toBeVisible();
	});

	it('[SPEC: AC-111] 金額が空のままの場合、サーバー通信は発生しない', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		render(Page, { data: mockData });

		await page.getByTestId('expense-create-button').click();
		await page.getByTestId('expense-submit-button').click();

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('[SPEC: AC-112] カテゴリが未選択のまま確定ボタンを押すと「カテゴリは必須です」がインライン表示される', async () => {
		render(Page, { data: mockData });

		// 登録ボタンをクリックしてフォームダイアログを開く
		await page.getByTestId('expense-create-button').click();

		// 金額を入力するがカテゴリは未選択のまま確定ボタンをクリック
		await page.getByTestId('expense-amount-input').fill('1000');
		await page.getByTestId('expense-submit-button').click();

		await expect.element(page.getByTestId('expense-category-error')).toBeVisible();
		await expect.element(page.getByText('カテゴリは必須です')).toBeVisible();
	});

	it('[SPEC: AC-112] カテゴリが未選択のままの場合、サーバー通信は発生しない', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		render(Page, { data: mockData });

		await page.getByTestId('expense-create-button').click();
		await page.getByTestId('expense-amount-input').fill('1000');
		await page.getByTestId('expense-submit-button').click();

		expect(fetchMock).not.toHaveBeenCalled();
	});
});
