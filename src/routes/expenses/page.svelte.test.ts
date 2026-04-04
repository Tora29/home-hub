/**
 * @file テスト: 支出一覧画面
 * @module src/routes/expenses/page.svelte.test.ts
 * @testType unit
 *
 * @target ./+page.svelte
 * @spec specs/expenses/spec.md
 * @covers AC-015, AC-111, AC-112
 */

import { describe, test, expect, afterEach, vi } from 'vitest';
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

const _mockDataWithUnapproved = {
	expenses: {
		items: [unapprovedExpense],
		total: 1,
		page: 1,
		limit: 20,
		monthTotal: 1000
	},
	categories: { items: [mockCategory], total: 1, page: 1, limit: 20 }
};

const _mockDataWithApproved = {
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

describe('+page.svelte - 確定済み支出の表示制御', () => {
	test('[SPEC: AC-015] 確定済みの支出行には編集ボタンが表示されない', async () => {
		render(Page, { data: mockDataWithFinalized });

		await expect.element(page.getByTestId('expense-item')).toBeVisible();
		await expect.element(page.getByRole('button', { name: '編集' })).not.toBeInTheDocument();
	});

	test('[SPEC: AC-015] 確定済みの支出行には削除ボタンが表示されない', async () => {
		render(Page, { data: mockDataWithFinalized });

		await expect.element(page.getByTestId('expense-item')).toBeVisible();
		await expect.element(page.getByRole('button', { name: '削除' })).not.toBeInTheDocument();
	});

	test('[SPEC: AC-015] 確定済みの支出行には未承認に戻すボタンが表示されない', async () => {
		render(Page, { data: mockDataWithFinalized });

		await expect.element(page.getByTestId('expense-item')).toBeVisible();
		await expect
			.element(page.getByRole('button', { name: '未承認に戻す' }))
			.not.toBeInTheDocument();
	});

	test('[SPEC: AC-015] 確定済みの支出行には確認済みボタンも表示されない', async () => {
		render(Page, { data: mockDataWithFinalized });

		await expect.element(page.getByTestId('expense-item')).toBeVisible();
		await expect
			.element(page.getByRole('button', { name: '確認済みにする' }))
			.not.toBeInTheDocument();
	});

	test('[SPEC: AC-015] 確定済みの支出行には確定ボタンも表示されない', async () => {
		render(Page, { data: mockDataWithFinalized });

		await expect.element(page.getByTestId('expense-item')).toBeVisible();
		await expect.element(page.getByTestId('expense-bulk-finalize-button')).not.toBeInTheDocument();
	});

	test('[SPEC: AC-015] 確定済みの支出行はグレーアウトされる', async () => {
		render(Page, { data: mockDataWithFinalized });

		const item = page.getByTestId('expense-item');
		await expect.element(item).toBeVisible();
		await expect.element(item).toHaveClass('opacity-60');
	});
});

describe('+page.svelte - フロントバリデーション', () => {
	test('[SPEC: AC-111] 金額が空のまま確定ボタンを押すと「金額は必須です」がインライン表示される', async () => {
		render(Page, { data: mockData });

		// 登録ボタンをクリックしてフォームダイアログを開く
		await page.getByRole('button', { name: '支出を登録' }).click();
		// ダイアログが開くのを待つ
		await expect.element(page.getByTestId('expense-form')).toBeVisible();

		// 金額を入力せずに確定ボタンをクリック
		await page.getByRole('button', { name: '確定' }).click();

		await expect.element(page.getByTestId('expense-amount-error')).toBeVisible();
		await expect.element(page.getByText('金額は必須です')).toBeVisible();
	});

	test('[SPEC: AC-111] 金額が空のままの場合、サーバー通信は発生しない', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		render(Page, { data: mockData });

		await page.getByRole('button', { name: '支出を登録' }).click();
		await expect.element(page.getByTestId('expense-form')).toBeVisible();
		await page.getByRole('button', { name: '確定' }).click();

		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('[SPEC: AC-112] カテゴリが未選択のまま確定ボタンを押すと「カテゴリは必須です」がインライン表示される', async () => {
		render(Page, { data: mockData });

		// 登録ボタンをクリックしてフォームダイアログを開く
		await page.getByRole('button', { name: '支出を登録' }).click();
		await expect.element(page.getByTestId('expense-form')).toBeVisible();

		// 金額を入力するがカテゴリは未選択のまま確定ボタンをクリック
		await page.getByRole('textbox').fill('1000');
		await page.getByRole('button', { name: '確定' }).click();

		await expect.element(page.getByTestId('expense-category-error')).toBeVisible();
		await expect.element(page.getByText('カテゴリは必須です')).toBeVisible();
	});

	test('[SPEC: AC-112] カテゴリが未選択のままの場合、サーバー通信は発生しない', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		render(Page, { data: mockData });

		await page.getByRole('button', { name: '支出を登録' }).click();
		await expect.element(page.getByTestId('expense-form')).toBeVisible();
		await page.getByRole('textbox').fill('1000');
		await page.getByRole('button', { name: '確定' }).click();

		expect(fetchMock).not.toHaveBeenCalled();
	});
});
