/**
 * @file テスト: ExpenseFormDialog コンポーネント
 * @module src/routes/expenses/components/ExpenseFormDialog.svelte.test.ts
 * @testType unit
 *
 * @target ./ExpenseFormDialog.svelte
 * @spec specs/expenses/spec.md
 * @covers AC-032, AC-033, AC-034
 */

import { describe, test, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ExpenseFormDialog from './ExpenseFormDialog.svelte';

afterEach(() => {
	vi.clearAllMocks();
});

const categories = [
	{ id: 'cat-1', userId: 'user-1', name: '食費', createdAt: '2026-01-01T00:00:00Z' }
];
const users = [
	{ id: 'user-1', name: '主', email: 'main@example.com' },
	{ id: 'user-2', name: '妻', email: 'wife@example.com' }
];

describe('ExpenseFormDialog', () => {
	test('[SPEC: AC-032] open=false のときフォームが描画されない // spec:f42a205a', async () => {
		render(ExpenseFormDialog, {
			open: false,
			mode: 'create',
			categories,
			users,
			onClose: vi.fn(),
			onSubmit: vi.fn()
		});

		await expect.element(page.getByTestId('expense-form')).not.toBeInTheDocument();
	});

	test('[SPEC: AC-033] mode=create のとき「支出を登録」フォームが表示される // spec:f42a205a', async () => {
		render(ExpenseFormDialog, {
			open: true,
			mode: 'create',
			categories,
			users,
			onClose: vi.fn(),
			onSubmit: vi.fn()
		});

		await expect.element(page.getByTestId('expense-form')).toBeInTheDocument();
		await expect.element(page.getByText('支出を登録')).toBeVisible();
	});

	test('[SPEC: AC-034] mode=edit かつ expense を渡すと「支出を編集」フォームが表示される // spec:f42a205a', async () => {
		const expense = {
			id: 'exp-1',
			userId: 'user-1',
			amount: 1500,
			categoryId: 'cat-1',
			payerUserId: 'user-1',
			status: 'unapproved' as const,
			createdAt: '2026-03-01T00:00:00Z',
			category: categories[0],
			payer: users[0]
		};

		render(ExpenseFormDialog, {
			open: true,
			mode: 'edit',
			expense,
			categories,
			users,
			onClose: vi.fn(),
			onSubmit: vi.fn()
		});

		await expect.element(page.getByTestId('expense-form')).toBeInTheDocument();
		await expect.element(page.getByText('支出を編集')).toBeVisible();
	});
});
