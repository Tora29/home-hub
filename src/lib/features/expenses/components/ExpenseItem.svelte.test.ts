/**
 * @file テスト: 支出一覧の行
 * @module src/lib/features/expenses/components/ExpenseItem.svelte.test.ts
 * @testType unit
 *
 * @target ./ExpenseItem.svelte
 */
import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { flushSync } from 'svelte';
import ExpenseItem from './ExpenseItem.svelte';
import ExpenseItemWrapper from './ExpenseItem.test-wrapper.svelte';
import type { ExpenseStatus, ExpenseWithRelations } from '../types';

// コンポーネントテストでは Tailwind 未読込のため、デスクトップ（md+）とモバイル（<md）の
// 両レイアウトが同時に DOM に存在する。重複する要素は first() / all() で扱う。

function makeExpense(overrides: Partial<ExpenseWithRelations> = {}): ExpenseWithRelations {
	return {
		id: 'exp-1',
		userId: 'user-1',
		amount: 12345,
		categoryId: 'cat-1',
		payerUserId: 'user-2',
		status: 'unapproved',
		createdAt: '2024-06-10T03:00:00.000Z',
		category: { id: 'cat-1', name: '食費', createdAt: '2024-06-01T00:00:00.000Z' },
		payer: { id: 'user-2', name: 'パートナー', email: 'b@example.com' },
		...overrides
	};
}

function makeProps(overrides: Record<string, unknown> = {}) {
	return {
		expense: makeExpense(),
		currentUserId: 'user-1',
		openMenuId: null,
		onCheckToggle: vi.fn(),
		onEdit: vi.fn(),
		onDelete: vi.fn(),
		onMenuToggle: vi.fn(),
		...overrides
	};
}

const checkboxes = () => page.getByRole('checkbox', { name: '確認済み' });
const desktopEditButton = () => page.getByRole('button', { name: '編集', exact: true });
const desktopDeleteButton = () => page.getByRole('button', { name: '削除', exact: true });
const menuButton = () => page.getByRole('button', { name: '操作メニューを開く' });

describe('ExpenseItem', () => {
	test('金額・カテゴリ・支払者・登録日を表示できる', async () => {
		await render(ExpenseItem, makeProps());
		await expect.element(page.getByText('¥12,345').first()).toBeVisible();
		await expect.element(page.getByText('食費').first()).toBeVisible();
		await expect.element(page.getByText('パートナー').first()).toBeVisible();
		await expect.element(page.getByText('6/10')).toBeVisible();
	});

	test('UTC で前日 15 時以降の登録日時の場合、JST の日付で表示される', async () => {
		await render(
			ExpenseItem,
			makeProps({ expense: makeExpense({ createdAt: '2024-05-31T16:00:00.000Z' }) })
		);
		await expect.element(page.getByText('6/1')).toBeVisible();
		await expect.element(page.getByText('5/31')).not.toBeInTheDocument();
	});

	test.each<[ExpenseStatus, string]>([
		['unapproved', '未承認'],
		['checked', '確認済み'],
		['pending', '申請中'],
		['approved', '承認済み']
	])('status が %s の場合、「%s」バッジを表示できる', async (status, label) => {
		await render(ExpenseItem, makeProps({ expense: makeExpense({ status }) }));
		await expect.element(page.getByText(label, { exact: true }).first()).toBeVisible();
	});

	test('自分の未承認の支出でチェックすると check で onCheckToggle を呼び出せる', async () => {
		const props = makeProps();
		await render(ExpenseItem, props);
		const first = checkboxes().first();
		await expect.element(first).toHaveAttribute('aria-checked', 'false');
		(first.element() as HTMLElement).click();
		flushSync();
		expect(props.onCheckToggle).toHaveBeenCalledWith('exp-1', 'check');
	});

	test('自分の確認済みの支出でチェックを外すと uncheck で onCheckToggle を呼び出せる', async () => {
		const props = makeProps({ expense: makeExpense({ status: 'checked' }) });
		await render(ExpenseItem, props);
		const first = checkboxes().first();
		await expect.element(first).toHaveAttribute('aria-checked', 'true');
		(first.element() as HTMLElement).click();
		flushSync();
		expect(props.onCheckToggle).toHaveBeenCalledWith('exp-1', 'uncheck');
	});

	test('チェック操作中の場合、チェックボックスが無効になり onCheckToggle が呼ばれない', async () => {
		const props = makeProps({ checkLoading: true });
		await render(ExpenseItem, props);
		for (const cb of checkboxes().all()) {
			await expect.element(cb).toBeDisabled();
			(cb.element() as HTMLElement).click();
		}
		flushSync();
		expect(props.onCheckToggle).not.toHaveBeenCalled();
	});

	test('自分の未承認の支出で編集・削除ボタンから onEdit / onDelete を呼び出せる', async () => {
		const props = makeProps();
		await render(ExpenseItem, props);
		(desktopEditButton().element() as HTMLElement).click();
		(desktopDeleteButton().element() as HTMLElement).click();
		flushSync();
		expect(props.onEdit).toHaveBeenCalledWith(props.expense);
		expect(props.onDelete).toHaveBeenCalledWith(props.expense);
	});

	test('自分の申請中の支出の場合、チェック・行メニューがなく編集・削除ボタンが無効になる', async () => {
		const props = makeProps({ expense: makeExpense({ status: 'pending' }) });
		await render(ExpenseItem, props);
		await expect.element(checkboxes().first()).not.toBeInTheDocument();
		await expect.element(menuButton()).not.toBeInTheDocument();
		await expect.element(desktopEditButton()).toBeDisabled();
		await expect.element(desktopDeleteButton()).toBeDisabled();
		(desktopEditButton().element() as HTMLElement).click();
		(desktopDeleteButton().element() as HTMLElement).click();
		flushSync();
		expect(props.onEdit).not.toHaveBeenCalled();
		expect(props.onDelete).not.toHaveBeenCalled();
	});

	test('自分の承認済みの支出の場合、チェック・編集・削除・行メニューが表示されない', async () => {
		await render(ExpenseItem, makeProps({ expense: makeExpense({ status: 'approved' }) }));
		await expect.element(checkboxes().first()).not.toBeInTheDocument();
		await expect.element(desktopEditButton()).not.toBeInTheDocument();
		await expect.element(desktopDeleteButton()).not.toBeInTheDocument();
		await expect.element(menuButton()).not.toBeInTheDocument();
	});

	test('パートナーの未承認の支出の場合、チェック・編集・削除・行メニューが表示されない', async () => {
		await render(ExpenseItem, makeProps({ currentUserId: 'user-2' }));
		await expect.element(checkboxes().first()).not.toBeInTheDocument();
		await expect.element(desktopEditButton()).not.toBeInTheDocument();
		await expect.element(desktopDeleteButton()).not.toBeInTheDocument();
		await expect.element(menuButton()).not.toBeInTheDocument();
	});

	test('行メニューボタンで操作メニューを開閉できる', async () => {
		await render(ExpenseItemWrapper, {
			expense: makeExpense(),
			currentUserId: 'user-1',
			onEdit: vi.fn(),
			onDelete: vi.fn()
		});
		await expect.element(menuButton()).toHaveAttribute('aria-expanded', 'false');
		await expect.element(page.getByTestId('expense-menu')).not.toBeInTheDocument();

		(menuButton().element() as HTMLElement).click();
		flushSync();
		await expect.element(menuButton()).toHaveAttribute('aria-expanded', 'true');
		await expect.element(page.getByTestId('expense-menu')).toBeVisible();

		(menuButton().element() as HTMLElement).click();
		flushSync();
		await expect.element(menuButton()).toHaveAttribute('aria-expanded', 'false');
		await expect.element(page.getByTestId('expense-menu')).not.toBeInTheDocument();
	});

	test('行メニューの編集で onEdit を呼び出しメニューが閉じる', async () => {
		const expense = makeExpense();
		const onEdit = vi.fn();
		await render(ExpenseItemWrapper, {
			expense,
			currentUserId: 'user-1',
			onEdit,
			onDelete: vi.fn()
		});
		(menuButton().element() as HTMLElement).click();
		flushSync();
		const menu = page.getByTestId('expense-menu');
		(menu.getByRole('button', { name: '編集' }).element() as HTMLElement).click();
		flushSync();
		expect(onEdit).toHaveBeenCalledWith(expense);
		await expect.element(menuButton()).toHaveAttribute('aria-expanded', 'false');
		await expect.element(menu).not.toBeInTheDocument();
	});

	test('行メニューの削除で onDelete を呼び出しメニューが閉じる', async () => {
		const expense = makeExpense();
		const onDelete = vi.fn();
		await render(ExpenseItemWrapper, {
			expense,
			currentUserId: 'user-1',
			onEdit: vi.fn(),
			onDelete
		});
		(menuButton().element() as HTMLElement).click();
		flushSync();
		const menu = page.getByTestId('expense-menu');
		(menu.getByRole('button', { name: '削除' }).element() as HTMLElement).click();
		flushSync();
		expect(onDelete).toHaveBeenCalledWith(expense);
		await expect.element(menuButton()).toHaveAttribute('aria-expanded', 'false');
		await expect.element(menu).not.toBeInTheDocument();
	});
});
