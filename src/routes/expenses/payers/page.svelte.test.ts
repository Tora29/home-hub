/**
 * @file テスト: 支払者管理画面
 * @module src/routes/expenses/payers/page.svelte.test.ts
 * @testType unit
 *
 * @target ./+page.svelte
 * @spec specs/expenses/spec.md
 * @covers AC-035, AC-036, AC-037, AC-038
 */

import { describe, test, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import Page from './+page.svelte';

vi.mock('$app/navigation', () => ({
	invalidateAll: vi.fn().mockResolvedValue(undefined)
}));

const mockPayer = { id: 'payer-1', userId: 'user-1', name: '田中', createdAt: new Date() };

const emptyData = {
	payers: { items: [], total: 0, page: 1, limit: 0 }
};

const withPayersData = {
	payers: { items: [mockPayer], total: 1, page: 1, limit: 1 }
};

describe('+page.svelte - 支払者管理', () => {
	test('[SPEC: AC-035] 支払者一覧が表示される', async () => {
		render(Page, { data: withPayersData });

		await expect.element(page.getByTestId('expense-payer-list')).toBeInTheDocument();
		await expect.element(page.getByText('田中')).toBeVisible();
	});

	test('[SPEC: AC-035] 支払者が0件のとき空状態メッセージが表示される', async () => {
		render(Page, { data: emptyData });

		await expect.element(page.getByTestId('expense-payer-list')).not.toBeInTheDocument();
		await expect
			.element(page.getByText('支払者がありません。上のフォームから追加してください。'))
			.toBeVisible();
	});

	test('[SPEC: AC-036] 支払者名が空のまま「追加」を押すと「支払者名は必須です」がインライン表示される', async () => {
		render(Page, { data: emptyData });

		(page.getByTestId('expense-payer-add-button').element() as HTMLButtonElement).click();
		flushSync();

		await expect.element(page.getByTestId('expense-payer-name-error')).toBeVisible();
		await expect.element(page.getByText('支払者名は必須です')).toBeVisible();
	});

	test('[SPEC: AC-037] 編集ボタンを押すとインライン編集モードになる', async () => {
		render(Page, { data: withPayersData });

		(page.getByTestId('expense-payer-edit-button').element() as HTMLButtonElement).click();
		flushSync();

		await expect.element(page.getByRole('button', { name: '保存' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'キャンセル' })).toBeVisible();
	});

	test('[SPEC: AC-038] 削除ボタンを押すと確認ダイアログが表示される', async () => {
		render(Page, { data: withPayersData });

		(page.getByTestId('expense-payer-delete-button').element() as HTMLButtonElement).click();
		flushSync();

		await expect.element(page.getByTestId('expense-payer-delete-dialog')).toBeInTheDocument();
		await expect.element(page.getByText('支払者を削除しますか？')).toBeVisible();
	});
});
