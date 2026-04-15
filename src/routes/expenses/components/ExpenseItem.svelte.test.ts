/**
 * @file テスト: ExpenseItem コンポーネント
 * @module src/routes/expenses/components/ExpenseItem.svelte.test.ts
 * @testType unit
 *
 * @target ./ExpenseItem.svelte
 * @spec specs/expenses/spec.md
 * @covers AC-004, AC-005, AC-006, AC-007, AC-015, AC-016, AC-017, AC-018, AC-020
 */

import { describe, test, expect, vi, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ExpenseItem from './ExpenseItem.svelte';
import type { ExpenseWithRelations } from '../_lib/types';

afterEach(() => {
	vi.clearAllMocks();
});

const currentUserId = 'user-a';
const otherUserId = 'user-b';

function makeExpense(overrides: {
	id?: string;
	userId?: string;
	status: 'unapproved' | 'checked' | 'pending' | 'approved';
	amount?: number;
}): ExpenseWithRelations {
	return {
		id: overrides.id ?? 'exp-1',
		userId: overrides.userId ?? currentUserId,
		amount: overrides.amount ?? 1000,
		categoryId: 'cat-1',
		payerUserId: currentUserId,
		status: overrides.status,
		createdAt: '2026-03-15T00:00:00Z',
		category: {
			id: 'cat-1',
			userId: currentUserId,
			name: '食費',
			createdAt: '2026-01-01T00:00:00Z'
		},
		payer: { id: currentUserId, name: '主', email: 'main@example.com' }
	};
}

function renderItem(
	expense: ExpenseWithRelations,
	opts: {
		openMenuId?: string | null;
		onCheckToggle?: (id: string, action: 'check' | 'uncheck') => void;
		onEdit?: (expense: ExpenseWithRelations) => void;
		onDelete?: (expense: ExpenseWithRelations) => void;
		onMenuToggle?: (id: string | null) => void;
	} = {}
) {
	return render(ExpenseItem, {
		expense,
		currentUserId,
		openMenuId: opts.openMenuId ?? null,
		onCheckToggle: opts.onCheckToggle ?? vi.fn(),
		onEdit: opts.onEdit ?? vi.fn(),
		onDelete: opts.onDelete ?? vi.fn(),
		onMenuToggle: opts.onMenuToggle ?? vi.fn()
	});
}

describe('ExpenseItem - 表示内容', () => {
	test('[SPEC: AC-020] 金額が ¥1,000 形式（¥プレフィックス+カンマ区切り）で表示される', async () => {
		renderItem(makeExpense({ status: 'unapproved', amount: 1000 }));
		await expect.element(page.getByText('¥1,000').first()).toBeVisible();
	});

	test('[SPEC: AC-020] カテゴリ名が表示される', async () => {
		renderItem(makeExpense({ status: 'unapproved' }));
		await expect.element(page.getByText('食費').first()).toBeVisible();
	});

	test('[SPEC: AC-020] unapproved 行のステータスバッジに「未承認」が表示される', async () => {
		renderItem(makeExpense({ status: 'unapproved' }));
		await expect.element(page.getByText('未承認').first()).toBeVisible();
	});

	test('[SPEC: AC-020] checked 行のステータスバッジに「確認済み」が表示される', async () => {
		renderItem(makeExpense({ status: 'checked' }));
		await expect.element(page.getByText('確認済み').first()).toBeVisible();
	});

	test('[SPEC: AC-017] pending 行のステータスバッジに「申請中」が表示される', async () => {
		renderItem(makeExpense({ status: 'pending' }));
		await expect.element(page.getByText('申請中').first()).toBeVisible();
	});

	test('[SPEC: AC-015] approved 行のステータスバッジに「承認済み」が表示される', async () => {
		renderItem(makeExpense({ status: 'approved' }));
		await expect.element(page.getByText('承認済み').first()).toBeVisible();
	});
});

describe('ExpenseItem - 自分の unapproved 行', () => {
	test('[SPEC: AC-004] チェックボックスが表示される', async () => {
		renderItem(makeExpense({ status: 'unapproved' }));
		await expect.element(page.getByTestId('expense-check-button').first()).toBeInTheDocument();
	});

	test('[SPEC: AC-004] チェックボックスをクリックすると onCheckToggle("check") が呼ばれる', async () => {
		const onCheckToggle = vi.fn();
		renderItem(makeExpense({ id: 'exp-1', status: 'unapproved' }), { onCheckToggle });

		const checkbox = page.getByTestId('expense-check-button').first().element() as HTMLInputElement;
		checkbox.click();
		flushSync();

		expect(onCheckToggle).toHaveBeenCalledWith('exp-1', 'check');
	});
});

describe('ExpenseItem - 自分の checked 行', () => {
	test('[SPEC: AC-005] チェックボックスがチェック済み状態で表示される', async () => {
		renderItem(makeExpense({ status: 'checked' }));
		const checkbox = page.getByTestId('expense-check-button').first().element() as HTMLInputElement;
		expect(checkbox.checked).toBe(true);
	});

	test('[SPEC: AC-005] チェックボックスをクリックすると onCheckToggle("uncheck") が呼ばれる', async () => {
		const onCheckToggle = vi.fn();
		renderItem(makeExpense({ id: 'exp-1', status: 'checked' }), { onCheckToggle });

		const checkbox = page.getByTestId('expense-check-button').first().element() as HTMLInputElement;
		checkbox.click();
		flushSync();

		expect(onCheckToggle).toHaveBeenCalledWith('exp-1', 'uncheck');
	});
});

describe('ExpenseItem - 自分の pending 行', () => {
	test('[SPEC: AC-017] チェックボックスが非表示', async () => {
		renderItem(makeExpense({ status: 'pending' }));
		await expect.element(page.getByTestId('expense-check-button')).not.toBeInTheDocument();
	});

	test('[SPEC: AC-017] 編集ボタンが disabled', async () => {
		renderItem(makeExpense({ status: 'pending' }));
		const editBtn = page.getByTestId('expense-edit-button').first().element() as HTMLButtonElement;
		expect(editBtn.disabled).toBe(true);
	});

	test('[SPEC: AC-017] 削除ボタンが disabled', async () => {
		renderItem(makeExpense({ status: 'pending' }));
		const deleteBtn = page
			.getByTestId('expense-delete-button')
			.first()
			.element() as HTMLButtonElement;
		expect(deleteBtn.disabled).toBe(true);
	});
});

describe('ExpenseItem - 自分の approved 行', () => {
	test('[SPEC: AC-015] チェックボックスが非表示', async () => {
		renderItem(makeExpense({ status: 'approved' }));
		await expect.element(page.getByTestId('expense-check-button')).not.toBeInTheDocument();
	});

	test('[SPEC: AC-015] 編集・削除ボタンが非表示', async () => {
		renderItem(makeExpense({ status: 'approved' }));
		await expect.element(page.getByTestId('expense-edit-button')).not.toBeInTheDocument();
		await expect.element(page.getByTestId('expense-delete-button')).not.toBeInTheDocument();
	});
});

describe('ExpenseItem - 他ユーザーの支出', () => {
	test('[SPEC: AC-016] unapproved 行にチェックボックス・編集・削除ボタンが非表示', async () => {
		renderItem(makeExpense({ userId: otherUserId, status: 'unapproved' }));
		await expect.element(page.getByTestId('expense-check-button')).not.toBeInTheDocument();
		await expect.element(page.getByTestId('expense-edit-button')).not.toBeInTheDocument();
		await expect.element(page.getByTestId('expense-delete-button')).not.toBeInTheDocument();
	});

	test('[SPEC: AC-016] checked 行にチェックボックス・編集・削除ボタンが非表示', async () => {
		renderItem(makeExpense({ userId: otherUserId, status: 'checked' }));
		await expect.element(page.getByTestId('expense-check-button')).not.toBeInTheDocument();
		await expect.element(page.getByTestId('expense-edit-button')).not.toBeInTheDocument();
		await expect.element(page.getByTestId('expense-delete-button')).not.toBeInTheDocument();
	});

	test('[SPEC: AC-017] pending 行に操作ボタンが非表示', async () => {
		renderItem(makeExpense({ userId: otherUserId, status: 'pending' }));
		await expect.element(page.getByTestId('expense-check-button')).not.toBeInTheDocument();
		await expect.element(page.getByTestId('expense-edit-button')).not.toBeInTheDocument();
		await expect.element(page.getByTestId('expense-delete-button')).not.toBeInTheDocument();
	});
});

describe('ExpenseItem - 編集・削除コールバック（自分の unapproved）', () => {
	test('[SPEC: AC-006] 編集ボタンをクリックすると onEdit が expense を引数に呼ばれる', async () => {
		const onEdit = vi.fn();
		const expense = makeExpense({ status: 'unapproved' });
		renderItem(expense, { onEdit });

		const editBtn = page.getByTestId('expense-edit-button').first().element() as HTMLButtonElement;
		editBtn.click();
		flushSync();

		expect(onEdit).toHaveBeenCalledWith(expense);
	});

	test('[SPEC: AC-007] 削除ボタンをクリックすると onDelete が expense を引数に呼ばれる', async () => {
		const onDelete = vi.fn();
		const expense = makeExpense({ status: 'unapproved' });
		renderItem(expense, { onDelete });

		const deleteBtn = page
			.getByTestId('expense-delete-button')
			.first()
			.element() as HTMLButtonElement;
		deleteBtn.click();
		flushSync();

		expect(onDelete).toHaveBeenCalledWith(expense);
	});
});

describe('ExpenseItem - モバイルメニュー', () => {
	test('[SPEC: AC-018] 自分の unapproved 行でメニューボタンをクリックすると onMenuToggle が呼ばれる', async () => {
		const onMenuToggle = vi.fn();
		renderItem(makeExpense({ id: 'exp-1', status: 'unapproved' }), { onMenuToggle });

		const menuBtn = page.getByTestId('expense-menu-button').element() as HTMLButtonElement;
		menuBtn.click();
		flushSync();

		expect(onMenuToggle).toHaveBeenCalledWith('exp-1');
	});

	test('[SPEC: AC-018] openMenuId が一致するとメニューが表示される', async () => {
		renderItem(makeExpense({ id: 'exp-1', status: 'unapproved' }), { openMenuId: 'exp-1' });
		await expect.element(page.getByTestId('expense-menu')).toBeInTheDocument();
	});

	test('[SPEC: AC-018] openMenuId が一致しない場合はメニューが非表示', async () => {
		renderItem(makeExpense({ id: 'exp-1', status: 'unapproved' }), { openMenuId: 'exp-other' });
		await expect.element(page.getByTestId('expense-menu')).not.toBeInTheDocument();
	});

	test('[SPEC: AC-018] 他ユーザーの unapproved 行にはメニューボタンが非表示', async () => {
		renderItem(makeExpense({ userId: otherUserId, status: 'unapproved' }));
		await expect.element(page.getByTestId('expense-menu-button')).not.toBeInTheDocument();
	});
});
