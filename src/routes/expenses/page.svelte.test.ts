/**
 * @file テスト: 支出一覧画面
 * @module src/routes/expenses/page.svelte.test.ts
 * @testType unit
 *
 * @target ./+page.svelte
 * @spec specs/expenses/spec.md
 * @covers AC-111, AC-112
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import Page from './+page.svelte';

afterEach(() => {
	vi.unstubAllGlobals();
});

const mockData = {
	expenses: { items: [], total: 0, page: 1, limit: 20, monthTotal: 0 },
	categories: {
		items: [{ id: 'cat-1', userId: 'user-1', name: '食費', createdAt: new Date() }],
		total: 1,
		page: 1,
		limit: 20
	}
};

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
