/**
 * @file テスト: ExpenseFormDialog
 * @module src/routes/expenses/components/ExpenseFormDialog.svelte.test.ts
 * @testType unit
 *
 * @target ./ExpenseFormDialog.svelte
 * @spec specs/expenses/spec.md
 * @covers AC-032, AC-033, AC-034
 */

import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ExpenseFormDialog from './ExpenseFormDialog.svelte';

const mockCategory = { id: 'cat-1', userId: 'user-1', name: '食費', createdAt: new Date() };

const mockExpense = {
	id: 'exp-1',
	userId: 'user-1',
	amount: 1000,
	categoryId: 'cat-1',
	approvedAt: null,
	finalizedAt: null,
	createdAt: new Date(),
	category: mockCategory
};

const baseProps = {
	categories: [mockCategory],
	onSuccess: vi.fn(),
	onCancel: vi.fn()
};

describe('ExpenseFormDialog', () => {
	test('[SPEC: AC-032] open=false のときフォームが描画されない', async () => {
		render(ExpenseFormDialog, { ...baseProps, open: false, mode: 'create' });

		await expect.element(page.getByTestId('expense-form')).not.toBeInTheDocument();
	});

	test('[SPEC: AC-033] open=true かつ mode=create のとき「支出を登録」フォームが表示される', async () => {
		render(ExpenseFormDialog, { ...baseProps, open: true, mode: 'create' });

		await expect.element(page.getByTestId('expense-form')).toBeVisible();
		await expect.element(page.getByText('支出を登録')).toBeVisible();
	});

	test('[SPEC: AC-034] open=true かつ mode=edit のとき「支出を編集」フォームが表示される', async () => {
		render(ExpenseFormDialog, {
			...baseProps,
			open: true,
			mode: 'edit',
			expense: mockExpense
		});

		await expect.element(page.getByTestId('expense-form')).toBeVisible();
		await expect.element(page.getByText('支出を編集')).toBeVisible();
	});
});
