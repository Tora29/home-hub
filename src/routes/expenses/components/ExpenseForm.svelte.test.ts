/**
 * @file テスト: ExpenseForm コンポーネント
 * @module src/routes/expenses/components/ExpenseForm.svelte.test.ts
 * @testType unit
 *
 * @target ./ExpenseForm.svelte
 * @spec specs/expenses/spec.md
 * @covers AC-111, AC-112
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ExpenseForm from './ExpenseForm.svelte';

afterEach(() => {
	vi.unstubAllGlobals();
});

const mockCategories = [
	{ id: 'cat-1', userId: 'user-1', name: '食費', createdAt: new Date() },
	{ id: 'cat-2', userId: 'user-1', name: '交通費', createdAt: new Date() }
];

const defaultProps = {
	mode: 'create' as const,
	categories: mockCategories,
	onSuccess: vi.fn(),
	onCancel: vi.fn()
};

describe('ExpenseForm - FE バリデーション', () => {
	it('[SPEC: AC-111] 金額が空のまま確定ボタンを押すと「金額は必須です」が表示される', async () => {
		render(ExpenseForm, defaultProps);

		await page.getByTestId('expense-submit-button').click();

		await expect.element(page.getByTestId('expense-amount-error')).toBeVisible();
		await expect.element(page.getByText('金額は必須です')).toBeVisible();
	});

	it('[SPEC: AC-111] 金額が空のままの場合、サーバー通信は発生しない', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		render(ExpenseForm, defaultProps);

		await page.getByTestId('expense-submit-button').click();

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('[SPEC: AC-112] カテゴリが未選択のまま確定ボタンを押すと「カテゴリは必須です」が表示される', async () => {
		render(ExpenseForm, defaultProps);

		await page.getByTestId('expense-amount-input').fill('1000');
		await page.getByTestId('expense-submit-button').click();

		await expect.element(page.getByTestId('expense-category-error')).toBeVisible();
		await expect.element(page.getByText('カテゴリは必須です')).toBeVisible();
	});

	it('[SPEC: AC-112] カテゴリが未選択のままの場合、サーバー通信は発生しない', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		render(ExpenseForm, defaultProps);

		await page.getByTestId('expense-amount-input').fill('1000');
		await page.getByTestId('expense-submit-button').click();

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('[SPEC: AC-111] [SPEC: AC-112] 金額・カテゴリ両方が未入力の場合、両エラーが同時に表示される', async () => {
		render(ExpenseForm, defaultProps);

		await page.getByTestId('expense-submit-button').click();

		await expect.element(page.getByTestId('expense-amount-error')).toBeVisible();
		await expect.element(page.getByTestId('expense-category-error')).toBeVisible();
	});
});
