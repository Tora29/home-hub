/**
 * @file テスト: ExpenseForm コンポーネント
 * @module src/routes/expenses/components/ExpenseForm.svelte.test.ts
 * @testType unit
 *
 * @target ./ExpenseForm.svelte
 * @spec specs/expenses/spec.md
 * @covers AC-111, AC-112, AC-120
 */

import { describe, test, expect, afterEach, vi } from 'vitest';
import { flushSync } from 'svelte';
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

const mockPayers = [
	{ id: 'payer-1', userId: 'user-1', name: '田中', createdAt: new Date() },
	{ id: 'payer-2', userId: 'user-1', name: '佐藤', createdAt: new Date() }
];

const defaultProps = {
	mode: 'create' as const,
	categories: mockCategories,
	payers: mockPayers,
	onSuccess: vi.fn(),
	onCancel: vi.fn()
};

describe('ExpenseForm - FE バリデーション', () => {
	test('[SPEC: AC-111] 金額が空のまま確定ボタンを押すと「金額は必須です」が表示される', async () => {
		render(ExpenseForm, defaultProps);

		(page.getByRole('button', { name: '確定' }).element() as HTMLElement).click();
		flushSync();

		await expect.element(page.getByTestId('expense-amount-error')).toBeVisible();
		await expect.element(page.getByText('金額は必須です')).toBeVisible();
	});

	test('[SPEC: AC-111] 金額が空のままの場合、サーバー通信は発生しない', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		render(ExpenseForm, defaultProps);

		(page.getByRole('button', { name: '確定' }).element() as HTMLElement).click();

		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('[SPEC: AC-112] カテゴリが未選択のまま確定ボタンを押すと「カテゴリは必須です」が表示される', async () => {
		render(ExpenseForm, defaultProps);

		await page.getByRole('textbox').fill('1000');
		(page.getByRole('button', { name: '確定' }).element() as HTMLElement).click();
		flushSync();

		await expect.element(page.getByTestId('expense-category-error')).toBeVisible();
		await expect.element(page.getByText('カテゴリは必須です')).toBeVisible();
	});

	test('[SPEC: AC-112] カテゴリが未選択のままの場合、サーバー通信は発生しない', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		render(ExpenseForm, defaultProps);

		await page.getByRole('textbox').fill('1000');
		(page.getByRole('button', { name: '確定' }).element() as HTMLElement).click();

		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('[SPEC: AC-111] [SPEC: AC-112] 金額・カテゴリ両方が未入力の場合、両エラーが同時に表示される', async () => {
		render(ExpenseForm, defaultProps);

		(page.getByRole('button', { name: '確定' }).element() as HTMLElement).click();
		flushSync();

		await expect.element(page.getByTestId('expense-amount-error')).toBeVisible();
		await expect.element(page.getByTestId('expense-category-error')).toBeVisible();
	});
});

describe('ExpenseForm - 支払者バリデーション', () => {
	test('[SPEC: AC-120] 支払者が未選択のまま確定ボタンを押すと「支払者は必須です」が表示される', async () => {
		render(ExpenseForm, defaultProps);

		await page.getByRole('textbox').fill('1000');
		// カテゴリを選択
		const categorySelect = page.getByTestId('expense-category-select');
		await categorySelect.selectOptions('cat-1');
		// 支払者は未選択のまま確定
		(page.getByRole('button', { name: '確定' }).element() as HTMLElement).click();
		flushSync();

		await expect.element(page.getByTestId('expense-payer-error')).toBeVisible();
		await expect.element(page.getByText('支払者は必須です')).toBeVisible();
	});

	test('[SPEC: AC-120] 支払者が未選択のままの場合、サーバー通信は発生しない', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		render(ExpenseForm, defaultProps);

		await page.getByRole('textbox').fill('1000');
		const categorySelect = page.getByTestId('expense-category-select');
		await categorySelect.selectOptions('cat-1');
		(page.getByRole('button', { name: '確定' }).element() as HTMLElement).click();

		expect(fetchMock).not.toHaveBeenCalled();
	});
});

describe('ExpenseForm - 金額入力の自動整形', () => {
	test('[SPEC: AC-206] 全角数字を入力すると半角数字に自動変換される', async () => {
		render(ExpenseForm, defaultProps);

		const input = page.getByRole('textbox');
		// headless Chromium では fill() で全角文字を入力するとタイムアウトするため
		// element() で DOM を直接操作して oninput をディスパッチする
		const inputEl = input.element() as HTMLInputElement;
		inputEl.value = '１２３４';
		inputEl.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		await expect.element(input).toHaveValue('1,234');
	});

	test('[SPEC: AC-207] 半角数字を入力するとカンマ区切りで整形される', async () => {
		render(ExpenseForm, defaultProps);

		const input = page.getByRole('textbox');
		const inputEl = input.element() as HTMLInputElement;
		inputEl.value = '1000';
		inputEl.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		await expect.element(input).toHaveValue('1,000');
	});

	test('[SPEC: AC-207] カンマ付きで入力しても正しく整形される', async () => {
		render(ExpenseForm, defaultProps);

		const input = page.getByRole('textbox');
		const inputEl = input.element() as HTMLInputElement;
		inputEl.value = '1,500';
		inputEl.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		await expect.element(input).toHaveValue('1,500');
	});
});
