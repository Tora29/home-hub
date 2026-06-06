/**
 * @file テスト: 支出一覧画面
 * @module src/lib/features/expenses/components/ExpensesPage.svelte.test.ts
 * @testType unit
 *
 * @target ./ExpensesPage.svelte
 */
import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import { flushSync } from 'svelte';
import ExpensesPage from './ExpensesPage.svelte';
import type { ExpenseWithRelations } from '../types';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));

function makeExpense(overrides: Partial<ExpenseWithRelations> = {}): ExpenseWithRelations {
	return {
		id: crypto.randomUUID(),
		userId: 'user-1',
		amount: 1000,
		categoryId: 'cat-1',
		payerUserId: 'user-1',
		status: 'unapproved',
		createdAt: new Date().toISOString(),
		category: { id: 'cat-1', userId: 'user-1', name: '食費', createdAt: new Date().toISOString() },
		payer: { id: 'user-1', name: 'テストユーザー', email: 'test@example.com' },
		...overrides
	};
}

function makeProps(overrides: Partial<Parameters<typeof render>[1]> = {}) {
	return {
		expenses: [] as ExpenseWithRelations[],
		total: 0,
		monthTotal: 0,
		categories: { items: [], total: 0, page: 1, limit: 20 },
		users: [{ id: 'user-1', name: 'テストユーザー', email: 'test@example.com' }],
		currentUserId: 'user-1',
		currentMonth: '2024-06',
		selectedMonth: '2024-06',
		partnerPendingCount: 0,
		...overrides
	};
}

describe('ExpensesPage', () => {
	test('支出がない場合、空状態メッセージが表示される', async () => {
		render(ExpensesPage, makeProps());
		await expect.element(page.getByTestId('expense-empty')).toBeVisible();
	});

	test('支出がある場合、一覧が表示される', async () => {
		render(ExpensesPage, makeProps({ expenses: [makeExpense()] }));
		await expect.element(page.getByTestId('expense-list')).toBeVisible();
		await expect.element(page.getByTestId('expense-empty')).not.toBeInTheDocument();
	});

	test('月間合計が表示される', async () => {
		render(ExpensesPage, makeProps({ monthTotal: 3500 }));
		await expect.element(page.getByTestId('expense-total')).toBeVisible();
		await expect.element(page.getByText('¥3,500')).toBeVisible();
	});

	test('月選択セレクトが表示される', async () => {
		render(ExpensesPage, makeProps());
		await expect.element(page.getByTestId('expense-month-select')).toBeVisible();
	});

	test('支出登録ボタンが表示される', async () => {
		render(ExpensesPage, makeProps());
		await expect.element(page.getByTestId('expense-create-button')).toBeVisible();
	});

	test('自分の checked 支出がある場合、承認依頼ボタンが表示される', async () => {
		render(
			ExpensesPage,
			makeProps({ expenses: [makeExpense({ userId: 'user-1', status: 'checked' })] })
		);
		await expect.element(page.getByTestId('expense-bulk-request-button')).toBeVisible();
	});

	test('自分の checked 支出がない場合、承認依頼ボタンが表示されない', async () => {
		render(
			ExpensesPage,
			makeProps({ expenses: [makeExpense({ userId: 'user-1', status: 'unapproved' })] })
		);
		await expect.element(page.getByTestId('expense-bulk-request-button')).not.toBeInTheDocument();
	});

	test('自分の pending 支出がある場合、申請取り消しボタンが表示される', async () => {
		render(
			ExpensesPage,
			makeProps({ expenses: [makeExpense({ userId: 'user-1', status: 'pending' })] })
		);
		await expect.element(page.getByTestId('expense-bulk-cancel-button')).toBeVisible();
	});

	test('パートナーの pending 支出がある場合、全件承認ボタンが表示される', async () => {
		render(ExpensesPage, makeProps({ partnerPendingCount: 1 }));
		await expect.element(page.getByTestId('expense-bulk-approve-button')).toBeVisible();
	});

	test('パートナーの pending 支出がない場合、全件承認ボタンが表示されない', async () => {
		render(ExpensesPage, makeProps({ partnerPendingCount: 0 }));
		await expect.element(page.getByTestId('expense-bulk-approve-button')).not.toBeInTheDocument();
	});

	test('支出登録ボタンをクリックするとダイアログが開く', async () => {
		render(ExpensesPage, makeProps());
		(page.getByTestId('expense-create-button').element() as HTMLElement).click();
		flushSync();
		await expect.element(page.getByRole('dialog')).toBeVisible();
	});
});
