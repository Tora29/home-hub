/**
 * @file テスト: 支出フォームダイアログ
 * @module src/lib/features/expenses/components/ExpenseFormDialog.svelte.test.ts
 * @testType unit
 *
 * @target ./ExpenseFormDialog.svelte
 */
import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { flushSync } from 'svelte';
import ExpenseFormDialog from './ExpenseFormDialog.svelte';
import type { Category, ExpenseWithRelations, User } from '../types';

const categories: Category[] = [{ id: 'cat-1', name: '食費', createdAt: '2024-06-01' }];
const users: User[] = [{ id: 'user-1', name: '夫', email: 'a@example.com' }];

const expense: ExpenseWithRelations = {
	id: 'exp-1',
	userId: 'user-1',
	amount: 2500,
	categoryId: 'cat-1',
	payerUserId: 'user-1',
	status: 'unapproved',
	createdAt: '2024-06-10T00:00:00.000Z',
	category: categories[0],
	payer: users[0]
};

function makeProps(overrides: Record<string, unknown> = {}) {
	return {
		open: true,
		mode: 'create' as const,
		categories,
		users,
		onSuccess: vi.fn(),
		onClose: vi.fn(),
		...overrides
	};
}

const amountInput = () => page.getByRole('textbox', { name: /金額/ });

/**
 * Escape キー押下を再現する（ブラウザは Escape でモーダル <dialog> に cancel イベントを発火する）。
 * userEvent.keyboard は CDP 経由でナビゲーション待機が入り全体実行時に不安定になるため使わない（testing.md）。
 * 実キーでの挙動は e2e/expenses.e2e.ts「キーボード・モーダル操作」で検証している。
 */
function pressEscape(): void {
	document.querySelector('dialog[open]')?.dispatchEvent(new Event('cancel', { cancelable: true }));
	flushSync();
}

describe('ExpenseFormDialog', () => {
	test('新規モードで open の場合、「支出を登録」ダイアログとフォームを表示できる', async () => {
		await render(ExpenseFormDialog, makeProps());
		await expect.element(page.getByRole('dialog', { name: '支出を登録' })).toBeVisible();
		await expect.element(page.getByRole('heading', { name: '支出を登録' })).toBeVisible();
		await expect.element(amountInput()).toHaveValue('');
	});

	test('編集モードで open の場合、「支出を編集」ダイアログに既存値を表示できる', async () => {
		await render(ExpenseFormDialog, makeProps({ mode: 'edit', expense }));
		await expect.element(page.getByRole('dialog', { name: '支出を編集' })).toBeVisible();
		await expect.element(amountInput()).toHaveValue('2,500');
	});

	test('open=false の場合、ダイアログとフォームが描画されない', async () => {
		await render(ExpenseFormDialog, makeProps({ open: false }));
		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
		await expect.element(page.getByTestId('expense-form')).not.toBeInTheDocument();
	});

	test('閉じて再度開いた場合、前回の入力値が残らない', async () => {
		const { rerender } = await render(ExpenseFormDialog, makeProps());
		const el = amountInput().element() as HTMLInputElement;
		el.value = '9000';
		el.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		await expect.element(amountInput()).toHaveValue('9,000');

		await rerender({ open: false });
		await expect.element(page.getByTestId('expense-form')).not.toBeInTheDocument();

		await rerender({ open: true });
		await expect.element(amountInput()).toHaveValue('');
	});

	test('フォームのキャンセルボタンで onClose を呼び出せる', async () => {
		const props = makeProps();
		await render(ExpenseFormDialog, props);
		(page.getByRole('button', { name: 'キャンセル' }).element() as HTMLElement).click();
		flushSync();
		expect(props.onClose).toHaveBeenCalledTimes(1);
	});

	test('Escape キーで onClose を呼び出せる', async () => {
		const props = makeProps();
		await render(ExpenseFormDialog, props);
		await expect.element(page.getByRole('dialog')).toBeVisible();
		pressEscape();
		await vi.waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
	});
});
